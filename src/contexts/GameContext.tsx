import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import type {
  User,
  CrimeCase,
  Language,
  Message,
} from "../types.ts";
import { getCases, saveProfile } from "../../supabaseService";
import { GameContext } from "./GameContextExports";



export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLangState] = useState<Language>(
    () => (localStorage.getItem("detective_lang") as Language) || "en",
  );
  const [cases, setCases] = useState<CrimeCase[]>([]);
  const [isCasesLoading, setIsCasesLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({});

  
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem("detective_user");
    return saved
      ? JSON.parse(saved)
      : {
          id: "local_user",
          name: "OPERATOR_42",
          isPremium: false,
          isAdmin: false,
          stats: {
            casesSolved: 0,
            totalPoints: 1200,
            badges: ["Rookie Detective"],
            rank: "Junior Agent",
            casesPlayed: [],
            caseProgress: {},
          },
        };
  });

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("detective_lang", l);
  };

  const fetchCases = useCallback(async () => {
    const data = await getCases();
    setCases(data);
  }, []);

  const syncToCloud = useCallback(async () => {
    if (user.id === "local_user") return;
    await saveProfile(user.id, user.name, user.stats, user.isPremium);
  }, [user]);

  const logout = async () => {
    localStorage.removeItem("detective_user");
    window.location.href = "/";
  };

  useEffect(() => {
    const loadCases = async () => {
      setIsCasesLoading(true);
      await fetchCases();
      setIsCasesLoading(false);
    };
    loadCases();
  }, [fetchCases]);

  useEffect(() => {
    const saveUser = async () => {
      setIsSyncing(true);
      localStorage.setItem("detective_user", JSON.stringify(user));
      await syncToCloud();
      setIsSyncing(false);
    };
    saveUser();
  }, [user, syncToCloud]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      cases,
      isCasesLoading,
      lang,
      setLang,
      syncToCloud,
      isSyncing,
      logout,
      chatHistory,
      setChatHistory,
    }),
    [user, cases, isCasesLoading, lang, isSyncing, chatHistory, syncToCloud],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
