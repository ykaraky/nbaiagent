import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, log_loss
import os
import sys

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..")

DATA_FILE = "data/nba_games_ready.csv"
MODEL_FILE = "models/nba_predictor_v13.json"

def analyze_model():
    print("--- ANALYSE MOTEUR V13 (Importance & Calibration) ---")
    
    if not os.path.exists(DATA_FILE) or not os.path.exists(MODEL_FILE):
        print("❌ Data ou Modèle introuvable.")
        return

    # 1. Load Data & Preprocess (Must match Train logic EXACTLY)
    df = pd.read_csv(DATA_FILE)
    df['IS_HOME'] = df['MATCHUP'].str.contains('vs.')
    
    df_home = df[df['IS_HOME'] == True].copy().add_suffix('_HOME').rename(columns={'GAME_ID_HOME': 'GAME_ID'})
    df_away = df[df['IS_HOME'] == False].copy().add_suffix('_AWAY').rename(columns={'GAME_ID_AWAY': 'GAME_ID'})
    df_final = pd.merge(df_home, df_away, on='GAME_ID')

    # Feature Engineering (Mirrored from Train)
    for col in ['EFG_PCT', 'TOV_PCT', 'ORB_RAW', 'WIN']:
        df_final[f'DIFF_{col[:3]}'] = df_final[f'{col}_LAST_5_HOME'] - df_final[f'{col}_LAST_5_AWAY']

    df_final['DIFF_REST'] = df_final['REST_DAYS_HOME'] - df_final['REST_DAYS_AWAY']
    df_final['IS_B2B_HOME_INT'] = df_final['IS_B2B_HOME'].astype(int)
    df_final['IS_B2B_AWAY_INT'] = df_final['IS_B2B_AWAY'].astype(int)
    df_final['DIFF_STREAK'] = df_final['STREAK_CURRENT_HOME'] - df_final['STREAK_CURRENT_AWAY']
    df_final['DIFF_LAST10'] = df_final['LAST10_WINS_HOME'] - df_final['LAST10_WINS_AWAY']
    df_final['DIFF_SPECIFIC_WIN_RATE'] = df_final['WIN_RATE_SPECIFIC_HOME'] - df_final['WIN_RATE_SPECIFIC_AWAY']
    
    # V13
    df_final['DIFF_EFF_SHOCK'] = df_final['EFF_SHOCK_HOME'] - df_final['EFF_SHOCK_AWAY']
    df_final['DIFF_VOLATILITY'] = df_final['VOLATILITY_HOME'] - df_final['VOLATILITY_AWAY']
    df_final['DIFF_MARGIN_CRASH'] = df_final['MARGIN_CRASH_HOME'] - df_final['MARGIN_CRASH_AWAY']

    features = [
        'EFG_PCT_LAST_5_HOME', 'EFG_PCT_LAST_5_AWAY', 
        'TOV_PCT_LAST_5_HOME', 'TOV_PCT_LAST_5_AWAY',
        'ORB_RAW_LAST_5_HOME', 'ORB_RAW_LAST_5_AWAY', 
        'DIFF_EFG', 'DIFF_TOV', 'DIFF_ORB', 'DIFF_WIN', 
        'REST_DAYS_HOME', 'REST_DAYS_AWAY', 'DIFF_REST',
        'IS_B2B_HOME_INT', 'IS_B2B_AWAY_INT',
        'STREAK_CURRENT_HOME', 'STREAK_CURRENT_AWAY', 'DIFF_STREAK',
        'LAST10_WINS_HOME', 'LAST10_WINS_AWAY', 'DIFF_LAST10',
        'WIN_RATE_SPECIFIC_HOME', 'WIN_RATE_SPECIFIC_AWAY', 'DIFF_SPECIFIC_WIN_RATE',
        'EFF_SHOCK_HOME', 'EFF_SHOCK_AWAY', 'DIFF_EFF_SHOCK',
        'VOLATILITY_HOME', 'VOLATILITY_AWAY', 'DIFF_VOLATILITY',
        'MARGIN_CRASH_HOME', 'MARGIN_CRASH_AWAY', 'DIFF_MARGIN_CRASH'
    ]
    target = 'WIN_HOME'

    # 2. Split
    X = df_final[features]
    y = df_final[target]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, shuffle=False)

    # 3. Load Model
    model = xgb.XGBClassifier()
    model.load_model(MODEL_FILE)

    # 4. Calibration Stats
    preds_proba = model.predict_proba(X_test)[:, 1]
    preds_class = model.predict(X_test)
    
    loss = log_loss(y_test, preds_proba)
    acc = accuracy_score(y_test, preds_class)

    print(f"\n📊 Performance (Test Set - {len(y_test)} games):")
    print(f"   Accuracy: {acc:.2%}")
    print(f"   Log Loss: {loss:.4f} (Lower is better)")

    # 5. Feature Importance (Native)
    # Gain = contribution to prediction logic (most important)
    importance = model.get_booster().get_score(importance_type='total_gain')
    sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)

    print("\n🏆 TOP 15 FEATURES (Total Gain Impact):")
    print("-" * 40)
    for idx, (feat, score) in enumerate(sorted_importance[:15]):
        prefix = "✅ V13" if feat in ['DIFF_EFF_SHOCK', 'DIFF_VOLATILITY', 'DIFF_MARGIN_CRASH', 'EFF_SHOCK_HOME', 'EFF_SHOCK_AWAY', 'VOLATILITY_HOME', 'VOLATILITY_AWAY', 'MARGIN_CRASH_HOME', 'MARGIN_CRASH_AWAY'] else "  "
        print(f"{idx+1:02d}. {prefix} {feat}: {score:.1f}")
    
    # Check V13 Features ranks specifically
    print("\n🧪 V13 FEATURES CHECK:")
    v13_feats = ['DIFF_EFF_SHOCK', 'DIFF_VOLATILITY', 'DIFF_MARGIN_CRASH']
    for f in v13_feats:
        score = importance.get(f, 0)
        rank = [k for k, v in sorted_importance].index(f) + 1 if f in importance else "N/A"
        print(f"   - {f}: Rank #{rank} (Score: {score:.1f})")

if __name__ == "__main__":
    analyze_model()
