import pandas as pd
import os

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..")

HISTORY_FILE = 'data/bets_history.csv'

def migrate_csv():
    print(f"🔄 Migration CSV V13 (Explainability) pour {HISTORY_FILE}...")
    
    if not os.path.exists(HISTORY_FILE):
        print("⚠️ Fichier introuvable, rien à faire (sera créé au prochain run).")
        return

    try:
        df = pd.read_csv(HISTORY_FILE)
        
        # Check existing columns
        new_cols = ['AI_Explanation', 'Risk_Level', 'Badges']
        added = False
        
        for col in new_cols:
            if col not in df.columns:
                print(f"   + Colonne ajoutée : {col}")
                df[col] = None # Empty for old rows
                added = True
                
        if added:
            df.to_csv(HISTORY_FILE, index=False)
            print("✅ CSV mis à jour avec succès.")
        else:
            print("✅ CSV déjà à jour.")
            
    except Exception as e:
        print(f"❌ Erreur migration : {e}")

if __name__ == "__main__":
    migrate_csv()
