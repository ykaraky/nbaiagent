import sys
import os
from datetime import datetime, timedelta
from nba_api.stats.endpoints import leaguegamefinder
import pandas as pd

# Ce script est destiné à tourner sur GitHub Actions.
# Il vérifie si les matchs de la veille sont TOUS terminés.
# Exit 0 = Succès (Tous finis ou Pas de match)
# Exit 1 = Échec (Matchs en cours ou API down)

def check_nba_status_cloud():
    # Par défaut: Check Hier
    yesterday_date = datetime.now() - timedelta(days=1)
    
    # OVERRIDE possible via variable d'env (utile pour tests manuels)
    if os.getenv("CHECK_DATE"):
        try:
            yesterday_date = datetime.strptime(os.getenv("CHECK_DATE"), "%Y-%m-%d")
        except:
            pass

    date_str = yesterday_date.strftime('%m/%d/%Y')  # Format API (MM/DD/YYYY)
    date_disp = yesterday_date.strftime('%Y-%m-%d') # Format Affichage
    
    print(f"🌍 [CLOUD CHECK] Analyse des matchs du {date_disp}...")

    try:
        # Appel API NBA
        gamefinder = leaguegamefinder.LeagueGameFinder(
            date_from_nullable=date_str,
            date_to_nullable=date_str,
            league_id_nullable='00', # NBA
            timeout=30
        )
        games_df = gamefinder.get_data_frames()[0]

        if games_df.empty:
            print(f"ℹ️ Aucun match trouvé pour cette date. (Rien à faire)")
            return True

        # Filtrage et Deduplication (GameID unique)
        unique_games = games_df.drop_duplicates(subset=['GAME_ID'])
        total_games = len(unique_games)
        
        # Vérification du statut (WL = 'W' ou 'L' signifie match validé/terminé)
        # Note: Un match en cours a souvent WL = null ou None
        finished_games = 0
        games_pending = []
        
        for _, game in unique_games.iterrows():
            matchup = game['MATCHUP']
            wl = game['WL']
            if wl in ['W', 'L']:
                finished_games += 1
            else:
                games_pending.append(matchup)

        print(f"📊 Rapport : {finished_games}/{total_games} matchs terminés.")

        if finished_games >= total_games:
            print("✅ TOUS LES MATCHS SONT TERMINÉS.")
            print("🚀 La routine peut être lancée !")
            return True
        else:
            print(f"⏳ EN ATTENTE : {len(games_pending)} matchs encore en cours ou non-validés.")
            for g in games_pending:
                print(f"   -> {g}")
            return False

    except Exception as e:
        print(f"❌ Erreur API ou Script : {e}")
        return False

if __name__ == "__main__":
    success = check_nba_status_cloud()
    if success:
        sys.exit(0) # Succès (Vert sur GitHub)
    else:
        sys.exit(1) # Échec (Rouge sur GitHub)
