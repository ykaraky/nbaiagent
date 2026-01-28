
import Navbar from '../../components/Navbar';
import RankingList from '../../components/players/RankingList';

import PageHeader from '../../components/ui/PageHeader';

export default function PlayersPage() {
    return (
        <div className="min-h-screen md:h-screen bg-[#09090b] text-white font-sans selection:bg-purple-500/30 flex flex-col md:overflow-hidden">
            {/* Unified Navbar (Fixed Height) */}
            <div className="flex-shrink-0">
                <Navbar activeTab='results' />
            </div>

            <div className="flex-1 flex flex-col pt-24 px-4 max-w-6xl mx-auto w-full pb-4 md:overflow-hidden">
                <PageHeader
                    title="Players Ranking"
                    subtitle="Power Ranking🔥"
                    borderColor="border-pink-900/20"
                />

                {/* RankingList takes all remaining space on Desktop, natural height on Mobile */}
                <div className="md:flex-1 md:min-h-0 w-full">
                    <RankingList />
                </div>
            </div>
        </div>
    );
}
