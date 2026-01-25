
import os
import requests
import json
import pandas as pd
from nba_api.stats.endpoints import commonallplayers
from dotenv import load_dotenv

# Setup Environment
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..") # To my-app/backend

# Load Env
env_path = ".env"
if not os.path.exists(env_path):
    # Try finding it in frontend
    fe_env = os.path.join("..", "frontend", ".env.local")
    if os.path.exists(fe_env):
        env_path = fe_env

load_dotenv(dotenv_path=env_path)

URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") # Prefer Service Role for Write

if not URL or not KEY:
    print("❌ Error: Missing Supabase credentials.")
    exit()

# Supabase REST Headers
Headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates" # Upsert behavior
}

ENDPOINT = f"{URL}/rest/v1/players"

def sync_players():
    print("🏀 Syncing Active Players (2025-26) using REST API...")
    
    # 1. Fetch from NBA API
    try:
        # IsOnlyCurrentSeason=1 implies active players
        print("   -> Fetching from NBA API...")
        players_data = commonallplayers.CommonAllPlayers(is_only_current_season=1, season='2025-26').get_data_frames()[0]
        print(f"✅ Fetched {len(players_data)} players from NBA API.")
    except Exception as e:
        print(f"❌ API Error: {e}")
        return

    # 2. Prepare Data
    records = []
    for _, row in players_data.iterrows():
        record = {
            "id": int(row['PERSON_ID']),
            "full_name": row['DISPLAY_FIRST_LAST'],
            "team_id": int(row['TEAM_ID']) if row['TEAM_ID'] else None,
            "position": None, 
            "is_active": True,
            "season": "2025-26"
        }
        records.append(record)
        
    # 3. Upsert to Supabase via REST
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

    print("✅ Sync Players Completed.")

if __name__ == "__main__":
    sync_players()
