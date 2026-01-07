"use client";

import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

interface BankrollChartProps {
    stats: any[];
}

export default function BankrollChart({ stats }: BankrollChartProps) {
    const data = useMemo(() => {
        // Chronological order
        const chrono = [...stats]
            .filter(match => match.user_result) // Only finished games with user vote
            .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());

        let currentBankroll = 0;
        const chartData = chrono.map((match) => {
            const isWin = match.user_result === "GAGNE";
            // Simplified logic: Bet 100. Win = +90 (odds 1.9), Loss = -100
            // Ideally we would have real odds, but this is "Virtual Bankroll" logic
            const pnl = isWin ? 90 : -100;
            currentBankroll += pnl;

            return {
                date: new Date(match.game_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                bankroll: currentBankroll,
                match: `${match.home_team} vs ${match.away_team}`,
                result: match.user_result
            };
        });

        // Add start point
        return [{ date: 'Start', bankroll: 0 }, ...chartData];
    }, [stats]);

    return (
        <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#666"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        stroke="#666"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}€`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#09090b',
                            borderColor: '#333',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => [`${value}€`, 'Bankroll']}
                    />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                    <Line
                        type="monotone"
                        dataKey="bankroll"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#60a5fa' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
