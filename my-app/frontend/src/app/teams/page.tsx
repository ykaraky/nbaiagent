"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { getTeamLogoUrl } from '@/utils/nbaTeams';
import Navbar from '@/components/Navbar';
import { Search, Shield, Activity, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

// --- TYPES ---
// --- TYPES ---
interface TeamIntelligence {
    team_id: number;
    team_name: string;
    confidence_rating: string;
    ai_accuracy: number;
    volatility_score: number;
    insights?: any[];
}

interface TeamStanding {
    team_id: number;
    rank: number;
    record: string;
    streak: string;
    last_10: string;
    home_record: string;
    road_record: string;
    conference: string;
}

interface TeamCardData extends TeamIntelligence {
    rank: number;
    record: string;
    streak: string;
    last_10: string;
    home_record: string;
    road_record: string;
    conference: string;
    user_winrate: number;
    user_bets_count: number;
    user_badge: 'NEUTRAL' | 'LUCKY' | 'JINX';
}

// --- SUPABASE ---
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TeamsPage() {
    const [teams, setTeams] = useState<TeamCardData[]>([]);
    const [filteredTeams, setFilteredTeams] = useState<TeamCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "accuracy" | "volatility" | "rank" | "user">("name");

    useEffect(() => {
        async function fetchTeams() {
            setLoading(true);

            // 1. Fetch Integration (Base)
            const { data: teamData, error: teamError } = await supabase
                .from('team_intelligence')
                .select('team_id, team_name, confidence_rating, ai_accuracy, volatility_score');

            // 2. Fetch Standings
            const { data: standingsData, error: standingsError } = await supabase
                .from('nba_standings')
                .select('*');

            // 3. Fetch User Bets (All bets with a prediction)
            const { data: betsData, error: betsError } = await supabase
                .from('bets_history')
                .select('*')
                .not('user_prediction', 'is', null);

            if (teamData && standingsData) {
                // MERGE LOGIC
                const merged: TeamCardData[] = teamData.map(t => {
                    const stand = standingsData.find(s => s.team_id === t.team_id) || {
                        rank: 99, record: '0-0', streak: '-', last_10: '-', home_record: '-', road_record: '-', conference: ''
                    } as TeamStanding;

                    // Calculate User Stats for this team
                    let wins = 0;
                    let finished = 0;
                    // Filter bets where this team was Home OR Away
                    const teamBets = betsData ? betsData.filter(b => b.home_team === t.team_name || b.away_team === t.team_name) : [];

                    teamBets.forEach(bet => {
                        if (bet.real_winner && bet.real_winner !== 'TBD') {
                            finished++;
                            if (bet.user_prediction === bet.real_winner) wins++;
                        }
                    });

                    const winrate = finished > 0 ? Math.round((wins / finished) * 100) : 0;
                    let badge: 'NEUTRAL' | 'LUCKY' | 'JINX' = 'NEUTRAL';
                    if (finished >= 3) {
                        if (winrate >= 65) badge = 'LUCKY';
                        else if (winrate <= 35) badge = 'JINX';
                    }

                    return {
                        ...t,
                        rank: stand.rank || 99,
                        record: stand.record,
                        streak: stand.streak,
                        last_10: stand.last_10,
                        home_record: stand.home_record,
                        road_record: stand.road_record,
                        conference: stand.conference,
                        user_winrate: winrate,
                        user_bets_count: finished,
                        user_badge: badge
                    };
                });

                // Remove duplicates
                const unique = Array.from(new Map(merged.map(item => [item.team_id, item])).values());
                setTeams(unique);
                setFilteredTeams(unique);
            }
            setLoading(false);
        }
        fetchTeams();
    }, []);

    useEffect(() => {
        let res = [...teams];

        // 1. Search
        if (searchTerm) {
            res = res.filter(t => t.team_name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        // 2. Sort
        if (sortBy === 'name') {
            res.sort((a, b) => a.team_name.localeCompare(b.team_name));
        } else if (sortBy === 'accuracy') {
            res.sort((a, b) => b.ai_accuracy - a.ai_accuracy);
        } else if (sortBy === 'volatility') {
            res.sort((a, b) => a.volatility_score - b.volatility_score);
        } else if (sortBy === 'rank') {
            res.sort((a, b) => a.rank - b.rank);
        } else if (sortBy === 'user') {
            res.sort((a, b) => b.user_winrate - a.user_winrate);
        }

        setFilteredTeams(res);
    }, [searchTerm, sortBy, teams]);

    // UI Helpers
    const getConfidenceColor = (rating: string) => {
        switch (rating) {
            case 'TRUSTED': return 'text-green-400 border-green-500/30 bg-green-500/10';
            case 'VOLATILE': return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
            case 'TRAP': return 'text-red-400 border-red-500/30 bg-red-500/10';
            default: return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white font-sans flex flex-col">
            <Navbar activeTab={undefined} />

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 pt-24 pb-20">
                {/* HEADLINE */}
                <PageHeader
                    title="Teams Hub"
                    subtitle="Centrale de commandement des 30 franchises."
                    icon={<Shield className="w-6 h-6 text-purple-500" />}
                    borderColor="border-purple-900/20"
                >
                    {/* ACTIONS */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Chercher une équipe..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#111] border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-[#111] border border-gray-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                            <option value="name">A-Z</option>
                            <option value="rank">Classement</option>
                            <option value="accuracy">Précision IA</option>
                            <option value="user">Ma Précision</option>
                            <option value="volatility">Stabilité</option>
                        </select>
                    </div>
                </PageHeader>

                {/* GRID */}
                {loading ? (
                    <div className="text-center py-20 text-gray-500 animate-pulse">Chargement des données...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredTeams.map((team) => (
                            <Link href={`/teams/${team.team_id}`} key={team.team_id}>
                                <div className="bg-[#111] border border-gray-800 rounded-xl p-5 hover:border-purple-500/30 transition-all hover:-translate-y-1 group relative overflow-hidden h-full flex flex-col">

                                    {/* HEADER: LOGO & RANK */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-16 h-16 relative">
                                            <img
                                                src={getTeamLogoUrl("", team.team_id)}
                                                alt={team.team_name}
                                                className="w-full h-full object-contain filter drop-shadow-lg"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/teams/1610612737.svg' }}
                                            />
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="text-2xl font-black text-white/10 group-hover:text-white/20 transition-colors">#{team.rank}</div>
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getConfidenceColor(team.confidence_rating)}`}>
                                                {team.confidence_rating}
                                            </div>
                                        </div>
                                    </div>

                                    {/* NAME */}
                                    <h2 className="text-lg font-black truncate mb-4">{team.team_name}</h2>

                                    {/* VITALS GRID */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Bilan</span>
                                            <span className="text-sm font-bold text-white">{team.record}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Série</span>
                                            <span className={`text-sm font-bold flex items-center gap-1 ${team.streak?.startsWith('W') ? 'text-green-400' : 'text-red-400'}`}>
                                                {team.streak}
                                                {team.streak?.startsWith('W') ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">L10</span>
                                            <span className="text-sm font-bold text-gray-300">{team.last_10}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Home/Away</span>
                                            <span className="text-[10px] font-bold text-gray-400">{team.home_record} / {team.road_record}</span>
                                        </div>
                                    </div>

                                    {/* METRICS (FOOTER) */}
                                    <div className="mt-auto space-y-3 pt-4 border-t border-gray-800/50">
                                        {/* AI ACCURACY */}
                                        <div>
                                            <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                                                <span>Précision IA</span>
                                                <span className="text-purple-400">{team.ai_accuracy}%</span>
                                            </div>
                                            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500 w-1/2" style={{ width: `${team.ai_accuracy}%` }} />
                                            </div>
                                        </div>

                                        {/* USER ACCURACY */}
                                        {team.user_bets_count > 0 && (
                                            <div>
                                                <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                                                    <span>Ma Précision</span>
                                                    <span className={`${team.user_winrate >= 50 ? 'text-blue-400' : 'text-orange-400'}`}>{team.user_winrate}%</span>
                                                </div>
                                                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                                    <div className={`h-full ${team.user_winrate >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${team.user_winrate}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
