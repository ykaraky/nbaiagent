
import Navbar from '../../components/Navbar';
import RankingList from '../../components/players/RankingList';

export default function PlayersPage() {
    return (
        <div className="min-h-screen md:h-screen bg-[#09090b] text-white font-sans selection:bg-purple-500/30 flex flex-col md:overflow-hidden">
            {/* Unified Navbar (Fixed Height) */}
            <div className="flex-shrink-0">
                <Navbar activeTab='results' />
            </div>

            <div className="flex-1 flex flex-col pt-24 px-4 max-w-6xl mx-auto w-full pb-4 md:overflow-hidden">
                <div className="mb-6 flex-shrink-0">
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
                        Classement Joueurs
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Votre Power Ranking personnel. Glissez-déposez pour réordonner.
                    </p>
                </div>

                {/* RankingList takes all remaining space on Desktop, natural height on Mobile */}
                <div className="md:flex-1 md:min-h-0 w-full">
                    <RankingList />
                </div>
            </div>
        </div>
    );
}
