import pandas as pd
import os
import time
import sys
from datetime import datetime
from nba_api.stats.endpoints import leaguegamefinder
from nba_api.stats.static import teams

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..")

# --- CONFIGURATION MIROIR (V0) ---
V0_DATA_PATH = "../../NBA_Agent/data/"

HISTORY_FILE = 'data/bets_history.csv'

# --- OUTILS ---
def get_teams_dict():
    nba_teams = teams.get_teams()
    return {t['id']: {'full': t['full_name'], 'code': t['abbreviation']} for t in nba_teams}

TEAMS_DB = get_teams_dict()

def clean_id(val):
    """Nettoyage ID robuste (int -> string sans zero)"""
    try: return str(int(float(val))).lstrip('0')
    except: return str(val).lstrip('0')

def verify():
    print("\n--- VÉRIFICATION DES RÉSULTATS (LIVE API) ---")
    
    if not os.path.exists(HISTORY_FILE):
        print("[ERREUR] Pas d'historique.")
        return

    df = pd.read_csv(HISTORY_FILE)
    updates = 0

    # --- ÉTAPE 0 : RÉPARATION OFFLINE ---
    mask_fixable_ia = (df['Real_Winner'].notna() & (df['Real_Winner'] != "")) & (df['Result'].isna() | (df['Result'] == ""))
    mask_fixable_user = (df['Real_Winner'].notna() & (df['Real_Winner'] != "")) & (df['User_Prediction'].notna() & (df['User_Prediction'] != "")) & (df['User_Result'].isna() | (df['User_Result'] == ""))
    
    fix_indices = df[mask_fixable_ia | mask_fixable_user].index
    if len(fix_indices) > 0:
        print(f"[REPARATION] {len(fix_indices)} lignes à recalculer hors-ligne...")
        for idx in fix_indices:
            real_w = df.at[idx, 'Real_Winner']
            if pd.isna(df.at[idx, 'Result']) or df.at[idx, 'Result'] == "":
                pred_ia = df.at[idx, 'Predicted_Winner']
                df.at[idx, 'Result'] = "GAGNE" if pred_ia == real_w else "PERDU"
            # User
            if pd.isna(df.at[idx, 'User_Result']) or df.at[idx, 'User_Result'] == "":
                u_pred = df.at[idx, 'User_Prediction']
                if pd.notna(u_pred) and u_pred != "":
                    df.at[idx, 'User_Result'] = "GAGNE" if u_pred == real_w else "PERDU"
        updates += len(fix_indices)

    # --- ÉTAPE 1 : IDENTIFIER LES MATCHS VRAIMENT VIDE (API) ---
    mask_pending = df['Real_Winner'].isna() | (df['Real_Winner'] == "") | (df['Real_Winner'] == "En attente...")
    today_str = datetime.now().strftime('%Y-%m-%d')
    mask_date = df['Date'] < today_str
    
    pending_indices = df[mask_pending & mask_date].index
    
    if len(pending_indices) == 0:
        if updates > 0:
            df.to_csv(HISTORY_FILE, index=False)
            if os.path.exists(V0_DATA_PATH):
                df.to_csv(os.path.join(V0_DATA_PATH, "bets_history.csv"), index=False)
            print(f"[SUCCES] Recalcul terminé ({updates} lignes).")
        else:
            print("[INFO] Aucun match passé en attente de résultat.")
        return

    print(f"[INFO] {len(pending_indices)} matchs à vérifier via API...")
    dates_to_check = df.loc[pending_indices, 'Date'].unique()
    
    for d_str in dates_to_check:
        print(f"   -> Scan API pour le {d_str}...")
        try:
            d_us = datetime.strptime(d_str, '%Y-%m-%d').strftime('%m/%d/%Y')
            finder = leaguegamefinder.LeagueGameFinder(date_from_nullable=d_us, date_to_nullable=d_us, league_id_nullable='00')
            results = finder.get_data_frames()[0]
            
            if results.empty:
                print("      (Pas de données API)")
                continue

            team_results_day = {}
            for _, r in results.iterrows():
                tid = int(r['TEAM_ID'])
                if tid in TEAMS_DB:
                    tname = TEAMS_DB[tid]['full']
                    outcome = "W" if r['WL'] == 'W' else "L"
                    team_results_day[tname] = outcome

            for idx in pending_indices:
                if df.at[idx, 'Date'] == d_str:
                    home = df.at[idx, 'Home']
                    away = df.at[idx, 'Away']
                    pred_ia = df.at[idx, 'Predicted_Winner']
                    
                    real_winner = None
                    if team_results_day.get(home) == 'W': real_winner = home
                    elif team_results_day.get(away) == 'W': real_winner = away
                    
                    if real_winner:
                        df.at[idx, 'Real_Winner'] = real_winner
                        df.at[idx, 'Result'] = "GAGNE" if pred_ia == real_winner else "PERDU"
                        user_pred = df.at[idx, 'User_Prediction']
                        if pd.notna(user_pred) and user_pred != "":
                            df.at[idx, 'User_Result'] = "GAGNE" if user_pred == real_winner else "PERDU"
                        updates += 1
                        print(f"      [MAJ] {home} vs {away} -> Vainqueur: {real_winner}")

            time.sleep(0.6) # Anti-ban

        except Exception as e:
            print(f"      [ERREUR] {e}")

    if updates > 0:
        # SAUVEGARDE LOCALE
        df.to_csv(HISTORY_FILE, index=False)
        # SAUVEGARDE MIROIR
        if os.path.exists(V0_DATA_PATH):
            mirror_file = os.path.join(V0_DATA_PATH, "bets_history.csv")
            df.to_csv(mirror_file, index=False)
            print(f"✅ Miroir V0 mis à jour : {mirror_file}")
        print(f"\n[SUCCES] {updates} résultats mis à jour au total.")
    else:
        print("\n[INFO] Rien à mettre à jour.")

if __name__ == "__main__":
    verify()
