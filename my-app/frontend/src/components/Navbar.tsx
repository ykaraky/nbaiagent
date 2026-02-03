"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, History, Menu, X, Home, Users, Shield, Info } from 'lucide-react';

interface NavbarProps {
    activeTab?: 'results' | 'upcoming';
    onTabChange?: (tab: 'results' | 'upcoming') => void;
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const isDashboard = pathname === '/dashboard';
    const isPlayers = pathname === '/players';
    const isInfo = pathname === '/info';

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 10) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleTabClick = (tab: 'results' | 'upcoming') => {
        if (onTabChange) {
            onTabChange(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Navigate to Home with tab param
            router.push(`/?tab=${tab}`);
        }
        setMobileMenuOpen(false);
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${isScrolled
                ? "bg-[#0a0a0a]/80 backdrop-blur-md py-3 border-gray-800"
                : "bg-[#0a0a0a] py-6 border-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
                {/* LOGO */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className={`transition-all duration-300 ${isScrolled ? "scale-90" : "scale-100"}`}>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 group-hover:from-cyan-300 group-hover:to-blue-500 transition-all">
                            NBAiAGENT
                        </h1>
                    </div>
                </Link>

                {/* DESKTOP NAV */}
                <nav className="hidden md:flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl border border-gray-800/50 backdrop-blur-sm">
                    {!isDashboard && !isPlayers && !isInfo ? (
                        <>
                            <button
                                onClick={() => handleTabClick('results')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'results'
                                    ? 'bg-gray-800 text-cyan-400 shadow-lg ring-1 ring-gray-700'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                    }`}
                            >
                                <History className="w-4 h-4" />
                                Résultats
                            </button>

                            <button
                                onClick={() => handleTabClick('upcoming')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'upcoming'
                                    ? 'bg-gray-800 text-purple-400 shadow-lg ring-1 ring-gray-700'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                    }`}
                            >
                                <Calendar className="w-4 h-4" />
                                À Venir
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white hover:bg-gray-800/50 transition-all duration-300"
                        >
                            <Home className="w-4 h-4" />
                            Retour Accueil
                        </Link>
                    )}

                    <div className="w-px h-5 bg-gray-800 mx-1"></div>

                    <Link
                        href="/teams"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${pathname.startsWith('/teams')
                            ? 'bg-gray-800 text-yellow-500 shadow-lg ring-1 ring-gray-700'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            }`}
                    >
                        <Shield className="w-4 h-4" />
                        Teams
                    </Link>

                    <Link
                        href="/players"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${isPlayers
                            ? 'bg-gray-800 text-pink-400 shadow-lg ring-1 ring-gray-700'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Players
                    </Link>

                    <Link
                        href="/dashboard"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${isDashboard
                            ? 'bg-gray-800 text-white shadow-lg ring-1 ring-gray-700'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </Link>

                    <div className="w-px h-5 bg-gray-800 mx-1"></div>

                    <Link
                        href="/info"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${isInfo
                            ? 'bg-gray-800 text-cyan-400 shadow-lg ring-1 ring-gray-700'
                            : 'text-gray-500 hover:text-white hover:bg-gray-800/50'
                            }`}
                    >
                        <Info className="w-4 h-4" />
                        Infos
                    </Link>
                </nav>

                {/* MOBILE MENU TOGGLE */}
                <button
                    className="md:hidden p-2 text-gray-400 hover:text-white"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* MOBILE MENU */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-[#0a0a0a] border-b border-gray-800 p-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col gap-2">
                        {!isDashboard && !isPlayers && !pathname.startsWith('/teams') && !isInfo ? (
                            <>
                                <button
                                    onClick={() => handleTabClick('results')}
                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'results' ? 'bg-gray-900 text-cyan-400' : 'text-gray-500 hover:bg-gray-900/50'
                                        }`}
                                >
                                    <History className="w-5 h-5" />
                                    <span className="font-bold">Derniers Résultats</span>
                                </button>
                                <button
                                    onClick={() => handleTabClick('upcoming')}
                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'upcoming' ? 'bg-gray-900 text-purple-400' : 'text-gray-500 hover:bg-gray-900/50'
                                        }`}
                                >
                                    <Calendar className="w-5 h-5" />
                                    <span className="font-bold">Matchs à Venir</span>
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/"
                                className="flex items-center gap-3 p-3 rounded-xl text-gray-500 hover:bg-gray-900/50 hover:text-white"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Home className="w-5 h-5" />
                                <span className="font-bold">Retour Accueil</span>
                            </Link>
                        )}

                        <div className="h-px bg-gray-800 my-1"></div>

                        <Link
                            href="/teams"
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${pathname.startsWith('/teams') ? 'bg-gray-900 text-yellow-500' : 'text-gray-500 hover:bg-gray-900/50 hover:text-white'}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Shield className="w-5 h-5" />
                            <span className="font-bold">Teams Hub</span>
                        </Link>

                        <Link
                            href="/players"
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isPlayers ? 'bg-gray-900 text-pink-400' : 'text-gray-500 hover:bg-gray-900/50 hover:text-white'}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Users className="w-5 h-5" />
                            <span className="font-bold">Players Ranking</span>
                        </Link>

                        <Link
                            href="/dashboard"
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isDashboard ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-900/50 hover:text-white'}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <LayoutDashboard className="w-5 h-5" />
                            <span className="font-bold">Dashboard</span>
                        </Link>

                        <div className="h-px bg-gray-800 my-1"></div>

                        <Link
                            href="/info"
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isInfo ? 'bg-gray-900 text-cyan-400' : 'text-gray-500 hover:bg-gray-900/50 hover:text-white'}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Info className="w-5 h-5" />
                            <span className="font-bold">À Propos</span>
                        </Link>
                    </div>
                </div>
            )}

        </header>
    );
}
