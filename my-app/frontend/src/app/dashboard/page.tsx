"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowLeft, LayoutDashboard, Wallet, Target, Activity, Trophy } from 'lucide-react';
import KPIStats from '../../components/dashboard/KPIStats';
import BankrollChart from '../../components/dashboard/BankrollChart';
import ReasonRadar from '../../components/dashboard/ReasonRadar';
import ConfusionMatrix from '../../components/dashboard/ConfusionMatrix';
import FatiguePerformanceChart from '../../components/dashboard/FatiguePerformanceChart';
import TeamPerformanceTable from '../../components/dashboard/TeamPerformanceTable';

// Create Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any[]>([]);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('bets_history')
                .select('*')
                .order('game_date', { ascending: false });

            if (data) {
                setStats(data);
            }
            setLoading(false);
        };

        fetchHistory();
    }, []);

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-4 font-sans selection:bg-purple-500/30">
            {/* Header / Nav */}
            <div className="max-w-7xl mx-auto flex items-center justify-between mb-8 pt-4">
                <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                    <div className="p-2 rounded-full bg-gray-800/50 group-hover:bg-gray-800 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm tracking-wide">Retour aux matchs</span>
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20">
                        <LayoutDashboard className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Dashboard V12
                        </h1>
                        <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">
                            Deep Analytics & Metacognition
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto space-y-6 pb-20">

                {/* 1. KEY PERFORMANCE INDICATORS (KPIs) */}
                <KPIStats stats={stats} />

                {/* 2. CHARTS SECTION (Economy & Fatigue) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bankroll */}
                    <div className="bg-[#121214] border border-gray-800/60 rounded-xl p-6 min-h-[300px]">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-blue-400" />
                            Evolution Bankroll
                        </h2>
                        <BankrollChart stats={stats} />
                    </div>

                    {/* Fatigue Analysis */}
                    <div className="bg-[#121214] border border-gray-800/60 rounded-xl p-6 min-h-[300px]">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-yellow-400" />
                            Performance IA selon Fatigue
                        </h2>
                        <FatiguePerformanceChart stats={stats} />
                    </div>
                </div>

                {/* 3. CONFUSION MATRIX (Full Width) */}
                <div className="bg-[#121214] border border-gray-800/60 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-400" />
                        Matrice de Confusion (IA vs Humain)
                    </h2>
                    <p className="text-xs text-gray-500 mb-4 -mt-3">Cliquez sur une case pour voir les matchs concernés.</p>
                    <ConfusionMatrix stats={stats} />
                </div>

                {/* 4. PERFORMANCE DETAILS (Radar & Teams) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Reason Radar */}
                    <div className="bg-[#121214] border border-gray-800/60 rounded-xl p-6 min-h-[350px]">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Target className="w-5 h-5 text-purple-400" />
                            Performance par Raison
                        </h2>
                        <ReasonRadar stats={stats} />
                    </div>

                    {/* Team Performance Table */}
                    <div className="bg-[#121214] border border-gray-800/60 rounded-xl p-6 min-h-[350px]">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-orange-400" />
                            Performance par Équipe
                        </h2>
                        <TeamPerformanceTable stats={stats} />
                    </div>
                </div>

            </div>
        </div>
    );
}
