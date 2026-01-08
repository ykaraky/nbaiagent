"use client";

import React, { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { getTeamShortName, getTeamLogoUrl } from '../../utils/nbaTeams';

interface TeamPerformanceTableProps {
    stats: any[];
}

type SortField = 'team' | 'ai_acc' | 'user_acc' | 'roi';

export default function TeamPerformanceTable({ stats }: TeamPerformanceTableProps) {
    const [sortField, setSortField] = useState<SortField>('roi');
    const [sortDesc, setSortDesc] = useState(true);

    const teamData = useMemo(() => {
        const teams: { [key: string]: { name: string, ai_wins: number, user_wins: number, user_bets: number, total: number, pnl: number } } = {};

        stats.forEach(match => {
            if (!match.real_winner) return;

            [match.home_team, match.away_team].forEach(team => {
                if (!teams[team]) {
                    teams[team] = { name: team, ai_wins: 0, user_wins: 0, user_bets: 0, total: 0, pnl: 0 };
                }

                teams[team].total++;

                // AI Stats
                if (match.predicted_winner === match.real_winner) {
                    teams[team].ai_wins++;
                }

                // User Stats (Betting ROI)
                if (match.user_result && match.user_prediction === team) {
                    teams[team].user_bets++;
                    if (match.user_result === 'GAGNE') {
                        teams[team].user_wins++;
                        teams[team].pnl += 90;
                    } else {
                        teams[team].pnl -= 100;
                    }
                }
            });
        });

        return Object.values(teams)
            .filter(t => t.total >= 3) // Min sample size
            .map(t => ({
                ...t,
                ai_acc: (t.ai_wins / t.total) * 100,
                user_acc: t.user_bets > 0 ? (t.user_wins / t.user_bets) * 100 : 0
            }))
            .sort((a, b) => {
                if (sortField === 'team') {
                    return sortDesc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
                }
                const getVal = (obj: any, field: SortField) => field === 'roi' ? obj.pnl : obj[field];

                const valA = getVal(a, sortField) as number;
                const valB = getVal(b, sortField) as number;
                return sortDesc ? (valB - valA) : (valA - valB);
            });

    }, [stats, sortField, sortDesc]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDesc(!sortDesc);
        } else {
            setSortField(field);
            setSortDesc(true);
        }
    };

    return (
        <div className="w-full overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wider text-[10px]">
                            <th className="pb-3 pl-2 cursor-pointer hover:text-white" onClick={() => handleSort('team')}>Team <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                            <th className="pb-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('ai_acc')}>AI Acc. <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                            <th className="pb-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('user_acc')}>User Acc. <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                            <th className="pb-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('roi')}>My ROI <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {teamData.slice(0, 8).map((team) => (
                            <tr key={team.name} className="group hover:bg-white/5 transition-colors">
                                <td className="py-2.5 pl-2 flex items-center gap-2">
                                    <div className="w-6 h-6 relative shrink-0">
                                        <img
                                            src={getTeamLogoUrl(team.name, 0)}
                                            alt={team.name}
                                            className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/teams/1610612737.svg' }}
                                        />
                                    </div>
                                    <span className="font-bold text-gray-300 group-hover:text-white">{getTeamShortName(team.name)}</span>
                                </td>
                                <td className="py-2.5 text-right font-mono text-xs">
                                    <span className={`${team.ai_acc > 65 ? 'text-green-400' : team.ai_acc < 40 ? 'text-red-400' : 'text-gray-400'}`}>
                                        {team.ai_acc.toFixed(0)}%
                                    </span>
                                </td>
                                <td className="py-2.5 text-right font-mono text-xs">
                                    <span className={`${team.user_acc > 60 ? 'text-purple-400' : team.user_acc > 0 && team.user_acc < 40 ? 'text-red-400' : 'text-gray-400'}`}>
                                        {team.user_bets > 0 ? `${team.user_acc.toFixed(0)}%` : '-'}
                                    </span>
                                </td>
                                <td className="py-2.5 text-right font-mono text-xs font-bold">
                                    <span className={`px-1.5 py-0.5 rounded ${team.pnl > 0 ? 'bg-green-500/10 text-green-400' : team.pnl < 0 ? 'bg-red-500/10 text-red-400' : 'text-gray-500'}`}>
                                        {team.user_bets > 0 ? (team.pnl > 0 ? '+' : '') + team.pnl + '€' : '-'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
