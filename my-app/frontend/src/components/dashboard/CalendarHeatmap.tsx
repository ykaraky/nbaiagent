"use client";

import React from 'react';
import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function CalendarHeatmap({ stats }: { stats: any[] }) {

    // 1. Process data: Group bets by date
    const calendarData = useMemo(() => {
        if (!stats || stats.length === 0) return {};

        const counts: Record<string, { count: number, wins: number, date: string }> = {};

        stats.forEach(bet => {
            const date = bet.game_date; // YYYY-MM-DD ideally
            if (!counts[date]) {
                counts[date] = { count: 0, wins: 0, date };
            }
            counts[date].count += 1;
            if (bet.real_winner && bet.user_prediction === bet.real_winner) {
                counts[date].wins += 1;
            }
        });

        return counts;
    }, [stats]);

    // 2. Generate last 365 days (or at least enough to fill grid)
    // For simplicity, let's show last 4 months (approx 16 weeks)
    const weeks = useMemo(() => {
        const today = new Date();
        const data = [];
        // Start from 16 weeks ago (monday)
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - (16 * 7));

        // Adjust to Monday
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);

        let currentDate = new Date(startDate);

        for (let w = 0; w < 18; w++) { // 18 weeks columns
            const week = [];
            for (let d = 0; d < 7; d++) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const dayData = calendarData[dateStr] || { count: 0, wins: 0, date: dateStr };

                week.push({
                    date: dateStr,
                    ...dayData
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
            data.push(week);
        }
        return data;
    }, [calendarData]);

    const getIntensityColor = (count: number, wins: number) => {
        if (count === 0) return "bg-gray-800/40"; // Empty

        const winrate = count > 0 ? wins / count : 0;

        // Color based on WINRATE (Green = Good, Red = Bad) + Opacity based on VOLUME?
        // Let's stick to GitHub style: Green intensity based on VOLUME, but tinted by Result?
        // User asked for "Green = Series, Red = Bad".

        if (winrate >= 0.5) {
            // Winning day
            if (count >= 5) return "bg-emerald-400";
            if (count >= 3) return "bg-emerald-500/80";
            return "bg-emerald-600/60";
        } else {
            // Losing day
            if (count >= 5) return "bg-rose-500";
            if (count >= 3) return "bg-rose-500/80";
            return "bg-rose-600/60";
        }
    };

    return (
        <div className="w-full overflow-x-auto pb-2">
            <div className="flex gap-1 min-w-max">
                {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1">
                        {week.map((day, dIdx) => (
                            <TooltipProvider key={day.date}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={`w-3 h-3 rounded-sm ${getIntensityColor(day.count, day.wins)} transition-colors hover:border hover:border-white/50`}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-900 border-gray-800 text-xs text-white">
                                        <div className="font-bold">{day.date}</div>
                                        <div>{day.count} paris</div>
                                        <div className={day.wins > day.count / 2 ? "text-green-400" : "text-red-400"}>
                                            {day.wins} Wins ({Math.round(day.wins / day.count * 100 || 0)}%)
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center mt-3 text-[10px] text-gray-500 font-mono uppercase tracking-widest px-1">
                <span>Derniers 4 mois</span>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-gray-800/40" />
                        <span>0</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-rose-600/60" />
                        <span>Perte</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm bg-emerald-600/60" />
                        <span>Gain</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
