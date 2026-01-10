import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import MatchCard from '@/components/MatchCard';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

// ... imports remain the same

interface Match {
  id: number;
  game_date: string;
  home_team: string;
  away_team: string;
  predicted_winner: string;
  confidence: string;
  real_winner?: string;
  user_prediction?: string;
  user_reason?: string;
  // Official Data from nba_games
  home_score?: number;
  away_score?: number;
  status?: string;
  // ... Match interface
  home_stats?: any; // JSONB
  away_stats?: any; // JSONB
  home_id?: number;
  away_id?: number;
  home_rank?: number;
  away_rank?: number;
  home_record?: string;
  away_record?: string;
  home_streak?: string;
  away_streak?: string;
  // V12 Context Features
  home_rest_days?: number;
  away_rest_days?: number;
  home_is_b2b?: boolean;
  away_is_b2b?: boolean;
  home_last10?: number;
  away_last10?: number;
  home_win_rate_specific?: number;
  away_win_rate_specific?: number;

  // V13 Explainability
  ai_explanation?: string;
  risk_level?: string;
  badges?: string;
  [key: string]: any;
}

import { NBA_TEAMS } from '@/utils/nbaTeams';

// Helper to get Abbr from Full Name
const getAbbr = (fullName: string) => {
  const t = NBA_TEAMS.find(team => team.teamName === fullName || team.simpleName === fullName);
  return t ? t.abbreviation : fullName;
}

import HomeClient from './HomeClient';

export default async function Home() {
  const today = new Date();
  const todayKey = today.toISOString().substring(0, 10);

  // 1. Fetch Past Matches (Bets History)
  const { data: pastMatches } = await supabase
    .from('bets_history')
    .select('*')
    .lt('game_date', todayKey)
    .order('game_date', { ascending: false })
    .limit(50);

  // 2. Fetch Future Matches (Bets History)
  const { data: futureMatches } = await supabase
    .from('bets_history')
    .select('*')
    .gte('game_date', todayKey)
    .order('game_date', { ascending: true })
    .limit(50);

  // 3. Collect unique dates
  const allMatches = [...(pastMatches || []), ...(futureMatches || [])];
  const uniqueDates = Array.from(new Set(allMatches.map(m => m.game_date.substring(0, 10))));

  // 4. Fetch Official NBA Data
  let officialGamesMap: Record<string, any> = {};
  if (uniqueDates.length > 0) {
    const { data: officialGames } = await supabase
      .from('nba_games')
      .select('*')
      .in('game_date', uniqueDates);

    officialGames?.forEach(game => {
      const dateStr = game.game_date.split('T')[0];
      const key = `${dateStr}|${game.home_team.toLowerCase().trim()}`;
      officialGamesMap[key] = game;
    });
  }

  // 4b. Fetch Standings
  let standingsMap: Record<string, any> = {};
  const { data: standings } = await supabase.from('nba_standings').select('*');
  standings?.forEach(team => {
    standingsMap[team.team_name.toLowerCase().trim()] = team;
  });

  // 5. Merge Data
  const enrichMatch = (m: Match) => {
    const mDate = m.game_date.split('T')[0];
    const homeFull = m.home_team.toLowerCase().trim();
    const homeAbbr = getAbbr(m.home_team).toLowerCase().trim();

    const keyFull = `${mDate}|${homeFull}`;
    const keyAbbrSearch = `${mDate}|${homeAbbr}`;
    const official = officialGamesMap[keyFull] || officialGamesMap[keyAbbrSearch];

    const homeSt = standingsMap[homeFull];
    const awaySt = standingsMap[m.away_team.toLowerCase().trim()];

    let enriched = { ...m };

    if (official) {
      const { id: officialId, game_date: offDate, home_team: offHome, away_team: offAway, ...officialData } = official;
      enriched = { ...enriched, ...officialData };
      enriched.real_winner = m.real_winner || (official.home_score > official.away_score ? official.home_team : official.away_team);

      enriched.home_rest_days = official.rest_days_home;
      enriched.away_rest_days = official.rest_days_away;
      enriched.home_is_b2b = official.is_b2b_home;
      enriched.away_is_b2b = official.is_b2b_away;
      enriched.home_last10 = official.last10_home_wins;
      enriched.away_last10 = official.last10_away_wins;
      enriched.home_win_rate_specific = official.home_win_rate_specific;
      enriched.away_win_rate_specific = official.away_win_rate_specific;
    }

    if (homeSt) {
      enriched.home_id = homeSt.team_id;
      enriched.home_rank = homeSt.rank;
      enriched.home_record = homeSt.record;
      enriched.home_streak = homeSt.streak;
      if (homeSt.last_10) { const parts = homeSt.last_10.split('-'); if (parts.length === 2) enriched.home_last10 = parseInt(parts[0]); }
      if (homeSt.home_record) { const parts = homeSt.home_record.split('-'); if (parts.length === 2) { const w = parseInt(parts[0]); const l = parseInt(parts[1]); enriched.home_win_rate_specific = w / (w + l); } }
    }
    if (awaySt) {
      enriched.away_id = awaySt.team_id;
      enriched.away_rank = awaySt.rank;
      enriched.away_record = awaySt.record;
      enriched.away_streak = awaySt.streak;
      if (awaySt.last_10) { const parts = awaySt.last_10.split('-'); if (parts.length === 2) enriched.away_last10 = parseInt(parts[0]); }
      if (awaySt.road_record) { const parts = awaySt.road_record.split('-'); if (parts.length === 2) { const w = parseInt(parts[0]); const l = parseInt(parts[1]); enriched.away_win_rate_specific = w / (w + l); } }
    }

    return enriched;
  };

  const enrichedPast = pastMatches?.map(enrichMatch) || [];
  const enrichedFuture = futureMatches?.map(enrichMatch) || [];

  // Grouping Logic 
  const groupMatches = (list: Match[]) => {
    const grouped: Record<string, Match[]> = {};
    list.forEach((m) => {
      const dateKey = m.game_date.substring(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(m);
    });
    return grouped;
  };

  const pastGrouped = groupMatches(enrichedPast);
  const futureGrouped = groupMatches(enrichedFuture);

  const pastDates = Object.keys(pastGrouped).sort().reverse();
  const futureDates = Object.keys(futureGrouped).sort();

  const latestResultsDate = pastDates.length > 0 ? pastDates[0] : null;
  const upcomingMatchesDate = futureDates.length > 0 ? futureDates[0] : null;

  const displayResults = latestResultsDate ? pastGrouped[latestResultsDate] : [];
  const displayUpcoming = upcomingMatchesDate ? futureGrouped[upcomingMatchesDate] : [];

  // Analytics Calculation
  let aiWins = 0, userWins = 0, totalFinished = 0;
  if (displayResults.length > 0) {
    displayResults.forEach(m => {
      if (m.real_winner || m.status === 'Final') {
        let winner = m.real_winner;
        if (!winner && m.status === 'Final' && m.home_score !== undefined && m.away_score !== undefined) {
          winner = m.home_score > m.away_score ? m.home_team : m.away_team;
        }

        if (winner) {
          totalFinished++;
          if (m.predicted_winner === winner) aiWins++;
          if (m.user_prediction === winner) userWins++;
        }
      }
    });
  }

  return (
    <HomeClient
      resultsMatches={displayResults}
      upcomingMatches={displayUpcoming}
      resultsDate={latestResultsDate}
      upcomingDate={upcomingMatchesDate}
      stats={{ aiWins, userWins, totalFinished }}
    />
  );
}