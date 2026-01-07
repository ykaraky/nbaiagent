
import os
import pandas as pd
import requests
import json
from dotenv import load_dotenv

# Load env variables from frontend (avoid duplication)
env_path = os.path.join(os.path.dirname(__file__), '../../frontend/.env.local')
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

CSV_PATH = "data/bets_history.csv"
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
    
    records_to_insert = []
    records_to_update = []
    
    for index, row in df.iterrows():
        row = row.where(pd.notnull(row), None)
        try:
            date_val = pd.to_datetime(row['Date']).strftime('%Y-%m-%d')
        except: continue
            
        home = row['Home']
        if not home or not date_val: continue

        record = {
            "game_date": date_val,
            "home_team": home,
            "away_team": row['Away'],
            "predicted_winner": row['Predicted_Winner'],
            "confidence": str(row['Confidence']) if row['Confidence'] else None,
            "result_ia": row.get('Result'),  # <--- AJOUTÉ
            "real_winner": row['Real_Winner'],
            "user_prediction": row['User_Prediction'],
            "user_result": row.get('User_Result'),
            "user_reason": row['User_Reason'],
            "user_confidence": int(row['User_Confidence']) if pd.notna(row.get('User_Confidence')) else None
        }
        
        key = f"{date_val}|{home}"
        if key in id_map:
            record['id'] = id_map[key]
            records_to_update.append(record)
        else:
            records_to_insert.append(record)

    # 3. Execution
    success = True
    for batch, name in [(records_to_update, "Mises à jour"), (records_to_insert, "Nouveaux")]:
        if not batch: continue
        print(f"🚀 {name} : Envoi de {len(batch)} matchs...")
        try:
            r = requests.post(ENDPOINT, headers=Headers, data=json.dumps(batch))
            if r.status_code not in [200, 201, 204]:
                 print(f"⚠️ Erreur {name}: {r.status_code} - {r.text[:200]}")
                 success = False
        except Exception as e:
            print(f"❌ Erreur réseau {name}: {e}")
            success = False

    if success:
        print("✅ Synchronisation terminée avec succès.")
    else:
        import sys
        sys.exit(1)

if __name__ == "__main__":
    sync_csv_to_supabase()
