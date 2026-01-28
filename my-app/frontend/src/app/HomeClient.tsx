"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy, TrendingUp, History, Calendar } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import MatchCard from '@/components/MatchCard';
import Navbar from '@/components/Navbar';
import PageHeader from '@/components/ui/PageHeader';

interface HomeClientProps {
    pastGrouped: Record<string, any[]>;
    futureGrouped: Record<string, any[]>;
    pastDates: string[];
    futureDates: string[];
}

export default function HomeClient({ pastGrouped, futureGrouped, pastDates, futureDates }: HomeClientProps) {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const initialTab = tabParam === 'upcoming' ? 'upcoming' : 'results';

    const [activeTab, setActiveTab] = useState<'results' | 'upcoming'>(initialTab);

    // State for selected dates
    const [selectedPastDate, setSelectedPastDate] = useState<string>(pastDates[0] || '');
    const [selectedFutureDate, setSelectedFutureDate] = useState<string>(futureDates[0] || '');

    // Resolve current data based on tab
    const currentMatches = activeTab === 'results'
        ? (pastGrouped[selectedPastDate] || [])
        : (futureGrouped[selectedFutureDate] || []);

    // Analytics Helper
    const calculateStats = (matches: any[]) => {
        let aiWins = 0, userWins = 0, totalFinished = 0;
        matches.forEach(m => {
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
        return { aiWins, userWins, totalFinished };
    };

    const stats = calculateStats(currentMatches);

    // Handlers for Past Date Navigation
    const handlePrevDate = () => {
        const idx = pastDates.indexOf(selectedPastDate);
        if (idx !== -1 && idx < pastDates.length - 1) {
            setSelectedPastDate(pastDates[idx + 1]);
        }
    };

    const handleNextDate = () => {
        const idx = pastDates.indexOf(selectedPastDate);
        if (idx !== -1 && idx > 0) {
            setSelectedPastDate(pastDates[idx - 1]);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-cyan-500/30">
            <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20">

                {/* RESULTS VIEW */}
                {activeTab === 'results' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <PageHeader
                            title="Derniers Résultats"
                            subtitle="Résumés, analyses et prédictions IA"
                            borderColor="border-cyan-900/30"
                            icon={<History className="w-6 h-6 text-cyan-400" />}
                        />

                        {/* Header & Navigation */}
                        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">

                            {/* Date Navigation */}
                            <div className="flex items-center gap-4 bg-gray-900/50 p-2 rounded-2xl border border-gray-800 backdrop-blur-sm">
                                <button
                                    onClick={handlePrevDate}
                                    disabled={pastDates.indexOf(selectedPastDate) >= pastDates.length - 1}
                                    className="p-2 hover:bg-gray-800 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-400" />
                                </button>

                                <div className="text-center min-w-[140px]">
                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-0.5">Date</span>
                                    <span className="text-lg font-black text-gray-100 font-mono">
                                        {selectedPastDate || "Aucune donnée"}
                                    </span>
                                </div>

                                <button
                                    onClick={handleNextDate}
                                    disabled={pastDates.indexOf(selectedPastDate) <= 0}
                                    className="p-2 hover:bg-gray-800 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            {/* Stats Summary */}
                            {stats.totalFinished > 0 && (
                                <div className="flex items-center gap-4 px-5 py-3 bg-gradient-to-br from-gray-900 to-gray-900 border border-gray-800 rounded-2xl shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-cyan-900/20 rounded-lg">
                                            <Trophy className="w-4 h-4 text-cyan-400" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">IA Success</div>
                                            <div className={`text-xl font-black font-mono ${stats.aiWins >= stats.totalFinished / 2 ? "text-cyan-400" : "text-gray-400"}`}>
                                                {stats.aiWins}/{stats.totalFinished}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-px h-8 bg-gray-800"></div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-900/20 rounded-lg">
                                            <TrendingUp className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">User Success</div>
                                            <div className={`text-xl font-black font-mono ${stats.userWins >= stats.totalFinished / 2 ? "text-purple-400" : "text-gray-400"}`}>
                                                {stats.userWins}/{stats.totalFinished}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Matches Grid */}
                        {currentMatches.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {currentMatches.map((match: any) => (
                                    <MatchCard key={match.id} match={match} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-900/20 rounded-3xl border border-gray-800/50 border-dashed">
                                <p className="text-gray-500 font-medium">Aucun match terminé pour cette date.</p>
                            </div>
                        )}
                    </div>
                )}


                {/* UPCOMING VIEW */}
                {activeTab === 'upcoming' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <PageHeader
                            title="Matchs à Venir"
                            subtitle="Calendrier et probabilités"
                            borderColor="border-purple-900/30"
                            icon={<Calendar className="w-6 h-6 text-purple-400" />}
                        />

                        {/* Date Selector (Chips) */}
                        <div className="mb-8 overflow-x-auto pb-4 scrollbar-hide">
                            <div className="flex gap-3">
                                {futureDates.map((date) => (
                                    <button
                                        key={date}
                                        onClick={() => setSelectedFutureDate(date)}
                                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${selectedFutureDate === date
                                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-lg shadow-purple-900/20'
                                            : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
                                            }`}
                                    >
                                        {new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                                    </button>
                                ))}
                                {futureDates.length === 0 && (
                                    <p className="text-gray-500 italic">Aucune date future disponible.</p>
                                )}
                            </div>
                        </div>

                        {/* Matches Grid */}
                        {currentMatches.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {currentMatches.map((match: any) => (
                                    <MatchCard key={match.id} match={match} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-900/20 rounded-3xl border border-gray-800/50 border-dashed">
                                <p className="text-gray-500 font-medium">Aucun match prévu pour cette date.</p>
                            </div>
                        )}
                    </div>
                )}

            </main>
        </div>
    );
}
