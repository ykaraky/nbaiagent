import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Note: On ne crée PAS le client ici en global, car si la clé manque au Build time,
// Next.js plantera lors de l'optimisation statique.
// On le crée à l'intérieur du handler.

export async function POST(request: Request) {
    // 1. Initialisation Sécurisée
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Validation des clés serveur (Vercel Env Vars)
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("ERREUR CRITIQUE: Configuration Supabase manquante (URL ou Service Key).");
        return NextResponse.json({ error: 'Server Configuration Error - Missing Keys' }, { status: 500 });
    }

    // Ce client utilise la CLÉ SECRÈTE (Service Role) et contourne RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const body = await request.json();
        const { matchId, team, reason, confidence, pin } = body;

        // 2. Vérification du PIN
        const CORRECT_PIN = process.env.ADMIN_VOICE_PIN;

        // Si le PIN n'est pas configuré sur le serveur, on bloque par sécurité
        if (!CORRECT_PIN) {
            console.error("ADMIN_VOICE_PIN non configuré sur le serveur !");
            return NextResponse.json({ error: 'Server Configuration Error - Missing PIN' }, { status: 500 });
        }

        if (pin !== CORRECT_PIN) {
            return NextResponse.json({ error: 'Code Admin Incorrect' }, { status: 401 });
        }

        if (!matchId) {
            return NextResponse.json({ error: 'Missing matchId' }, { status: 400 });
        }

        // 3. Mise à jour Supabase (Via Admin Client)
        const { error } = await supabaseAdmin
            .from('bets_history')
            .update({
                user_prediction: team,
                user_reason: reason,
                user_confidence: confidence
            })
            .eq('id', matchId);

        if (error) {
            console.error("Erreur Supabase Admin:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Erreur API:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
