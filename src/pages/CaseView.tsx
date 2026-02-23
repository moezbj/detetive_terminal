import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  Routes,
  Route,
  useParams,
  useNavigate,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useSpeech } from "react-text-to-speech";
import { useGame } from "../hooks/useGame";

import {
  interrogateSuspect,
  evaluateAccusation,
  generateHint,
} from "../services/geminiService";

import { type CrimeCase, type SuspectID, type CaseProgress, DifficultyCost } from "../types";
import ClueDetailModal from "../Modal/ClueModal";
import InsufficientIntelModal from "../Modal/InsufficientIntelModal";
import { UI_TEXT } from "../../translations";
import ProgressBanner from "../components/ProgressBanner";
import { getUserStats, payForCase } from "../../supabaseService";

const CaseIntro: React.FC<{ caseData: CrimeCase }> = ({ caseData }) => {
  const navigate = useNavigate();
  const { user, setUser } = useGame();
  const [showInsufficientIntel, setShowInsufficientIntel] = useState(false);

  const { speechStatus, start, pause, stop } = useSpeech({
    text: caseData.teaser,
    pitch: 1,
    rate: 0.9,
    volume: 1,
    lang: "en-US",
    voiceURI: "",
    autoPlay: false,
    highlightText: true,
    showOnlyHighlightedText: false,
    highlightMode: "word",
    enableDirectives: true,
  });
  const pay = async () => {
    if (!user?.stats) return null;
    if (user.stats.cases_played.includes(caseData.id)) {
      navigate("file");
      return;
    }
    const isStillSpent =
      caseData.difficulty === "Hard"
        ? user.stats.total_points >= 300
        : caseData.difficulty === "Medium"
          ? user.stats.total_points >= 200
          : caseData.difficulty === "Easy"
            ? user.stats.total_points >= 100
            : false;
    if (!isStillSpent) {
      setShowInsufficientIntel(true);
      return;
    }
    const newCase = await payForCase(
      user.id,
      user.stats,
      user.stats.id,
      caseData.id,
      user?.stats.total_points - DifficultyCost[caseData.difficulty],
    );
    if (newCase === "updated") {
      await getUserStats(user.id).then((res) => {
        setUser({ ...user, stats: res.data });
      });
      navigate("file");
    }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <img
          src={caseData.backgroundImage}
          loading="lazy"
          className="w-full h-full object-cover blur-md scale-110 brightness-[0.2]"
        />
      </div>
      <div className="relative z-10 max-w-4xl text-center space-y-12 animate-fadeIn">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-serif font-bold tracking-tighter text-white leading-none">
          {caseData.title}
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-gray-500 font-serif italic leading-relaxed">
          "{caseData.teaser}"
        </p>
        <div className="flex flex-col items-center gap-8">
          <div className="flex items-center gap-4">
            <button
              onClick={start}
              className={`flex items-center gap-4 bg-white/10 px-6 py-2 rounded-full ${speechStatus === "started" ? "animate-pulse" : ""}`}
            >
              <i className="fa-solid fa-volume-high text-red-600"></i>
              <span className="text-xs font-black uppercase text-white">
                Listen to Briefing
              </span>
            </button>
            <button disabled={speechStatus === "paused"} onClick={pause}>
              Pause
            </button>
            <button disabled={speechStatus === "stopped"} onClick={stop}>
              Stop
            </button>
          </div>
          <button
            onClick={() => pay()}
            className="px-10 py-3 bg-red-700 hover:bg-red-600 text-white text-sm font-black rounded-xl uppercase tracking-widest shadow-xl"
          >
            Access File {caseData.difficulty === "Hard"
                        ? "(300 intel)"
                        : caseData.difficulty === "Medium"
                          ? "(200 intel)"
                          : caseData.difficulty === "Easy"
                            ? "(100 intel)"
                            : ""}
          </button>
        </div>
      </div>
      {showInsufficientIntel && (
        <InsufficientIntelModal
          setShowInsufficientIntel={setShowInsufficientIntel}
        />
      )}
    </div>
  );
};

const CaseView: React.FC = () => {
  const { caseId } = useParams();
  const location = useLocation();
  const {
    cases,
    user,
    setUser,
    lang,
    chatHistory,
    setChatHistory,
    syncCaseToCloud,
  } = useGame();
  const isRTL = lang === "ar";
  const t = UI_TEXT[lang];

  const [activeSuspect, setActiveSuspect] = useState<SuspectID | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClueId, setSelectedClueId] = useState<string | null>(null);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);

  const [verdict, setVerdict] = useState<{
    correct: boolean;
    feedback: string;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const currentCase = useMemo(
    () => cases.find((c) => c.id === caseId),
    [cases, caseId],
  );

  const progress = useMemo(() => {
    if (!user || !currentCase)
      return {
        discoveredClueIds: [],
        interrogatedSuspectIds: [],
        isCompleted: false,
        unreadClueIds: [],
        unlockedHintIds: [],
      };
    return user.stats?.case_progress
      ? user.stats?.case_progress[currentCase.id]
      : {
          discoveredClueIds: [],
          interrogatedSuspectIds: [],
          isCompleted: false,
          unreadClueIds: [],
          unlockedHintIds: [],
        };
  }, [user, currentCase]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

  if (!currentCase)
    return (
      <div className="p-20 text-center text-red-600 font-mono">
        CASE_NOT_FOUND: {caseId}
      </div>
    );

  const discoverClue = (clueId: string) => {
    if (!progress?.discoveredClueIds.includes(clueId)) {
      updateProgress({
        discoveredClueIds: [...(progress?.discoveredClueIds || []), clueId],
      });
    }
    setSelectedClueId(clueId);
  };
  const updateProgress = async (updates: Partial<CaseProgress>) => {
    if (user && currentCase.id) {
      await setUser((prev) => {
        if (!prev) return null;
        const currentCaseProgress = prev.stats?.case_progress
          ? prev.stats?.case_progress[currentCase.id]
          : {
              discoveredClueIds: [],
              interrogatedSuspectIds: [],
              isCompleted: false,
              unreadClueIds: [],
              unlockedHintIds: [],
            };

        return {
          ...prev,
          stats: {
            ...prev.stats,
            case_progress: {
              ...prev.stats.case_progress,
              [currentCase.id]: { ...currentCaseProgress, ...updates },
            },
          },
        };
      });
      syncCaseToCloud();
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !activeSuspect || isLoading) return;
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    const suspectKey = `${currentCase.id}_${activeSuspect}`;
    const history = chatHistory[suspectKey] || [];
    const newHistory = [
      ...history,
      { role: "user" as const, text: currentInput },
    ];

    setChatHistory((prev) => ({ ...prev, [suspectKey]: newHistory }));

    if (!progress?.interrogatedSuspectIds?.includes(activeSuspect)) {
      updateProgress({
        interrogatedSuspectIds: [
          ...(progress.interrogatedSuspectIds || []),
          activeSuspect,
        ],
      });
    }

    try {
      const reply = await interrogateSuspect(
        currentCase,
        activeSuspect,
        currentInput,
      );
      setChatHistory((prev) => ({
        ...prev,
        [suspectKey]: [...newHistory, { role: "model" as const, text: reply }],
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitAccusation = async (suspectId: string, theory: string) => {
    setIsLoading(true);
    try {
      const res = await evaluateAccusation(
        currentCase,
        suspectId,
        theory,
        lang,
      );
      setVerdict(res);
      if (res.correct) {
        updateProgress({ isCompleted: true });

        setUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            stats: {
              ...prev.stats,
              cases_solved: prev.stats.cases_solved + 1,
              total_points:
                prev.stats.total_points +
                (currentCase.difficulty === "Hard" ? 1200 : 600),
            },
          };
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestHint = async () => {
    if (!currentCase || !progress || isLoading || !user) return;
    const hintCost = user.isPremium ? 50 : 250;
    if (user.stats.total_points < hintCost) {
      Navigate({ to: "/shop" });
      return;
    }

    setIsLoadingHint(true);
    try {
      const hint = await generateHint(currentCase, progress, lang);
      setActiveHint(hint);
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            total_points: prev.stats.total_points - hintCost,
          },
        };
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingHint(false);
    }
  };
  const showTab =
    location.pathname.endsWith("/file") ||
    location.pathname.endsWith("/interrogate") ||
    location.pathname.endsWith("/evidence") ||
    location.pathname.endsWith("/accusation");
  if (!currentCase)
    return <div className="p-20 text-center text-red-600">Case not found.</div>;
  return (
    <div className="flex flex-col animate-fadeIn">
      {showTab && (
        <ProgressBanner
          currentProgress={progress}
          currentCase={currentCase}
          requestHint={requestHint}
          isLoadingHint={isLoadingHint}
        />
      )}

      {showTab && (
        <div className="bg-neutral-900/80 border-b border-white/5 p-4 flex flex-wrap justify-center gap-2 md:gap-4 sticky top-[73px] z-20 backdrop-blur-md">
          <Link
            to={`/case/${caseId}/file`}
            className={`text-xs font-black uppercase px-4 py-2 rounded transition-all ${window.location.pathname.endsWith("/file") ? "text-white bg-red-950/50" : "text-gray-500 hover:text-white"}`}
          >
            File
          </Link>

          <Link
            to={`/case/${caseId}/evidence`}
            className={`text-xs font-black uppercase px-4 py-2 rounded transition-all ${window.location.pathname.endsWith("/evidence") ? "text-white bg-red-950/50" : "text-gray-500 hover:text-white"}`}
          >
            Evidence
          </Link>
          <Link
            to={`/case/${caseId}/interrogate`}
            className={`text-xs font-black uppercase px-4 py-2 rounded transition-all ${window.location.pathname.endsWith("/interrogate") ? "text-white bg-red-950/50" : "text-gray-500 hover:text-white"}`}
          >
            Interrogate
          </Link>
          <Link
            to={`/case/${caseId}/accusation`}
            className="text-xs font-black uppercase text-white bg-red-700 px-6 py-2 rounded shadow-lg hover:bg-red-600 transition-all"
          >
            Verdict
          </Link>
        </div>
      )}
      {activeHint && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[90%] bg-red-950/95 backdrop-blur-2xl border border-red-500/50 p-12 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.9)] animate-fadeIn">
          <div
            className={`flex justify-between items-center mb-8 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <i className="fa-solid fa-satellite-dish text-red-600 animate-pulse"></i>
              <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.5em]">
                Classified Leak intercepted
              </span>
            </div>
            <button
              onClick={() => setActiveHint(null)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <i className="fa-solid fa-circle-xmark text-xl"></i>
            </button>
          </div>
          <p
            className={`text-white font-serif italic text-2xl leading-relaxed mb-8 select-none ${isRTL ? "text-right" : ""}`}
          >
            {activeHint}
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => setActiveHint(null)}
              className="px-10 py-3 bg-red-700 text-white font-black rounded-full text-[9px] uppercase tracking-widest shadow-xl"
            >
              Purge Transmission
            </button>
          </div>
        </div>
      )}
      <Routes>
        <Route index element={<CaseIntro caseData={currentCase} />} />
        <Route
          path="file"
          element={
            <div
              className={`max-w-5xl mx-auto p-6 md:p-12 space-y-12 animate-fadeIn ${isRTL ? "text-right" : ""}`}
            >
              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-serif font-bold text-white tracking-tight">
                  {currentCase.title}
                </h2>
                <p className="text-red-600 font-mono text-xs uppercase tracking-[0.3em]">
                  {currentCase.subtitle}
                </p>
              </div>

              <div className="bg-neutral-900/40 p-8 md:p-12 rounded-[2rem] border border-white/5 shadow-2xl space-y-8">
                <h3 className="text-xl font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-4">
                  Incident Report
                </h3>
                <p className="text-xl md:text-2xl text-gray-300 font-serif leading-relaxed italic">
                  "{currentCase.description}"
                </p>
              </div>

              <div className="space-y-8">
                <h3 className="text-xl font-black text-gray-500 uppercase tracking-widest">
                  Subjects of Interest
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentCase.suspects.map((s) => (
                    <div
                      key={s.id}
                      className="p-8 bg-neutral-900 border border-white/5 rounded-[2rem] flex gap-8 items-center group hover:border-red-600/30 transition-all"
                    >
                      <img
                        src={"src/assets/icon.png"}
                        className="w-24 h-24 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all shadow-xl"
                        alt={s.name}
                      />
                      <div>
                        <h3 className="text-2xl font-bold text-white">
                          {s.name}
                        </h3>
                        <p className="text-[10px] text-red-600 uppercase font-black tracking-widest mb-2">
                          {s.role}
                        </p>
                        <p className="text-sm text-gray-500 italic leading-snug line-clamp-2">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }
        />
        <Route
          path="interrogate"
          element={
            <div
              className={`flex flex-col md:flex-row h-[calc(100vh-180px)] sm:h-[calc(100vh-220px)] animate-fadeIn p-4 gap-4 ${isRTL ? "md:flex-row-reverse" : ""}`}
            >
              <div className="w-full md:w-96 space-y-4 overflow-y-auto no-scrollbar">
                {currentCase.suspects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSuspect(s.id)}
                    className={`w-full p-6 rounded-2xl border transition-all text-left flex justify-between items-center ${activeSuspect === s.id ? "bg-red-950/20 border-red-600 text-white shadow-xl" : "bg-neutral-900 border-white/5 text-gray-500 hover:bg-neutral-800"}`}
                  >
                    <div>
                      <div className="text-xl font-serif font-bold">
                        {s.name}
                      </div>
                      <div className="text-[8px] uppercase font-black text-red-800">
                        {s.role}
                      </div>
                    </div>
                    {progress?.interrogatedSuspectIds?.includes(s.id) && (
                      <i className="fa-solid fa-microphone text-[8px] text-red-600 animate-pulse"></i>
                    )}
                  </button>
                ))}
                <div>
                  <span className="uppercase font-black text-red-800">
                    use accusatory Keywords to target the suspect
                  </span>
                </div>
              </div>

              <div className="flex-1 bg-neutral-900 rounded-[2rem] border border-white/5 flex flex-col overflow-hidden relative shadow-inner">
                {!activeSuspect ? (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-20 p-12 text-center">
                    <i className="fa-solid fa-microphone-slash text-6xl mb-6"></i>
                    <p className="text-2xl font-serif italic">
                      Select a subject to begin recorded interrogation...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-6 bg-black/40 border-b border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">
                        Live Recording:{" "}
                        {
                          currentCase.suspects.find(
                            (s) => s.id === activeSuspect,
                          )?.name
                        }
                      </span>
                    </div>
                    <div
                      ref={scrollRef}
                      className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar"
                    >
                      {(
                        chatHistory[`${currentCase.id}_${activeSuspect}`] || []
                      ).map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] p-6 rounded-2xl text-lg font-serif italic ${msg.role === "user" ? "bg-white text-black" : "bg-neutral-800 text-gray-300"}`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="text-red-600 font-mono text-[10px] animate-pulse">
                          TRANSCRIBING...
                        </div>
                      )}
                    </div>
                    <div className="p-6 bg-black/40 border-t border-white/5">
                      <div className="flex gap-4">
                        <input
                          className="flex-1 bg-neutral-800 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-1 focus:ring-red-700"
                          placeholder="Type your inquiry..."
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSendMessage()
                          }
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={isLoading}
                          className="w-14 h-14 bg-red-700 rounded-xl flex items-center justify-center text-white hover:bg-red-600 transition-all active:scale-90 shadow-xl"
                        >
                          <i className="fa-solid fa-paper-plane"></i>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          }
        />
        <Route
          path="evidence"
          element={
            <div className="max-w-6xl mx-auto p-6 md:p-12 animate-fadeIn">
              {currentCase.clues.map((clue) => {
                const isFound = progress?.discoveredClueIds.includes(clue.id);
                return (
                  <div
                    key={clue.id}
                    onClick={() => discoverClue(clue.id)}
                    className={`bg-neutral-900/40 p-12 rounded-[3rem] border transition-all duration-700 group relative overflow-hidden cursor-pointer flex flex-col items-center text-center ${isFound ? "border-red-600/30 shadow-[0_0_30px_rgba(220,38,38,0.1)]" : "border-white/5 grayscale blur-[1px] hover:blur-0"}`}
                  >
                    <div
                      className={`absolute ${isRTL ? "-left-8" : "-right-8"} -bottom-8 opacity-5 group-hover:opacity-10 transition-all duration-1000`}
                    >
                      <i className={`fa-solid ${clue.icon} text-[15rem]`}></i>
                    </div>
                    <div
                      className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center mb-8 transition-all duration-700 ${isFound ? "bg-red-950/30 text-red-600 border border-red-600/30 group-hover:scale-110" : "bg-neutral-950 text-gray-800"}`}
                    >
                      <i className={`fa-solid ${clue.icon} text-5xl`}></i>
                    </div>
                    {isFound ? (
                      <div className="space-y-4 relative z-10">
                        <h3 className="text-xl sm:text-3xl font-serif font-bold text-white uppercase tracking-tighter">
                          {clue.title}
                        </h3>
                        <p className="text-gray-500 text-sm sm:text-lg leading-relaxed italic line-clamp-2">
                          "{clue.description}"
                        </p>
                        <button className="mt-4 px-6 py-2 bg-red-700 text-white rounded-full text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.detailedAnalysis}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em]">
                          Unknown Artifact
                        </p>
                        <button className="px-10 py-4 bg-neutral-800 hover:bg-red-700 text-white font-black rounded-2xl text-[10px] uppercase transition-colors">
                          {t.examineRecord}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {selectedClueId && (
                <ClueDetailModal
                  selectedClueId={selectedClueId}
                  selectedCase={currentCase}
                  setSelectedClueId={setSelectedClueId}
                  syncCaseToCloud={syncCaseToCloud}
                />
              )}
            </div>
          }
        />
        <Route
          path="accusation"
          element={
            <div className="max-w-4xl mx-auto p-6 md:p-12 animate-fadeIn">
              {verdict ? (
                <div className="bg-neutral-900 border border-white/5 p-12 rounded-[3rem] text-center space-y-8 shadow-2xl">
                  <div
                    className={`text-9xl ${verdict.correct ? "text-green-500" : "text-red-700"} animate-stamp`}
                  >
                    {verdict.correct ? (
                      <i className="fa-solid fa-gavel"></i>
                    ) : (
                      <i className="fa-solid fa-skull-crossbones"></i>
                    )}
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white uppercase">
                    {verdict.correct ? "Case Resolved" : "Trial Failed"}
                  </h2>
                  <div className="bg-black/40 p-8 rounded-2xl text-gray-300 font-serif text-lg sm:text-xl italic leading-relaxed">
                    {verdict.feedback}
                  </div>
                  <button
                    onClick={() => setVerdict(null)}
                    className="px-10 py-4 bg-white/5 border border-white/10 text-gray-500 hover:text-white rounded-xl uppercase font-black text-[10px]"
                  >
                    Back to Evidence
                  </button>
                </div>
              ) : (
                <div className="bg-neutral-900 border border-white/5 p-12 rounded-[3rem] space-y-12 shadow-2xl">
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white uppercase tracking-tighter">
                      Deliver Verdict
                    </h2>
                    <p className="text-gray-500 italic">
                      "The law is reason, free from passion."
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentCase.suspects.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveSuspect(s.id)}
                        className={`p-6 rounded-2xl border transition-all text-left ${activeSuspect === s.id ? "bg-red-950 border-red-600 text-white" : "bg-black border-white/5 text-gray-500 hover:bg-neutral-950"}`}
                      >
                        <div className="font-bold text-xl">{s.name}</div>
                        <div className="text-[10px] uppercase font-black opacity-50">
                          {s.role}
                        </div>
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="w-full bg-black border border-white/5 rounded-2xl p-8 text-white focus:outline-none focus:ring-1 focus:ring-red-700 min-h-[200px] font-serif italic text-xl"
                    placeholder="Summarize the mechanism and proof of the crime..."
                    id="theory-input"
                  ></textarea>

                  <button
                    disabled={isLoading || !activeSuspect}
                    onClick={() => {
                      const theory = (
                        document.getElementById(
                          "theory-input",
                        ) as HTMLTextAreaElement
                      ).value;
                      if (activeSuspect)
                        submitAccusation(activeSuspect, theory);
                    }}
                    className="w-full py-6 bg-red-700 hover:bg-red-600 text-white font-black text-2xl rounded-2xl shadow-2xl transition-all transform active:scale-95 uppercase tracking-widest disabled:opacity-50"
                  >
                    {isLoading ? "Deliberating..." : "Submit Evidence"}
                  </button>
                </div>
              )}
            </div>
          }
        />
      </Routes>
    </div>
  );
};

export default CaseView;
