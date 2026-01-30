"use client";

import React, { useMemo } from 'react';
import { Check, X, Bot, User } from 'lucide-react';

interface ConfusionMatrixProps {
    stats: any[];
}

export default function ConfusionMatrix({ stats }: ConfusionMatrixProps) {
    const [selectedCell, setSelectedCell] = React.useState<string | null>(null);

    const matrix = useMemo(() => {
        let bothWon = 0;
        let humanWonAiLost = 0;
        let aiWonHumanLost = 0;
        let bothLost = 0;
        let total = 0;

        const matches = {
            'bothWon': [] as any[],
            'humanWonAiLost': [] as any[],
            'aiWonHumanLost': [] as any[],
            'bothLost': [] as any[]
        };

        stats.forEach(match => {
            if (match.user_result && match.result_ia) {
                total++;
                const humanWin = match.user_result === "GAGNE";
                const aiWin = match.result_ia === "GAGNE";

                if (humanWin && aiWin) {
                    bothWon++;
                    matches['bothWon'].push(match);
                }
                else if (humanWin && !aiWin) {
                    humanWonAiLost++;
                    matches['humanWonAiLost'].push(match);
                }
                else if (!humanWin && aiWin) {
                    aiWonHumanLost++;
                    matches['aiWonHumanLost'].push(match);
                }
                else if (!humanWin && !aiWin) {
                    bothLost++;
                    matches['bothLost'].push(match);
                }
            }
        });

        return { bothWon, humanWonAiLost, aiWonHumanLost, bothLost, total, matches };
    }, [stats]);

    if (matrix.total === 0) return <div className="text-gray-500 text-sm p-4">Pas assez de données comparables.</div>;

    const getPercent = (val: number) => ((val / matrix.total) * 100).toFixed(0) + '%';
    const isSelected = (key: string) => selectedCell === key;

    const renderCell = (key: string, icon: React.ReactNode, title: string, subtitle: string, count: number, colorClass: string, borderClass: string) => (
        <div
            onClick={() => setSelectedCell(selectedCell === key ? null : key)}
            className={`cursor-pointer transition-all duration-300 rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden border ${isSelected(key) ? 'bg-white/5 border-white shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-[1.02]' : `bg-[#1a1a1e] ${borderClass} hover:bg-white/5`}`}
        >
            <div className={`absolute top-2 left-2 text-[10px] uppercase tracking-widest flex items-center gap-1 font-bold ${colorClass}`}>
                {icon}
            </div>
            <div className="mt-2 text-2xl font-black text-white">{count}</div>
            <div className="text-xs text-gray-500">{getPercent(count)}</div>
            <div className={`text-[10px] mt-1 font-medium ${colorClass}`}>{subtitle}</div>
        </div>
    );

    return (
        <div>
            <div className="grid grid-cols-2 gap-4 mt-4">
                {/* Top Left: Both Correct */}
                {renderCell('bothWon', <><User className="w-3 h-3" /> + <Bot className="w-3 h-3" /></>, "Synergie", "Double Win", matrix.bothWon, "text-emerald-400", "border-emerald-500/30")}

                {/* Top Right: Human > AI */}
                {renderCell('humanWonAiLost', <><User className="w-3 h-3" /> {'>'} <Bot className="w-3 h-3" /></>, "Alpha", "User Wins", matrix.humanWonAiLost, "text-purple-400", "border-purple-500/30")}

                {/* Bottom Left: AI > Human */}
                {renderCell('aiWonHumanLost', <><Bot className="w-3 h-3" /> {'>'} <User className="w-3 h-3" /></>, "Occasions", "IA Wins", matrix.aiWonHumanLost, "text-blue-400", "border-blue-500/30")}

                {/* Bottom Right: Both Wrong */}
                {renderCell('bothLost', <><X className="w-3 h-3" /> Double Loss</>, "Chaos", "Chaos Total", matrix.bothLost, "text-red-400", "border-red-500/30")}
            </div>

            {/* Drill Down List */}
            {selectedCell && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-800 pb-2">
                        Détails : {selectedCell === 'humanWonAiLost' ? 'Victoires Humaines (Alpha)' : selectedCell === 'aiWonHumanLost' ? 'Victoires IA' : selectedCell === 'bothWon' ? 'Double Win' : 'Double Loss'}
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {matrix.matches[selectedCell as keyof typeof matrix.matches].map((m: any, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs bg-[#121212] p-2 rounded border border-gray-800">
                                <div className="text-gray-400 font-mono">{new Date(m.game_date).toLocaleDateString()}</div>
                                <div className="flex-1 px-4 flex justify-center items-center gap-2">
                                    <span className={m.real_winner === m.home_team ? 'text-white font-bold' : 'text-gray-500'}>{m.home_team}</span>
                                    <span className="text-gray-600 px-1">vs</span>
                                    <span className={m.real_winner === m.away_team ? 'text-white font-bold' : 'text-gray-500'}>{m.away_team}</span>
                                </div>
                                <div className="text-right flex flex-col items-end gap-0.5">
                                    <div className="flex gap-2">
                                        <span className={`text-[9px] px-1 rounded ${m.user_result === 'GAGNE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>USER</span>
                                        <span className={`text-[9px] px-1 rounded ${m.result_ia === 'GAGNE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>IA</span>
                                    </div>
                                    <span className="text-[9px] text-gray-600">Conf: {m.confidence}</span>
                                </div>
                            </div>
                        ))}
                        {matrix.matches[selectedCell as keyof typeof matrix.matches].length === 0 && <div className="text-gray-500 italic">Aucun match.</div>}
                    </div>
                </div>
            )}
        </div>
    );
}
