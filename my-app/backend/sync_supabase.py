
import os
import pandas as pd
import requests
import json
from dotenv import load_dotenv

# Load env variables from frontend (avoid duplication)
env_path = os.path.join(os.path.dirname(__file__), '../frontend/.env.local')
load_dotenv(env_path)

URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not URL or not KEY:
    print("❌ ERREUR: NEXT_PUBLIC_SUPABASE_URL ou KEY manquant dans les variables d'environnement.")
    exit(1)

import os
import pandas as pd
import requests
import json
from dotenv import load_dotenv

# Load env variables from frontend (avoid duplication)
env_path = os.path.join(os.path.dirname(__file__), '../frontend/.env.local')
load_dotenv(env_path)

URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not URL or not KEY:
    print("❌ ERREUR: NEXT_PUBLIC_SUPABASE_URL ou KEY manquant dans les variables d'environnement.")
    exit(1)

# Supabase REST API Config
Headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates" # Important for Upsert with ID
}

CSV_PATH = "bets_history.csv"
ENDPOINT = f"{URL}/rest/v1/bets_history"

def get_existing_map():
    """Fetches all existing matches to map (date, home_team) -> id"""
    print("🔄 Chargement de la base de données existante...")
    # Fetch needed columns only to be light
    # Assuming less than 10000 rows. If more, pagination needed.
    # Default limit is usually 1000. Let's ask for more just in case.
    params = {
        "select": "id,game_date,home_team",
        "limit": "5000" 
    }
    
    try:
        r = requests.get(ENDPOINT, headers=Headers, params=params)
        r.raise_for_status()
        data = r.json()
        
        # Build map: Key = "YYYY-MM-DD|HomeTeam" -> Value = ID
        mapping = {}
        for row in data:
            key = f"{row['game_date']}|{row['home_team']}"
            mapping[key] = row['id']
            
        print(f"✅ {len(mapping)} matchs existants chargés en mémoire.")
        return mapping
    except Exception as e:
        print(f"❌ Erreur récupération données: {e}")
        return {}

def sync_csv_to_supabase():
    if not os.path.exists(CSV_PATH):
        print(f"⚠️ Fichier {CSV_PATH} introuvable ici: {os.getcwd()}")
        return

    print(f"📖 Lecture de {CSV_PATH}...")
    try:
        df = pd.read_csv(CSV_PATH)
    except Exception as e:
        print(f"❌ Erreur lecture CSV: {e}")
        return
    
    if df.empty:
        print("⚠️ CSV vide.")
        return

    # 1. Get Existing IDs (1 Request)
    id_map = get_existing_map()
    
    # 2. Prepare Payload
    records_to_upsert = []
    
    for index, row in df.iterrows():
        # Clean Row
        row = row.where(pd.notnull(row), None)
        
        try:
            # Normalize Date
            date_val = pd.to_datetime(row['Date']).strftime('%Y-%m-%d')
        except:
            continue
            
        home = row['Home']
        if not home or not date_val:
            continue

        record = {
            "game_date": date_val,
            "home_team": home,
            "away_team": row['Away'],
            "predicted_winner": row['Predicted_Winner'],
            "confidence": str(row['Confidence']) if row['Confidence'] else None,
            "real_winner": row['Real_Winner'],
            "user_prediction": row['User_Prediction'],
            "user_reason": row['User_Reason']
        }
        
        # Check if exists to attach ID (enables update)
        key = f"{date_val}|{home}"
        if key in id_map:
            record['id'] = id_map[key] # This forces UPDATE instead of INSERT/Duplicate
            
        records_to_upsert.append(record)

    if not records_to_upsert:
        print("⚠️ Aucun enregistrement valide.")
        return

    print(f"🚀 Envoi groupé de {len(records_to_upsert)} matchs...")
    
    # 3. Bulk Upsert (1 Request)
    # Supabase handles bulk upsert gracefully
    try:
        r = requests.post(ENDPOINT, headers=Headers, data=json.dumps(records_to_upsert))
        
        if r.status_code in [200, 201, 204]:
             print(f"✅ SUCCÈS TOTAL ! {len(records_to_upsert)} matchs synchronisés.")
        else:
             print(f"⚠️ Erreur lors de l'envoi: {r.status_code}")
             print(r.text[:500]) # First 500 chars of error
             
    except Exception as e:
        print(f"❌ Erreur réseau: {e}")

if __name__ == "__main__":
    sync_csv_to_supabase()
