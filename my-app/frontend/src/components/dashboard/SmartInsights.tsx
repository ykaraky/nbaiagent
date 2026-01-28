import React, { useMemo } from 'react';
import { Flame, Calendar, Skull, TrendingUp } from 'lucide-react';

export default function SmartInsights({ stats }: { stats: any[] }) {

    const insights = useMemo(() => {
        if (!stats || stats.length === 0) return null;

        // Stats are ordered by date desc (latest first)
        // We need to look at 'finished' games only
        const finishedGames = stats.filter(b => b.real_winner && b.real_winner !== 'TBD');

        // Refined logical "Nemesis": Team with lowest winrate (min 3 games)
        const teamPerformance: Record<string, { wins: number, total: number }> = {};
        finishedGames.forEach(game => {
            [game.home_team, game.away_team].forEach(team => {
                if (!teamPerformance[team]) teamPerformance[team] = { wins: 0, total: 0 };
                teamPerformance[team].total++;
                if (game.user_prediction === game.real_winner) teamPerformance[team].wins++;
            });
        });

        // 2. Lucky Team (Best Team)
        let luckyTeam = { name: '-', record: '0-0', winrate: 0 };
        let maxWinrate = -1;

        Object.entries(teamPerformance).forEach(([team, stat]) => {
            if (stat.total >= 3) {
                const wr = (stat.wins / stat.total) * 100;
                if (wr > maxWinrate) {
                    maxWinrate = wr;
                    luckyTeam = { name: team, record: `${stat.wins}-${stat.total - stat.wins}`, winrate: Math.round(wr) };
                }
            }
        });

        let nemesis = { name: '-', record: '0-0', winrate: 0 };
        let minWinrate = 101;

        Object.entries(teamPerformance).forEach(([team, stat]) => {
            if (stat.total >= 3) {
                const wr = (stat.wins / stat.total) * 100;
                if (wr < minWinrate) {
                    minWinrate = wr;
                    nemesis = { name: team, record: `${stat.wins}-${stat.total - stat.wins}`, winrate: Math.round(wr) };
                }
            }
        });

        return {
            luckyTeam: luckyTeam,
            nemesis: nemesis
        };

    }, [stats]);

    if (!insights) return <div className="text-gray-500 text-sm">Pas assez de données.</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LUCKY TEAM */}
            <div className="bg-[#18181b] border border-gray-800 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group">
                <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Porte-Bonheur</div>
                    <div className="text-lg font-black text-white leading-tight" title={insights.luckyTeam.name}>
                        {insights.luckyTeam.name}
                    </div>
                    <div className="text-xs text-emerald-400 font-mono font-bold">
                        {insights.luckyTeam.record} ({insights.luckyTeam.winrate}%)
                    </div>
                </div>
            </div>

            {/* NEMESIS */}
            <div className="bg-[#18181b] border border-gray-800 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group">
                <div className="p-3 rounded-full bg-purple-500/10 text-purple-400">
                    <Skull className="w-6 h-6" />
                </div>
                <div>
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Bête Noire</div>
                    <div className="text-lg font-black text-white leading-tight" title={insights.nemesis.name}>
                        {insights.nemesis.name}
                    </div>
                    <div className="text-xs text-red-400 font-mono font-bold">{insights.nemesis.record} ({insights.nemesis.winrate}%)</div>
                </div>
            </div>
        </div>
    );
}
