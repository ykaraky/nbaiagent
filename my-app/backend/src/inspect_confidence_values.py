import pandas as pd
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

response = supabase.table("bets_history").select("User_Confidence").execute()
df = pd.DataFrame(response.data)

if not df.empty and 'User_Confidence' in df.columns:
    print("Unique Values:", df['User_Confidence'].unique())
    print("Description:\n", df['User_Confidence'].describe())
else:
    print("No data or column missing")
