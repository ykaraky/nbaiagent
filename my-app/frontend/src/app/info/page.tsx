"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import PageHeader from '@/components/ui/PageHeader';
import { Info, ShieldAlert, Cpu, Target, ExternalLink, Zap, History as HistoryIcon, Calendar, Shield, Activity, Users, LayoutDashboard } from 'lucide-react';

export default function InfoPage() {
    return (
        <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-purple-500/30 flex flex-col">
            <Navbar activeTab={undefined} />

            <main className="flex-1 max-w-4xl mx-auto w-full p-4 pt-24 pb-20 space-y-12">
                {/* HEADER */}
                <PageHeader
                    title="À Propos"
                    subtitle="Comprendre NBAiAGENT"
                    icon={<Info className="w-6 h-6 text-cyan-400" />}
                    borderColor="border-cyan-900/20"
                />

                {/* 1. INTRO */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-purple-400" />
                        Le Concept
                    </h2>
                    <div className="bg-[#111] border border-gray-800 rounded-xl p-6 text-gray-300 leading-relaxed text-sm md:text-base">
                        <p className="mb-4">
                            <strong>NBAiAgent</strong> est une application d’analyse et de prédiction dédiée aux matchs NBA.
                            Elle combine <strong>données statistiques</strong>, <strong>indicateurs de volatilité</strong> et <strong>modèles d’intelligence artificielle</strong> afin de proposer une lecture avancée des rencontres passées et à venir.
                        </p>
                        <p>
                            L’objectif n’est pas de prédire l’avenir avec certitude, mais d’apporter <strong>un outil d’aide à la décision</strong>, basé sur des signaux mesurables et transparents.
                        </p>
                    </div>
                </section>

                {/* 2. HOW IT WORKS */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-400" />
                        Comment ça fonctionne
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                            <h3 className="font-bold text-white mb-2">📡 Données & Analyse</h3>
                            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                                <li>Analyse de données NBA historiques et récentes</li>
                                <li>Ingestion de stats avancées (Eff, Pace, etc.)</li>
                                <li>Calcul de la <strong>Volatilité</strong> des équipes</li>
                            </ul>
                        </div>
                        <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                            <h3 className="font-bold text-white mb-2">🤖 Intelligence Artificielle</h3>
                            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                                <li>Modèles de Machine Learning (XGBoost)</li>
                                <li>Détection de "Pièges" (Matchs Traps)</li>
                                <li>Métacognition (Suivi de performance IA vs Humain)</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* 3. FEATURES OVERVIEW */}
                <section className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Panorama des Fonctionnalités
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* RESULTATS */}
                        <div className="bg-[#111] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-cyan-400">
                                <HistoryIcon className="w-4 h-4" />
                                <h3 className="font-bold text-sm uppercase tracking-wide">Résultats</h3>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Accédez aux scores récents, analysez les performances passées et validez la précision des prédictions de l'IA après chaque rencontre.
                            </p>
                        </div>

                        {/* UPCOMING */}
                        <div className="bg-[#111] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-purple-400">
                                <Calendar className="w-4 h-4" />
                                <h3 className="font-bold text-sm uppercase tracking-wide">Matchs à Venir</h3>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Consultez l'agenda des prochaines rencontres avec les prédictions du modèle, les indices de confiance et détectez les opportunités.
                            </p>
                        </div>

                        {/* TEAMS HUB */}
                        <div className="bg-[#111] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-yellow-500">
                                <Shield className="w-4 h-4" />
                                <h3 className="font-bold text-sm uppercase tracking-wide">Teams Hub</h3>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Vue d'ensemble des 30 franchises : classements, état de forme actuel, séries de victoires/défaites et indicateurs de performance IA.
                            </p>
                        </div>

                        {/* TEAM DETAILS */}
                        <div className="bg-[#111] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-orange-400">
                                <Activity className="w-4 h-4" />
                                <h3 className="font-bold text-sm uppercase tracking-wide">Team Details</h3>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Fiche d'identité complète : Stats avancées, historique des 5 derniers matchs et votre historique personnel face à cette équipe (Porte-bonheur ou Chat noir).
                            </p>
                        </div>

                        {/* PLAYERS */}
                        <div className="bg-[#111] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-pink-400">
                                <Users className="w-4 h-4" />
                                <h3 className="font-bold text-sm uppercase tracking-wide">Players Ranking</h3>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Classement interactif (Drag & Drop) du Top 50 NBA, accompagné des statistiques individuelles majeures.
                            </p>
                        </div>

                        {/* DASHBOARD */}
                        <div className="bg-[#111] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-white">
                                <LayoutDashboard className="w-4 h-4" />
                                <h3 className="font-bold text-sm uppercase tracking-wide">Dashboard</h3>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Votre cockpit personnel : Suivi de Bankroll, Smart Insights (Tendances), et Matrice de Confusion pour comparer votre instinct à l'IA.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 3. TARGET AUDIENCE */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">À qui s’adresse l’application ?</h2>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-full text-xs text-gray-400">Passionnés de NBA</span>
                        <span className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-full text-xs text-gray-400">Amateurs de Data</span>
                        <span className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-full text-xs text-gray-400">Curieux de l'IA</span>
                        <span className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-full text-xs text-gray-400">Profils rationnels</span>
                    </div>
                </section>

                <hr className="border-gray-800" />

                {/* 4. DISCLAIMERS */}
                <section className="space-y-6">
                    {/* Warning */}
                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-6">
                        <h3 className="text-orange-400 font-bold flex items-center gap-2 mb-3">
                            <ShieldAlert className="w-5 h-5" />
                            Avertissement Important
                        </h3>
                        <ul className="space-y-2 text-sm text-orange-200/80">
                            <li>• Les informations fournies sont <strong>informatives et expérimentales</strong></li>
                            <li>• Elles ne constituent <strong>ni un conseil financier</strong>, ni une incitation au pari</li>
                            <li>• Les prédictions peuvent être incorrectes. L’utilisateur reste seul responsable de ses décisions</li>
                        </ul>
                    </div>

                    {/* Legal / Independence */}
                    <div className="text-xs text-gray-600 space-y-4">
                        <p>
                            <strong>Indépendance & Données :</strong><br />
                            Cette application est <strong>indépendante</strong> et n’est <strong>ni affiliée, ni sponsorisée, ni approuvée</strong> par la NBA ou ses équipes.
                            Les données utilisées proviennent de sources publiques et ouvertes.
                        </p>
                        <p>
                            <strong>Propriété Intellectuelle :</strong><br />
                            <em>NBA Intelligent Agent is an independent application and is not affiliated with, endorsed by, or sponsored by the National Basketball Association (NBA) or any of its teams. Team names, logos, and player names are used for identification purposes only.</em>
                        </p>
                    </div>
                </section>

            </main>

            {/* FOOTER */}
            <footer className="border-t border-gray-900 py-8 text-center text-gray-700 text-xs">
                <p>&copy; {new Date().getFullYear()} NBAiAGENT. Experimental Build v2.1</p>
            </footer>
        </div>
    );
}
