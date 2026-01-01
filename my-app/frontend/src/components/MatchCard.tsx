"use client";

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MatchCard({ match }: { match: any }) {
    const [voting, setVoting] = useState(false);
    const [userVote, setUserVote] = useState(match.user_prediction || null);

    const handleVote = async (team: string) => {
        setVoting(true);

        // Envoi à Supabase
        const { error } = await supabase
            .from('bets_history')
            .update({
                user_prediction: team,
                user_reason: "Web/Mobile Vote"
            })
            .eq('id', match.id);

        if (!error) {
            setUserVote(team);
        } else {
            alert("Erreur réseau");
        }
        setVoting(false);
    };

    // Fonction pour annuler visuellement le vote et réafficher les boutons
    const enableEdit = () => {
        setUserVote(null);
    };

    return (
        <div className="bg-[#1c1c1c] border border-gray-800 rounded-xl p-5 shadow-lg hover:border-cyan-500/50 transition-all flex flex-col h-full">

            {/* Date */}
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">
                {match.game_date}
            </div>

            {/* Équipes */}
            <div className="flex justify-between items-center mb-6">
                <div className="text-center w-1/3 flex flex-col items-center">
                    {/* Tu pourras ajouter les logos ici plus tard */}
                    <div className="text-lg font-bold leading-tight">{match.home_team}</div>
                </div>
                <div className="text-gray-700 font-black text-xs px-2">VS</div>
                <div className="text-center w-1/3 flex flex-col items-center">
                    <div className="text-lg font-bold leading-tight">{match.away_team}</div>
                </div>
            </div>

            {/* Zone IA */}
            <div className="bg-[#252525] rounded-lg p-3 text-center mb-4 border border-gray-700/50">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">IA Prediction</div>
                <div className="text-2xl font-black text-cyan-400 tracking-tighter">{match.predicted_winner}</div>
                <div className="text-xs text-cyan-700 font-bold">{match.confidence}</div>
            </div>

            {/* Zone Vote / Résultat - Pousse vers le bas avec margin-top-auto */}
            <div className="mt-auto">
                {match.real_winner ? (
                    // CAS 1 : Match Fini
                    <div className={`text-center text-sm font-bold py-2 rounded-lg border ${match.predicted_winner === match.real_winner
                            ? 'bg-green-900/20 text-green-400 border-green-900'
                            : 'bg-red-900/20 text-red-400 border-red-900'
                        }`}>
                        {match.predicted_winner === match.real_winner ? 'IA : GAGNÉ 🎯' : 'IA : PERDU ❌'}
                    </div>
                ) : (
                    // CAS 2 : Match à venir
                    <div>
                        {userVote ? (
                            // Sous-Cas A : Déjà Voté
                            <div className="flex flex-col items-center animate-in fade-in duration-300">
                                <div className="text-center w-full p-2 bg-green-900/10 rounded border border-green-900/30">
                                    <span className="text-xs text-gray-400 block uppercase">Mon Choix</span>
                                    <span className="text-green-400 font-black text-lg">{userVote}</span>
                                </div>
                                {/* Bouton Modifier */}
                                <button
                                    onClick={enableEdit}
                                    className="mt-2 text-xs text-gray-600 underline hover:text-gray-300 transition-colors"
                                >
                                    Modifier
                                </button>
                            </div>
                        ) : (
                            // Sous-Cas B : Pas encore voté (ou mode modification)
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleVote(match.home_team)}
                                    disabled={voting}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-200 text-xs font-bold py-3 rounded-lg transition-all border border-transparent hover:border-gray-600"
                                >
                                    {match.home_team}
                                </button>
                                <button
                                    onClick={() => handleVote(match.away_team)}
                                    disabled={voting}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-200 text-xs font-bold py-3 rounded-lg transition-all border border-transparent hover:border-gray-600"
                                >
                                    {match.away_team}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}