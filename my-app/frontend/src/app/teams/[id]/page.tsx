"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { notFound, useParams } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, Activity, Brain, Target, Shield, Clock } from 'lucide-react';
import { getTeamLogoUrl } from '@/utils/nbaTeams';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

// --- TYPES ---
interface TeamIntelligence {
    team_id: number;
    team_name: string;
    confidence_rating: string;
    ai_accuracy: number;
    volatility_score: number;
    last_5_games: Last5Game[];
    insights: InsightBadge[];
}

interface Last5Game {
    date: string;
    result: "W" | "L";
    is_home: boolean;
    opponent: string;
    score_diff: string;
}

interface InsightBadge {
    type: string;
    label: string;
    value: string;
    color: string;
}

// --- SUPABASE ---
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TeamPage() {
    const params = useParams();
    const teamId = params.id as string;

    const [data, setData] = useState<TeamIntelligence | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTeamData() {
            if (!teamId) return;
            const { data, error } = await supabase
                .from('team_intelligence')
                .select('*')
                .eq('team_id', teamId)
                .single();

            if (error) {
                console.error("Error fetching team data:", error);
            } else {
                setData(data);
            }
            setLoading(false);
        }
        fetchTeamData();
    }, [teamId]);

    if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-gray-500">Chargement de l'intelligence...</div>;
    if (!data) return <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-gray-500 gap-4"><div>Equipe non trouvée ou pas encore analysée.</div><Link href="/" className="text-purple-400 hover:underline">Retour</Link></div>;

    // --- RENDER HELPERS ---
    const getConfidenceColor = (rating: string) => {
        switch (rating) {
            case 'TRUSTED': return 'text-green-400 border-green-500/30 bg-green-500/10';
            case 'VOLATILE': return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
            case 'TRAP': return 'text-red-400 border-red-500/30 bg-red-500/10';
            default: return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-purple-500/30 flex flex-col">
            <Navbar activeTab={undefined} />

            <main className="flex-1 max-w-4xl mx-auto w-full p-4 pt-24 pb-20">
                {/* HEADER */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </Link>
                        <div className="w-16 h-16 bg-gray-900 rounded-full border border-gray-800 p-2 relative overflow-hidden">
                            <img
                                src={getTeamLogoUrl("", parseInt(teamId))}
                                onError={(e) => { (e.target as HTMLImageElement).src = '/teams/1610612737.svg' }}
                                alt={data.team_name}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-wider">{data.team_name}</h1>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getConfidenceColor(data.confidence_rating)} mt-1`}>
                                {data.confidence_rating === 'TRUSTED' && <Shield className="w-3 h-3" />}
                                {data.confidence_rating === 'VOLATILE' && <Activity className="w-3 h-3" />}
                                {data.confidence_rating}
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPI GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {/* INTELLIGENCE IA */}
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Brain className="w-16 h-16 text-purple-500" />
                        </div>
                        <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">Précision IA</div>
                        <div className="text-3xl font-black text-white flex items-baseline gap-2">
                            {data.ai_accuracy}%
                            <span className="text-xs font-normal text-gray-500">de réussite</span>
                        </div>
                        <div className="mt-2 text-xs text-purple-400/80">
                            Historique des paris sur cette équipe
                        </div>
                    </div>

                    {/* VOLATILITY */}
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-5 relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Activity className="w-16 h-16 text-orange-500" />
                        </div>
                        <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">Volatilité</div>
                        <div className="text-3xl font-black text-white flex items-baseline gap-2">
                            {data.volatility_score}
                            <span className="text-xs font-normal text-gray-500">/ 100</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full mt-3 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${data.volatility_score > 60 ? 'bg-orange-500' : 'bg-green-500'}`}
                                style={{ width: `${data.volatility_score}%` }}
                            />
                        </div>
                    </div>

                    {/* BADGES / INSIGHTS */}
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-5 flex flex-col justify-center gap-2">
                        <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">État de forme</div>
                        {data.insights.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {data.insights.map((badge, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-sm">
                                        <span className={`w-2 h-2 rounded-full ${badge.color === 'fire' ? 'bg-red-500 animate-pulse' : badge.color === 'ice' ? 'bg-blue-400' : badge.color === 'green' ? 'bg-green-500' : 'bg-gray-500'}`} />
                                        <span className="font-medium text-gray-200">{badge.label}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-sm italic">Aucun signal particulier.</div>
                        )}
                    </div>
                </div>

                {/* RECENT GAMES */}
                <div className="bg-[#111] border border-gray-800 rounded-xl p-6 mb-8">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        Derniers 5 Matchs de l'Équipe
                    </h2>
                    <div className="space-y-3">
                        {data.last_5_games.map((game, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-8 rounded-full ${game.result === 'W' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <div>
                                        <div className="text-sm font-bold text-gray-200">
                                            {game.is_home ? 'vs' : '@'} {game.opponent}
                                        </div>
                                        <div className="text-xs text-gray-500">{game.date}</div>
                                    </div>
                                </div>
                                <div className={`text-sm font-bold font-mono ${game.result === 'W' ? 'text-green-400' : 'text-red-400'}`}>
                                    {game.result === 'W' ? '+' : ''}{game.score_diff}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MODULE UTILISATEUR: Historique & Affinité */}
                <UserHistoryModule teamId={teamId} teamName={data.team_name} />

            </main>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function UserHistoryModule({ teamId, teamName }: { teamId: string, teamName: string }) {
    const [stats, setStats] = useState<{ total: number, winrate: number, badge: string, history: any[] } | null>(null);

    useEffect(() => {
        async function fetchUserStats() {
            // Fetch bets involving this team where User Voted
            const { data: bets } = await supabase
                .from('bets_history')
                .select('*')
                .not('user_prediction', 'is', null) // Only where user voted
                .or(`home_team.eq."${teamName}",away_team.eq."${teamName}"`) // Involved this team
                .order('game_date', { ascending: false })
                .limit(10); // Last 10 user bets

            if (!bets || bets.length === 0) {
                setStats({ total: 0, winrate: 0, badge: 'NEUTRAL', history: [] });
                return;
            }

            // Calculate Stats
            let wins = 0;
            let finished = 0;

            bets.forEach(bet => {
                if (bet.real_winner && bet.real_winner !== 'TBD') {
                    finished++;
                    if (bet.user_prediction === bet.real_winner) wins++;
                }
            });

            const winrate = finished > 0 ? Math.round((wins / finished) * 100) : 0;

            // Badge Logic
            let badge = "NEUTRAL";
            if (finished >= 3) {
                if (winrate >= 65) badge = "LUCKY";
                else if (winrate <= 35) badge = "JINX";
            }

            setStats({ total: bets.length, winrate, badge, history: bets });
        }

        fetchUserStats();
    }, [teamId, teamName]);

    if (!stats) return <div className="p-4 text-center text-gray-600 animate-pulse">Chargement de votre historique...</div>;

    if (stats.total === 0) return (
        <div className="bg-[#111] border border-gray-800 border-dashed rounded-xl p-6 text-center">
            <h2 className="text-lg font-bold mb-2 text-gray-400">Votre Historique</h2>
            <p className="text-sm text-gray-500">Vous n'avez pas encore parié sur {teamName}.</p>
        </div>
    );

    return (
        <div className="bg-[#111] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-400" />
                        Votre Historique
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Vos performances sur {teamName}</p>
                </div>

                {/* Badge Affinité */}
                {stats.badge === 'LUCKY' && (
                    <div className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full flex items-center gap-2">
                        <span className="text-lg">🍀</span>
                        <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Porte-Bonheur</span>
                    </div>
                )}
                {stats.badge === 'JINX' && (
                    <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full flex items-center gap-2">
                        <span className="text-lg">🐈‍⬛</span>
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Chat Noir</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* GLOBAL STATS */}
                <div className="bg-gray-900/50 rounded-lg p-4 flex flex-col justify-center items-center border border-gray-800">
                    <div className="text-3xl font-black text-white">{stats.winrate}%</div>
                    <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Votre Réussite</div>
                    <div className="text-[10px] text-gray-600 mt-2">{stats.total} paris placés</div>
                </div>

                {/* BET LIST */}
                <div className="md:col-span-2 space-y-2">
                    {stats.history.map((bet) => {
                        const isWin = bet.real_winner && bet.user_prediction === bet.real_winner;
                        const isPending = !bet.real_winner || bet.real_winner === 'TBD';

                        return (
                            <div key={bet.id} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg border border-gray-800/50 text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-500 text-xs w-16">{bet.date}</span>
                                    <div className="font-medium">
                                        <span className={bet.home_team === teamName ? 'text-white' : 'text-gray-500'}>{bet.home_team.substring(0, 3)}</span>
                                        <span className="text-gray-600 mx-1">vs</span>
                                        <span className={bet.away_team === teamName ? 'text-white' : 'text-gray-500'}>{bet.away_team.substring(0, 3)}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-xs">
                                        <span className="text-gray-500 mr-2">Votre Vote:</span>
                                        <span className="font-bold text-purple-300">{bet.user_prediction}</span>
                                    </div>

                                    {isPending ? (
                                        <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">EN COURS</span>
                                    ) : (
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isWin ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {isWin ? 'GAGNÉ' : 'PERDU'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
