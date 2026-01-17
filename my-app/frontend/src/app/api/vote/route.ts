import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ce client utilise la CLÉ SECRÈTE (Service Role)
// Il contourne donc les règles RLS (Row Level Security)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { matchId, team, reason, confidence, pin } = body;

        // 🔒 SÉCURITÉ SIMPLE : Vérification du PIN
        const CORRECT_PIN = process.env.ADMIN_VOICE_PIN;
        if (!CORRECT_PIN) {
            console.error("ADMIN_VOICE_PIN non configuré sur le serveur !");
            return NextResponse.json({ error: 'Server Config Error' }, { status: 500 });
        }

        if (pin !== CORRECT_PIN) {
            return NextResponse.json({ error: 'Code Admin Incorrect' }, { status: 401 });
        }

        if (!matchId) {
            return NextResponse.json({ error: 'Missing matchId' }, { status: 400 });
        }

        // Mise à jour sécurisée côté serveur
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
