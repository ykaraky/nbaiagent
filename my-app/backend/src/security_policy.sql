-- 🛡️ SECURITY HARDENING SCRIPT 🛡️
-- Ce script active la sécurité RLS (Row Level Security) sur toutes vos tables.
-- Une fois activé : SEUL le backend (avec sa clé service_role) pourra écrire.
-- Le public (votre site web) pourra SEULEMENT lire.

BEGIN;

-- 1. Table: bets_history (Historique des paris)
ALTER TABLE bets_history ENABLE ROW LEVEL SECURITY;

-- Politique de LECTURE (Tout le monde peut voir les paris)
CREATE POLICY "Public Read Bets" 
ON bets_history FOR SELECT 
USING (true);

-- Politique d'ÉCRITURE (Seul le Service Role peut modifier)
-- Note: Le Service Role bypass RLS par défaut, donc on n'a même pas besoin de policy explicite pour lui,
-- MAIS on doit s'assurer qu'aucune autre policy 'anon' ne permet d'écriture.
-- En activant RLS sans créer de policy FOR INSERT/UPDATE pour 'anon', on bloque implicitement l'écriture publique.

-- (Optionnel: Reset des policies existantes si besoin)
-- DROP POLICY IF EXISTS "Public Read Bets" ON bets_history;
-- DROP POLICY IF EXISTS "Public Write Bets" ON bets_history;


-- 2. Table: nba_games (Scores)
ALTER TABLE nba_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Games" 
ON nba_games FOR SELECT 
USING (true);


-- 3. Table: nba_standings (Classements)
ALTER TABLE nba_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Standings" 
ON nba_standings FOR SELECT 
USING (true);


-- 4. Table: reason_types (Types de badges)
ALTER TABLE reason_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read ReasonTypes" 
ON reason_types FOR SELECT 
USING (true);


-- 5. Table: reasons (Liaison Match <-> Badges)
ALTER TABLE reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Reasons" 
ON reasons FOR SELECT 
USING (true);


COMMIT;

-- ✅ TERMINÉ.
-- A partir de maintenant, toute tentative d'écriture via l'API publique (Postman, Hacker) sera rejetée (401/403).
-- Vos scripts Python continueront de fonctionner car ils utilisent la SERVICE_ROLE_KEY.
