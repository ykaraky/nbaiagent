"use client";

import React, { useMemo } from 'react';
import { TrendingUp, Wallet, Target, Activity, Flame } from 'lucide-react';

interface KPIStatsProps {
    stats: any[];
}

export default function KPIStats({ stats }: KPIStatsProps) {
    const kpi = useMemo(() => {
        let totalGames = 0;
        let aiWins = 0;
        let userWins = 0;
        let userTotal = 0;
        let bankroll = 0; // Starts at 0, assumes +100 for win, -100 for loss (odds ~2.0 simplified)
        let currentStreak = 0;
        let bestStreak = 0;
        let highConfWins = 0;
        let highConfTotal = 0;

        // Process reversed array (oldest to newest) for simplified streak/bankroll calc
        const chronological = [...stats].sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());

        chronological.forEach(game => {
            if (game.result_ia) {
                totalGames++;
                if (game.result_ia === "GAGNE") aiWins++;
            }

            if (game.user_result) {
                userTotal++;
                if (game.user_result === "GAGNE") {
                    userWins++;
                    bankroll += 100 * 0.9; // Simplified +90 profit (1.90 odds avg)
                    currentStreak++;
                } else {
                    bankroll -= 100;
                    currentStreak = 0;
                }
                if (currentStreak > bestStreak) bestStreak = currentStreak;

                // High Confidence Stats (3)
                if (game.user_confidence === 3) {
                    highConfTotal++;
                    if (game.user_result === "GAGNE") highConfWins++;
                }
            }
        });

        const userWinRate = userTotal > 0 ? ((userWins / userTotal) * 100).toFixed(1) : "0.0";
        const highConfRate = highConfTotal > 0 ? ((highConfWins / highConfTotal) * 100).toFixed(1) : "0.0";
        const roi = userTotal > 0 ? ((bankroll / (userTotal * 100)) * 100).toFixed(1) : "0.0";

        return { userWinRate, userTotal, roi, currentStreak, bestStreak, highConfRate, highConfTotal };
    }, [stats]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 1. GLOBAL WINRATE */}
            <div className="bg-[#121214] border border-gray-800/60 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-purple-500/20 transition-all group">
                <div className="p-3 rounded-full bg-emerald-500/10 mb-3 group-hover:bg-emerald-500/20 transition-colors">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Win Rate (User)</h3>
                <div className="text-3xl font-black text-white">{kpi.userWinRate}%</div>
                <div className="text-[10px] text-gray-500 mt-1">{kpi.userTotal} bets</div>
            </div>

            {/* 2. ROI VIRTUEL */}
            <div className="bg-[#121214] border border-gray-800/60 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-purple-500/20 transition-all group">
                <div className="p-3 rounded-full bg-blue-500/10 mb-3 group-hover:bg-blue-500/20 transition-colors">
                    <Wallet className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">ROI Virtuel</h3>
                <div className={`text-3xl font-black ${parseFloat(kpi.roi) >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
                    {parseFloat(kpi.roi) > 0 ? '+' : ''}{kpi.roi}%
                </div>
                <div className="text-[10px] text-gray-500 mt-1">Base 100€ / bet</div>
            </div>

            {/* 3. HIGH CONFIDENCE */}
            <div className="bg-[#121214] border border-gray-800/60 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-purple-500/20 transition-all group">
                <div className="p-3 rounded-full bg-purple-500/10 mb-3 group-hover:bg-purple-500/20 transition-colors">
                    <Target className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Précision Max Conf.</h3>
                <div className="text-3xl font-black text-white">{kpi.highConfRate}%</div>
                <div className="text-[10px] text-gray-500 mt-1">{kpi.highConfTotal} bets "High"</div>
            </div>

            {/* 4. STREAK */}
            <div className="bg-[#121214] border border-gray-800/60 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-purple-500/20 transition-all group">
                <div className="p-3 rounded-full bg-amber-500/10 mb-3 group-hover:bg-amber-500/20 transition-colors">
                    <Flame className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Série Actuelle</h3>
                <div className="text-3xl font-black text-white flex items-center gap-1">
                    {kpi.currentStreak} <span className="text-sm font-normal text-gray-500">wins</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1">Record: {kpi.bestStreak}</div>
            </div>
        </div>
    );
}
