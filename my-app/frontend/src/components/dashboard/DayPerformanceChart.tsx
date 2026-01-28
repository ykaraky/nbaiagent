"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export default function DayPerformanceChart({ stats }: { stats: any[] }) {

    const data = useMemo(() => {
        if (!stats || stats.length === 0) return [];

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const frDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

        const dayStats = days.map((d, i) => ({
            day: frDays[i],
            fullDay: d,
            wins: 0,
            total: 0,
            winrate: 0
        }));

        stats.forEach(bet => {
            if (bet.real_winner && bet.real_winner !== 'TBD') {
                const d = new Date(bet.game_date);
                const dayIndex = d.getDay();

                dayStats[dayIndex].total++;
                if (bet.user_prediction === bet.real_winner) {
                    dayStats[dayIndex].wins++;
                }
            }
        });

        // Calculate winrates and filter out empty days?? No, let's show all
        return dayStats.map(d => ({
            ...d,
            winrate: d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0
        })).filter(d => d.total > 0); // Only show days closer to logic? Or keep index?

    }, [stats]);

    if (data.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs">
                <span>Pas assez de données.</span>
            </div>
        );
    }

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: '#ffffff10' }}
                        formatter={(value: any, name: any) => [`${value}%`, 'Réalisme']}
                        labelFormatter={(label) => `Jour: ${label}`}
                    />
                    <Bar dataKey="winrate" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.winrate >= 50 ? '#818cf8' : '#fb923c'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
