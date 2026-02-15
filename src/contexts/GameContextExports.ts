import { createContext } from "react";
import type { User, CrimeCase, Language, Message } from "../types.ts";

export interface GameContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  cases: CrimeCase[];
  isCasesLoading: boolean;
  lang: Language;
  setLang: (lang: Language) => void;
  syncToCloud: () => Promise<void>;
  isSyncing: boolean;
  logout: () => Promise<void>;
  chatHistory: Record<string, Message[]>;
  setChatHistory: React.Dispatch<
    React.SetStateAction<Record<string, Message[]>>
  >;
}

export const GameContext = createContext<GameContextType | undefined>(
  undefined,
);
