import subprocess
import sys
import time
from datetime import datetime

def check_games_finished():
    """Vérifie si les matchs d'hier sont terminés via l'API NBA"""
    print("\n🔍 Vérification de l'état des matchs...")
    try:
        result = subprocess.run([sys.executable, "check_status.py"], 
                              capture_output=True, text=True, timeout=30)
        
        # Si le script retourne 0, les matchs sont finis
        if result.returncode == 0:
            print("✅ Tous les matchs d'hier sont terminés !")
            return True
        else:
            print("⏳ Certains matchs ne sont pas encore terminés.")
            print(f"   Message: {result.stdout}")
            return False
    except subprocess.TimeoutExpired:
        print("⚠️ Timeout lors de la vérification (API lente?)")
        return False
    except FileNotFoundError:
        print("⚠️ Fichier check_status.py introuvable, on continue quand même...")
        return True
    except Exception as e:
        print(f"⚠️ Erreur lors du check: {e}")
        print("   On continue quand même...")
        return True

def pull_user_votes():
    """Récupère les votes utilisateurs depuis Supabase vers le CSV local"""
    print("\n📥 Récupération des votes utilisateurs (Supabase → CSV)...")
    try:
        # Cherche d'abord pull_votes.py, sinon essaie src/pull_votes.py
        script = "pull_votes.py" if os.path.exists("pull_votes.py") else "src/pull_votes.py"
        result = subprocess.run([sys.executable, script], 
                              capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("✅ Votes récupérés avec succès !")
        else:
            print(f"⚠️ Erreur lors de la récupération: {result.stderr}")
    except FileNotFoundError:
        print("⚠️ Script pull_votes introuvable, on continue sans...")
    except Exception as e:
        print(f"⚠️ Erreur: {e}")
        print("   On continue sans les votes...")

def run_main_routine():
    """Lance la routine principale (data, stats, sync, git, streamlit)"""
    print("\n🚀 Lancement de la routine principale...")
    print("="*60)
    
    try:
        # Lance daily_routine.py et laisse l'output visible
        subprocess.run([sys.executable, "daily_routine.py"], check=False)
    except KeyboardInterrupt:
        print("\n⚠️ Routine interrompue par l'utilisateur.")
    except Exception as e:
        print(f"❌ Erreur lors de la routine: {e}")

# === IMPORTS TARDIFS ===
import os

# === WORKFLOW PRINCIPAL ===
if __name__ == "__main__":
    print("\n" + "="*60)
    print("🏀 NBA AGENT - MASTER ROUTINE")
    print("="*60)
    print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    # 1. Vérification de l'état des matchs
    games_finished = check_games_finished()
    
    if not games_finished:
        print("\n⏸️  ROUTINE MISE EN PAUSE")
        print("━" * 60)
        print("Les matchs d'hier ne sont pas encore tous terminés.")
        print("\nOptions:")
        print("  1. Attendez quelques heures et relancez ce script")
        print("  2. Forcez la routine: python daily_routine.py")
        print("━" * 60)
        input("\n[Appuyez sur Entrée pour quitter]")
        exit(0)

    # 2. Récupération des votes cloud
    pull_user_votes()
    
    # Petit délai pour que l'utilisateur puisse lire
    time.sleep(1)
    
    # 3. Lancement de la routine complète
    run_main_routine()

    print("\n" + "="*60)
    print("✅ MASTER ROUTINE TERMINÉE !")
    print("="*60)
