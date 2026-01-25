-- 1. Table: players
-- Catalogue des joueurs actifs (mis à jour par script)
CREATE TABLE IF NOT EXISTS players (
    id BIGINT PRIMARY KEY, -- utilise l'ID NBA officiel
    full_name TEXT NOT NULL,
    team_id BIGINT,
    position TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    season TEXT NOT NULL, -- ex: "2025-26"
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: player_ranking
-- Classement manuel défini par l'utilisateur
CREATE TABLE IF NOT EXISTS player_ranking (
    player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
    season TEXT NOT NULL,
    rank INTEGER NOT NULL, -- 1 = Meilleur
    rank_group TEXT, -- ex: "MVP", "All-Star", "Starter"
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (player_id, season)
);

-- 3. Row Level Security (RLS)
-- Lecture publique, Écriture sécurisée (Service Role uniquement pour l'instant)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_ranking ENABLE ROW LEVEL SECURITY;

-- Policy: Tout le monde peut lire
CREATE POLICY "Public Read Players" ON players
    FOR SELECT USING (true);
    
CREATE POLICY "Public Read Ranking" ON player_ranking
    FOR SELECT USING (true);

-- Policy: Seul le service_role peut écrire (via Scripts ou API sécurisée)
-- Note: On n'ajoute pas de policy INSERT/UPDATE publique pour éviter le defacing.
-- L'API via code PIN utilisera le client Supabase avec Service Key ou alors une fonction RPC si besoin.
-- Pour l'instant, on laisse fermé aux 'anon'.

-- 4. Index pour performance
CREATE INDEX IF NOT EXISTS idx_players_season ON players(season);
CREATE INDEX IF NOT EXISTS idx_ranking_rank ON player_ranking(rank);
