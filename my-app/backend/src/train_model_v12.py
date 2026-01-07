import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import os

# Forces le dossier de travail sur celui du script (backend/src) -> Remonte à backend/
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..")

# --- CHEMINS ---
DATA_FILE = "data/nba_games_ready.csv"
MODEL_FILE = "models/nba_predictor_v12.json" # V12 Model File

def train_model():
    print("--- Demarrage Entrainement Engine V12 (Context Awareness) ---")
    if not os.path.exists(DATA_FILE): 
        print(f"❌ Erreur: {DATA_FILE} introuvable.")
        return False, "Fichier data introuvable", 0

    try:
        df = pd.read_csv(DATA_FILE)
        
        # Identification Home/Away Rows
        # The file contains 2 rows per game. 
        # MATCHUP contains "vs." for Home and "@" for Away.
        df['IS_HOME'] = df['MATCHUP'].str.contains('vs.')
        
        # Split into Home and Away sub-dataframes
        df_home = df[df['IS_HOME'] == True].copy().add_suffix('_HOME').rename(columns={'GAME_ID_HOME': 'GAME_ID'})
        df_away = df[df['IS_HOME'] == False].copy().add_suffix('_AWAY').rename(columns={'GAME_ID_AWAY': 'GAME_ID'})
        
        # Merge to get one row per game with both team stats
        df_final = pd.merge(df_home, df_away, on='GAME_ID')
        
        # --- FEATURE ENGINEERING (V12) ---
        
        # 1. Base Stats Diffs (Legacy)
        for col in ['EFG_PCT', 'TOV_PCT', 'ORB_RAW', 'WIN']:
            df_final[f'DIFF_{col[:3]}'] = df_final[f'{col}_LAST_5_HOME'] - df_final[f'{col}_LAST_5_AWAY']
            
        # 2. Context Features (New)
        
        # Rest Days & Fatigue
        # Note: REST_DAYS is already calculated per team in features_nba.py
        df_final['DIFF_REST'] = df_final['REST_DAYS_HOME'] - df_final['REST_DAYS_AWAY']
        
        # B2B (Booleans to Int)
        df_final['IS_B2B_HOME_INT'] = df_final['IS_B2B_HOME'].astype(int)
        df_final['IS_B2B_AWAY_INT'] = df_final['IS_B2B_AWAY'].astype(int)
        
        # Streaks
        df_final['DIFF_STREAK'] = df_final['STREAK_CURRENT_HOME'] - df_final['STREAK_CURRENT_AWAY']
        
        # Last 10 Form
        df_final['DIFF_LAST10'] = df_final['LAST10_WINS_HOME'] - df_final['LAST10_WINS_AWAY']
        
        # Specific Win Rate (Home Team at Home vs Away Team at Away)
        # This is powerful: How good is PHX at Home vs NYK on Road?
        df_final['DIFF_SPECIFIC_WIN_RATE'] = df_final['WIN_RATE_SPECIFIC_HOME'] - df_final['WIN_RATE_SPECIFIC_AWAY']

        # Select Features for Model
        features = [
            # Legacy
            'EFG_PCT_LAST_5_HOME', 'EFG_PCT_LAST_5_AWAY', 
            'TOV_PCT_LAST_5_HOME', 'TOV_PCT_LAST_5_AWAY',
            'ORB_RAW_LAST_5_HOME', 'ORB_RAW_LAST_5_AWAY', 
            'DIFF_EFG', 'DIFF_TOV', 'DIFF_ORB', 
            
            # Legacy but important
            'DIFF_WIN', 
            
            # V12 NEW FEATURES
            'REST_DAYS_HOME', 'REST_DAYS_AWAY', 'DIFF_REST',
            'IS_B2B_HOME_INT', 'IS_B2B_AWAY_INT',
            'STREAK_CURRENT_HOME', 'STREAK_CURRENT_AWAY', 'DIFF_STREAK',
            'LAST10_WINS_HOME', 'LAST10_WINS_AWAY', 'DIFF_LAST10',
            'WIN_RATE_SPECIFIC_HOME', 'WIN_RATE_SPECIFIC_AWAY', 'DIFF_SPECIFIC_WIN_RATE'
        ]
        
        target = 'WIN_HOME'
        
        print(f"Features ({len(features)}): {features}")
        
        # Train/Test Split
        # Using shuffle=False to respect time series (train on past, test on recent)
        X = df_final[features]
        y = df_final[target]
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, shuffle=False)
        
        # Model Parameters
        # Slightly update params for more features? 
        # Keeping close to V1 but slightly deeper maybe? V1 was depth=4.
        model = xgb.XGBClassifier(
            n_estimators=200, 
            learning_rate=0.03, 
            max_depth=5, 
            eval_metric='logloss', 
            objective='binary:logistic',
            early_stopping_rounds=10
        )
        
        model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
        
        # Save
        if not os.path.exists("models"): os.makedirs("models")
        model.save_model(MODEL_FILE)
        
        # Evaluation
        preds = model.predict(X_test)
        acc = accuracy_score(y_test, preds)
        
        print(f"✅ Modèle V12 entraîné et sauvegardé: {MODEL_FILE}")
        print(f"🎯 Précision sur le Test Set (Recent Games): {acc:.1%}")
        
        return True, "Modele V12 Ready", acc

    except Exception as e:
        print(f"❌ Erreur Training: {e}")
        import traceback
        traceback.print_exc()
        return False, str(e), 0

if __name__ == "__main__":
    s, m, a = train_model()
