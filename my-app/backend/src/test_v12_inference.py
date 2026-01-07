
import pandas as pd
import xgboost as xgb
from datetime import datetime
import os
import sys

# Forces le dossier de travail sur celui du script (backend/src) -> Remonte à backend/
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..")

# --- MOCK PREDICT TODAY LOGIC ---
# Identique au script de prod mais juste pour tester une fonction

MODEL_PATH = "models/nba_predictor_v12.json"
if not os.path.exists(MODEL_PATH):
    print("❌ Model deleted not found")
    exit(1)

model = xgb.XGBClassifier()
model.load_model(MODEL_PATH)
print("✅ Model loaded")

df_history = pd.read_csv('data/nba_games_ready.csv')
df_history['GAME_DATE'] = pd.to_datetime(df_history['GAME_DATE'])

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
        feats[f'WIN_LAST_5{suffix}'] = t_df['WIN'].tail(5).mean() 

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

    print("Input Features:", feats)

    input_data = pd.DataFrame([feats])[feature_order]

    probs = model.predict_proba(input_data)[0]
    return probs[1] # Probabilité victoire domicile

# Test with Boston (1610612738) vs Denver (1610612743)
prob = get_prediction_logic(1610612738, 1610612743)
print(f"Prediction Boston vs Denver: {prob:.2%}")
