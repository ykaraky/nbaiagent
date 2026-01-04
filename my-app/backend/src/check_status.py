import sys
import os
from datetime import datetime, timedelta
from nba_api.stats.endpoints import leaguegamefinder
import pandas as pd

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..")

def check_nba_status():
    yesterday = datetime.now() - timedelta(days=1)
    date_str = yesterday.strftime('%m/%d/%Y')
    date_disp = yesterday.strftime('%d.%m.%Y')
    
    print(f"--- CONTROLE DES MATCHS DU {date_disp} ---")

    try:
        gamefinder = leaguegamefinder.LeagueGameFinder(
            date_from_nullable=date_str,
            date_to_nullable=date_str,
            league_id_nullable='00'
        )
        games = gamefinder.get_data_frames()[0]

        if games.empty:
            print(f"[INFO] Aucun match trouvé pour le {date_disp}.")
            return True

        unique_games = games.drop_duplicates(subset=['GAME_ID'])
        total_games = len(unique_games)
        finished_games = 0
        
        for _, game in unique_games.iterrows():
            wl = game['WL']
            if wl in ['W', 'L']:
                finished_games += 1

        if finished_games >= total_games and total_games > 0:
            print(f"[OK] Tous les matchs ({finished_games}/{total_games}) sont terminés.")
            return True
        else:
            print(f"[WAIT] {finished_games}/{total_games} matchs terminés. On attend encore...")
            return False

    except Exception as e:
        print(f"[ERREUR] API inaccessible : {e}")
        return False

if __name__ == "__main__":
    success = check_nba_status()
    # On quitte avec 0 si tout est fini, 1 sinon pour que nba_master.py comprenne
    sys.exit(0 if success else 1)
