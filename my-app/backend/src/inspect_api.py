
from nba_api.stats.endpoints import leaguedashplayerstats
import pandas as pd

def inspect_columns():
    print("🔍 Fetching NBA API Columns...")
    
    # 1. Season Stats
    try:
        stats = leaguedashplayerstats.LeagueDashPlayerStats(season='2024-25', per_mode_detailed='PerGame').get_data_frames()[0]
        print("\n--- SEASON STATS COLUMNS (Per Game) ---")
        print(list(stats.columns))
        print("\n--- SAMPLE ROW (Season) ---")
        print(stats.iloc[0].to_dict())
    except Exception as e:
        print(f"Error Season: {e}")

    # 2. Advanced Stats?
    try:
        adv = leaguedashplayerstats.LeagueDashPlayerStats(season='2024-25', measure_type_detailed_defense='Advanced').get_data_frames()[0]
        print("\n--- ADVANCED STATS COLUMNS ---")
        print(list(adv.columns))
    except Exception as e:
        print(f"Error Advanced: {e}")

    # 3. Last 10 Games?
    try:
        last10 = leaguedashplayerstats.LeagueDashPlayerStats(season='2024-25', last_n_games=10).get_data_frames()[0]
        print("\n--- LAST 10 GAMES COLUMNS ---")
        print(list(last10.columns))
    except Exception as e:
        print(f"Error Last 10: {e}")

if __name__ == "__main__":
    inspect_columns()
