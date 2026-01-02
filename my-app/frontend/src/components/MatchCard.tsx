"use client";

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getTeamLogoUrl, getTeamShortName } from '../utils/nbaTeams';
import { Trophy, TrendingUp, BarChart2, Calendar, ChevronDown, ChevronUp, Edit2, CheckCircle2, XCircle } from 'lucide-react';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MatchCardProps {
    match: {
        id: number;
        game_date: string;
        home_team: string;
        away_team: string;
        predicted_winner: string;
        confidence: string;
        user_prediction?: string;
        user_reason?: string;
        real_winner?: string;
        // Optional fields if available in future
        home_score?: number;
        away_score?: number;
        home_record?: string;
        away_record?: string;
        home_rank?: number;
        away_rank?: number;
        home_streak?: string;
        away_streak?: string;
        status?: string;
        home_stats?: {
            fg_pct: number;
            fg3_pct: number;
            reb: number;
            ast: number;
        };
        away_stats?: {
            fg_pct: number;
            fg3_pct: number;
            reb: number;
            ast: number;
        };
    }
}

// Reasons list from V0 app (for stability)
const REASONS_LIST = [
    "Intuition / Feeling",
    "Blessure / Effectif",
    "Série / Forme du moment",
    "Domicile / Extérieur",
    "Analyse Stats",
    "Revanche / Rivalité",
    "Back-to-Back (Fatigue)",
    "Cote / Value Bet",
    "Suivi de l'IA",
    "Contre l'IA"
];

export default function MatchCard({ match }: MatchCardProps) {
    const [voting, setVoting] = useState(false);
    const [userVote, setUserVote] = useState(match.user_prediction || null);
    const [statsOpen, setStatsOpen] = useState(false);
    const [selectedReason, setSelectedReason] = useState(match.user_reason || REASONS_LIST[0]);

    const handleVote = async (team: string) => {
        setVoting(true);
        const { error } = await supabase
            .from('bets_history')
            .update({
                user_prediction: team,
                user_reason: selectedReason
            })
            .eq('id', match.id);

        if (!error) {
            setUserVote(team);
        } else {
            alert("Erreur réseau");
        }
        setVoting(false);
    };

    const enableEdit = () => {
        setUserVote(null);
    };

    // Helper to format date
    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('fr-FR', {
                weekday: 'short', day: 'numeric', month: 'short'
            }).toUpperCase();
        } catch {
            return dateStr;
        }
    };

    const isMatchFinished = match.status === 'Final' || !!match.real_winner;
    const isAiCorrect = match.predicted_winner === match.real_winner;
    const isUserCorrect = userVote === match.real_winner;

    return (
        <div className="group relative bg-[#121212] border border-white/5 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all duration-300 shadow-xl flex flex-col">
            {/* Background Glow Effect */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Header: Date & Status */}
            <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    <Calendar className="w-3 h-3" />
                    {formatDate(match.game_date)}
                </div>
                {!isMatchFinished && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20 animate-pulse">
                        À VENIR
                    </span>
                )}
                {isMatchFinished && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        TERMINÉ
                    </span>
                )}
            </div>

            {/* Teams Matchup */}
            <div className="p-6 relative">
                <div className="flex justify-between items-center z-10 relative">
                    {/* Home Team */}
                    <div className="flex flex-col items-center w-5/12 group/team">
                        <div className="relative w-16 h-16 mb-3 transition-transform group-hover/team:scale-110 duration-300">
                            {/* Logo wrapper */}
                            <img
                                src={getTeamLogoUrl(match.home_team)}
                                alt={match.home_team}
                                className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/teams/1610612737.svg' }} // Default fallback just in case
                            />
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-[9px] px-1.5 rounded text-gray-400">HOME</div>
                        </div>
                        <h3 className="text-sm font-bold text-center leading-tight mb-1">{getTeamShortName(match.home_team)}</h3>
                        <div className="text-[10px] text-gray-500 font-mono flex flex-col items-center">
                            <span>#{match.home_rank || "-"} ({match.home_record || "0-0"}) <span className={match.home_streak?.startsWith('W') ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{match.home_streak || "-"}</span></span>
                            <span>{match.home_score !== undefined ? <span className="text-white font-bold text-lg">{match.home_score}</span> : ""}</span>
                        </div>
                    </div>

                    {/* VS */}
                    <div className="flex flex-col items-center justify-center w-2/12">
                        {match.home_score !== undefined && match.away_score !== undefined ? (
                            <div className="text-[10px] font-bold text-gray-500 border border-gray-600 px-1 rounded">FINAL</div>
                        ) : (
                            <div className="text-lg font-black text-gray-600 font-mono italic">VS</div>
                        )}
                    </div>

                    {/* Away Team */}
                    <div className="flex flex-col items-center w-5/12 group/team">
                        <div className="relative w-16 h-16 mb-3 transition-transform group-hover/team:scale-110 duration-300">
                            <img
                                src={getTeamLogoUrl(match.away_team)}
                                alt={match.away_team}
                                className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                            />
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-[9px] px-1.5 rounded text-gray-400">AWAY</div>
                        </div>
                        <h3 className="text-sm font-bold text-center leading-tight mb-1">{getTeamShortName(match.away_team)}</h3>
                        <div className="text-[10px] text-gray-500 font-mono flex flex-col items-center">
                            <span>#{match.away_rank || "-"} ({match.away_record || "0-0"}) <span className={match.away_streak?.startsWith('W') ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{match.away_streak || "-"}</span></span>
                            <span>{match.away_score !== undefined ? <span className="text-white font-bold text-lg">{match.away_score}</span> : ""}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Predictions Section */}
            <div className="px-4 pb-4 space-y-3">

                {/* AI Prediction */}
                <div className="bg-gradient-to-r from-[#1a1a1a] to-[#202020] rounded-xl p-3 border border-gray-800 relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                                <Trophy className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-gray-500 tracking-wider font-semibold">AI Prediction</div>
                                <div className="text-sm font-bold text-gray-200">{match.predicted_winner}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-bold text-cyan-400">{match.confidence}</div>
                            {isMatchFinished && (
                                <div className={`text-[10px] font-bold mt-0.5 ${isAiCorrect ? 'text-green-500' : 'text-red-500'}`}>
                                    {isAiCorrect ? 'SUCCESS' : 'FAILED'}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Progress Bar Background */}
                    <div className="absolute bottom-0 left-0 h-0.5 bg-cyan-500/20 w-full">
                        <div className="h-full bg-cyan-500" style={{ width: match.confidence.includes('%') ? match.confidence : '50%' }}></div>
                    </div>
                </div>

                {/* User Prediction */}
                <div className="bg-[#181818] rounded-xl p-3 border border-gray-800/50">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${userVote ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-800 text-gray-500'}`}>
                                <TrendingUp className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-semibold text-gray-400">MY PICK</span>
                        </div>
                        {userVote && !isMatchFinished && (
                            <button onClick={enableEdit} className="text-gray-600 hover:text-white transition-colors">
                                <Edit2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {!userVote ? (
                        <div className="space-y-2 mt-2">
                            {/* Reason selector */}
                            <select
                                value={selectedReason}
                                onChange={(e) => setSelectedReason(e.target.value)}
                                className="w-full py-1.5 px-2 rounded-lg bg-gray-900 border border-gray-700 text-[10px] text-gray-300 focus:outline-none focus:border-purple-500 transition-colors"
                            >
                                {REASONS_LIST.map((reason) => (
                                    <option key={reason} value={reason}>
                                        {reason}
                                    </option>
                                ))}
                            </select>

                            {/* Vote buttons */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleVote(match.home_team)}
                                    disabled={voting || isMatchFinished}
                                    className="py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 transition-all border border-transparent hover:border-gray-600 disabled:opacity-50"
                                >
                                    {getTeamShortName(match.home_team)}
                                </button>
                                <button
                                    onClick={() => handleVote(match.away_team)}
                                    disabled={voting || isMatchFinished}
                                    className="py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 transition-all border border-transparent hover:border-gray-600 disabled:opacity-50"
                                >
                                    {getTeamShortName(match.away_team)}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center mt-1">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${isMatchFinished ? (isUserCorrect ? 'text-green-400' : 'text-red-400') : 'text-purple-400'}`}>
                                    {getTeamShortName(userVote)}
                                </span>
                                {isMatchFinished && (isUserCorrect ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />)}
                            </div>
                            <span className="text-[10px] text-gray-600 italic">
                                {match.user_reason || "No reason provided"}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Stats Accordion - TEMPORARILY DISABLED 
            <div className="border-t border-white/5">
                <button
                    onClick={() => setStatsOpen(!statsOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-medium text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                >
                    ...
                </button>
                ...
            </div> 
            */}
        </div>
    );
}
