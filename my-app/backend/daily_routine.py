import subprocess
import sys
import time
import os
from datetime import datetime

def run_step(script_path, description):
    print(f"\n{'='*50}")
    print(f"🚀 ÉTAPE : {description}")
    print(f"{'='*50}")
    
    # On vérifie que le fichier existe avant de lancer
    if not os.path.exists(script_path):
        print(f"❌ ERREUR : Le fichier {script_path} est introuvable.")
        return False

    try:
        # On lance le script et on attend qu'il finisse
        subprocess.run([sys.executable, script_path], check=True)
        print(f"✅ {description} terminé avec succès.")
        return True
    except subprocess.CalledProcessError:
        print(f"❌ ERREUR CRITIQUE dans {script_path}.")
        return False

def run_git_sync():
    print(f"\n{'='*50}")
    print(f"☁️ SYNCHRONISATION GITHUB")
    print(f"{'='*50}")
    try:
        subprocess.run(["git", "add", "."], check=True)
        date_msg = datetime.now().strftime('%Y-%m-%d %H:%M')
        # Le commit peut échouer s'il n'y a rien à changer, ce n'est pas grave (check=False)
        subprocess.run(["git", "commit", "-m", f"Auto-update routine {date_msg}"], check=False)
        print("Envoi vers GitHub...")
        subprocess.run(["git", "push"], check=True)
        print("✅ Code & Data sécurisés sur GitHub !")
    except Exception as e:
        print(f"⚠️ Attention : Erreur Git ({e}), mais on continue.")

# --- DÉMARRAGE NBA Agent ---

print("\n🏀 --- NBA AGENT: ROUTINE --- 🏀\n")

# 1. Mise à jour des scores et calendrier
if not run_step('src/data_nba.py', "Mise à jour des Scores"):
    input("Entrée pour quitter...")
    exit()

# 2. Calcul des stats
run_step('src/features_nba.py', "Recalcul Stats")

# 3. Vérification des paris (Gagné/Perdu)
run_step('src/verify_bets.py', "Vérification Paris")

# 4. NOUVEAU : Envoi vers Supabase (Cloud Database)
# On le fait avant Git pour être sûr que la base est à jour pour les apps externes
run_step('sync_supabase.py', "Synchro Supabase")

# 5. Sauvegarde du code et du CSV sur GitHub
run_git_sync()

# 6. Lancement de l'interface
print(f"\n{'='*50}")
print("✨ LANCEMENT DE L'INTERFACE")
print(f"{'='*50}")
time.sleep(2)

try:
    subprocess.run([sys.executable, "-m", "streamlit", "run", "app.py"])
except KeyboardInterrupt:
    print("\n[INFO] Fermeture de l'application. À demain !")