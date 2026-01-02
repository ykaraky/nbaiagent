import sys
from datetime import datetime, timedelta
from nba_api.stats.endpoints import leaguegamefinder
import pandas as pd

def check_nba_status():
    # 1. Date cible : Hier
    yesterday = datetime.now() - timedelta(days=1)
    date_str = yesterday.strftime('%m/%d/%Y') # Format requis par GameFinder (MM/DD/YYYY)
    date_disp = yesterday.strftime('%d.%m.%Y')
    
    print(f"--- CONTROLE ROBUSTE DU {date_disp} ---")
    print("Connexion API (LeagueGameFinder)...")

    try:
        # 2. Recherche des matchs joués à cette date précise
        # C'est la même méthode que ton script de mise à jour, donc 100% aligné.
        gamefinder = leaguegamefinder.LeagueGameFinder(
            date_from_nullable=date_str,
            date_to_nullable=date_str,
            league_id_nullable='00' # 00 = NBA
        )
        games = gamefinder.get_data_frames()[0]

        if games.empty:
            print(f"[INFO] Aucun match trouvé pour le {date_disp}.")
            print(">> FEU VERT (Rien à faire).")
            return

        # On a souvent 2 lignes par match (Home et Away), on dédoublonne par GAME_ID
        unique_games = games.drop_duplicates(subset=['GAME_ID'])
        total_games = len(unique_games)
        finished_games = 0
        
        print(f"\n{total_games} matchs détectés :")
        print("-" * 40)

        for _, game in unique_games.iterrows():
            match_str = game['MATCHUP']
            pts = game['PTS']
            wl = game['WL'] # W ou L (indique que le match est fini)
            
            # Si on a des points ET un résultat (W/L), c'est fini
            is_finished = (pts > 0) and (wl in ['W', 'L'])
            
            status_icon = "[OK]" if is_finished else "[ATTENTE]"
            status_txt = f"{int(pts)} pts ({wl})" if is_finished else "En cours..."
            
            print(f"{status_icon} {match_str} : {status_txt}")
            
            if is_finished:
                finished_games += 1

        print("-" * 40)

        # 4. Verdict
        if finished_games >= total_games and total_games > 0:
            print("\n>>> FEU VERT : TOUT EST PRET <<<")
            print("Tu peux lancer GO_NBA.bat")
        elif finished_games == 0:
            print("\n>>> FEU ROUGE : AUCUN RÉSULTAT <<<")
        else:
            print(f"\n>>> FEU ORANGE : {finished_games}/{total_games} terminés <<<")
            print("Certains scores manquent encore.")

    except Exception as e:
        print(f"[ERREUR] API inaccessible : {e}")

if __name__ == "__main__":
    check_nba_status()