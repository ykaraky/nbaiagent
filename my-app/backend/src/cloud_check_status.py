import sys
import os
import io
import time
from datetime import datetime, timedelta
from nba_api.live.nba.endpoints import scoreboard

# Ce script est destiné à tourner sur GitHub Actions.
# Il utilise l'endpoint LIVE de la NBA (CDN) pour éviter les blocages de stats.nba.com

def check_nba_status_cloud():
    print("🌍 [CLOUD CHECK] Vérification via NBA Live API (CDN)...")

    # 1. Récupération du Scoreboard du jour
    # Note: L'endpoint Live renvoie toujours les données "du jour" ou "de la nuit".
    try:
        board = scoreboard.Scoreboard()
        games = board.games.get_dict()
    except Exception as e:
        print(f"❌ Erreur API Live : {e}")
        return False

    if not games:
        print("ℹ️ Aucun match dans le Live Scoreboard.")
        # Si aucun match n'est dans le live board, c'est peut-être qu'il n'y a pas de matchs aujourd'hui
        # ou que la journée est finie depuis longtemps.
        # Dans le doute pour une routine matinale : C'est vert.
        return True

    print(f"📊 {len(games)} matchs trouvés dans le flux live.")

    finished_count = 0
    pending_games = []

    for game in games:
        # Structure Live API:
        # game['gameStatus'] => 1 (Scheduled), 2 (In Progress), 3 (Final)
        # game['gameStatusText'] => "Final", "Q4 2:00", etc.
        
        status_code = game.get('gameStatus', 0)
        status_text = game.get('gameStatusText', 'Unknown')
        
        home = game.get('homeTeam', {}).get('teamTricode', '???')
        away = game.get('awayTeam', {}).get('teamTricode', '???')
        matchup = f"{away} @ {home}"

        if status_code == 3: # 3 = Final
            finished_count += 1
        else:
            pending_games.append(f"{matchup} ({status_text})")

    # Rapport
    total = len(games)
    print(f"📈 Rapport : {finished_count}/{total} matchs terminés.")

    if finished_count == total:
        print("✅ TOUS LES MATCHS SONT TERMINÉS.")
        return True
    else:
        print(f"⏳ EN ATTENTE : {len(pending_games)} matchs encore en cours.")
        for g in pending_games:
            print(f"   -> {g}")
        return False

if __name__ == "__main__":
    if check_nba_status_cloud():
        sys.exit(0)
    else:
        sys.exit(1)
