import pandas as pd
from nba_api.stats.endpoints import leaguegamefinder
import os
import sys

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..")

# --- CONFIGURATION MIROIR (V0) ---
V0_DATA_PATH = "../../NBA_Agent/data/"

# --- CHEMINS ---
DATA_DIR = "data"
FILE_PATH = os.path.join(DATA_DIR, "nba_games.csv")

def get_nba_data():
    print("--- Recuperation des donnees NBA ---")
    
    # Création dossier data si inexistant
    if not os.path.exists(DATA_DIR): os.makedirs(DATA_DIR)

    try:
        gamefinder = leaguegamefinder.LeagueGameFinder(league_id_nullable='00', season_type_nullable='Regular Season', timeout=60)
        games = gamefinder.get_data_frames()[0]
        games['GAME_DATE'] = pd.to_datetime(games['GAME_DATE'])
        games = games[games['GAME_DATE'] > '2023-01-01'].sort_values('GAME_DATE')
        
        print(f"Succes ! {len(games)} matchs.")
        
        # SAUVEGARDE LOCAL (Next.js)
        games.to_csv(FILE_PATH, index=False)
        print(f"Sauvegarde dans {FILE_PATH}")

        # SAUVEGARDE MIROIR (V0)
        if os.path.exists(V0_DATA_PATH):
            mirror_file = os.path.join(V0_DATA_PATH, "nba_games.csv")
            games.to_csv(mirror_file, index=False)
            print(f"✅ Miroir V0 mis à jour : {mirror_file}")
            
    except Exception as e:
        print(f"[ERREUR] {e}")
        exit(1)

if __name__ == "__main__":
    get_nba_data()
