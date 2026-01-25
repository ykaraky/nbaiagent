
import pandas as pd
import os
from datetime import datetime, timedelta

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', 'data')
HISTORY_FILE = os.path.join(DATA_DIR, 'bets_history.csv')
GAMES_FILE = os.path.join(DATA_DIR, 'nba_games_ready.csv')

def recover_rest_days():
    print("--- RECOVERY: REST DAYS BACKFILL ---")
    
    if not os.path.exists(HISTORY_FILE) or not os.path.exists(GAMES_FILE):
        print("❌ Critical files missing.")
        return

    # Load Data
    df_hist = pd.read_csv(HISTORY_FILE)
    df_games = pd.read_csv(GAMES_FILE)
    
    # Preprocess Games for Lookup
    df_games['GAME_DATE'] = pd.to_datetime(df_games['GAME_DATE'])
    # Mapping Name -> ID (simplified, assuming names match roughly or we use ID if available)
    # Issue: bets_history has Team Names, nba_games_ready has IDs.
    # We need a name to ID map.
    # We can perform a quick extraction from games file itself if it contains team names
    # Let's check columns: 'TEAM_ID', 'TEAM_NAME' usually exist
    
    # Create Name -> ID Map
    team_map = {}
    if 'TEAM_NAME' in df_games.columns and 'TEAM_ID' in df_games.columns:
        teams = df_games[['TEAM_ID', 'TEAM_NAME']].drop_duplicates()
        for _, r in teams.iterrows():
            team_map[r['TEAM_NAME']] = r['TEAM_ID']
            
    # CRITICAL FIX: Manual Mappings for inconsistencies
    team_map['Los Angeles Clippers'] = team_map.get('LA Clippers') # Map full name to ID of short name
    team_map['L.A. Clippers'] = team_map.get('LA Clippers')

            
    # Also need "City Name" vs "Full Name" handling if mismatches exist (e.g. "Lakers" vs "Los Angeles Lakers")
    # In predict_today.py we see `nba_api` uses full names. 
    # bets_history usually has Full Names like "Los Angeles Lakers".
    
    updates_count = 0
    
    for index, row in df_hist.iterrows():
        # Check if Rest data is missing
        if pd.notna(row['Home_Rest']) and pd.notna(row['Away_Rest']):
            continue

        date_str = row['Date']
        home_name = row['Home']
        away_name = row['Away']
        
        try:
            match_date = pd.to_datetime(date_str)
        except:
            continue
            
        print(f"🔧 Fixing {date_str}: {home_name} vs {away_name}...")
        
        # Helper to find last game date
        def get_rest_days(team_name, current_date):
            # Try exact match first
            t_id = team_map.get(team_name)
            
            # Fuzzy match fallback if needed (e.g. "L.A. Lakers")
            if not t_id:
                # Try simple fuzzy
                for k, v in team_map.items():
                    if team_name in k or k in team_name:
                        t_id = v
                        break
            
            if not t_id:
                print(f"   ⚠️ Team ID not found for {team_name}")
                return None
                
            # Filter games for this team BEFORE current match date
            team_games = df_games[
                (df_games['TEAM_ID'] == t_id) & 
                (df_games['GAME_DATE'] < current_date)
            ].sort_values('GAME_DATE')
            
            if team_games.empty:
                return 4 # Default long rest if no history
                
            last_date = team_games.iloc[-1]['GAME_DATE']
            diff = (current_date - last_date).days
            rest = max(0, diff - 1)
            return min(7, rest) # Cap at 7

        h_rest = get_rest_days(home_name, match_date)
        a_rest = get_rest_days(away_name, match_date)
        
        if h_rest is not None:
            df_hist.at[index, 'Home_Rest'] = h_rest
            df_hist.at[index, 'Home_B2B'] = "TRUE" if h_rest == 0 else "FALSE"
            
        if a_rest is not None:
            df_hist.at[index, 'Away_Rest'] = a_rest
            df_hist.at[index, 'Away_B2B'] = "TRUE" if a_rest == 0 else "FALSE"
            
        updates_count += 1

    if updates_count > 0:
        df_hist.to_csv(HISTORY_FILE, index=False)
        print(f"✅ Fixed {updates_count} rows. Saved to {HISTORY_FILE}")
    else:
        print("✅ No rows needed fixing.")

if __name__ == "__main__":
    recover_rest_days()
