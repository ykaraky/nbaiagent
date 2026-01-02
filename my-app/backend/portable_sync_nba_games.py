
import os
import pandas as pd
import requests
import json
import time
from dotenv import load_dotenv

# 1. CONFIG
load_dotenv() 

# Try Next.js style first, then Python/Streamlit style
URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY")

if not URL or not KEY:
    print("❌ ERREUR: Variables d'environnement manquantes.")
    print("   Attendu: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY  ou  SUPABASE_URL / SUPABASE_KEY")
    exit(1)

Headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

# 2. SOURCE
# On cherche le fichier dans plusieurs endroits possibles
def find_csv_path():
    # 1. Sous-dossier data/ (Standard V0)
    in_data = os.path.join(os.getcwd(), "data", "nba_games.csv")
    if os.path.exists(in_data): return in_data

    # 2. Racine (Cas simple)
    in_root = os.path.join(os.getcwd(), "nba_games.csv")
    if os.path.exists(in_root): return in_root

    # 3. Fallback dev local (_v0_...)
    in_dev = os.path.join(os.getcwd(), "_v0_nba_games.csv")
    if os.path.exists(in_dev): return in_dev
    
    return None

ENDPOINT = f"{URL}/rest/v1/nba_games"

def sync_games():
    csv_path = find_csv_path()
    if not csv_path:
        print(f"⚠️ Fichier 'nba_games.csv' introuvable (Cherché dans data/ et racine).")
        return

    print(f"📖 Lecture du fichier de stats: {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"❌ Erreur lecture CSV: {e}")
        return

    if df.empty:
        print("⚠️ CSV vide.")
        return

    # Nettoyage et Aggregation par GAME_ID
    # Le fichier contient 2 lignes par match (Home / Away)
    # Nous devons les fusionner en 1 seule ligne DB
    
    print("⚙️ Traitement et fusion des données (Home/Away)...")
    
    games_map = {}
    
    for _, row in df.iterrows():
        game_id = str(row['GAME_ID'])
        if game_id.startswith('2'): # ID sometimes treated as int, ensure format '002...' if needed or just use str
             game_id = f"00{game_id}" if len(game_id) < 10 else game_id

        if game_id not in games_map:
            games_map[game_id] = {}
        
        # Identification Home/Away
        matchup = str(row['MATCHUP']) # ex: "PHX @ NYK" or "CLE vs. CHI"
        is_home_row = "vs." in matchup
        
        # Stats Object
        stats = {
            "pts": int(row['PTS']) if pd.notna(row['PTS']) else 0,
            "fg_pct": float(row['FG_PCT']) if pd.notna(row['FG_PCT']) else 0.0,
            "fg3_pct": float(row['FG3_PCT']) if pd.notna(row['FG3_PCT']) else 0.0,
            "ft_pct": float(row['FT_PCT']) if pd.notna(row['FT_PCT']) else 0.0,
            "reb": int(row['REB']) if pd.notna(row['REB']) else 0,
            "ast": int(row['AST']) if pd.notna(row['AST']) else 0,
            "tov": int(row['TOV']) if pd.notna(row['TOV']) else 0,
            "stl": int(row['STL']) if pd.notna(row['STL']) else 0,
            "blk": int(row['BLK']) if pd.notna(row['BLK']) else 0,
            "plus_minus": float(row['PLUS_MINUS']) if pd.notna(row['PLUS_MINUS']) else 0.0,
            "wl": row['WL']
        }
        
        team_abbr = row['TEAM_ABBREVIATION']
        
        # Populate Game Record
        # Base info should be same for both rows (Date, ID)
        if 'game_date' not in games_map[game_id]:
            games_map[game_id]['game_date'] = pd.to_datetime(row['GAME_DATE']).strftime('%Y-%m-%d')
            games_map[game_id]['id'] = game_id
            games_map[game_id]['status'] = 'Final' if pd.notna(row['WL']) else 'Scheduled'

        if is_home_row:
            games_map[game_id]['home_team'] = team_abbr
            games_map[game_id]['home_score'] = stats['pts']
            games_map[game_id]['home_stats'] = stats
        else:
            games_map[game_id]['away_team'] = team_abbr
            games_map[game_id]['away_score'] = stats['pts']
            games_map[game_id]['away_stats'] = stats

    # Preparation Payload Supabase
    records_to_upsert = []
    
    for gid, gdata in games_map.items():
        # Validation: On a besoin des deux équipes pour une ligne valide
        if 'home_team' in gdata and 'away_team' in gdata:
            records_to_upsert.append(gdata)
            
    if not records_to_upsert:
        print("⚠️ Aucune donnée match complète trouvée.")
        return

    print(f"🚀 Synchronisation de {len(records_to_upsert)} matchs officiels...")
    
    # Batch Upload
    batch_size = 500
    total = len(records_to_upsert)
    
    for i in range(0, total, batch_size):
        batch = records_to_upsert[i:i+batch_size]
        try:
            r = requests.post(ENDPOINT, headers=Headers, data=json.dumps(batch))
            if r.status_code in [200, 201, 204]:
                print(f"   Matches {i} à {min(i+batch_size, total)} : ✅ Succès")
            else:
                print(f"   Matches {i}: ⚠️ Erreur {r.status_code} - {r.text[:100]}")
        except Exception as e:
            print(f"❌ Erreur réseau: {e}")

    print("✅ Terminé.")

if __name__ == "__main__":
    sync_games()
