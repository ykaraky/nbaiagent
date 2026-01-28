"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { getTeamLogoUrl } from '@/utils/nbaTeams';
import Navbar from '@/components/Navbar';
import { Search, Shield, Activity, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

// --- TYPES ---
interface TeamIntelligence {
    team_id: number;
    team_name: string;
    confidence_rating: string;
    ai_accuracy: number;
    volatility_score: number;
    insights?: any[];
}

// --- SUPABASE ---
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TeamsPage() {
    const [teams, setTeams] = useState<TeamIntelligence[]>([]);
    const [filteredTeams, setFilteredTeams] = useState<TeamIntelligence[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "accuracy" | "volatility">("name");

    useEffect(() => {
        async function fetchTeams() {
            // Fetch minimal needed fields for the grid
            const { data, error } = await supabase
                .from('team_intelligence')
                .select('team_id, team_name, confidence_rating, ai_accuracy, volatility_score');

            if (error) {
                console.error("Error fetching teams:", error);
            } else if (data) {
                // Remove duplicates if any (just in case)
                const unique = Array.from(new Map(data.map(item => [item.team_id, item])).values());
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
            res.sort((a, b) => a.volatility_score - b.volatility_score); // Low volatility = Stable (Better?) or High? Let's sort Low to High (Stable first)
        }

        setFilteredTeams(res);
    }, [searchTerm, sortBy, teams]);

    // UI Helpers
    const getConfidenceColor = (rating: string) => {
        switch (rating) {
            case 'TRUSTED': return 'text-green-400 bg-green-500/10 border-green-500/30';
            case 'VOLATILE': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
            case 'TRAP': return 'text-red-400 bg-red-500/10 border-red-500/30';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
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
                            className="bg-[#111] border border-gray-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                        >
                            <option value="name">A-Z</option>
                            <option value="accuracy">Précision IA</option>
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
                                <div className="bg-[#111] border border-gray-800 rounded-xl p-4 hover:border-purple-500/30 transition-all hover:-translate-y-1 group relative overflow-hidden">
                                    {/* HEAD */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 bg-gray-900 rounded-full p-2 border border-gray-800">
                                            <img
                                                src={getTeamLogoUrl("", team.team_id)}
                                                alt={team.team_name}
                                                className="w-full h-full object-contain"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/teams/1610612737.svg' }}
                                            />
                                        </div>
                                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getConfidenceColor(team.confidence_rating)}`}>
                                            {team.confidence_rating}
                                        </div>
                                    </div>

                                    {/* INFO */}
                                    <h2 className="text-lg font-bold truncate pr-2 mb-3">{team.team_name}</h2>

                                    {/* METRICS */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-gray-900/50 rounded-lg p-2 border border-gray-800/50">
                                            <div className="text-gray-500 mb-0.5">Précision</div>
                                            <div className="font-mono font-bold text-white flex items-center gap-1">
                                                {team.ai_accuracy}%
                                            </div>
                                        </div>
                                        <div className="bg-gray-900/50 rounded-lg p-2 border border-gray-800/50">
                                            <div className="text-gray-500 mb-0.5">Volatilité</div>
                                            <div className="font-mono font-bold text-white flex items-center gap-1">
                                                {team.volatility_score}
                                            </div>
                                        </div>
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
