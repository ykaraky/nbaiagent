import pandas as pd
import numpy as np
import os

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
# On remonte d'un cran pour être à la racine de backend/ car le script est dans src/
os.chdir("..")

# --- CONFIGURATION MIROIR (V0) ---
V0_DATA_PATH = "../../NBA_Agent/data/"

# --- CHEMINS ---
INPUT_FILE = "data/nba_games.csv"
OUTPUT_FILE = "data/nba_games_ready.csv"

print("--- Calcul des FEATURES ENGINE V12 (Context Awareness) ---")

if not os.path.exists(INPUT_FILE):
    print(f"[ERREUR] {INPUT_FILE} introuvable.")
    exit(1)

try:
    df = pd.read_csv(INPUT_FILE)
    df['GAME_DATE'] = pd.to_datetime(df['GAME_DATE'])
    # Identify Win/Loss
    df['WIN'] = df['WL'].apply(lambda x: 1 if x == 'W' else 0)
    
    # Sort for calculations
    df = df.sort_values(by=['TEAM_ID', 'GAME_DATE'])

    # --- 1. FOUR FACTORS (Legacy V4) ---
    df['EFG_PCT'] = (df['FGM'] + 0.5 * df['FG3M']) / df['FGA'].replace(0, np.nan)
    df['TOV_PCT'] = df['TOV'] / (df['FGA'] + 0.44 * df['FTA'] + df['TOV']).replace(0, np.nan)
    df['FT_RATE'] = df['FTM'] / df['FGA'].replace(0, np.nan)
    df['ORB_RAW'] = df['OREB']

    factors = ['EFG_PCT', 'TOV_PCT', 'FT_RATE', 'ORB_RAW', 'WIN']
    for factor in factors:
        df[f"{factor}_LAST_5"] = df.groupby('TEAM_ID')[factor].transform(lambda x: x.shift(1).rolling(5).mean())

    # --- 2. ENGINE V12: CONTEXT AWARENESS ---
    
    # A. FATIGUE (Rest Days & B2B)
    # Shift dates to compare with previous game
    df['PREV_GAME_DATE'] = df.groupby('TEAM_ID')['GAME_DATE'].shift(1)
    # Calculate days diff (REST_DAYS = Date - PrevDate - 1 day? No, usually "Days Rest" means break. 
    # If played yesterday (gap=1 day), Rest=0. If played 2 days ago (gap=2), Rest=1.
    # Standard NBA API "REST_DAYS" usually treats B2B as 0 rest days.
    # Here: (Date - Prev).days.  B2B => 1.  Gap => 2.
    # Let's align with common definition: Days since last game.
    df['DAYS_DIFF'] = (df['GAME_DATE'] - df['PREV_GAME_DATE']).dt.days
    df['REST_DAYS'] = df['DAYS_DIFF'] - 1 # B2B (1 day diff) = 0 Rest Days.
    df['REST_DAYS'] = df['REST_DAYS'].fillna(3).clip(lower=0, upper=7) # Default 3 days rest for first game
    
    df['IS_B2B'] = df['REST_DAYS'] == 0

    # B. FORM (Last 10 Wins)
    # Wins in last 10 games (excluding current)
    df['LAST10_WINS'] = df.groupby('TEAM_ID')['WIN'].transform(lambda x: x.shift(1).rolling(10).sum().fillna(0))

    # C. STREAK (Current Streak)
    # Positive for Win Streak, Negative for Loss Streak. Entering the game.
    def calculate_streak(series):
        streaks = [0] * len(series)
        current_streak = 0
        # Iterate through history
        for i, result in enumerate(series[:-1]): # Look at result i to set streak for i+1
            start_streak = current_streak
            if result == 1: # Win
                if current_streak >= 0:
                    current_streak += 1
                else:
                    current_streak = 1
            else: # Loss
                if current_streak <= 0:
                    current_streak -= 1
                else:
                    current_streak = -1
            
            # The streak ENTERING the next game (i+1) is calculated here
            streaks[i+1] = current_streak
        return pd.Series(streaks, index=series.index)

    df['STREAK_CURRENT'] = df.groupby('TEAM_ID')['WIN'].transform(calculate_streak)

    # D. HOME / AWAY SPECIFIC WIN RATE
    df['IS_HOME'] = df['MATCHUP'].str.contains('vs.')
    
    # Expanding Mean of Wins, grouped by Team AND Location
    # We strip the current game from the expanding mean to avoid data leakage?
    # shift(1) ensures we only know history.
    df['WIN_RATE_SPECIFIC'] = df.groupby(['TEAM_ID', 'IS_HOME'])['WIN'].transform(
        lambda x: x.shift(1).expanding().mean().fillna(0.5) 
    )
    
    # Separate columns for clarity/mirroring (though logic handled by IS_HOME)
    # We will map this to home_win_rate in Sync if IS_HOME=True, else away_win_rate.

    # E. INJURY PROXIES (V13) - DETECTING "GHOST" INJURIES
    
    # 1. EFF_SHOCK (Efficiency Drop: Last 3 vs Last 10)
    # Detects sudden offensive collapse (e.g. Star player out)
    df['EFG_PCT_LAST_3'] = df.groupby('TEAM_ID')['EFG_PCT'].transform(lambda x: x.shift(1).rolling(3).mean())
    df['EFG_PCT_LAST_10'] = df.groupby('TEAM_ID')['EFG_PCT'].transform(lambda x: x.shift(1).rolling(10).mean())
    # Scale by 100 for readability/importance
    df['EFF_SHOCK'] = (df['EFG_PCT_LAST_3'] - df['EFG_PCT_LAST_10']) * 100
    
    # 2. VOLATILITY (Stability Check)
    # Standard deviation of Point Differential over Last 10 games
    df['VOLATILITY'] = df.groupby('TEAM_ID')['PLUS_MINUS'].transform(lambda x: x.shift(1).rolling(10).std())
    
    # 3. MARGIN_CRASH (Weighted Recent Failure)
    # Detects if team is getting blown out recently.
    # Weighted Avg of Last 3 Point Differentials (Weights: 1, 2, 3 for most recent)
    def weighted_avg(x):
        weights = np.arange(1, len(x) + 1) # [1, 2, 3]
        return np.sum(weights * x) / np.sum(weights)

    df['MARGIN_CRASH'] = df.groupby('TEAM_ID')['PLUS_MINUS'].transform(lambda x: x.shift(1).rolling(3).apply(weighted_avg, raw=True))

    # --- 3. EXPORT ---
    # We keep rows even with NaNs for sync purposes?? 
    # Logic V4 filtered dropped rows. For V12 Sync we might want everything.
    # But for Model Training we need valid features.
    
    # Let's keep `df_final` for the Model (Cleaned)
    df_model = df.dropna(subset=[f"{f}_LAST_5" for f in factors])
    
    # For Sync, we might want the whole `df` enriched, but usually verify_bets/sync uses `nba_games.csv` (Raw)
    # We will overwrite `nba_games_ready.csv` for the Model.
    # Ideally we create `nba_games_enriched.csv` for the Sync? 
    # Let's stick to `nba_games_ready.csv` fulfilling both roles if possible, or Sync reads Ready.
    # Assuming Sync needs all historical games to be present.
    # Dropna removes the first 5 games of any team. This is acceptable for history sync (old games).
    
    df_model.to_csv(OUTPUT_FILE, index=False)
    print(f"[OK] Sauvegarde dans {OUTPUT_FILE} (lignes: {len(df_model)})")

    # SAUVEGARDE MIROIR (V0 Project)
    if os.path.exists(V0_DATA_PATH):
        mirror_path = os.path.join(V0_DATA_PATH, "nba_games_ready.csv")
        df_model.to_csv(mirror_path, index=False)
        print(f"✅ Miroir V0 mis à jour")

except Exception as e:
    print(f"[ERREUR] {e}")
    import traceback
    traceback.print_exc()
    exit(1)
