import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import os

# --- CHEMINS ---
DATA_FILE = "data/nba_games_ready.csv"
MODEL_FILE = "models/nba_predictor.json"

def train_model():
    print("--- Demarrage Entrainement ---")
    if not os.path.exists(DATA_FILE): return False, "Fichier data introuvable", 0

    try:
        df = pd.read_csv(DATA_FILE)
        # ... (Logique de préparation identique) ...
        df['IS_HOME'] = df['MATCHUP'].str.contains('vs.')
        df_home = df[df['IS_HOME'] == True].copy().add_suffix('_HOME').rename(columns={'GAME_ID_HOME': 'GAME_ID'})
        df_away = df[df['IS_HOME'] == False].copy().add_suffix('_AWAY').rename(columns={'GAME_ID_AWAY': 'GAME_ID'})
        df_final = pd.merge(df_home, df_away, on='GAME_ID')

        # Features
        for col in ['EFG_PCT', 'TOV_PCT', 'ORB_RAW', 'WIN']:
            df_final[f'DIFF_{col[:3]}'] = df_final[f'{col}_LAST_5_HOME'] - df_final[f'{col}_LAST_5_AWAY']
        df_final['DIFF_REST'] = df_final['DAYS_REST_HOME'] - df_final['DAYS_REST_AWAY']

        features = [
            'EFG_PCT_LAST_5_HOME', 'EFG_PCT_LAST_5_AWAY', 'TOV_PCT_LAST_5_HOME', 'TOV_PCT_LAST_5_AWAY',
            'ORB_RAW_LAST_5_HOME', 'ORB_RAW_LAST_5_AWAY', 'DIFF_EFG', 'DIFF_TOV', 'DIFF_ORB', 'DIFF_WIN', 'DIFF_REST'
        ]
        
        # Hack pour compatibilité Cloud
        model = xgb.XGBClassifier(n_estimators=150, learning_rate=0.03, max_depth=4, eval_metric='logloss', objective='binary:logistic')
        model._estimator_type = "classifier"
        
        X_train, X_test, y_train, y_test = train_test_split(df_final[features], df_final['WIN_HOME'], test_size=0.2, shuffle=False)
        model.fit(X_train, y_train)
        
        # Création dossier models si inexistant
        if not os.path.exists("models"): os.makedirs("models")
        
        model.save_model(MODEL_FILE)
        acc = accuracy_score(y_test, model.predict(X_test))
        return True, "Modele sauvegarde.", acc

    except Exception as e:
        return False, str(e), 0

if __name__ == "__main__":
    s, m, a = train_model()
    print(f"{m} Precision: {a:.1%}")