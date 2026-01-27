"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { notFound, useParams } from 'next/navigation';
import { ArrowLeft, TrendingUp, Activity, Brain, Target, Shield, Clock, CheckCircle2, XCircle } from 'lucide-react';
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
    score?: string;
    my_team_abb?: string;
}

interface InsightBadge {
    type: string;
    label: string;
    value: string;
    color: string;
}

interface UserStats {
    total: number;
    winrate: number;
    badge: string;
    history: any[];
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
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!teamId) return;

            // 1. Fetch Team Intelligence
            const { data: teamData, error: teamError } = await supabase
                .from('team_intelligence')
                .select('*')
                .eq('team_id', teamId)
                .single();

            if (teamError) {
                console.error("Error fetching team data:", teamError);
            } else {
                setData(teamData);
                fetchUserStats(teamData.team_name); // Match with team name
            }
            setLoading(false);
        }

        async function fetchUserStats(teamName: string) {
            const { data: bets } = await supabase
                .from('bets_history')
                .select('*')
                .not('user_prediction', 'is', null)
                .or(`home_team.eq."${teamName}",away_team.eq."${teamName}"`)
                .order('game_date', { ascending: false })
                .limit(10);

            if (!bets || bets.length === 0) {
                setUserStats({ total: 0, winrate: 0, badge: 'NEUTRAL', history: [] });
                return;
            }

            let wins = 0;
            let finished = 0;
            bets.forEach(bet => {
                if (bet.real_winner && bet.real_winner !== 'TBD') {
                    finished++;
                    if (bet.user_prediction === bet.real_winner) wins++;
                }
            });

            const winrate = finished > 0 ? Math.round((wins / finished) * 100) : 0;
            let badge = "NEUTRAL";
            if (finished >= 3) {
                if (winrate >= 65) badge = "LUCKY";
                else if (winrate <= 35) badge = "JINX";
            }
            setUserStats({ total: bets.length, winrate, badge, history: bets });
        }

        fetchData();
    }, [teamId]);

    if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-gray-500">Chargement...</div>;
    if (!data) return <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-gray-500 gap-4"><div>Equipe non trouvée.</div><Link href="/teams" className="text-purple-400 hover:underline">Retour Hub Teams</Link></div>;

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
                        <Link href="/teams" className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {/* INTELLIGENCE IA */}
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-4 relative overflow-hidden group hover:border-purple-500/30 transition-colors flex flex-col justify-between h-32">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Précision IA</div>
                                <Brain className="w-4 h-4 text-purple-500" />
                            </div>
                            <div className="text-3xl font-black text-white flex items-baseline gap-1">
                                {data.ai_accuracy}%
                            </div>
                        </div>
                        {/* Subtle bar */}
                        <div className="w-full h-1.5 bg-gray-800 rounded-full mt-auto">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${data.ai_accuracy}%` }} />
                        </div>
                    </div>

                    {/* USER PRECISION (SYMMETRIC) */}
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-4 relative overflow-hidden group hover:border-blue-500/30 transition-colors flex flex-col justify-between h-32">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Ma Précision</div>
                                <Target className="w-4 h-4 text-blue-500" />
                            </div>
                            {userStats && userStats.total > 0 ? (
                                <div className="text-3xl font-black text-blue-400 flex items-baseline gap-1">
                                    {userStats.winrate}%
                                </div>
                            ) : (
                                <div className="text-sm text-gray-600 italic mt-2">Aucun pari</div>
                            )}
                        </div>
                        {userStats && userStats.total > 0 && (
                            <div className="w-full h-1.5 bg-gray-800 rounded-full mt-auto">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${userStats.winrate}%` }} />
                            </div>
                        )}
                    </div>

                    {/* VOLATILITY (SCORE + GAUGE) */}
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-4 group hover:border-orange-500/30 transition-colors flex flex-col justify-between h-32">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Volatilité</div>
                                <Activity className="w-4 h-4 text-orange-500" />
                            </div>
                            <div className="text-3xl font-black text-white flex items-baseline gap-1">
                                {data.volatility_score}<span className="text-xs text-gray-500 font-normal">/100</span>
                            </div>
                        </div>
                        {/* Unified Bar */}
                        <div className="w-full h-1.5 bg-gray-800 rounded-full mt-auto">
                            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${data.volatility_score}%` }} />
                        </div>
                    </div>

                    {/* BADGES / FORM */}
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col justify-start h-32">
                        <div className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-3">État de Forme</div>
                        {data.insights.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {data.insights.slice(0, 3).map((badge, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${badge.color === 'fire' ? 'bg-red-500' : badge.color === 'green' ? 'bg-green-500' : 'bg-blue-400'}`} />
                                        <span className="text-xs font-medium text-gray-300">{badge.label}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-600 text-xs italic">-</div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: RECENT GAMES */}
                    <div className="lg:col-span-1">
                        <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-gray-400 uppercase tracking-wider">
                            <Clock className="w-4 h-4" />
                            Derniers 5 Matchs
                        </h2>
                        <div className="space-y-2">
                            {data.last_5_games.map((game, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-[#111] rounded-lg border border-gray-800 hover:bg-gray-900/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1 h-8 rounded-full ${game.result === 'W' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <div>
                                            <div className="text-sm text-gray-200">
                                                <span className="font-black text-white">{game.my_team_abb || 'THIS'}</span>
                                                <span className="text-gray-500 mx-1">{game.is_home ? 'vs' : '@'}</span>
                                                <span className="font-bold text-gray-400">{game.opponent}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-500">{game.date}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold font-mono text-white">
                                            {game.score || '...'}
                                        </div>
                                        <div className={`text-[10px] font-bold ${game.result === 'W' ? 'text-green-400' : 'text-red-400'}`}>
                                            {game.result === 'W' ? '+' : ''}{game.score_diff}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: USER HISTORY MODULE */}
                    <div className="lg:col-span-2">
                        {userStats && (
                            <div className="bg-[#111] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold flex items-center gap-2">
                                            <Target className="w-5 h-5 text-purple-400" />
                                            Votre Historique
                                        </h2>
                                        <p className="text-xs text-gray-500 mt-1">Vos performances sur {data.team_name}</p>
                                    </div>

                                    {/* Winrate Big display */}
                                    <div className="flex items-center gap-4">
                                        {userStats.badge === 'LUCKY' && (
                                            <div className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1">
                                                🍀 Porte-Bonheur
                                            </div>
                                        )}
                                        {userStats.badge === 'JINX' && (
                                            <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                                                🐈‍⬛ Chat Noir
                                            </div>
                                        )}
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-white leading-none">{userStats.winrate}%</div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest">Réussite</div>
                                        </div>
                                    </div>
                                </div>

                                {userStats.total === 0 ? (
                                    <div className="text-center py-8 border-t border-gray-800/50 border-dashed">
                                        <p className="text-sm text-gray-500">Aucun pari enregistré sur cette équipe.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {userStats.history.map((bet) => {
                                            const isWin = bet.real_winner && bet.user_prediction === bet.real_winner;
                                            const isPending = !bet.real_winner || bet.real_winner === 'TBD';
                                            const isHome = bet.home_team === data.team_name;

                                            return (
                                                <div key={bet.id} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center p-3 bg-gray-900/30 rounded-lg border border-gray-800/50 hover:bg-gray-900/50 transition-colors">
                                                    {/* Date */}
                                                    <div className="text-[10px] text-gray-500 font-mono w-20">{bet.game_date}</div>

                                                    {/* Match Info */}
                                                    <div className="flex flex-col">
                                                        <div className="text-sm text-white mb-0.5">
                                                            {isHome ? (
                                                                <>
                                                                    <span className="font-black text-white">{bet.home_team}</span>
                                                                    <span className="text-gray-500 mx-1">vs</span>
                                                                    <span className="text-gray-400">{bet.away_team}</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="text-gray-400">{bet.home_team}</span>
                                                                    <span className="text-gray-500 mx-1">@</span>
                                                                    <span className="font-black text-white">{bet.away_team}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                            Vote: <span className="text-purple-300 font-medium">{bet.user_prediction}</span>
                                                        </div>
                                                    </div>

                                                    {/* Result Pill */}
                                                    <div>
                                                        {isPending ? (
                                                            <div className="flex items-center gap-2 px-3 py-1 rounded bg-gray-800 border border-gray-700">
                                                                <Clock className="w-3 h-3 text-gray-400" />
                                                                <span className="text-[10px] font-bold text-gray-400">EN COURS</span>
                                                            </div>
                                                        ) : isWin ? (
                                                            <div className="flex items-center gap-2 px-3 py-1 rounded bg-green-500/10 border border-green-500/30">
                                                                <CheckCircle2 className="w-3 h-3 text-green-400" />
                                                                <span className="text-[10px] font-bold text-green-400">GAGNÉ</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 px-3 py-1 rounded bg-red-500/10 border border-red-500/30">
                                                                <XCircle className="w-3 h-3 text-red-400" />
                                                                <span className="text-[10px] font-bold text-red-400">PERDU</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}
