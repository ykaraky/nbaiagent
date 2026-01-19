import sys
import os
import time
from datetime import datetime, timedelta
from nba_api.stats.endpoints import leaguegamefinder
import pandas as pd

# CONFIG
MAX_RETRIES = 3
TIMEOUT = 60
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.nba.com/'
}

def check_nba_status_cloud():
    # Par défaut: Check Hier
    yesterday_date = datetime.now() - timedelta(days=1)
    
    # OVERRIDE possible via variable d'env
    if os.getenv("CHECK_DATE"):
        try:
            yesterday_date = datetime.strptime(os.getenv("CHECK_DATE"), "%Y-%m-%d")
        except:
            pass

    date_str = yesterday_date.strftime('%m/%d/%Y')  # Format API (MM/DD/YYYY)
    date_disp = yesterday_date.strftime('%Y-%m-%d') # Format Affichage
    
    print(f"🌍 [CLOUD CHECK] Analyse des matchs du {date_disp}...")

    attempts = 0
    success = False
    games_df = pd.DataFrame()

    while attempts < MAX_RETRIES:
        try:
            print(f"   📡 Tentative {attempts + 1}/{MAX_RETRIES}...")
            # Appel API NBA avec Timeout augmenté
            gamefinder = leaguegamefinder.LeagueGameFinder(
                date_from_nullable=date_str,
                date_to_nullable=date_str,
                league_id_nullable='00', # NBA
                timeout=TIMEOUT,
                headers=HEADERS
            )
            games_df = gamefinder.get_data_frames()[0]
            success = True
            break
        except Exception as e:
            print(f"   ⚠️ Erreur: {e}")
            attempts += 1
            time.sleep(5) # Attente avant retry

    if not success:
        print("❌ ECHEC CRITIQUE: Impossible de joindre l'API NBA après plusieurs tentatives.")
        return False

    if games_df.empty:
        print(f"ℹ️ Aucun match trouvé pour cette date. (Rien à faire)")
        return True

    # Filtrage et Deduplication (GameID unique)
    unique_games = games_df.drop_duplicates(subset=['GAME_ID'])
    total_games = len(unique_games)
    
    # Vérification du statut
    finished_games = 0
    games_pending = []
    
    for _, game in unique_games.iterrows():
        wl = game['WL']
        if wl in ['W', 'L']:
            finished_games += 1
        else:
            games_pending.append(game['MATCHUP'])

    print(f"📊 Rapport : {finished_games}/{total_games} matchs terminés.")

    if finished_games >= total_games:
        print("✅ TOUS LES MATCHS SONT TERMINÉS.")
        return True
    else:
        print(f"⏳ EN ATTENTE : {len(games_pending)} matchs encore en cours.")
        for g in games_pending:
            print(f"   -> {g}")
        return False

if __name__ == "__main__":
    if check_nba_status_cloud():
        sys.exit(0)
    else:
        sys.exit(1)
