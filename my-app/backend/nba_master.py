import subprocess
import sys
import time
import os
from datetime import datetime

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def check_games_finished():
    """Vérifie si les matchs d'hier sont terminés via l'API NBA"""
    print("\n🔍 Vérification de l'état des matchs...")
    try:
        my_env = os.environ.copy()
        my_env["PYTHONIOENCODING"] = "utf-8"
        
        # On lance check_status.py qui quitte avec 0 si fini, 1 sinon
        result = subprocess.run([sys.executable, "src/check_status.py"], 
                              capture_output=True, text=True, timeout=30, 
                              encoding='utf-8', env=my_env)
        
        if result.returncode == 0:
            print("✅ Tous les matchs d'hier sont terminés !")
            return True
        else:
            # En cas de doute, on affiche quand même ce que le script a dit
            if result.stdout: print(result.stdout)
            print("⏳ Certains matchs ne sont pas encore terminés.")
            return False
    except Exception as e:
        print(f"⚠️ Erreur lors du check: {e}")
        return True 

def run_main_routine():
    """Lance la routine principale (data, stats, sync, git)"""
    print("\n🚀 Lancement de la routine complète...")
    print("="*60)
    
    try:
        # On lance daily_routine.py
        subprocess.run([sys.executable, "daily_routine.py"], check=False)
    except Exception as e:
        print(f"❌ Erreur lors de la routine: {e}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🏀 NBA AGENT - MASTER ROUTINE (MONOREPO)")
    print("="*60)
    print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    # 1. Vérification de l'état des matchs
    games_finished = check_games_finished()
    
    if not games_finished:
        print("\n⏸️  ROUTINE MISE EN PAUSE")
        print("Les matchs d'hier ne sont pas encore tous terminés.")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        input("\n[Appuyez sur Entrée pour quitter]")
        exit(0)

    # 2. Lancement de la routine complète (Pull -> Predict -> Sync)
    run_main_routine()

    print("\n" + "="*60)
    print("✅ MASTER ROUTINE TERMINÉE !")
    print("="*60)
