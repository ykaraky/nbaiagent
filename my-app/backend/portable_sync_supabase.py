import os
import pandas as pd
import requests
import json
from dotenv import load_dotenv

# 1. CONFIGURATION
# Charge les variables depuis un fichier .env situé dans le MÊME dossier que ce script
load_dotenv()

# Récupération des clés
URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
# Note: Dans un script backend pur, on peut utiliser la clé publique (ANON) si les règles RLS le permettent,
# ou la clé SERVICE_ROLE (plus puissant, contourne les règles) si besoin.
KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# Si les variables ne sont pas trouvées dans le .env, on peut les hardcoder ici en dernier recours pour tester :
# URL = "https://votre-projet.supabase.co"
# KEY = "votre-clé-publique"

if not URL or not KEY:
    print("❌ ERREUR: NEXT_PUBLIC_SUPABASE_URL ou KEY manquant.")
    print("👉 Assurez-vous d'avoir un fichier .env dans ce dossier avec ces variables.")
    exit(1)

# Supabase REST API Config
Headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates" # Upsert behavior
}

# 2. CHEMINS
# Ajustez le nom de votre fichier CSV s'il est différent dans votre dossier V0
CSV_FILENAME = "bets_history.csv" 
# Si le CSV est dans un sous-dossier (ex: data/), changez ci-dessous :
CSV_PATH = os.path.join(os.getcwd(), CSV_FILENAME)

ENDPOINT = f"{URL}/rest/v1/bets_history"

def get_existing_map():
    """Récupère les ID existants pour éviter les doublons."""
    print("🔄 Chargement de la base de données distante...")
    params = {
        "select": "id,game_date,home_team",
        "limit": "5000" 
    }
    try:
        r = requests.get(ENDPOINT, headers=Headers, params=params)
        r.raise_for_status()
        data = r.json()
        
        mapping = {}
        for row in data:
            key = f"{row['game_date']}|{row['home_team']}"
            mapping[key] = row['id']
            
        print(f"✅ {len(mapping)} matchs existants trouvés.")
        return mapping
    except Exception as e:
        print(f"❌ Erreur connexion Supabase: {e}")
        return {}

def sync_csv_to_supabase():
    if not os.path.exists(CSV_PATH):
        print(f"⚠️ Fichier introuvable : {CSV_PATH}")
        return

    print(f"📖 Lecture de {CSV_FILENAME}...")
    try:
        df = pd.read_csv(CSV_PATH)
    except Exception as e:
        print(f"❌ Erreur lecture CSV: {e}")
        return
    
    if df.empty:
        print("⚠️ CSV vide.")
        return

    id_map = get_existing_map()
    records_to_upsert = []
    
    print("⚙️ Préparation des données...")
    for index, row in df.iterrows():
        # Nettoyage
        row = row.where(pd.notnull(row), None)
        
        try:
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
        
        # Mapping ID pour update
        key = f"{date_val}|{home}"
        if key in id_map:
            record['id'] = id_map[key]
            
        records_to_upsert.append(record)

    if not records_to_upsert:
        print("⚠️ Rien à envoyer.")
        return

    print(f"🚀 Envoi de {len(records_to_upsert)} matchs vers le Cloud...")
    
    try:
        r = requests.post(ENDPOINT, headers=Headers, data=json.dumps(records_to_upsert))
        if r.status_code in [200, 201, 204]:
             print(f"✅ SUCCÈS ! Cloud mis à jour.")
        else:
             print(f"⚠️ Erreur API: {r.status_code} - {r.text[:200]}")
             
    except Exception as e:
        print(f"❌ Erreur réseau: {e}")

if __name__ == "__main__":
    sync_csv_to_supabase()
