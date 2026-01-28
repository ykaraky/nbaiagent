"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export default function ConfidenceChart({ stats }: { stats: any[] }) {

    // Process Date: Group by User_Confidence brackets
    const data = React.useMemo(() => {
        if (!stats) return [];

        const buckets = {
            "Faible (0-30%)": { total: 0, wins: 0, label: "❄️ Faible" },
            "Moyen (30-70%)": { total: 0, wins: 0, label: "⚖️ Moyen" },
            "Elevé (70-100%)": { total: 0, wins: 0, label: "🔥 Elevé" }
        };

        stats.forEach(bet => {
            // Need 'User_Confidence' or similar. 
            // If explicit column 'User_Confidence' exists (0-100 or 0-10)
            // Or 'confidence' field.
            // Based on checking schema: 'User_Confidence' exists.

            const conf = bet.User_Confidence || 0; // Assuming 0-100

            let bucketKey: keyof typeof buckets = "Faible (0-30%)";
            if (conf > 70) bucketKey = "Elevé (70-100%)";
            else if (conf > 30) bucketKey = "Moyen (30-70%)";

            if (bet.real_winner && bet.real_winner !== 'TBD') {
                buckets[bucketKey].total += 1;
                if (bet.user_prediction === bet.real_winner) {
                    buckets[bucketKey].wins += 1;
                }
            }
        });

        return Object.values(buckets).map(b => ({
            name: b.label,
            winrate: b.total > 0 ? Math.round((b.wins / b.total) * 100) : 0,
            volume: b.total,
            accuracyColor: (b.total > 0 && (b.wins / b.total) > 0.6) ? '#4ade80' : '#f87171'
        }));
    }, [stats]);

    if (data.every(d => d.volume === 0)) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs">
                <span>Pas assez de données de confiance.</span>
            </div>
        );
    }

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: 'transparent' }}
                        formatter={(value: any, name: any, props: any) => {
                            if (name === 'winrate') return [`${value}% Réussite`, ''];
                            return [value, name];
                        }}
                    />
                    <Bar dataKey="winrate" barSize={20} radius={[0, 4, 4, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.winrate >= 50 ? '#818cf8' : '#fb923c'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2 text-[10px] text-gray-400">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>Winrate {'>'} 50%</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <span>Winrate {'<'} 50%</span>
                </div>
            </div>
        </div>
    );
}
