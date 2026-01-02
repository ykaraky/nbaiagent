import os
import requests
import json
import time
from dotenv import load_dotenv
from nba_api.stats.endpoints import leaguestandingsv3
from nba_api.stats.static import teams

# 1. CONFIG
# Try loading from local .env or frontend .env.local
env_path = ".env"
if not os.path.exists(env_path):
    # Try sibling frontend folder
    potential_path = os.path.join(os.path.dirname(os.getcwd()), "frontend", ".env.local")
    if os.path.exists(potential_path):
        env_path = potential_path
    else:
        # Try current dir's parent/frontend if running from backend
        potential_path = os.path.join(os.getcwd(), "..", "frontend", ".env.local")
        if os.path.exists(potential_path):
            env_path = potential_path

print(f"🌍 Loading env from: {env_path}")
load_dotenv(dotenv_path=env_path)

URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY")

if not URL or not KEY:
    print("❌ ERREUR: Variables d'environnement manquantes (SUPABASE_URL / KEY).")
    exit(1)

Headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

ENDPOINT = f"{URL}/rest/v1/nba_standings"

def sync_standings():
    print("🏀 Récupération des classements NBA via nba_api...")
    
    # Get full team names mapping
    nba_teams = teams.get_teams()
    team_map = {t['id']: t['full_name'] for t in nba_teams}
    
    try:
        standings = leaguestandingsv3.LeagueStandingsV3()
        df = standings.standings.get_data_frame()
    except Exception as e:
        print(f"❌ Erreur nba_api: {e}")
        return

    if df.empty:
        print("⚠️ Aucune donnée de classement trouvée.")
        return

    records_to_upsert = []
    
    print(f"⚙️ Traitement de {len(df)} équipes...")

    for _, row in df.iterrows():
        team_id = int(row['TeamID'])
        
        # Get FULL team name (e.g., "Oklahoma City Thunder" not "Thunder")
        full_name = team_map.get(team_id, row['TeamName'])
        
        # Parsing Streak
        streak_origin = row['CurrentStreak']
        streak_fmt = str(streak_origin)
        
        if isinstance(streak_origin, (int, float)):
           val = int(streak_origin)
           streak_fmt = f"W{abs(val)}" if val >= 0 else f"L{abs(val)}"
        
        team_data = {
            "team_id": team_id,
            "team_name": full_name,  # NOW USING FULL NAME
            "wins": int(row['WINS']),
            "losses": int(row['LOSSES']),
            "win_pct": float(row['WinPCT']),
            "conference": row['Conference'],
            "rank": int(row['PlayoffRank']),
            "record": row['Record'],
            "streak": streak_fmt
        }
        records_to_upsert.append(team_data)

    print(f"🚀 Envoi de {len(records_to_upsert)} lignes vers Supabase...")
    
    try:
        r = requests.post(ENDPOINT, headers=Headers, data=json.dumps(records_to_upsert))
        if r.status_code in [200, 201, 204]:
            print("✅ Succès !")
        else:
            print(f"⚠️ Erreur {r.status_code} - {r.text}")
    except Exception as e:
        print(f"❌ Erreur réseau: {e}")

if __name__ == "__main__":
    sync_standings()
