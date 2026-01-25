import subprocess
import sys
import time
import os
from datetime import datetime

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def run_step(script_path, description):
    print(f"\n{'='*50}")
    print(f"🚀 ÉTAPE : {description}")
    print(f"{'='*50}")
    
    if not os.path.exists(script_path):
        print(f"❌ ERREUR : Le fichier {script_path} est introuvable.")
        return False

    try:
        subprocess.run([sys.executable, script_path], check=True)
        print(f"✅ {description} terminé avec succès.")
        return True
    except subprocess.CalledProcessError:
        print(f"❌ ERREUR CRITIQUE dans {script_path}.")
        return False

def run_git_sync():
    print(f"\n{'='*50}")
    print(f"☁️ SYNCHRONISATION GITHUB (Monorepo)")
    print(f"{'='*50}")
    try:
        # On remonte à la racine du monorepo pour git (nbaiagent/)
        os.chdir("../..") 
        subprocess.run(["git", "add", "."], check=True)
        date_msg = datetime.now().strftime('%Y-%m-%d %H:%M')
        subprocess.run(["git", "commit", "-m", f"Routine auto {date_msg}"], check=False)
        print("Envoi vers GitHub...")
        subprocess.run(["git", "push"], check=True)
        print("✅ Code & Data sécurisés sur GitHub !")
        # Retour au dossier backend
        os.chdir("my-app/backend")
    except Exception as e:
        print(f"⚠️ Attention : Erreur Git ({e}), mais on continue.")

# --- DÉMARRAGE NBA Agent (CENTRALISÉ) ---

print("\n" + "🏀" * 15)
print("🏀 NBA AGENT: MASTER ROUTINE 🏀")
print("🏀" * 15 + "\n")

# 0. Synchronisation initiale (Récupération des votes web)
run_step('src/pull_votes.py', "Récupération des Votes Cloud")

# 1. Mise à jour des scores historiques
run_step('src/data_nba.py', "Mise à jour des Scores Historiques")

# 2. Injection des Features (Four Factors)
run_step('src/features_nba.py', "Calcul des Features IA")

# 3. Vérification des paris passés (Gagné/Perdu)
run_step('src/verify_bets.py', "Vérification des Résultats Passés")

# 4. GÉNÉRATION DES PRONOSTICS DU JOUR (LE CERVEAU)
# Note: predict_today.py gère maintenant la mise à jour sans écraser les votes
run_step('src/predict_today.py', "Génération des Pronos du Jour")

# 5. SYNCHRONISATION CLOUD (SUPABASE)
run_step('src/sync_supabase.py', "Synchro Paris -> Supabase")
run_step('src/sync_nba_games.py', "Synchro Scores -> Supabase")
run_step('src/sync_standings.py', "Synchro Classements -> Supabase")
run_step('src/sync_players.py', "Synchro Joueurs & Stats")

# 6. SAUVEGARDE GITHUB
# run_git_sync() # Désactivé par défaut pour éviter les conflits si l'user code en même temps

# 7. LANCEMENT DE L'INTERFACE (OPTIONNEL)
print(f"\n{'='*50}")
print("✨ ROUTINE TERMINÉE")
print(f"{'='*50}")
time.sleep(2)