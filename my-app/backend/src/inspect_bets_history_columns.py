import pandas as pd
import os

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..") # Retour a backend/

DATA_BETS = "data/bets_history.csv"

if os.path.exists(DATA_BETS):
    df = pd.read_csv(DATA_BETS)
    print("COLUMNS:", df.columns.tolist())
    print("\nSAMPLE (First 3 rows):")
    print(df[['Home', 'Away', 'User_Prediction']].head(3))
    
    # Check specifically for Houston
    houston = df[ (df['Home'].str.contains('Houston', case=False, na=False)) | (df['Away'].str.contains('Houston', case=False, na=False)) ]
    if not houston.empty:
        print("\nHOUSTON SAMPLE:")
        print(houston[['Home', 'Away', 'User_Prediction']].head(3))
else:
    print(f"{DATA_BETS} not found")
