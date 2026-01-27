import os
import requests
from dotenv import load_dotenv

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..") # Retour a backend/

env_path = ".env"
if not os.path.exists(env_path):
    potential_path = os.path.join("..", "frontend", ".env.local")
    if os.path.exists(potential_path):
        env_path = potential_path

load_dotenv(dotenv_path=env_path)

URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
# Use ANON key for read, it should be enough if RLS allows public read (which we set)
KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not URL or not KEY:
    print("❌ KEYS MISSING")
    exit()

Headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json"
}

# 1. Fetch from team_intelligence to get the OFFICIAL team_name
ENDPOINT_TI = f"{URL}/rest/v1/team_intelligence?select=team_name&team_id=eq.1610612745" # HOU
print("Fetching Team Intelligence Name for ID 1610612745 (Houston)...")
r = requests.get(ENDPOINT_TI, headers=Headers)
print(r.text)
official_name = r.json()[0]['team_name'] if r.status_code == 200 and len(r.json()) > 0 else "Unknown"
print(f"OFFICIAL NAME: '{official_name}'")

# 2. Fetch from bets_history (Search for anything looking like Houston)
ENDPOINT_BH = f"{URL}/rest/v1/bets_history?select=home_team,away_team,user_prediction&limit=10&or=(home_team.ilike.*Houston*,away_team.ilike.*Houston*)"
print("\nFetching Bets History matches for *Houston*...")
r2 = requests.get(ENDPOINT_BH, headers=Headers)
print(r2.text)
