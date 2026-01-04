import pandas as pd
import numpy as np
import os
import sys

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
# On remonte d'un cran pour être à la racine de backend/ car le script est dans src/
os.chdir("..")

# --- CONFIGURATION MIROIR (V0) ---
V0_DATA_PATH = "../../NBA_Agent/data/"

# --- CHEMINS ---
INPUT_FILE = "data/nba_games.csv"
OUTPUT_FILE = "data/nba_games_ready.csv"

print("--- Calcul des FOUR FACTORS ---")

if not os.path.exists(INPUT_FILE):
    print(f"[ERREUR] {INPUT_FILE} introuvable.")
    exit(1)

try:
    df = pd.read_csv(INPUT_FILE)
    df['GAME_DATE'] = pd.to_datetime(df['GAME_DATE'])
    df['WIN'] = df['WL'].apply(lambda x: 1 if x == 'W' else 0)
    df = df.sort_values(by=['TEAM_ID', 'GAME_DATE'])

    # Calculs (Identiques à la v4)
    df['EFG_PCT'] = (df['FGM'] + 0.5 * df['FG3M']) / df['FGA'].replace(0, np.nan)
    df['TOV_PCT'] = df['TOV'] / (df['FGA'] + 0.44 * df['FTA'] + df['TOV']).replace(0, np.nan)
    df['FT_RATE'] = df['FTM'] / df['FGA'].replace(0, np.nan)
    df['ORB_RAW'] = df['OREB']

    factors = ['EFG_PCT', 'TOV_PCT', 'FT_RATE', 'ORB_RAW', 'WIN']
    for factor in factors:
        df[f"{factor}_LAST_5"] = df.groupby('TEAM_ID')[factor].transform(lambda x: x.shift(1).rolling(5).mean())

    df['PREV_GAME_DATE'] = df.groupby('TEAM_ID')['GAME_DATE'].shift(1)
    df['DAYS_REST'] = (df['GAME_DATE'] - df['PREV_GAME_DATE']).dt.days.fillna(3).clip(upper=7)

    df_final = df.dropna(subset=[f"{f}_LAST_5" for f in factors])
    
    # SAUVEGARDE LOCALE (Next.js Project)
    df_final.to_csv(OUTPUT_FILE, index=False)
    print(f"[OK] Sauvegarde dans {OUTPUT_FILE}")

    # SAUVEGARDE MIROIR (V0 Project)
    if os.path.exists(V0_DATA_PATH):
        mirror_path = os.path.join(V0_DATA_PATH, "nba_games_ready.csv")
        df_final.to_csv(mirror_path, index=False)
        print(f"✅ Miroir V0 mis à jour : {mirror_path}")

except Exception as e:
    print(f"[ERREUR] {e}")
    exit(1)
