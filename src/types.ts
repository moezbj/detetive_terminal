export type SuspectID = string;
export type AccessLevel = "Free" | "Premium";
export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";
export const DifficultyCost = {
  Easy: 100,
  Medium: 200,
  Hard: 300,
  Expert: 500,
} as const;

export type DifficultyCosType =
  (typeof DifficultyCost)[keyof typeof DifficultyCost];

export type Language = "en" | "ar" | "fr";

export interface Suspect {
  id: SuspectID;
  name: string;
  role: string;
  description: string;
  motive: string;
  alibi: string;
  imageUrl: string;
}

export interface Clue {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface TimelineEntry {
  time: string;
  event: string;
}

export interface CaseProgress {
  discovered_clue_ids: string[];
  interrogatedSuspectIds: SuspectID[];
  unlockedHintIds: string[];
  isCompleted: boolean;
  unreadClueIds?: string[];
}

export interface CrimeCase {
  id: string;
  title: string;
  subtitle: string;
  teaser: string;
  difficulty: Difficulty;
  backgroundImage: string;
  victim: string;
  description: string;
  suspects: Suspect[];
  clues: Clue[];
  timeline: TimelineEntry[];
  killerId: string;
  solutionSecret: string;
  accessLevel: AccessLevel;
}

export interface UserStats {
  id: string;
  cases_solved: string[];
  total_points: number;
  badges: string[];
  rank: string;
  cases_played: string[];
  case_progress: Record<string, CaseProgress>;
  lastDailyIntelClaim?: string;
}

export interface User {
  id: string;
  name: string;
  isPremium: boolean;
  stats: UserStats;
  isAdmin: boolean;
}

export interface LeaderboardEntry {
  name: string;
  cases_solved: string[];
  points: number;
  badges: string[];
}

export interface Message {
  role: "user" | "model";
  text: string;
}
export interface EvaluationResult {
  correct: boolean;
  score: number;
  confidence: number;
  feedback: {
    type: 'brilliant' | 'correct' | 'partial' | 'incorrect';
    message: string;
    tone: 'celebratory' | 'positive' | 'encouraging' | 'constructive';
  };
  details: {
    suspectMatch: boolean;
    semanticScore: number;
    keywordScore: number;
    entityScore: number;
    narrativeScore: number;
    temporalScore: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keyPhrases?: any;
    matchedConcepts?: Array<{
      type: string;
      name: string;
      similarity: number;
    }>;
    missingConcepts?: string[];
  };
}

export type GameView =
  | "lobby"
  | "intro"
  | "casefile"
  | "interrogation"
  | "evidence"
  | "accusation"
  | "leaderboard"
  | "profile"
  | "auth"
  | "shop"
  | "admin";
