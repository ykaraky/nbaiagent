import pandas as pd
import numpy as np
import os
import requests
import json
from datetime import datetime
from dotenv import load_dotenv
from nba_api.stats.static import teams

# Forces le dossier de travail sur celui du script (backend/)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.chdir("..") # Retour a backend/

# --- CONFIG ---
env_path = ".env"
if not os.path.exists(env_path):
    potential_path = os.path.join("..", "frontend", ".env.local")
    if os.path.exists(potential_path):
        env_path = potential_path

load_dotenv(dotenv_path=env_path)

URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # MUST HAVE SERVICE ROLE
if not KEY:
    KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not URL or not KEY:
    print("❌ ERREUR: Variables d'environnement manquantes.")
    exit(1)

Headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

ENDPOINT = f"{URL}/rest/v1/team_intelligence"

DATA_GAMES = "data/nba_games_ready.csv"
DATA_BETS = "data/bets_history.csv"

def get_ai_accuracy(team_name, df_bets):
    """Calcule le % de réussite de l'IA quand elle parie SUR ou CONTRE cette équipe"""
    if df_bets.empty: return 0.0
    
    # Matchs impliquant l'équipe
    mask = (df_bets['Home'] == team_name) | (df_bets['Away'] == team_name)
    team_bets = df_bets[mask]
    
    if len(team_bets) == 0: return 0.0
    
    # On ne garde que les paris finis
    finished = team_bets[team_bets['Result'].isin(['GAGNE', 'PERDU'])]
    if len(finished) == 0: return 0.0
    
    # Calcul winrate
    wins = len(finished[finished['Result'] == 'GAGNE'])
    return round((wins / len(finished)) * 100, 1)

def get_volatility(team_id, df_games):
    """Calcule la volatilité (Ecart-type du Plus/Minus sur 10 matchs)"""
    team_games = df_games[df_games['TEAM_ID'] == team_id].sort_values('GAME_DATE')
    if len(team_games) < 5: return 50.0 # Default
    
    last_10 = team_games.tail(10)
    if 'PLUS_MINUS' not in last_10.columns: return 50.0
    
    std_dev = last_10['PLUS_MINUS'].std()
    # Normalize: NBA std dev usually between 5 (stable) and 15 (unstable)
    # Map 5->0, 20->100
    score = (std_dev - 5) * (100 / 15)
    return float(np.clip(score, 0, 100))

def get_last_5(team_id, df_games, id_to_name):
    """Récupère les 5 derniers matchs pour l'UI"""
    team_games = df_games[df_games['TEAM_ID'] == team_id].sort_values('GAME_DATE').tail(5)
    history = []
    
    for _, row in team_games.iterrows():
        is_home = "vs." in row['MATCHUP']
        # MATCHUP ex: "HOU vs. MEM" or "HOU @ MEM"
        # We want our abb and opp abb
        parts = row['MATCHUP'].replace(" vs. ", " ").replace(" @ ", " ").split(" ")
        # usually [MY_ABB, OPP_ABB]
        my_abb = parts[0]
        opp_code = parts[1] if len(parts) > 1 else "OPP"
        
        res = "W" if row['WL'] == 'W' else "L"
        diff = row['PLUS_MINUS']
        pts = row['PTS']
        opp_pts = pts - diff
        
        sign = "+" if diff > 0 else ""
        
        history.append({
            "date": pd.to_datetime(row['GAME_DATE']).strftime('%Y-%m-%d'),
            "opponent": opp_code,
            "result": res,
            "score_diff": f"{sign}{int(diff)}",
            "score": f"{int(pts)}-{int(opp_pts)}",
            "my_team_abb": my_abb,
            "is_home": is_home
        })
    # Reverse to show newest first
    return history[::-1]

def sync_team_intelligence():
    print("🧠 Synchronisation du module 'Team Intelligence'...")
    
    # Load Data
    if not os.path.exists(DATA_GAMES):
        print(f"⚠️ {DATA_GAMES} introuvable.")
        return
    
    df_games = pd.read_csv(DATA_GAMES)
    
    df_bets = pd.DataFrame()
    if os.path.exists(DATA_BETS):
        try:
            df_bets = pd.read_csv(DATA_BETS)
        except: pass

    # Get Teams
    nba_teams = teams.get_teams()
    records = []
    id_to_name = {t['id']: t['full_name'] for t in nba_teams}

    for t in nba_teams:
        tid = t['id']
        tname = t['full_name']
        
        # 1. Metrics
        acc = get_ai_accuracy(tname, df_bets)
        vol = get_volatility(tid, df_games)
        l5 = get_last_5(tid, df_games, id_to_name)
        
        # 2. Badge Logic
        rating = "NEUTRAL"
        badges = []
        
        # Accuracy Badge
        if acc >= 60:
            rating = "TRUSTED"
            badges.append({"type": "ACCURACY", "label": "IA Fiable", "value": "HIGH", "color": "green"})
        elif acc <= 40 and acc > 0:
            rating = "TRAP" # Piège
            badges.append({"type": "ACCURACY", "label": "IA en échec", "value": "LOW", "color": "red"})
            
        # Volatility Badge
        if vol > 70:
            rating = "VOLATILE" if rating == "NEUTRAL" else rating # Trusted overrides Volatile? Maybe not.
            badges.append({"type": "VOLATILITY", "label": "Imprévisible", "value": "HIGH", "color": "orange"})
        elif vol < 20:
             badges.append({"type": "VOLATILITY", "label": "Stable", "value": "LOW", "color": "blue"})

        # Momentum Badge (from L5)
        wins_l5 = sum(1 for g in l5 if g['result'] == 'W')
        if wins_l5 >= 4:
            badges.append({"type": "MOMENTUM", "label": "En forme", "value": "HOT", "color": "fire"})
        elif wins_l5 <= 1:
            badges.append({"type": "MOMENTUM", "label": "En crise", "value": "COLD", "color": "ice"})

        record = {
            "team_id": tid,
            "team_name": tname,
            "confidence_rating": rating,
            "ai_accuracy": acc,
            "volatility_score": round(vol, 1),
            "last_5_games": l5,
            "insights": badges,
            "updated_at": datetime.utcnow().isoformat()
        }
        records.append(record)
        
    # Upsert
    print(f"🚀 Envoi de {len(records)} analyses vers Supabase...")
    try:
        r = requests.post(ENDPOINT, headers=Headers, data=json.dumps(records))
        if r.status_code in [200, 201, 204]:
            print("✅ Succès Team Intelligence !")
        else:
            print(f"⚠️ Erreur: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"❌ Erreur réseau: {e}")

if __name__ == "__main__":
    sync_team_intelligence()
