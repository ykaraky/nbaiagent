"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Save, Search, RefreshCw, Plus, Trash2, ShieldCheck, Trophy } from 'lucide-react';
import { getTeamLogoUrl } from '../../utils/nbaTeams';

// Client-side Supabase (for fetching (Read Public))
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Player {
    id: number;
    full_name: string;
    team_id: number;
    position: string | null;
}

interface RankedPlayer extends Player {
    rank: number;
}

// --- SORTABLE ITEM (LEFT COLUMN) ---
function SortableItem(props: { player: RankedPlayer, index: number, onRemove: (id: number) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.player.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} style={style} className={`flex items-center gap-3 p-2 bg-[#111] border border-gray-800 rounded-lg hover:border-gray-600 group transition-all ${isDragging ? 'shadow-2xl ring-2 ring-purple-500/50' : ''}`}>
            {/* Handle */}
            <div {...attributes} {...listeners} className="cursor-grab text-gray-600 hover:text-white transition-colors p-1 touch-none">
                <GripVertical className="w-4 h-4" />
            </div>

            {/* Rank */}
            <div className={`w-6 text-center text-sm font-black ${props.index < 10 ? 'text-yellow-500' : 'text-gray-500'}`}>
                {props.index + 1}
            </div>

            {/* Avatar / Team */}
            <div className="relative w-8 h-8 flex-shrink-0 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                <img
                    src={getTeamLogoUrl("", props.player.team_id)}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/teams/1610612737.svg' }}
                    className="w-full h-full object-cover p-1"
                    alt={props.player.full_name}
                />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-200 text-xs truncate">{props.player.full_name}</div>
            </div>

            {/* Remove Action */}
            <button
                onClick={() => props.onRemove(props.player.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded text-gray-600 hover:text-red-500 transition-all"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// --- POOL ITEM (RIGHT COLUMN) ---
function PoolItem(props: { player: Player, onAdd: (p: Player) => void, disabled: boolean }) {
    return (
        <div className="flex items-center gap-3 p-2 bg-[#0a0a0a] border border-gray-800/50 rounded-lg hover:border-gray-700 transition-all group">
            <div className="relative w-8 h-8 flex-shrink-0 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                <img
                    src={getTeamLogoUrl("", props.player.team_id)}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/teams/1610612737.svg' }}
                    className="w-full h-full object-cover p-1"
                    alt={props.player.full_name}
                />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-300 text-xs truncate">{props.player.full_name}</div>
            </div>
            <button
                onClick={() => props.onAdd(props.player)}
                disabled={props.disabled}
                className="p-1.5 bg-gray-900 hover:bg-green-500/20 rounded text-gray-500 hover:text-green-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <Plus className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}

// --- MAIN LIST COMPONENT ---
export default function RankingList() {
    const [rankedPlayers, setRankedPlayers] = useState<RankedPlayer[]>([]);
    const [poolPlayers, setPoolPlayers] = useState<Player[]>([]);
    const [filteredPool, setFilteredPool] = useState<Player[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Initial Fetch
    useEffect(() => {
        fetchData();
    }, []);

    // Filter Logic
    useEffect(() => {
        if (!searchTerm) {
            setFilteredPool(poolPlayers); // Show full list (500 is manageable)
        } else {
            const lower = searchTerm.toLowerCase();
            const filtered = poolPlayers.filter(p => p.full_name.toLowerCase().includes(lower));
            setFilteredPool(filtered);
        }
    }, [searchTerm, poolPlayers]);

    const fetchData = async () => {
        setLoading(true);
        const { data: allPlayers } = await supabase.from('players').select('*').eq('is_active', true);
        const { data: ranking } = await supabase.from('player_ranking').select('*').eq('season', '2025-26');

        if (allPlayers) {
            // Separate Ranked vs Pool
            const ranked: RankedPlayer[] = [];
            const pool: Player[] = [];

            // Helper set for O(1) lookup
            const rankedIds = new Set(ranking?.map(r => r.player_id));

            allPlayers.forEach(p => {
                if (rankedIds.has(p.id)) {
                    const r = ranking?.find(rk => rk.player_id === p.id);
                    ranked.push({ ...p, rank: r ? r.rank : 999 });
                } else {
                    pool.push({ ...p });
                }
            });

            // Sort Ranking
            ranked.sort((a, b) => a.rank - b.rank);
            // Sort Pool (Alphabetical)
            pool.sort((a, b) => a.full_name.localeCompare(b.full_name));

            setRankedPlayers(ranked);
            setPoolPlayers(pool);
        }
        setLoading(false);
    };

    // DND Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            // Mobile: Press delay of 250ms before drag starts implies intent, allowing scroll otherwise
            // HOWEVER, since we have a Handle, we might want instant drag ON THE HANDLE.
            // But if the handle is small, users might miss.
            // Let's stick to standard practice: 
            // If dragging by handle, we usually want instant, but 'touch-action: none' on handle is key.
            // If we rely on specific sensors for handle vs item...
            // Actually, simply adding TouchSensor often fixes the "scroll vs drag" conflict.
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setRankedPlayers((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addToRanking = (player: Player) => {
        if (rankedPlayers.length >= 50) {
            alert("Limite atteinte (50 joueurs max). Retirez-en un pour ajouter.");
            return;
        }

        // Remove from Pool
        setPoolPlayers(prev => prev.filter(p => p.id !== player.id));
        // Add to Ranking (End)
        setRankedPlayers(prev => [...prev, { ...player, rank: prev.length + 1 }]);
        // Clear search
        setSearchTerm("");
    };

    const removeFromRanking = (id: number) => {
        const playerToRemove = rankedPlayers.find(p => p.id === id);
        if (!playerToRemove) return;

        // Remove from Ranking
        setRankedPlayers(prev => prev.filter(p => p.id !== id));
        // Add back to Pool & Re-sort
        setPoolPlayers(prev => {
            const newPool = [...prev, playerToRemove];
            return newPool.sort((a, b) => a.full_name.localeCompare(b.full_name));
        });
    };

    const saveRanking = async () => {
        setSaving(true);
        // Normalize Ranks (1-based index)
        const payload = rankedPlayers.map((p, index) => ({
            player_id: p.id,
            rank: index + 1
        }));

        try {
            const res = await fetch('/api/ranking/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rankings: payload })
            });

            if (res.ok) {
                alert("✅ Classement sauvegardé avec succès !");
            } else {
                alert("❌ Erreur lors de la sauvegarde.");
            }
        } catch (e) {
            alert("❌ Erreur réseau.");
            console.error(e);
        }
        setSaving(false);
    };

    if (loading) return <div className="text-gray-500 text-center py-20 flex flex-col items-center gap-2"><RefreshCw className="animate-spin" />Chargement...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">

            {/* LEFT: RANKING */}
            <div className="flex flex-col gap-4 h-full md:overflow-hidden">
                <div className="flex justify-between items-center bg-[#111] p-4 rounded-xl border border-gray-800 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Mon Top 50
                        </h2>
                        <div className="text-xs text-gray-500 font-mono mt-1">
                            {rankedPlayers.length} / 50 Joueurs
                        </div>
                    </div>
                    <button
                        onClick={saveRanking}
                        disabled={saving}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 text-xs uppercase tracking-wider shadow-lg shadow-purple-900/20"
                    >
                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Sauvegarder
                    </button>
                </div>

                <div className="flex-1 bg-[#111]/50 border border-gray-800/50 rounded-xl p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent min-h-0">
                    {rankedPlayers.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
                            <ShieldCheck className="w-10 h-10" />
                            <p className="text-sm">Votre classement est vide.</p>
                            <p className="text-xs">Ajoutez des joueurs depuis la liste de droite.</p>
                        </div>
                    )}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={rankedPlayers.map(p => p.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1.5">
                                {rankedPlayers.map((player, index) => (
                                    <SortableItem key={player.id} player={player} index={index} onRemove={removeFromRanking} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            {/* RIGHT: POOL */}
            <div className="flex flex-col gap-4 h-full md:overflow-hidden">
                <div className="bg-[#111] p-3 rounded-xl border border-gray-800 flex items-center gap-3 flex-shrink-0">
                    <Search className="w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Rechercher un joueur..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none focus:outline-none text-sm text-gray-300 w-full placeholder-gray-600"
                    />
                </div>

                <div className="flex-1 bg-[#0a0a0a] border border-gray-800/50 rounded-xl p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent min-h-0">
                    <div className="text-xs text-gray-500 mb-2 px-2 uppercase font-bold tracking-wider">
                        Joueurs Disponibles ({filteredPool.length})
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {filteredPool.map(player => (
                            <PoolItem
                                key={player.id}
                                player={player}
                                onAdd={addToRanking}
                                disabled={rankedPlayers.length >= 50}
                            />
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}
