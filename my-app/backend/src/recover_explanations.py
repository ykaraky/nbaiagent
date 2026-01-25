
import pandas as pd
import numpy as np
import xgboost as xgb
import os
import sys
from datetime import datetime, timedelta

# Adjust path to find backend modules
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

import explainability

# Data Paths
DATA_DIR = os.path.join(BASE_DIR, '..', 'data')
HISTORY_FILE = os.path.join(DATA_DIR, 'bets_history.csv')
GAMES_FILE = os.path.join(DATA_DIR, 'nba_games_ready.csv')
MODEL_PATH = os.path.join(BASE_DIR, '..', 'models', 'nba_predictor_v13.json')

def recover_explanations():
    print("--- RECOVERY: EXPLANATIONS & RISK BACKFILL ---")

    if not os.path.exists(HISTORY_FILE) or not os.path.exists(GAMES_FILE):
        print("❌ Critical files missing.")
        return

    # Load Data
    df_hist = pd.read_csv(HISTORY_FILE)
    df_games = pd.read_csv(GAMES_FILE)
    df_games['GAME_DATE'] = pd.to_datetime(df_games['GAME_DATE'])

    # Load Model
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Model not found at {MODEL_PATH}")
        return
        
    model = xgb.XGBClassifier()
    model.load_model(MODEL_PATH)

    # Helper: Feature Calculation Logic (Copied from predict_today.py V13)
    def get_features(home_id, away_id, game_date):
        # We need games BEFORE the game_date
        past_games = df_games[df_games['GAME_DATE'] < game_date]
        
        home_games = past_games[past_games['TEAM_ID'] == home_id].sort_values('GAME_DATE')
        away_games = past_games[past_games['TEAM_ID'] == away_id].sort_values('GAME_DATE')
        
        if home_games.empty or away_games.empty: 
            return None

        # --- FEATURES CALCULATION ---
        feats = {}
        
        # Legacy
        for t_type, t_df, suffix in [('HOME', home_games, '_HOME'), ('AWAY', away_games, '_AWAY')]:
            feats[f'EFG_PCT_LAST_5{suffix}'] = t_df['EFG_PCT'].tail(5).mean()
            feats[f'TOV_PCT_LAST_5{suffix}'] = t_df['TOV_PCT'].tail(5).mean()
            feats[f'ORB_RAW_LAST_5{suffix}'] = t_df['ORB_RAW'].tail(5).mean()
            feats[f'WIN_LAST_5{suffix}'] = t_df['WIN'].tail(5).mean()

        feats['DIFF_EFG'] = feats['EFG_PCT_LAST_5_HOME'] - feats['EFG_PCT_LAST_5_AWAY']
        feats['DIFF_TOV'] = feats['TOV_PCT_LAST_5_HOME'] - feats['TOV_PCT_LAST_5_AWAY']
        feats['DIFF_ORB'] = feats['ORB_RAW_LAST_5_HOME'] - feats['ORB_RAW_LAST_5_AWAY']
        feats['DIFF_WIN'] = feats['WIN_LAST_5_HOME'] - feats['WIN_LAST_5_AWAY']

        # Engine V12 Context
        # Recalculate Rest/B2B based on history
        date_home = home_games.iloc[-1]['GAME_DATE']
        date_away = away_games.iloc[-1]['GAME_DATE']
        
        diff_home = (game_date - date_home).days
        rest_home = max(0, diff_home - 1)
        rest_home = min(7, rest_home)
        
        diff_away = (game_date - date_away).days
        rest_away = max(0, diff_away - 1)
        rest_away = min(7, rest_away)

        feats['REST_DAYS_HOME'] = rest_home
        feats['REST_DAYS_AWAY'] = rest_away
        feats['DIFF_REST'] = rest_home - rest_away
        feats['IS_B2B_HOME_INT'] = 1 if rest_home == 0 else 0
        feats['IS_B2B_AWAY_INT'] = 1 if rest_away == 0 else 0

        # Form
        feats['LAST10_WINS_HOME'] = home_games['WIN'].tail(10).sum()
        feats['LAST10_WINS_AWAY'] = away_games['WIN'].tail(10).sum()
        feats['DIFF_LAST10'] = feats['LAST10_WINS_HOME'] - feats['LAST10_WINS_AWAY']

        # Streak
        def get_current_streak(df):
            wins = df['WIN'].values
            if len(wins) == 0: return 0
            last_res = wins[-1]
            streak = 0
            for i in range(len(wins)-1, -1, -1):
                if wins[i] == last_res: streak += 1
                else: break
            return streak if last_res == 1 else -streak

        feats['STREAK_CURRENT_HOME'] = get_current_streak(home_games)
        feats['STREAK_CURRENT_AWAY'] = get_current_streak(away_games)
        feats['DIFF_STREAK'] = feats['STREAK_CURRENT_HOME'] - feats['STREAK_CURRENT_AWAY']

        # Specific Win Rate
        if 'MATCHUP' in home_games.columns:
            start_season = game_date - timedelta(days=90) # Look back 3 months approx for season
            # Simple approximation: just take all history loaded (which is usually this season)
            # Better: Filter by season? assuming df_games is current season.
            
            home_at_home = home_games[home_games['MATCHUP'].str.contains('vs.')]
            rate_home = home_at_home['WIN'].mean() if len(home_at_home) > 0 else 0.5
            
            away_at_away = away_games[~away_games['MATCHUP'].str.contains('vs.')]
            rate_away = away_at_away['WIN'].mean() if len(away_at_away) > 0 else 0.5
            
            feats['WIN_RATE_SPECIFIC_HOME'] = rate_home
            feats['WIN_RATE_SPECIFIC_AWAY'] = rate_away
            feats['DIFF_SPECIFIC_WIN_RATE'] = rate_home - rate_away
        else:
             # Fallback if matchup col missing
            feats['WIN_RATE_SPECIFIC_HOME'] = 0.5
            feats['WIN_RATE_SPECIFIC_AWAY'] = 0.5
            feats['DIFF_SPECIFIC_WIN_RATE'] = 0

        # V13 Injury Proxies
        for t_type, t_df, suffix in [('HOME', home_games, '_HOME'), ('AWAY', away_games, '_AWAY')]:
            efg3 = t_df['EFG_PCT'].tail(3).mean()
            efg10 = t_df['EFG_PCT'].tail(10).mean()
            feats[f'EFF_SHOCK{suffix}'] = (efg3 - efg10) * 100
            
            if 'PLUS_MINUS' in t_df.columns:
                feats[f'VOLATILITY{suffix}'] = t_df['PLUS_MINUS'].tail(10).std()
            else:
                feats[f'VOLATILITY{suffix}'] = 0
                
        feats['DIFF_EFF_SHOCK'] = feats['EFF_SHOCK_HOME'] - feats['EFF_SHOCK_AWAY']
        feats['DIFF_VOLATILITY'] = feats['VOLATILITY_HOME'] - feats['VOLATILITY_AWAY']
        
        def calc_margin_crash(df, n=3):
            if 'PLUS_MINUS' not in df.columns: return 0
            recent = df['PLUS_MINUS'].tail(n).values
            if len(recent) == 0: return 0
            weights = np.arange(1, len(recent) + 1)
            return np.sum(recent * weights) / np.sum(weights)

        feats['MARGIN_CRASH_HOME'] = calc_margin_crash(home_games)
        feats['MARGIN_CRASH_AWAY'] = calc_margin_crash(away_games)
        feats['DIFF_MARGIN_CRASH'] = feats['MARGIN_CRASH_HOME'] - feats['MARGIN_CRASH_AWAY']

        return feats

    # Name -> ID Map
    team_map = {}
    if 'TEAM_NAME' in df_games.columns and 'TEAM_ID' in df_games.columns:
        teams = df_games[['TEAM_ID', 'TEAM_NAME']].drop_duplicates()
        for _, r in teams.iterrows():
            team_map[r['TEAM_NAME']] = r['TEAM_ID']
            
    # CRITICAL FIX: Manual Mappings
    team_map['Los Angeles Clippers'] = team_map.get('LA Clippers')
    team_map['L.A. Clippers'] = team_map.get('LA Clippers')


    updates_count = 0
    
    # Feature Order for Model
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
        'EFF_SHOCK_HOME', 'EFF_SHOCK_AWAY', 'DIFF_EFF_SHOCK',
        'VOLATILITY_HOME', 'VOLATILITY_AWAY', 'DIFF_VOLATILITY',
        'MARGIN_CRASH_HOME', 'MARGIN_CRASH_AWAY', 'DIFF_MARGIN_CRASH'
    ]

    for index, row in df_hist.iterrows():
        # Check if Explainability data is missing
        if pd.notna(row['AI_Explanation']) and pd.notna(row['Risk_Level']) and str(row['AI_Explanation']).strip() != "":
            continue

        date_str = row['Date']
        try:
            game_date = pd.to_datetime(date_str)
        except: continue
        
        home_name = row['Home']
        away_name = row['Away']
        
        # ID Lookup (Fuzzy fallback)
        h_id = team_map.get(home_name)
        if not h_id:
             for k,v in team_map.items(): 
                 if home_name in k or k in home_name: 
                     h_id = v
                     break
        
        a_id = team_map.get(away_name)
        if not a_id:
             for k,v in team_map.items(): 
                 if away_name in k or k in away_name: 
                     a_id = v
                     break
                     
        if not h_id or not a_id:
            print(f"⚠️ IDs missing for {home_name} or {away_name}, skipping.")
            continue
            
        print(f"🔧 Regenerating AI Data for {date_str}: {home_name} vs {away_name}")
        
        feats = get_features(h_id, a_id, game_date)
        if not feats:
            continue
            
        # Predict using Model to get Probability (needed for Explainability)
        try:
            input_df = pd.DataFrame([feats])[feature_order]
            probs = model.predict_proba(input_df)[0]
            prob_home = probs[1]
            
            # Generate Explanation
            ux_data = explainability.get_explanation_and_risk(feats, prob_home, home_name, away_name)
            
            df_hist.at[index, 'AI_Explanation'] = ux_data['explanation']
            df_hist.at[index, 'Risk_Level'] = ux_data['risk_level']
            df_hist.at[index, 'Badges'] = "|".join(ux_data['badges'])
            
            updates_count += 1
            
        except Exception as e:
            print(f"Error predicting: {e}")

    if updates_count > 0:
        df_hist.to_csv(HISTORY_FILE, index=False)
        print(f"✅ Regenerated AI data for {updates_count} rows. Saved to {HISTORY_FILE}")
    else:
        print("✅ No rows needed regeneration.")

if __name__ == "__main__":
    recover_explanations()
