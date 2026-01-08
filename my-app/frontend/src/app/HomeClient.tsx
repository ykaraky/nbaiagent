"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Calendar, History } from 'lucide-react';
import MatchCard from '@/components/MatchCard';

interface HomeClientProps {
    resultsMatches: any[];
    upcomingMatches: any[];
    resultsDate: string | null;
    upcomingDate: string | null;
    stats: {
        aiWins: number;
        userWins: number;
        totalFinished: number;
    };
}

type TabState = 'results' | 'upcoming';

export default function HomeClient({ resultsMatches, upcomingMatches, resultsDate, upcomingDate, stats }: HomeClientProps) {
    const [activeTab, setActiveTab] = useState<TabState>('results');

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans">

            {/* HERDER */}
            <header className="mb-8 text-center mt-6">
                <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">
                    NBAiAGENT
                </h1>
                <p className="text-gray-500 font-medium">next.js edition</p>

                <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 mt-6 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-all border border-gray-800 hover:border-purple-500/30 group">
                    <LayoutDashboard className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                    <span className="text-xs font-bold uppercase tracking-wider">Accéder au Dashboard</span>
                </Link>
            </header>

            {/* TABS NAVIGATION */}
            <div className="max-w-7xl mx-auto mb-10">
                <div className="flex justify-center p-1 bg-gray-900/50 rounded-2xl border border-gray-800 backdrop-blur-sm w-full max-w-md mx-auto relative">
                    {/* Sliding Background (Simplified with direct conditional classes for now) */}
                    <button
                        onClick={() => setActiveTab('results')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'results' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <History className={`w-4 h-4 ${activeTab === 'results' ? 'text-cyan-400' : ''}`} />
                        Derniers Résultats
                    </button>
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'upcoming' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Calendar className={`w-4 h-4 ${activeTab === 'upcoming' ? 'text-purple-400' : ''}`} />
                        Matches à venir
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="max-w-7xl mx-auto space-y-12 min-h-[500px]">

                {/* RESULTS TAB */}
                {activeTab === 'results' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-gray-800 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="bg-gray-800 w-1.5 h-8 rounded-full"></span>
                                <h2 className="text-2xl font-black text-gray-200 uppercase tracking-tight">Derniers Résultats</h2>
                            </div>

                            {/* ANALYTICS SUMMARY (MOBILE VISIBLE NOW) */}
                            {stats.totalFinished > 0 && (
                                <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/80 border border-gray-800 rounded-xl backdrop-blur-md shadow-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">AI</span>
                                        <span className={`text-base font-black font-mono ${stats.aiWins >= stats.totalFinished / 2 ? "text-cyan-400" : "text-gray-400"}`}>
                                            {stats.aiWins}/{stats.totalFinished}
                                        </span>
                                    </div>
                                    <div className="w-px h-4 bg-gray-700/50"></div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">USER</span>
                                        <span className={`text-base font-black font-mono ${stats.userWins >= stats.totalFinished / 2 ? "text-purple-400" : "text-gray-400"}`}>
                                            {stats.userWins}/{stats.totalFinished}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <span className="text-xs font-medium text-gray-500 font-mono bg-gray-900 px-3 py-1 rounded-full border border-gray-800 hidden md:inline-block">
                                {resultsDate || "Aujourd'hui"}
                            </span>
                        </div>

                        {resultsMatches.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {resultsMatches.map((match: any) => (
                                    <MatchCard key={match.id} match={match} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-900/20 rounded-2xl border border-gray-800/50 border-dashed">
                                <p className="text-gray-500 font-medium">Aucun résultat récent disponible.</p>
                            </div>
                        )}
                    </div>
                )}


                {/* UPCOMING TAB */}
                {activeTab === 'upcoming' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="bg-cyan-500 w-1.5 h-8 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)]"></span>
                                <h2 className="text-2xl font-black text-gray-200 uppercase tracking-tight">Matches à Venir</h2>
                            </div>
                            <span className="text-xs font-medium text-gray-500 font-mono bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
                                {upcomingDate || "Bientôt"}
                            </span>
                        </div>

                        {upcomingMatches.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {upcomingMatches.map((match: any) => (
                                    <MatchCard key={match.id} match={match} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-900/20 rounded-2xl border border-gray-800/50 border-dashed">
                                <p className="text-gray-500 font-medium">Aucun match programmé pour le moment.</p>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </main>
    );
}
