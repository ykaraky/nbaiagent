export interface ReasonDef {
    id: string; // The short name stored in DB (e.g. "Stats")
    longName: string; // Display name (e.g. "Modèle statistique")
    description: string;
    type: string; // "Données & Modèle", "Contexte Match", ...
}

export const REASON_TYPES = [
    "Données & Modèle",
    "Contexte Match",
    "Lecture Humaine",
    "Méta / IA"
] as const;

export const REASONS_DATA: ReasonDef[] = [
    // Données & Modèle
    {
        id: "Stats",
        longName: "Modèle statistique",
        description: "Analyse basée sur les données : moyennes glissantes, ratings, pace, efficacité, projections",
        type: "Données & Modèle"
    },
    {
        id: "Fatigue",
        longName: "Charge & calendrier",
        description: "Back-to-back, 3 matchs en 4 jours, charge de minutes, enchaînement de déplacements",
        type: "Données & Modèle"
    },
    {
        id: "Home/Away",
        longName: "Avantage terrain",
        description: "Différences de performance domicile / extérieur, fatigue liée aux déplacements, contexte local",
        type: "Données & Modèle"
    },
    {
        id: "Effectif",
        longName: "Disponibilité & rotation",
        description: "Absences, blessures, retours récents, minutes limitées ou changement significatif de rotation",
        type: "Données & Modèle"
    },
    {
        id: "Mismatch",
        longName: "Déséquilibre d’effectif",
        description: "Écart net de talent, profondeur ou qualité globale entre les deux équipes, indépendamment des blessures",
        type: "Données & Modèle"
    },

    // Contexte Match
    {
        id: "Forme",
        longName: "Dynamique récente",
        description: "Niveau de performance sur les derniers matchs (résultats, constance, qualité du jeu)",
        type: "Contexte Match"
    },
    {
        id: "Motivation",
        longName: "Contexte émotionnel / enjeu",
        description: "Rivalité, revanche, match à enjeu (playoffs, qualification), dynamique mentale particulière",
        type: "Contexte Match"
    },

    // Lecture Humaine
    {
        id: "Intuition",
        longName: "Intuition humaine",
        description: "Lecture subjective du match basée sur l’expérience, le ressenti, ou des signaux faibles non modélisés",
        type: "Lecture Humaine"
    },
    {
        id: "Value",
        longName: "Valeur de cote",
        description: "Écart perçu entre la probabilité réelle et la cote proposée par le bookmaker (value bet)",
        type: "Lecture Humaine"
    },

    // Méta / IA
    {
        id: "IA+",
        longName: "Alignement avec l’IA",
        description: "Choix conforme à la recommandation du modèle IA",
        type: "Méta / IA"
    },
    {
        id: "IA-",
        longName: "Désaccord avec l’IA",
        description: "Choix volontairement opposé à la recommandation IA",
        type: "Méta / IA"
    }
];

// Helper to get list for dropdowns (using short ID as value)
export const REASONS_IDS = REASONS_DATA.map(r => r.id);

export function getReasonByLongName(longName: string): ReasonDef | undefined {
    return REASONS_DATA.find(r => r.longName === longName);
}

export function getReasonById(id: string): ReasonDef | undefined {
    return REASONS_DATA.find(r => r.id === id);
}
