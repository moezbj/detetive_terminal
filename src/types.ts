export type SuspectID = string;
export type AccessLevel = "Free" | "Premium" | "Expert";
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
  discoveredClueIds: string[];
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
  difficulty: "Easy" | "Medium" | "Hard";
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
  cases_solved: number;
  total_points: number;
  badges: string[];
  rank: string;
  cases_played: string[];
  case_progress: Record<string, CaseProgress>;
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
  cases_solved: number;
  points: number;
  badges: string[];
}

export interface Message {
  role: "user" | "model";
  text: string;
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
