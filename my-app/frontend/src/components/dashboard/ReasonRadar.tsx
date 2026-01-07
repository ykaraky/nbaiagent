"use client";

import React, { useMemo } from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';
import { REASONS_DATA } from '../../utils/reasonsConstants';

interface ReasonRadarProps {
    stats: any[];
}

export default function ReasonRadar({ stats }: ReasonRadarProps) {
    const data = useMemo(() => {
        // Initialize map with 0 stats for all known reasons
        const map = new Map<string, { wins: number; total: number; label: string }>();

        REASONS_DATA.forEach(r => {
            map.set(r.id, { wins: 0, total: 0, label: r.id });
        });

        // Fill stats
        stats.forEach(match => {
            if (match.user_result && match.user_reason) {
                const entry = map.get(match.user_reason);
                if (entry) {
                    entry.total++;
                    if (match.user_result === "GAGNE") entry.wins++;
                }
            }
        });

        // Convert to array for Recharts
        return Array.from(map.values()).map(item => ({
            subject: item.label,
            A: item.total > 0 ? parseFloat(((item.wins / item.total) * 100).toFixed(1)) : 0,
            fullMark: 100, // For scaling
            total: item.total // For tooltip
        })).filter(item => item.total > 0); // Only show reasons used at least once? Or show all? 
        // Showing all might clutter if unused. Let's filter slightly or show all if design allows. 
        // For radar, it's better to show all axes usually, but if 0 it's just center. 
        // Let's keep filter > 0 to start clean.
    }, [stats]);

    if (data.length < 3) {
        return (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">
                Pas assez de données pour le Radar (min 3 raisons utilisées)
            </div>
        );
    }

    return (
        <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#666', fontSize: 10 }} />
                    <Radar
                        name="Win Rate %"
                        dataKey="A"
                        stroke="#a855f7"
                        fill="#a855f7"
                        fillOpacity={0.4}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#09090b',
                            borderColor: '#333',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any, name: any, props: any) => [
                            `${value}% (${props.payload.total} bets)`,
                            'Win Rate'
                        ]}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
