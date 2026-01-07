import pandas as pd
import xgboost as xgb
from datetime import datetime
import os
import sys
from nba_api.stats.endpoints import scoreboardv2
from nba_api.stats.static import teams

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..")

# --- CONFIGURATION MIROIR (V0) ---
V0_DATA_PATH = "../../NBA_Agent/data/"

print("--- GÉNÉRATION AUTOMATIQUE DES PRONOSTICS ---")

# 1. Chargement des ressources
try:
    # On cherche le modèle dans models/
    MODEL_PATH = "models/nba_predictor_v12.json"
    if os.path.exists(MODEL_PATH):
        model = xgb.XGBClassifier()
        model.load_model(MODEL_PATH)
    else:
        print(f"❌ Erreur : {MODEL_PATH} introuvable.")
        exit()

    if os.path.exists('data/nba_games_ready.csv'):
        df_history = pd.read_csv('data/nba_games_ready.csv')
        df_history['GAME_DATE'] = pd.to_datetime(df_history['GAME_DATE'])
    else:
        print("❌ Erreur : data/nba_games_ready.csv introuvable.")
        exit()
        
    nba_teams = teams.get_teams()
    id_to_name = {t['id']: t['full_name'] for t in nba_teams}

except Exception as e:
    print(f"❌ Erreur chargement : {e}")
    exit()

# 2. Fonction de Prédiction V12
def get_prediction_logic(home_id, away_id):
    home_games = df_history[df_history['TEAM_ID'] == home_id].sort_values('GAME_DATE')
    away_games = df_history[df_history['TEAM_ID'] == away_id].sort_values('GAME_DATE')
    
    if home_games.empty or away_games.empty: return None

    # Get the last game row to access "Last 5" stats (which are rolling means of prev games)
    # CAREFUL: "EFG_PCT_LAST_5" in row X is the avg of X-1, X-2... entering X.
    # So for Today (Game X+1), we must use the stats from the row "Last Game" ??
    # Actually, features_nba.py says: df[f"{factor}_LAST_5"] = ... shift(1).rolling(5)
    # So row X contains the avg of the 5 games BEFORE X.
    # For Today, we need the avg of the 5 most recent games.
    # That is exactly what `EFG_PCT` rolling would calculate if we appended a row.
    # Alternatively: Recalculate it from raw stats of last 5 games? 
    # Or rely on the fact that `last_home['EFG_PCT_LAST_5']` is the avg entering Last Game.
    # This is slightly stale. Ideally we want avg entering Today (including Last Game).
    
    # RE-CALCULATION ON THE FLY FOR PRECISION (Engine V12 Requirement)
    def get_rolling_avg(games_df, col, n=5):
        return games_df[col].tail(n).mean()
        
    factors = ['EFG_PCT', 'TOV_PCT', 'FT_RATE', 'ORB_RAW', 'WIN'] # WIN needed for WIN_LAST_5
    
    # --- FEATURES CALCULATION ---
    feats = {}
    
    # Legacy factors (Recalculated to be fresh)
    for t_type, t_df, suffix in [('HOME', home_games, '_HOME'), ('AWAY', away_games, '_AWAY')]:
        feats[f'EFG_PCT_LAST_5{suffix}'] = t_df['EFG_PCT'].tail(5).mean()
        feats[f'TOV_PCT_LAST_5{suffix}'] = t_df['TOV_PCT'].tail(5).mean()
        feats[f'ORB_RAW_LAST_5{suffix}'] = t_df['ORB_RAW'].tail(5).mean()
        feats[f'WIN_LAST_5{suffix}'] = t_df['WIN'].tail(5).mean() # For Diff Win
        # Note: FT_RATE not used in model directly but used in Last 5 calculation? No model uses LAST_5 features.

    feats['DIFF_EFG'] = feats['EFG_PCT_LAST_5_HOME'] - feats['EFG_PCT_LAST_5_AWAY']
    feats['DIFF_TOV'] = feats['TOV_PCT_LAST_5_HOME'] - feats['TOV_PCT_LAST_5_AWAY']
    feats['DIFF_ORB'] = feats['ORB_RAW_LAST_5_HOME'] - feats['ORB_RAW_LAST_5_AWAY']
    feats['DIFF_WIN'] = feats['WIN_LAST_5_HOME'] - feats['WIN_LAST_5_AWAY']

    # --- ENGINE V12 CONTEXT FEATURES ---
    
    today = pd.to_datetime(datetime.now().strftime('%Y-%m-%d'))
    
    # 1. Fatigue (Rest Days & B2B)
    date_home = home_games.iloc[-1]['GAME_DATE']
    date_away = away_games.iloc[-1]['GAME_DATE']
    
    # Days since last game (minus 1 for Rest Days specific logic logic: Gap-1)
    diff_home = (today - date_home).days
    rest_home = max(0, diff_home - 1)
    rest_home = min(7, rest_home) # Clip at 7
    
    diff_away = (today - date_away).days
    rest_away = max(0, diff_away - 1)
    rest_away = min(7, rest_away)

    feats['REST_DAYS_HOME'] = rest_home
    feats['REST_DAYS_AWAY'] = rest_away
    feats['DIFF_REST'] = rest_home - rest_away
    
    feats['IS_B2B_HOME_INT'] = 1 if rest_home == 0 else 0
    feats['IS_B2B_AWAY_INT'] = 1 if rest_away == 0 else 0

    # 2. Form (Last 10 Wins)
    feats['LAST10_WINS_HOME'] = home_games['WIN'].tail(10).sum()
    feats['LAST10_WINS_AWAY'] = away_games['WIN'].tail(10).sum()
    feats['DIFF_LAST10'] = feats['LAST10_WINS_HOME'] - feats['LAST10_WINS_AWAY']

    # 3. Streak (Current)
    def get_current_streak(df):
        # We need to iterate backwards from the end until the result changes
        wins = df['WIN'].values
        if len(wins) == 0: return 0
        last_res = wins[-1]
        streak = 0
        for i in range(len(wins)-1, -1, -1):
            if wins[i] == last_res:
                streak += 1
            else:
                break
        return streak if last_res == 1 else -streak

    feats['STREAK_CURRENT_HOME'] = get_current_streak(home_games)
    feats['STREAK_CURRENT_AWAY'] = get_current_streak(away_games)
    feats['DIFF_STREAK'] = feats['STREAK_CURRENT_HOME'] - feats['STREAK_CURRENT_AWAY']

    # 4. Specific Win Rate (Home at Home vs Away at Away)
    # IS_HOME is tricky in dataset, looking at "vs." in MATCHUP
    # Filter home_games where they were actually Home
    home_at_home = home_games[home_games['MATCHUP'].str.contains('vs.')]
    rate_home = home_at_home['WIN'].mean() if len(home_at_home) > 0 else 0.5
    
    away_at_away = away_games[~away_games['MATCHUP'].str.contains('vs.')] # @ symbol usually
    rate_away = away_at_away['WIN'].mean() if len(away_at_away) > 0 else 0.5
    
    feats['WIN_RATE_SPECIFIC_HOME'] = rate_home
    feats['WIN_RATE_SPECIFIC_AWAY'] = rate_away
    feats['DIFF_SPECIFIC_WIN_RATE'] = rate_home - rate_away

    # Order must match Training exactly!
    feature_order = [
        'EFG_PCT_LAST_5_HOME', 'EFG_PCT_LAST_5_AWAY', 
        'TOV_PCT_LAST_5_HOME', 'TOV_PCT_LAST_5_AWAY',
        'ORB_RAW_LAST_5_HOME', 'ORB_RAW_LAST_5_AWAY', 
        'DIFF_EFG', 'DIFF_TOV', 'DIFF_ORB', 'DIFF_WIN', 
        'REST_DAYS_HOME', 'REST_DAYS_AWAY', 'DIFF_REST',
        'IS_B2B_HOME_INT', 'IS_B2B_AWAY_INT',
        'STREAK_CURRENT_HOME', 'STREAK_CURRENT_AWAY', 'DIFF_STREAK',
        'LAST10_WINS_HOME', 'LAST10_WINS_AWAY', 'DIFF_LAST10',
        'WIN_RATE_SPECIFIC_HOME', 'WIN_RATE_SPECIFIC_AWAY', 'DIFF_SPECIFIC_WIN_RATE'
    ]

    input_data = pd.DataFrame([feats])[feature_order]

    probs = model.predict_proba(input_data)[0]
    return probs[1] # Probabilité victoire domicile

# 3. Récupération des matchs du jour
try:
    today_str = datetime.now().strftime('%Y-%m-%d')
    print(f"📅 Recherche des matchs pour le {today_str}...")
    
    board = scoreboardv2.ScoreboardV2(game_date=today_str)
    games = board.game_header.get_data_frame()
    games = games.dropna(subset=['HOME_TEAM_ID', 'VISITOR_TEAM_ID'])
    
    if games.empty:
        print("⚠️ Aucun match trouvé pour ce soir.")
        exit()
        
    print(f"✅ {len(games)} matchs trouvés.")
    
    # 4. Boucle de prédiction et sauvegarde
    HISTORY_FILE = 'data/bets_history.csv'
    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'w') as f:
            f.write("Date,Home,Away,Predicted_Winner,Confidence,Type,Result\n")
            
    try:
        current_hist = pd.read_csv(HISTORY_FILE)
    except:
        current_hist = pd.DataFrame()

    new_bets = 0
    for _, game in games.iterrows():
        h_id, a_id = game['HOME_TEAM_ID'], game['VISITOR_TEAM_ID']
        h_name = id_to_name.get(h_id, str(h_id))
        a_name = id_to_name.get(a_id, str(a_id))
        
        already_exists = False
        if not current_hist.empty:
            match_exists = current_hist[
                (current_hist['Date'] == today_str) & 
                (current_hist['Home'] == h_name) & 
                (current_hist['Away'] == a_name)
            ]
            if not match_exists.empty:
                already_exists = True
        
        if not already_exists:
            prob_home = get_prediction_logic(h_id, a_id)
            
            if prob_home is not None:
                if prob_home > 0.5:
                    winner, conf = h_name, prob_home * 100
                else:
                    winner, conf = a_name, (1 - prob_home) * 100
                
                line = f"\n{today_str},{h_name},{a_name},{winner},{conf:.1f}%,Auto,"
                
                # ÉCRITURE LOCAL (Next.js)
                with open(HISTORY_FILE, 'a') as f:
                    f.write(line)
                
                # ÉCRITURE MIROIR (V0)
                if os.path.exists(V0_DATA_PATH):
                    v0_file = os.path.join(V0_DATA_PATH, "bets_history.csv")
                    with open(v0_file, 'a') as f:
                        f.write(line)

                print(f"   -> {h_name} vs {a_name} : {winner} ({conf:.1f}%) [SAUVEGARDÉ]")
                new_bets += 1
        else:
            print(f"   -> {h_name} vs {a_name} : Déjà fait.")

    print(f"\nTerminé ! {new_bets} nouveaux pronostics ajoutés.")

except Exception as e:
    print(f"❌ Erreur globale : {e}")
