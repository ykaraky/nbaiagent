import { createClient } from '@supabase/supabase-js';
import MatchCard from '@/components/MatchCard'; // On importe notre brique Lego

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Cette page est générée sur le serveur (rapide et SEO friendly)
export default async function Home() {

  // On récupère les données
  const { data: matches } = await supabase
    .from('bets_history')
    .select('*')
    .order('game_date', { ascending: false })
    .limit(30);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans">

      <header className="mb-12 text-center mt-6">
        <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">
          NBA AGENT
        </h1>
        <p className="text-gray-500 font-medium">v10.0 • Next.js Edition</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* On boucle sur les matchs et on affiche une carte pour chaque */}
        {matches?.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </main>
  );
}