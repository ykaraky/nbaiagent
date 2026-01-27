-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- TEAM INTELLIGENCE TABLE
-- One row per team, updated daily by AI
create table if not exists team_intelligence (
    team_id bigint primary key, -- NBA Team ID (e.g., 1610612747)
    team_name text not null,
    
    -- AI Analysis
    confidence_rating text, -- "TRUSTED", "VOLATILE", "NEUTRAL", "AVOID"
    ai_accuracy float,      -- 0.0 to 100.0 (Winrate of AI on this team)
    volatility_score float, -- 0.0 to 100.0 (Stability index)
    
    -- Context Data
    last_5_games jsonb,     -- Array of objects [{date, opponent, result, score_diff}]
    next_game jsonb,        -- Object {date, opponent, home_away}
    insights jsonb,         -- Array of specific badges [{type: "MOMENTUM", value: "HIGH", label: "Sur une série"}]
    
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS POLICIES
alter table team_intelligence enable row level security;

-- Allow Public Read
create policy "Public Read Team Intelligence"
on team_intelligence for select
to anon
using (true);

-- Allow Service Role Write (Python Script)
create policy "Service Role Write Team Intelligence"
on team_intelligence for all
to service_role
using (true)
with check (true);
