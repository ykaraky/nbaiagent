"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Battery, BatteryWarning, BatteryCharging } from 'lucide-react';

interface FatiguePerformanceChartProps {
    stats: any[];
}

export default function FatiguePerformanceChart({ stats }: FatiguePerformanceChartProps) {
    const data = useMemo(() => {
        if (!stats || stats.length === 0) return [];

        interface Scenario {
            total: number;
            ai_wins: number;
            user_wins: number;
            label: string;
        }

        // Scenarios
        const scenarios: Record<string, Scenario> = {
            'B2B': { total: 0, ai_wins: 0, user_wins: 0, label: 'Back-to-Back' },
            'Short Rest': { total: 0, ai_wins: 0, user_wins: 0, label: '1 Day Rest' },
            'Fresh': { total: 0, ai_wins: 0, user_wins: 0, label: '2+ Days Rest' }
        };

        stats.forEach(match => {
            // We consider a match "B2B" if EITHER team is B2B.
            // This simplification helps identifying "Fatigue Impact" generally.
            // Or we could specific: "AI Accuracy when Betting ON a B2B team"? 
            // For now, let's keep it simple: Context of the match.

            // Actually, usually we care about the team we bet ON.
            // But predicting the winner involves both. 
            // Let's categorize the match by the "Worst" fatigue condition present.

            let category = 'Fresh';

            // Check B2B first (Severe)
            if (match.home_is_b2b || match.away_is_b2b) {
                category = 'B2B';
            }
            // Check Short Rest (Rest = 1)
            else if ((match.home_rest_days === 1) || (match.away_rest_days === 1)) {
                category = 'Short Rest';
            }

            // Count
            if (match.real_winner) {
                scenarios[category].total++;

                if (match.predicted_winner === match.real_winner) {
                    scenarios[category].ai_wins++;
                }

                if (match.user_prediction && match.user_prediction === match.real_winner) {
                    scenarios[category].user_wins++;
                }
            }
        });

        // Format for Recharts
        return Object.keys(scenarios).map(key => {
            const s = scenarios[key];
            return {
                name: s.label,
                key: key,
                total: s.total,
                ai_pct: s.total > 0 ? parseFloat(((s.ai_wins / s.total) * 100).toFixed(1)) : 0,
                user_pct: s.total > 0 ? parseFloat(((s.user_wins / s.total) * 100).toFixed(1)) : 0,
            };
        });

    }, [stats]);

    return (
        <div className="w-full h-[300px]">
            {stats.some(s => s.home_is_b2b !== undefined) ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#888"
                            tick={{ fill: '#888', fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888"
                            tick={{ fill: '#888', fontSize: 12 }}
                            tickFormatter={(val) => `${val}%`}
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            formatter={(value: number | undefined) => [value !== undefined ? `${value}%` : '', '']}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar dataKey="ai_pct" name="AI Precision" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            {
                                data.map((entry, index) => (
                                    <Cell key={`cell-ai-${index}`} fill={entry.ai_pct > 50 ? '#06b6d4' : '#0e7490'} />
                                ))
                            }
                        </Bar>
                        <Bar dataKey="user_pct" name="User Precision" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            {
                                data.map((entry, index) => (
                                    <Cell key={`cell-user-${index}`} fill={entry.user_pct > 50 ? '#a855f7' : '#7e22ce'} />
                                ))
                            }
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                    <BatteryWarning className="w-8 h-8 opacity-50" />
                    <p className="text-xs uppercase tracking-widest">En attente de données de fatigue...</p>
                </div>
            )}

        </div>
    );
}
