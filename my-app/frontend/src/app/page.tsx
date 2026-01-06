import { createClient } from '@supabase/supabase-js';
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
  [key: string]: any;
}

import { NBA_TEAMS } from '@/utils/nbaTeams';

// Helper to get Abbr from Full Name
const getAbbr = (fullName: string) => {
  const t = NBA_TEAMS.find(team => team.teamName === fullName || team.simpleName === fullName);
  return t ? t.abbreviation : fullName;
}

export default async function Home() {
  const today = new Date();
  const todayKey = today.toISOString().substring(0, 10); // used for > < queries
  // ... imports OK

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

  // 3. Collect unique dates to fetch official stats efficiently
  const allMatches = [...(pastMatches || []), ...(futureMatches || [])];
  const uniqueDates = Array.from(new Set(allMatches.map(m => m.game_date.substring(0, 10))));

  // 4. Fetch Official NBA Data (nba_games) for these dates
  let officialGamesMap: Record<string, any> = {};

  if (uniqueDates.length > 0) {
    const { data: officialGames } = await supabase
      .from('nba_games')
      .select('*')
      .in('game_date', uniqueDates);

    officialGames?.forEach(game => {
      const dateStr = game.game_date.split('T')[0];
      // Index by normalized "date|teamname"
      const key = `${dateStr}|${game.home_team.toLowerCase().trim()}`;
      officialGamesMap[key] = game;
    });
  }

  // 4b. Fetch Standings (New)
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

    // Search by Full Name key OR Abbreviation key
    const keyFull = `${mDate}|${homeFull}`;
    const keyAbbrSearch = `${mDate}|${homeAbbr}`;

    const official = officialGamesMap[keyFull] || officialGamesMap[keyAbbrSearch];

    // Standings Merge
    const homeSt = standingsMap[homeFull];
    const awaySt = standingsMap[m.away_team.toLowerCase().trim()];

    let enriched = { ...m };

    if (official) {
      const { id: officialId, game_date: offDate, home_team: offHome, away_team: offAway, ...officialData } = official;
      enriched = { ...enriched, ...officialData };
      enriched.real_winner = m.real_winner || (official.home_score > official.away_score ? official.home_team : official.away_team);
    }

    if (homeSt) {
      enriched.home_id = homeSt.team_id;
      enriched.home_rank = homeSt.rank;
      enriched.home_record = homeSt.record;
      enriched.home_streak = homeSt.streak;
    }
    if (awaySt) {
      enriched.away_id = awaySt.team_id;
      enriched.away_rank = awaySt.rank;
      enriched.away_record = awaySt.record;
      enriched.away_streak = awaySt.streak;
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

  // Find keys
  const pastDates = Object.keys(pastGrouped).sort().reverse();
  const futureDates = Object.keys(futureGrouped).sort();

  // Select display dates
  const latestResultsDate = pastDates.length > 0 ? pastDates[0] : null;
  const upcomingMatchesDate = futureDates.length > 0 ? futureDates[0] : null;

  const displayResults = latestResultsDate ? pastGrouped[latestResultsDate] : [];
  const displayUpcoming = upcomingMatchesDate ? futureGrouped[upcomingMatchesDate] : [];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans">

      <header className="mb-12 text-center mt-6">
        <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">
          NBAiAGENT
        </h1>
        <p className="text-gray-500 font-medium">next.js edition</p>
      </header>

      <div className="max-w-7xl mx-auto space-y-12">

        {/* SECTION: DERNIERS RÉSULTATS */}
        {displayResults.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-gray-200 border-b border-gray-800 pb-2">
              <span className="bg-gray-800 w-2 h-8 rounded-full"></span>
              DERNIERS RÉSULTATS
              <span className="text-sm font-normal text-gray-500 ml-auto font-mono bg-gray-900 px-3 py-1 rounded-lg border border-gray-800">
                {latestResultsDate}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayResults.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {/* SECTION: MATCHES À VENIR */}
        {displayUpcoming.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-gray-200 border-b border-gray-800 pb-2">
              <span className="bg-cyan-500 w-2 h-8 rounded-full"></span>
              MATCHES À VENIR
              <span className="text-sm font-normal text-gray-500 ml-auto font-mono bg-gray-900 px-3 py-1 rounded-lg border border-gray-800">
                {upcomingMatchesDate}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayUpcoming.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {displayResults.length === 0 && displayUpcoming.length === 0 && (
          <div className="text-center text-gray-500 py-20">
            Aucun match trouvé récemment ou à venir.
          </div>
        )}

      </div>
    </main>
  );
}