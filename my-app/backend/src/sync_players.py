
import os
import requests
import json
import pandas as pd
from nba_api.stats.endpoints import leaguedashplayerstats, commonallplayers
from dotenv import load_dotenv

# Setup Environment
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..") # To my-app/backend

# Load Env
env_path = ".env"
if not os.path.exists(env_path):
    fe_env = os.path.join("..", "frontend", ".env.local")
    if os.path.exists(fe_env):
        env_path = fe_env

load_dotenv(dotenv_path=env_path)

URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not URL or not KEY:
    print("❌ Error: Missing Supabase credentials.")
    exit()

Headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

ENDPOINT = f"{URL}/rest/v1/players"

def sync_players():
    print("🏀 Syncing Active Players & Stats (2024-25)...")
    
    try:
        # 1. Fetch Season Stats (Base list of active players with stats)
        print("   -> Fetching Season Stats...")
        season_stats = leaguedashplayerstats.LeagueDashPlayerStats(season='2024-25', per_mode_detailed='PerGame').get_data_frames()[0]
        
        # 2. Fetch Last 10 Games Stats
        print("   -> Fetching Last 10 Games Stats...")
        l10_stats = leaguedashplayerstats.LeagueDashPlayerStats(season='2024-25', last_n_games=10, per_mode_detailed='PerGame').get_data_frames()[0]
        
        # 3. Merge
        # Rename L10 columns to avoid collision
        l10_stats = l10_stats[['PLAYER_ID', 'PTS', 'REB', 'AST']]
        l10_stats.columns = ['PLAYER_ID', 'L10_PTS', 'L10_REB', 'L10_AST']
        
        # Merge on PLAYER_ID
        merged = pd.merge(season_stats, l10_stats, on='PLAYER_ID', how='left')
        
        # Handle NaN (players with <10 games might have nulls? No, just less games)
        merged.fillna(0, inplace=True)
        
        print(f"✅ Prepared {len(merged)} players.")

    except Exception as e:
        print(f"❌ API Error: {e}")
        return

    # 4. Prepare Records
    records = []
    for _, row in merged.iterrows():
        record = {
            "id": int(row['PLAYER_ID']),
            "full_name": row['PLAYER_NAME'],
            "team_id": int(row['TEAM_ID']), 
            "position": None, # API doesn't give clean Pos here, fine for MVP
            "is_active": True,
            "season": "2025-26",
            # Stats
            "pts": float(row['PTS']),
            "reb": float(row['REB']),
            "ast": float(row['AST']),
            "l10_pts": float(row['L10_PTS']),
            "l10_reb": float(row['L10_REB']),
            "l10_ast": float(row['L10_AST'])
        }
        records.append(record)
        
    # 5. Upsert
    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        try:
            r = requests.post(ENDPOINT, headers=Headers, data=json.dumps(batch))
            if r.status_code in [200, 201, 204]:
                print(f"   -> Upserted batch {i}-{i+len(batch)}")
            else:
                print(f"❌ Error {r.status_code}: {r.text}")
        except Exception as e:
            print(f"❌ Upsert Error: {e}")

    print("✅ Sync Players & Stats Completed.")

if __name__ == "__main__":
    sync_players()
