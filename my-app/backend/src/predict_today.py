import pandas as pd
import numpy as np # Added for V13
import xgboost as xgb
from datetime import datetime
import os
import sys
from nba_api.stats.endpoints import scoreboardv2
from nba_api.stats.static import teams
import explainability # V13 Explainability Logic

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..")


print("--- GÉNÉRATION AUTOMATIQUE DES PRONOSTICS (ENGINE V13) ---")

# 1. Chargement des ressources
try:
    # On cherche le modèle dans models/
    MODEL_PATH = "models/nba_predictor_v13.json" # UPDATED V13
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

# 2. Fonction de Prédiction V12 & V13
def get_prediction_logic(home_id, away_id):
    home_games = df_history[df_history['TEAM_ID'] == home_id].sort_values('GAME_DATE')
    away_games = df_history[df_history['TEAM_ID'] == away_id].sort_values('GAME_DATE')
    
    if home_games.empty or away_games.empty: return None

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

    feats['DIFF_EFG'] = feats['EFG_PCT_LAST_5_HOME'] - feats['EFG_PCT_LAST_5_AWAY']
    feats['DIFF_TOV'] = feats['TOV_PCT_LAST_5_HOME'] - feats['TOV_PCT_LAST_5_AWAY']
    feats['DIFF_ORB'] = feats['ORB_RAW_LAST_5_HOME'] - feats['ORB_RAW_LAST_5_AWAY']
    feats['DIFF_WIN'] = feats['WIN_LAST_5_HOME'] - feats['WIN_LAST_5_AWAY']

    # --- ENGINE V12 CONTEXT FEATURES ---
    
    today = pd.to_datetime(datetime.now().strftime('%Y-%m-%d'))
    
    # 1. Fatigue (Rest Days & B2B)
    date_home = home_games.iloc[-1]['GAME_DATE']
    date_away = away_games.iloc[-1]['GAME_DATE']
    
    # Days since last game
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
    home_at_home = home_games[home_games['MATCHUP'].str.contains('vs.')]
    rate_home = home_at_home['WIN'].mean() if len(home_at_home) > 0 else 0.5
    
    away_at_away = away_games[~away_games['MATCHUP'].str.contains('vs.')] # @ symbol usually
    rate_away = away_at_away['WIN'].mean() if len(away_at_away) > 0 else 0.5
    
    feats['WIN_RATE_SPECIFIC_HOME'] = rate_home
    feats['WIN_RATE_SPECIFIC_AWAY'] = rate_away
    feats['DIFF_SPECIFIC_WIN_RATE'] = rate_home - rate_away

    # --- ENGINE V13 INJURY PROXIES ---
    
    # 5. EFF_SHOCK (Last 3 EFG - Last 10 EFG)
    for t_type, t_df, suffix in [('HOME', home_games, '_HOME'), ('AWAY', away_games, '_AWAY')]:
        efg3 = t_df['EFG_PCT'].tail(3).mean()
        efg10 = t_df['EFG_PCT'].tail(10).mean()
        feats[f'EFF_SHOCK{suffix}'] = (efg3 - efg10) * 100
        
    feats['DIFF_EFF_SHOCK'] = feats['EFF_SHOCK_HOME'] - feats['EFF_SHOCK_AWAY']

    # 6. VOLATILITY (Std Dev of Point Differential)
    # Assuming 'PLUS_MINUS' is in df_history (it should be if standard nba_games.csv)
    # If not, we might need a fallback.
    for t_type, t_df, suffix in [('HOME', home_games, '_HOME'), ('AWAY', away_games, '_AWAY')]:
        if 'PLUS_MINUS' in t_df.columns:
            feats[f'VOLATILITY{suffix}'] = t_df['PLUS_MINUS'].tail(10).std()
        else:
             # Fallback if PLUS_MINUS missing (should not happen with regular sync)
             feats[f'VOLATILITY{suffix}'] = 0 
             
    feats['DIFF_VOLATILITY'] = feats['VOLATILITY_HOME'] - feats['VOLATILITY_AWAY']
    
    # 7. MARGIN_CRASH (Weighted Recent Failure)
    def calc_margin_crash(df, n=3):
        if 'PLUS_MINUS' not in df.columns: return 0
        recent = df['PLUS_MINUS'].tail(n).values
        if len(recent) == 0: return 0
        weights = np.arange(1, len(recent) + 1)
        return np.sum(recent * weights) / np.sum(weights)

    feats['MARGIN_CRASH_HOME'] = calc_margin_crash(home_games)
    feats['MARGIN_CRASH_AWAY'] = calc_margin_crash(away_games)
    feats['DIFF_MARGIN_CRASH'] = feats['MARGIN_CRASH_HOME'] - feats['MARGIN_CRASH_AWAY']

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
        'WIN_RATE_SPECIFIC_HOME', 'WIN_RATE_SPECIFIC_AWAY', 'DIFF_SPECIFIC_WIN_RATE',
        
        # V13
        'EFF_SHOCK_HOME', 'EFF_SHOCK_AWAY', 'DIFF_EFF_SHOCK',
        'VOLATILITY_HOME', 'VOLATILITY_AWAY', 'DIFF_VOLATILITY',
        'MARGIN_CRASH_HOME', 'MARGIN_CRASH_AWAY', 'DIFF_MARGIN_CRASH'
    ]

    input_data = pd.DataFrame([feats])[feature_order]
    probs = model.predict_proba(input_data)[0]
    return probs[1], feats # Return feats for UI Display persistence

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
            f.write("Date,Home,Away,Predicted_Winner,Confidence,Type,Result,Real_Winner,User_Prediction,User_Result,User_Reason,User_Confidence,Home_Rest,Away_Rest,Home_B2B,Away_B2B,AI_Explanation,Risk_Level,Badges\n")
            
    try:
        current_hist = pd.read_csv(HISTORY_FILE)
    except:
        current_hist = pd.DataFrame()

    new_bets = 0
    for _, game in games.iterrows():
        h_id, a_id = game['HOME_TEAM_ID'], game['VISITOR_TEAM_ID']
        h_name = id_to_name.get(h_id, str(h_id))
        a_name = id_to_name.get(a_id, str(a_id))
        
        # Logic change: Even if it exists, we might need to UPDATE the AI columns (Fatigue, Explainability)
        # BUT we must preserve the USER columns.
        
        should_process = True
        existing_index = None

        if not current_hist.empty:
            match_exists = current_hist[
                (current_hist['Date'] == today_str) & 
                (current_hist['Home'] == h_name) & 
                (current_hist['Away'] == a_name)
            ]
            if not match_exists.empty:
                already_exists = True
                existing_index = match_exists.index[0]
                # We process anyway to update AI fields, but we will write back specifically
        
        result = get_prediction_logic(h_id, a_id) 
        
        if result is not None:
            prob_home, feats = result
            
            if prob_home > 0.5:
                winner, conf = h_name, prob_home * 100
            else:
                winner, conf = a_name, (1 - prob_home) * 100
            
            h_b2b = "TRUE" if feats['IS_B2B_HOME_INT'] == 1 else "FALSE"
            a_b2b = "TRUE" if feats['IS_B2B_AWAY_INT'] == 1 else "FALSE"
            
            # V13 EXPLAINABILITY
            ux_data = explainability.get_explanation_and_risk(feats, prob_home, h_name, a_name)
            
            # DATA PREPARATION
            new_row = {
                'Date': today_str,
                'Home': h_name,
                'Away': a_name,
                'Predicted_Winner': winner,
                'Confidence': f"{conf:.1f}%",
                'Type': 'Auto',
                'Result': '', # AI Result (Unknown yet)
                'Real_Winner': '',
                # USER COLUMNS (To be preserved or Init)
                'User_Prediction': '',
                'User_Result': '',
                'User_Reason': '',
                'User_Confidence': '',
                # FATIGUE
                'Home_Rest': feats['REST_DAYS_HOME'],
                'Away_Rest': feats['REST_DAYS_AWAY'],
                'Home_B2B': h_b2b,
                'Away_B2B': a_b2b,
                # V13
                'AI_Explanation': ux_data['explanation'],
                'Risk_Level': ux_data['risk_level'],
                'Badges': "|".join(ux_data['badges'])
            }

            if already_exists and existing_index is not None:
                # UPDATE MODE: We preserve User columns from the existing row
                old_row = current_hist.loc[existing_index]
                
                # Copy back user fields if they exist
                for key in ['User_Prediction', 'User_Result', 'User_Reason', 'User_Confidence']:
                    if key in old_row and pd.notna(old_row[key]):
                         new_row[key] = old_row[key]
                
                # Update the dataframe in memory
                for col, val in new_row.items():
                    current_hist.at[existing_index, col] = val
                    
                print(f"   -> {h_name} vs {a_name} : Mis à jour (Vote gardé).")
            else:
                # INSERT MODE
                new_df = pd.DataFrame([new_row])
                current_hist = pd.concat([current_hist, new_df], ignore_index=True)
                print(f"   -> {h_name} vs {a_name} : Nouveau.")
                new_bets += 1

    # SAVE GLOBAL (Once after loop)
    # Much safer than appending line by line which causes duplicates and encoding issues
    current_hist.to_csv(HISTORY_FILE, index=False, encoding='utf-8')
    


    print(f"\nTerminé ! {new_bets} nouveaux pronostics ajoutés / Les autres mis à jour.")

    print(f"\nTerminé ! {new_bets} nouveaux pronostics ajoutés.")

except Exception as e:
    print(f"❌ Erreur globale : {e}")
