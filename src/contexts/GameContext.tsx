import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import type { User, CrimeCase, Language, Message } from "../types.ts";
import { getCases, saveProfile, saveCaseProgress } from "../../supabaseService";
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
  const lastSyncRef = useRef<string>("");

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("detective_user");
    return saved ? JSON.parse(saved) : null;
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
    if (!user) return undefined;
    if (user?.id === "local_user") {
      await saveProfile(user.id, user.name, user.isPremium);
    }
  }, [user]);

  /**
   * Comprehensive cloud sync that updates both full profile
   * and specific case progress entries in the database.
   */
  const syncCaseToCloud = useCallback(async () => {
    if (!user) return undefined;


    // Simple debounce/comparison to avoid redundant calls
    const userString = JSON.stringify(user);
    if (userString === lastSyncRef.current) return;

    setIsSyncing(true);
    try {
      // 2. Sync individual case progress entries that changed
      const caseIds = Object.keys(user.stats.caseProgress);

      for (const cid of caseIds) {
        await saveCaseProgress(user.id, cid, user.stats.caseProgress[cid]);
      }

      lastSyncRef.current = userString;
    } catch (e) {
      console.error("Cloud synchronization failure:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  const logout = async () => {
    localStorage.removeItem("detective_user");
    setUser(null);
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
      syncCaseToCloud
    }),
    [
      user,
      cases,
      isCasesLoading,
      lang,
      isSyncing,
      chatHistory,
      syncToCloud,
      syncCaseToCloud,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
