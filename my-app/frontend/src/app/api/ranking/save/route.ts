
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Server-side client with Service Role (Bypass RLS)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { rankings, pin } = body;
        // pin logic optional for now, can be added later

        if (!rankings || !Array.isArray(rankings)) {
            return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
        }

        const season = "2025-26";

        // 1. Clear existing ranking for this season (Full overwrite strategy for simplicity)
        // Note: DELETE without WHERE deletes ALL? No, we filter by season.
        // But wait, if multiple users exist... ah, right now it's a SINGLE USER app (Admin).
        // So we wipe the previous ranking for the season.
        const { error: deleteError } = await supabase
            .from('player_ranking')
            .delete()
            .eq('season', season);

        if (deleteError) {
            console.error("Delete Error", deleteError);
            return NextResponse.json({ error: "Failed to clear old ranking" }, { status: 500 });
        }

        // 2. Insert new ranking
        if (rankings.length > 0) {
            const records = rankings.map((r: any) => ({
                player_id: r.player_id,
                rank: r.rank,
                season: season,
                updated_at: new Date().toISOString()
            }));

            const { error: insertError } = await supabase
                .from('player_ranking')
                .insert(records);

            if (insertError) {
                console.error("Insert Error", insertError);
                return NextResponse.json({ error: "Failed to save new ranking" }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true, count: rankings.length });

    } catch (e) {
        console.error("API Error", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
