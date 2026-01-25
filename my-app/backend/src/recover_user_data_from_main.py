
import pandas as pd
import subprocess
import io
import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, '..', 'data', 'bets_history.csv')

def recover_user_data():
    print("--- RECOVERY: USER DATA FROM MAIN ---")
    
    # 1. Fetch Main Version
    cmd = ["git", "show", "main:my-app/backend/data/bets_history.csv"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        main_content = result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Error fetching main file: {e}")
        return

    # 2. Load DFs
    try:
        df_main = pd.read_csv(io.StringIO(main_content))
        df_local = pd.read_csv(CSV_PATH)
    except Exception as e:
        print(f"❌ Error reading CSVs: {e}")
        return
        
    print(f"📊 Main has {len(df_main)} rows.")
    print(f"📊 Local has {len(df_local)} rows.")
    
    # 3. Identify Merge Keys
    # We want to bring User_Prediction, User_Result, User_Reason, User_Confidence, Result, Real_Winner (if main has reliable results)
    # The prompt showed "PERDU,Motivation,2.0" -> Result? User_Result?
    # Let's trust Main for Jan 24 specifically.
    
    cols_to_restore = ['User_Prediction', 'User_Result', 'User_Reason', 'User_Confidence', 'Real_Winner', 'Result']
    
    updates = 0
    
    for idx, row in df_local.iterrows():
        date_val = row['Date']
        if '2026-01-24' not in date_val: 
            continue # Target Jan 24 only as requested
            
        home = row['Home']
        # Find match in main
        match = df_main[(df_main['Date'] == date_val) & (df_main['Home'] == home)]
        
        if match.empty:
            continue
            
        src_row = match.iloc[0]
        
        # Check if local is empty but main has data
        local_pred = row.get('User_Prediction')
        main_pred = src_row.get('User_Prediction')
        
        if pd.isna(local_pred) and pd.notna(main_pred):
            # Restore!
            print(f"♻️ Restoring data for {date_val} {home}: {main_pred}")
            for col in cols_to_restore:
                if col in src_row and pd.notna(src_row[col]):
                    df_local.at[idx, col] = src_row[col]
            updates += 1

    if updates > 0:
        df_local.to_csv(CSV_PATH, index=False)
        print(f"✅ Restored {updates} rows from Main branch history.")
    else:
        print("⚠️ No restorable data found for Jan 24.")

if __name__ == "__main__":
    recover_user_data()
