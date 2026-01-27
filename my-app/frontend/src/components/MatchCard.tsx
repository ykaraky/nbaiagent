"use client";

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { getTeamLogoUrl, getTeamShortName } from '../utils/nbaTeams';
import { Trophy, TrendingUp, BarChart2, Calendar, ChevronDown, ChevronUp, Edit2, CheckCircle2, XCircle, ChevronsUp, ChevronsDown, Minus, AlertTriangle, ShieldCheck, Zap, Activity } from 'lucide-react';

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
        // V13 Explainability
        ai_explanation?: string;
        risk_level?: string; // High, Medium, Low
        badges?: string; // "Badge1|Badge2"
        user_prediction?: string;
        user_reason?: string;
        user_confidence?: number;
        real_winner?: string;
        // Optional fields if available in future
        home_score?: number;
        away_score?: number;
        home_id?: number;
        away_id?: number;
        home_record?: string;
        away_record?: string;
        home_rank?: number;
        away_rank?: number;
        home_streak?: string;
        away_streak?: string;
        // V12 Context Features
        home_rest_days?: number;
        away_rest_days?: number;
        home_is_b2b?: boolean;
        away_is_b2b?: boolean;
        home_last10?: number;
        away_last10?: number;
        home_win_rate_specific?: number;
        away_win_rate_specific?: number;
        status?: string;
        home_stats?: {
            fg_pct: number;
            fg3_pct: number;
            ft_pct: number;
            reb: number;
            ast: number;
            stl: number;
            blk: number;
            tov: number;
            [key: string]: any;
        };
        away_stats?: {
            fg_pct: number;
            fg3_pct: number;
            ft_pct: number;
            reb: number;
            ast: number;
            stl: number;
            blk: number;
            tov: number;
        };
    }
}

import { REASONS_DATA, REASON_TYPES, getReasonById } from '../utils/reasonsConstants';

// Default reason fallback
const DEFAULT_REASON = REASONS_DATA[0].id;

export default function MatchCard({ match }: MatchCardProps) {
    const [voting, setVoting] = useState(false);
    const [userVote, setUserVote] = useState(match.user_prediction || null);
    const [statsOpen, setStatsOpen] = useState(false);
    const [selectedReason, setSelectedReason] = useState(match.user_reason || DEFAULT_REASON);
    const [userConfidence, setUserConfidence] = useState(match.user_confidence || 2); // 1=Low, 2=Mid, 3=High

    const handleVote = async (team: string) => {
        // 1. Récupérer ou Demander le PIN
        let pin = localStorage.getItem('nba_admin_pin');
        if (!pin) {
            pin = window.prompt("🔒 Mode Admin : Entrez le code PIN pour voter");
            if (!pin) return; // Annulation
        }

        setVoting(true);

        // NOUVEAU: Appel via API Route (tunnel sécurisé)
        try {
            const res = await fetch('/api/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId: match.id,
                    team: team,
                    reason: selectedReason,
                    confidence: userConfidence,
                    pin: pin // Envoi du PIN
                })
            });

            if (res.ok) {
                setUserVote(team);
                // Si succès, on mémorise le PIN pour ne plus le demander
                localStorage.setItem('nba_admin_pin', pin);
            } else {
                const err = await res.json();
                if (res.status === 401) {
                    alert("⛔ Code Incorrect !");
                    localStorage.removeItem('nba_admin_pin'); // On oublie le mauvais code
                } else {
                    console.error("Vote failed:", err);
                    alert("Erreur lors du vote (voir console)");
                }
            }
        } catch (e) {
            console.error("Network error:", e);
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

    const isMatchFinished = match.status === 'Final'; // Strict check for UI
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
                        À VENIR / LIVE
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
                        <Link href={match.home_id ? `/teams/${match.home_id}` : '#'} className={`relative w-16 h-16 mb-3 transition-transform group-hover/team:scale-110 duration-300 ${!match.home_id && 'pointer-events-none'}`}>
                            {/* Logo wrapper */}
                            <img
                                src={getTeamLogoUrl(match.home_team, match.home_id)}
                                alt={match.home_team}
                                className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/teams/1610612737.svg' }} // Default fallback just in case
                            />
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-[9px] px-1.5 rounded text-gray-400">HOME</div>
                        </Link>
                        <Link href={match.home_id ? `/teams/${match.home_id}` : '#'} className={`text-sm font-bold text-center leading-tight mb-1 hover:text-cyan-400 transition-colors ${!match.home_id && 'pointer-events-none'}`}>
                            {getTeamShortName(match.home_team)}
                        </Link>

                        {/* SCORE DISPLAY (Moved Here) */}
                        {isMatchFinished && match.home_score !== undefined && (
                            <div className={`text-2xl font-black leading-none my-1 ${match.home_score < (match.away_score || 0) ? "text-gray-500" : "text-white"}`}>
                                {match.home_score}
                            </div>
                        )}

                        <div className="text-[10px] text-gray-500 font-mono flex flex-col items-center gap-1 w-full max-w-[160px]">
                            {/* LINE 1: Rank, Record, Streak (Grid) */}
                            <div className="grid grid-cols-3 w-full gap-0.5 text-[9px] opacity-90 border border-gray-800 rounded px-1 py-0.5 text-center items-center">
                                <span className={match.home_rank ? "text-gray-400" : "text-gray-600"}>#{match.home_rank || "-"}</span>
                                <span className="text-gray-300 font-medium">{match.home_record || "0-0"}</span>
                                <span className={match.home_streak?.startsWith('W') ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                    {match.home_streak || "-"}
                                </span>
                            </div>

                            {/* LINE 2: Specific Record, L10, Fatigue (Grid) */}
                            <div className="grid grid-cols-3 w-full gap-0.5 text-[9px] opacity-75 border border-gray-800 rounded px-1 py-0.5 text-center items-center">
                                <span title="Home Win Rate" className="text-gray-400">H {match.home_win_rate_specific ? `${(match.home_win_rate_specific * 100).toFixed(0)}%` : '-'}</span>
                                <span title="Last 10" className={match.home_last10 !== undefined && match.home_last10 >= 7 ? 'text-green-400' : (match.home_last10 !== undefined && match.home_last10 <= 3 ? 'text-red-400' : 'text-gray-400')}>
                                    L10 {match.home_last10 !== undefined ? `${match.home_last10}-${10 - match.home_last10}` : '-'}
                                </span>
                                {match.home_is_b2b ? (
                                    <span className="text-red-500 font-bold">B2B</span>
                                ) : (
                                    <span className="text-gray-400">{match.home_rest_days !== undefined ? `${match.home_rest_days}j` : '-'}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* VS */}
                    <div className="flex flex-col items-center justify-center w-2/12">
                        {match.home_score !== undefined && match.away_score !== undefined ? (
                            <div className="text-[10px] font-bold text-gray-600 border border-gray-700 px-1 rounded opacity-80">FINAL</div>
                        ) : (
                            <div className="text-lg font-black text-gray-700 font-mono italic">VS</div>
                        )}
                    </div>

                    {/* Away Team */}
                    <div className="flex flex-col items-center w-5/12 group/team">
                        <Link href={match.away_id ? `/teams/${match.away_id}` : '#'} className={`relative w-16 h-16 mb-3 transition-transform group-hover/team:scale-110 duration-300 ${!match.away_id && 'pointer-events-none'}`}>
                            <img
                                src={getTeamLogoUrl(match.away_team, match.away_id)}
                                alt={match.away_team}
                                className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                            />
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-[9px] px-1.5 rounded text-gray-400">AWAY</div>
                        </Link>
                        <Link href={match.away_id ? `/teams/${match.away_id}` : '#'} className={`text-sm font-bold text-center leading-tight mb-1 hover:text-cyan-400 transition-colors ${!match.away_id && 'pointer-events-none'}`}>
                            {getTeamShortName(match.away_team)}
                        </Link>

                        {/* SCORE DISPLAY (Moved Here) */}
                        {isMatchFinished && match.away_score !== undefined && (
                            <div className={`text-2xl font-black leading-none my-1 ${match.away_score < (match.home_score || 0) ? "text-gray-500" : "text-white"}`}>
                                {match.away_score}
                            </div>
                        )}

                        <div className="text-[10px] text-gray-500 font-mono flex flex-col items-center gap-1 w-full max-w-[160px]">
                            {/* LINE 1: Rank, Record, Streak (Grid) */}
                            <div className="grid grid-cols-3 w-full gap-0.5 text-[9px] opacity-90 border border-gray-800 rounded px-1 py-0.5 text-center items-center">
                                <span className={match.away_rank ? "text-gray-400" : "text-gray-600"}>#{match.away_rank || "-"}</span>
                                <span className="text-gray-300 font-medium">{match.away_record || "0-0"}</span>
                                <span className={match.away_streak?.startsWith('W') ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                    {match.away_streak || "-"}
                                </span>
                            </div>

                            {/* LINE 2: Specific Record, L10, Fatigue (Grid) */}
                            <div className="grid grid-cols-3 w-full gap-0.5 text-[9px] opacity-75 border border-gray-800 rounded px-1 py-0.5 text-center items-center">
                                <span title="Away Win Rate" className="text-gray-400">A {match.away_win_rate_specific ? `${(match.away_win_rate_specific * 100).toFixed(0)}%` : '-'}</span>
                                <span title="Last 10" className={match.away_last10 !== undefined && match.away_last10 >= 7 ? 'text-green-400' : (match.away_last10 !== undefined && match.away_last10 <= 3 ? 'text-red-400' : 'text-gray-400')}>
                                    L10 {match.away_last10 !== undefined ? `${match.away_last10}-${10 - match.away_last10}` : '-'}
                                </span>
                                {match.away_is_b2b ? (
                                    <span className="text-red-500 font-bold">B2B</span>
                                ) : (
                                    <span className="text-gray-400">{match.away_rest_days !== undefined ? `${match.away_rest_days}j` : '-'}</span>
                                )}
                            </div>
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
                            <div className="p-2 bg-cyan-900/20 rounded-lg text-cyan-300/80">
                                <Trophy className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-gray-500 tracking-wider font-bold">AI Prediction</div>
                                <div className="text-sm font-bold text-gray-400">{match.predicted_winner}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-black text-cyan-500/80 tracking-tight">{match.confidence}</div>
                            {isMatchFinished && (
                                <div className={`text-[10px] font-black mt-0.5 tracking-tighter ${isAiCorrect ? 'text-green-600/80' : 'text-red-600/80'}`}>
                                    {isAiCorrect ? 'SUCCESS' : 'FAILED'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* V13 Explanation (Minimalist) */}
                    {match.ai_explanation && (
                        <div className="mt-2 text-[10px] text-gray-500 font-medium leading-tight flex items-center gap-2 relative z-10">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${match.risk_level === 'High' ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' :
                                match.risk_level === 'Medium' ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]' :
                                    'bg-gray-500'
                                }`} />
                            <span className="opacity-80">{match.ai_explanation}</span>
                        </div>
                    )}

                    {/* Progress Bar Background */}
                    <div className="absolute bottom-0 left-0 h-0.5 bg-cyan-900/20 w-full">
                        <div className="h-full bg-cyan-700/30" style={{ width: match.confidence.includes('%') ? match.confidence : '50%' }}></div>
                    </div>
                </div>

                {/* User Prediction */}
                <div className="bg-[#181818] rounded-xl p-3 border border-gray-800/50 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-0">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${userVote ? 'bg-purple-900/20 text-purple-300/80 border border-purple-500/10' : 'bg-gray-800/50 text-gray-600 border border-gray-700/50'}`}>
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase text-gray-400/60 tracking-wider font-bold">MY PICK</div>
                                <div className={`text-sm font-bold ${userVote ? 'text-gray-400' : 'text-gray-600 italic'}`}>
                                    {userVote || "No prediction"}
                                </div>
                            </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                            {userVote ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        {/* Confidence Indicator Display */}
                                        {match.user_confidence && (
                                            <div title={`Confiance: ${match.user_confidence === 3 ? 'Elevée' : match.user_confidence === 1 ? 'Faible' : 'Moyenne'}`} className="flex items-center justify-center w-5 h-5 border border-gray-700/50 rounded flex-shrink-0">
                                                {match.user_confidence === 3 && <ChevronsUp className="w-3.5 h-3.5 text-gray-400" />}
                                                {match.user_confidence === 1 && <ChevronsDown className="w-3.5 h-3.5 text-gray-600" />}
                                                {(!match.user_confidence || match.user_confidence === 2) && <Minus className="w-3 h-3 text-gray-500" />}
                                            </div>
                                        )}
                                        <div className="text-xs font-bold text-purple-400/80 tracking-tight max-w-[150px] truncate">
                                            {match.user_reason || selectedReason}
                                        </div>
                                        {userVote && !isMatchFinished && (
                                            <button onClick={enableEdit} className="text-gray-600 hover:text-white transition-colors">
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    {isMatchFinished && (
                                        <div className={`text-[10px] font-black mt-0.5 tracking-tighter ${isUserCorrect ? 'text-green-600/80' : 'text-red-600/80'}`}>
                                            {isUserCorrect ? 'SUCCESS' : 'FAILED'}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span className="text-[10px] font-bold text-gray-600 tracking-widest uppercase">PENDING</span>
                            )}
                        </div>
                    </div>

                    {!userVote && !isMatchFinished && (
                        <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                            {/* Reason selector */}
                            {/* Reason selector (Grouped by Type) */}
                            <select
                                value={selectedReason}
                                onChange={(e) => setSelectedReason(e.target.value)}
                                className="w-full py-2 px-3 rounded-lg bg-black/40 border border-gray-800 text-[11px] text-gray-400 focus:outline-none focus:border-purple-500/50 transition-all cursor-pointer hover:bg-black/60"
                            >
                                {REASON_TYPES.map((type) => (
                                    <optgroup key={type} label={type} className="bg-gray-900 text-gray-500 font-bold">
                                        {REASONS_DATA.filter(r => r.type === type).map((reason) => (
                                            <option key={reason.id} value={reason.id} title={reason.description} className="text-gray-300 font-normal">
                                                {reason.id}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>

                            {/* Confidence Selector */}
                            <div className="flex gap-1 justify-center w-full max-w-[180px] mx-auto">
                                {[1, 2, 3].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setUserConfidence(level)}
                                        className={`flex-1 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider transition-all border ${userConfidence === level
                                            ? (level === 1 ? 'bg-red-500/20 border-red-500 text-red-400' :
                                                level === 2 ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                                                    'bg-green-500/20 border-green-500 text-green-400')
                                            : 'bg-gray-800 border-gray-700 text-gray-600 hover:bg-gray-700'
                                            }`}
                                    >
                                        {level === 1 ? 'Low' : level === 2 ? 'Mid' : 'High'}
                                    </button>
                                ))}
                            </div>

                            {/* Vote buttons */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleVote(match.home_team)}
                                    disabled={voting}
                                    className="py-2.5 px-3 rounded-lg bg-gray-900/50 hover:bg-purple-500/10 text-xs font-bold text-gray-400 hover:text-purple-300 transition-all border border-gray-800 hover:border-purple-500/30 disabled:opacity-50"
                                >
                                    {getTeamShortName(match.home_team)}
                                </button>
                                <button
                                    onClick={() => handleVote(match.away_team)}
                                    disabled={voting}
                                    className="py-2.5 px-3 rounded-lg bg-gray-900/50 hover:bg-purple-500/10 text-xs font-bold text-gray-400 hover:text-purple-300 transition-all border border-gray-800 hover:border-purple-500/30 disabled:opacity-50"
                                >
                                    {getTeamShortName(match.away_team)}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Stats Accordion */}
            {
                isMatchFinished && (match.home_stats || match.away_stats) && (
                    <div className="border-t border-white/5 bg-[#141414]/50">
                        <button
                            onClick={() => setStatsOpen(!statsOpen)}
                            className="w-full flex items-center justify-between px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <BarChart2 className="w-3.5 h-3.5" />
                                <span>Match Statistics</span>
                            </div>
                            {statsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {statsOpen && (
                            <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <StatBar
                                    label="FG %"
                                    home={(match.home_stats?.fg_pct || 0) * 100}
                                    away={(match.away_stats?.fg_pct || 0) * 100}
                                    format={(v) => `${v.toFixed(1)}%`}
                                />
                                <StatBar
                                    label="3PT %"
                                    home={(match.home_stats?.fg3_pct || 0) * 100}
                                    away={(match.away_stats?.fg3_pct || 0) * 100}
                                    format={(v) => `${v.toFixed(1)}%`}
                                />
                                <StatBar
                                    label="FT %"
                                    home={(match.home_stats?.ft_pct || 0) * 100}
                                    away={(match.away_stats?.ft_pct || 0) * 100}
                                    format={(v) => `${v.toFixed(1)}%`}
                                />
                                <div className="pt-2 border-t border-white/5" />
                                <StatBar
                                    label="Rebounds"
                                    home={match.home_stats?.reb || 0}
                                    away={match.away_stats?.reb || 0}
                                />
                                <StatBar
                                    label="Assists"
                                    home={match.home_stats?.ast || 0}
                                    away={match.away_stats?.ast || 0}
                                />
                                <StatBar
                                    label="Steals"
                                    home={match.home_stats?.stl || 0}
                                    away={match.away_stats?.stl || 0}
                                />
                                <StatBar
                                    label="Blocks"
                                    home={match.home_stats?.blk || 0}
                                    away={match.away_stats?.blk || 0}
                                />
                                <StatBar
                                    label="Turnovers"
                                    home={match.home_stats?.tov || 0}
                                    away={match.away_stats?.tov || 0}
                                    lowerIsBetter
                                />
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
}

// Helper component for comparative stats
function StatBar({ label, home, away, format = (v) => v.toString(), lowerIsBetter = false }: {
    label: string,
    home: number,
    away: number,
    format?: (v: number) => string,
    lowerIsBetter?: boolean
}) {
    const total = home + away;
    const homePct = total > 0 ? (home / total) * 100 : 50;
    const awayPct = 100 - homePct;

    const isHomeLead = lowerIsBetter ? (home < away && home !== 0) : (home > away);
    const isAwayLead = lowerIsBetter ? (away < home && away !== 0) : (away > home);

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold tracking-tight">
                <span className={isHomeLead ? 'text-cyan-400' : 'text-gray-500'}>{format(home)}</span>
                <span className="text-gray-500 uppercase tracking-widest font-medium opacity-60">{label}</span>
                <span className={isAwayLead ? 'text-cyan-400' : 'text-gray-500'}>{format(away)}</span>
            </div>
            <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-gray-800/40">
                <div
                    className={`h-full transition-all duration-700 ease-out ${isHomeLead ? 'bg-gradient-to-r from-cyan-800 to-cyan-600 shadow-none opacity-80' : 'bg-gray-700'}`}
                    style={{ width: `${homePct}%` }}
                />
                <div
                    className={`h-full transition-all duration-700 ease-out ${isAwayLead ? 'bg-gradient-to-l from-cyan-800 to-cyan-600 shadow-none opacity-80' : 'bg-gray-800'}`}
                    style={{ width: `${awayPct}%` }}
                />
            </div>
        </div>
    );
}
