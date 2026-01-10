import pandas as pd
import numpy as np

# --- CONFIGURATION (Thresholds) ---
# Can be moved to a YAML/JSON later if needed.
CONFIG = {
    # 1. CRASH (Feature: DIFF_MARGIN_CRASH)
    # Recommended: P10 or Z-Score <= -1.0
    # We will use a Z-Score concept if stats avail, or fixed values if not.
    # From Analysis: V13 MARGIN_CRASH_HOME/AWAY range is roughly +/- 15? 
    # Let's use a safe default for "High Crash" and calibration later.
    'CRASH_THRESHOLD': -7.0, # TBD - If Difference is lower than -7 points (Team A much worse recent blowout status)
    
    # 2. VOLATILITY (Feature: DIFF_VOLATILITY)
    # Recommended: Z-Score >= 1.0
    # Volatility is StdDev. Diff Volatility range? 
    # If Team A Var (15) - Team B Var (5) = 10.
    'VOLATILITY_THRESHOLD': 5.0, # TBD - Difference in Std Dev
    
    # 3. STRUCTURE (Feature: DIFF_SPECIFIC_WIN_RATE)
    # Recommended: P75
    # Specific Win Rate is 0.0 to 1.0. Diff is -1.0 to 1.0. 
    # Dominant Structure usually means > 20% diff?
    'STRUCTURE_THRESHOLD': 0.20, 
    
    # 4. FAVORITE (Model Probability)
    'FAVORITE_THRESHOLD': 0.60,
}

def get_explanation_and_risk(feats, prob_home, home_name, away_name):
    """
    Generates AI Reason, Risk Level, and Badges based on V13 Logic.
    Returns: dict with 'reason', 'risk_level', 'badges' (list of 2 strings max)
    """
    
    # Extract Features
    crash_diff = feats.get('DIFF_MARGIN_CRASH', 0)
    volatility_diff = feats.get('DIFF_VOLATILITY', 0)
    structure_diff = feats.get('DIFF_SPECIFIC_WIN_RATE', 0)
    
    # Identify Favorite
    is_home_fav = prob_home >= 0.5
    favorite_prob = prob_home if is_home_fav else (1 - prob_home)
    favorite_name = home_name if is_home_fav else away_name
    opponent_name = away_name if is_home_fav else home_name
    
    # --- 1. DETECT SIGNALS ---
    
    # A. CRASH (Effondrement Collectif)
    # If fav is Home, we check if Opponent (Away) has crashed? 
    # DIFF_MARGIN_CRASH = Home - Away.
    # If Home is Fav: High Margin Crash for Away means Away is crashing.
    # Wait, MARGIN_CRASH is weighted recent point diff. 
    # Positive = Good recent wins. Negative = Recent blowouts.
    # If Away is crashing, Away Margin Crash is very negative.
    # DIFF (Home - Away) would be (Normal - Negative) = POSITIVE HIGH.
    #
    # User Spec: "DIFF_MARGIN_CRASH <= P10 ... interpreted as Team Favorite subit plus de défaites"
    # Wait. User interpretation: "L’équipe favorite subit récemment plus de lourdes défaites que l’adversaire."
    # So the SIGNAL is against the favorite.
    #
    # If Home is Fav:
    # We warn if Home has a CRASH.
    # Home Crash -> Low/Negative Value. 
    # Away Normal -> Normal Value.
    # DIFF (Home - Away) -> Negative.
    # So if DIFF < Threshold (Negative), Home (Fav) is crashing relative to Away.
    #
    # If Away is Fav:
    # Away Crash -> Low/Negative.
    # Home Normal.
    # DIFF (Home - Away) -> Positive.
    # So if DIFF > Threshold (Positive), Away (Fav) is crashing relative to Home.
    
    crash_signal = False
    if is_home_fav:
        if crash_diff <= CONFIG['CRASH_THRESHOLD']: # Home crashing
            crash_signal = True
    else:
        if crash_diff >= -CONFIG['CRASH_THRESHOLD']: # Away crashing (Positive diff)
            crash_signal = True

    # B. VOLATILITY (Instabilité)
    # User Spec: "abs(zscore) >= Z". Danger comes from extremes.
    # "L’équipe adverse montre une forte instabilité".
    # Warning usually if Favorite is unstable? OR Opponent is chaos?
    # Context: "Sauver des paris pièges".
    # Usually: Avoid betting ON an unstable team, or betting AGAINST a chaotic team (variance).
    # User Spec for Trap: "Favorite + Volatility High + Crash High = Danger".
    # This implies the attributes belong to the Favorite or the context of the match makes it dangerous.
    # Let's assume Volatility Signal = High Volatility Difference (one team much more unstable).
    
    volatility_signal = abs(volatility_diff) >= CONFIG['VOLATILITY_THRESHOLD']
    
    # C. STRUCTURE (Dominance)
    # Favori must have structural advantage.
    # If Home Fav: Structure Diff > Threshold.
    # If Away Fav: Structure Diff < -Threshold.
    structure_signal = False
    if is_home_fav:
        if structure_diff >= CONFIG['STRUCTURE_THRESHOLD']:
            structure_signal = True
    else:
        if structure_diff <= -CONFIG['STRUCTURE_THRESHOLD']:
            structure_signal = True

    # --- 2. TRAP GAME LOGIC (Risk Level) ---
    # Formula: FAVORITE AND (CRASH OR VOLATILITY) AND NOT STRUCTURE
    
    is_strong_favorite = favorite_prob >= CONFIG['FAVORITE_THRESHOLD']
    
    trap_game = False
    risk_level = "Low"
    
    if is_strong_favorite and not structure_signal:
        if crash_signal or volatility_signal:
            trap_game = True
            
            if crash_signal and volatility_signal:
                risk_level = "High" # Danger élevé
            else:
                risk_level = "Medium" # Match piégeux

    # Override for non-strong favorites (Toss-up)
    if not is_strong_favorite:
        risk_level = "Medium"

    # --- 3. REASON GENERATION (Priorities) ---
    
    reason = "Analyse IA en cours..."
    badges = []

    # Priority 1: CRASH (Overrides everything if present on Favorite? Or Opponent?)
    # User: "L’équipe adverse montre des signes d’effondrement" -> Good for picking Fav.
    # BUT "L'équipe favorite subit... " -> Bad for picking Fav (Trap).
    
    # Let's distinguish: "Why this pick?"
    # We are explaining WHY we picked the winner (Favorite).
    
    # Case A: We picked the Favorite.
    # 1. Did we pick because Opponent Crashing?
    # If Home Picked (Fav): Away Crash? (Diff Positive High).
    # 2. Did we pick because Structure?
    # 3. Did we pick because Game Stats?
    
    # Case B: We picked the Underdog (Upset).
    # 1. Because Fav Crashing?
    
    # Let's stick to the User's "Labels for the Decision".
    
    # Logic for "Why":
    # If we picked Home:
    #   Check structure > 0 (Home better structure).
    #   Check crash diff > 0 (Away crashing more than Home).
    #   Check volatility?
    
    # Let's simplify based on USER MAPPING:
    
    # Label: Effondrement collectif
    # Trigger: DIFF_MARGIN_CRASH indicates the LOSER is crashing.
    # If Home Wins: We want DIFF > Threshold (Away Crashing).
    # If Away Wins: We want DIFF < Threshold (Home Crashing).
    
    loser_crashing = False
    if prob_home > 0.5: # Predicting Home
        if crash_diff >= abs(CONFIG['CRASH_THRESHOLD']): loser_crashing = True
    else: # Predicting Away
        if crash_diff <= -abs(CONFIG['CRASH_THRESHOLD']): loser_crashing = True
        
    # Label: Instabilité récente
    # Trigger: High Volatility on the LOSER? Or just General Chaos?
    # User: "L’équipe adverse montre une forte instabilité".
    # So Volatility on the Loser.
    
    opponent_unstable = False
    # If Home Wins, Away is Opponent. Volatility Diff (Home - Away).
    # If Away has high vol, Diff is Low involved? Volatility is always positive.
    # Low Diff (Home Low - Away High) = Negative.
    if prob_home > 0.5:
        if volatility_diff <= -CONFIG['VOLATILITY_THRESHOLD']: opponent_unstable = True
    else:
        if volatility_diff >= CONFIG['VOLATILITY_THRESHOLD']: opponent_unstable = True

    # Label: Avantage Structurel
    # Trigger: Winner has structure advantage.
    winner_structure = False
    if prob_home > 0.5:
        if structure_diff >= CONFIG['STRUCTURE_THRESHOLD']: winner_structure = True
    else:
        if structure_diff <= -CONFIG['STRUCTURE_THRESHOLD']: winner_structure = True

    # --- SELECT REASON ---
    
    main_reason = ""
    
    if loser_crashing:
        main_reason = f"L'équipe adverse ({opponent_name}) montre des signes d'effondrement collectif récents."
        badges.append("📉 Effondrement")
    
    elif opponent_unstable:
        main_reason = f"L'équipe adverse ({opponent_name}) traverse une zone de forte instabilité."
        badges.append("🎢 Instabilité")
    
    elif winner_structure:
        main_reason = f"{favorite_name} bénéficie d'un avantage structurel solide (Domicile/Extérieur)."
        badges.append("🧱 Solide")
        
    else:
        # Fallback
        main_reason = f"{favorite_name} présente une meilleure dynamique de jeu globale (Efficacité/Forme)."
        badges.append("⚡ Forme")

    # Add specifics if Trap Game (Warning context)
    if trap_game:
        # If it's a trap game, maybe we still picked the favorite, but with High Risk.
        # Or maybe we picked the Underdog?
        # The Trap Logic was: Favorite is fragile.
        # If we picked the Favorite despite Trap Signal -> High Risk.
        pass

    return {
        "explanation": main_reason,
        "risk_level": risk_level,
        "badges": badges # List of strings [Badge1, Badge2]
    }
