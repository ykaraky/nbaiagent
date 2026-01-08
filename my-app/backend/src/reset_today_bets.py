
import pandas as pd
import os
from datetime import datetime

# Script to remove today's entries from bets_history.csv
# This forces predict_today.py to re-generate them with new columns (Fatigue, etc.)

def reset_today():
    # Force absolute path resolution relative to this script
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    # Expected location: backend/data/bets_history.csv (relative to backend/src/xxx.py)
    csv_path = os.path.join(BASE_DIR, '..', 'data', 'bets_history.csv')
    
    if not os.path.exists(csv_path):
        print(f"❌ File not found: {csv_path} (recherché depuis {os.getcwd()})")
        return

    print(f"📖 Reading {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return
        
    today_str = datetime.now().strftime('%Y-%m-%d')
    print(f"📅 Removing entries for date: {today_str}")
    
    initial_count = len(df)
    # Filter out today's rows
    df_new = df[df['Date'] != today_str]
    final_count = len(df_new)
    
    if initial_count == final_count:
        print("ℹ️ No entries found for today. Nothing to remove.")
    else:
        print(f"📉 Removing {initial_count - final_count} rows...")
        df_new.to_csv(csv_path, index=False)
        print("✅ CSV updated successfully.")

if __name__ == "__main__":
    reset_today()
