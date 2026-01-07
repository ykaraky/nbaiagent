"use client";

import React, { useMemo } from 'react';
import { Check, X, Bot, User } from 'lucide-react';

interface ConfusionMatrixProps {
    stats: any[];
}

export default function ConfusionMatrix({ stats }: ConfusionMatrixProps) {
    const matrix = useMemo(() => {
        let bothWon = 0;
        let humanWonAiLost = 0;
        let aiWonHumanLost = 0;
        let bothLost = 0;
        let total = 0;

        stats.forEach(match => {
            if (match.user_result && match.result_ia) {
                total++;
                const humanWin = match.user_result === "GAGNE";
                const aiWin = match.result_ia === "GAGNE";

                if (humanWin && aiWin) bothWon++;
                else if (humanWin && !aiWin) humanWonAiLost++;
                else if (!humanWin && aiWin) aiWonHumanLost++;
                else if (!humanWin && !aiWin) bothLost++;
            }
        });

        return { bothWon, humanWonAiLost, aiWonHumanLost, bothLost, total };
    }, [stats]);

    if (matrix.total === 0) return <div className="text-gray-500 text-sm p-4">Pas assez de données comparables.</div>;

    const getPercent = (val: number) => ((val / matrix.total) * 100).toFixed(0) + '%';

    return (
        <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Top Left: Both Correct */}
            <div className="bg-[#1a1a1e] border border-emerald-500/30 rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-2 left-2 text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <User className="w-3 h-3" /> + <Bot className="w-3 h-3" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">{matrix.bothWon}</div>
                <div className="text-xs text-gray-500">{getPercent(matrix.bothWon)}</div>
                <div className="text-[10px] text-emerald-400 mt-1 font-medium">Synergie (Double Win)</div>
            </div>

            {/* Top Right: Human > AI */}
            <div className="bg-[#1a1a1e] border border-blue-500/30 rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-2 right-2 text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <User className="w-3 h-3" /> {'>'} <Bot className="w-3 h-3" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">{matrix.humanWonAiLost}</div>
                <div className="text-xs text-gray-500">{getPercent(matrix.humanWonAiLost)}</div>
                <div className="text-[10px] text-blue-400 mt-1 font-medium">Alpha Humain</div>
            </div>

            {/* Bottom Left: AI > Human */}
            <div className="bg-[#1a1a1e] border border-purple-500/30 rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute bottom-2 left-2 text-[10px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Bot className="w-3 h-3" /> {'>'} <User className="w-3 h-3" />
                </div>
                <div className="mt-2 text-2xl font-black text-white">{matrix.aiWonHumanLost}</div>
                <div className="text-xs text-gray-500">{getPercent(matrix.aiWonHumanLost)}</div>
                <div className="text-[10px] text-purple-400 mt-1 font-medium">Occasions Manquées</div>
            </div>

            {/* Bottom Right: Both Wrong */}
            <div className="bg-[#1a1a1e] border border-red-500/30 rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute bottom-2 right-2 text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <X className="w-3 h-3" /> Double Loss
                </div>
                <div className="mt-2 text-2xl font-black text-white">{matrix.bothLost}</div>
                <div className="text-xs text-gray-500">{getPercent(matrix.bothLost)}</div>
                <div className="text-[10px] text-red-400 mt-1 font-medium">Chaos Total</div>
            </div>
        </div>
    );
}
