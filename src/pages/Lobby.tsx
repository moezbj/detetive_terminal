import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../hooks/useGame";
import { UI_TEXT } from "../../translations";
import PaywallModal from "../Modal/PaywallModal";
import ComingSoonModal from "../Modal/ComingSoonModal";

const Lobby: React.FC = () => {
  const { cases, isCasesLoading, lang, user } = useGame();
  const navigate = useNavigate();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const t = UI_TEXT[lang];
  const isRTL = lang === "ar";

  /* const freeSlotsRemaining = useMemo(() => {
    if (!user) return 0;
    const freePlayed = user.stats?.cases_played?.filter((id) => {
      const c = cases.find((cc) => cc.id === id);
      return c?.accessLevel === "Free";
    }).length;
    return Math.max(0, 2 - freePlayed);
  }, [user, cases]); */
  const renderColor = (type: string) => {
    let c = "";
    switch (type) {
      case "Expert ": {
        c = "text-gray-500 border-gray-500";
        break;
      }
      case "Hard": {
        c = "text-red-500 border-red-500";
        break;
      }
      case "Medium": {
        c = "text-yellow-500 border-yellow-500";
        break;
      }
      case "Easy": {
        c = "text-green-500 border-green-500";
        break;
      }
    }
    return c;
  };
  if (isCasesLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-red-600 font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">
          Retrieving Encrypted Dossiers...
        </p>
      </div>
    );
  }

  return (
    <div
      className={`max-w-6xl mx-auto px-6 py-20 space-y-24 ${isRTL ? "text-right" : ""}`}
    >
      <header className="text-center space-y-6">
        <div className="inline-block px-4 py-1 border border-red-900/50 rounded-full bg-red-900/10 text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-4">
          Central Intelligence Bureau
        </div>
        <h1 className="text-5xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-serif font-bold tracking-tighter text-white leading-none">
          {t.lobbyTitle}
        </h1>
        <p className="text-gray-500 font-serif italic text-2xl max-w-2xl mx-auto">
          {t.lobbySubtitle}
        </p>
        {/* {!user?.isPremium && (
          <p className="text-xs text-yellow-600 font-mono uppercase tracking-widest pt-4">
            Free Access Slots: {freeSlotsRemaining}
          </p>
        )} */}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {cases
          .sort((a, b) => b.difficulty.localeCompare(a.difficulty))
          .map((c) => {
            const isSolved = user?.stats
              ? user?.stats?.cases_solved.includes(c.id)
              : false;
            return (
              <div
                key={c.id}
                onClick={() => {
                  const isAlreadyStarted = user?.stats.cases_played.includes(
                    c.id,
                  );
                  if (!user) {
                    navigate("/auth");
                  }
                  if (
                    !user?.isPremium &&
                    c.accessLevel === "Premium" &&
                    !isAlreadyStarted
                  ) {
                    setShowComingSoon(true);
                  } else {
                    navigate(`/case/${c.id}`);
                  }
                }}
                className="group case-card relative overflow-hidden rounded-4xl border border-white/5 bg-neutral-900 cursor-pointer transition-all duration-700 hover:border-red-600/30"
              >
                <div className="aspect-4/5 overflow-hidden">
                  <img
                    src={c.backgroundImage}
                    alt={c.title}
                    loading="lazy"
                    className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/40 to-transparent"></div>
                  {isSolved && (
                    <div className="absolute top-6 right-6 bg-green-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl">
                      <i className="fa-solid fa-check-double mr-2"></i>{" "}
                      {t.resolved}
                    </div>
                  )}
                </div>
                <div className="p-10 relative -mt-32">
                  <div className="flex justify-between items-start mb-4">
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded bg-black/80 border ${renderColor(c.difficulty)}`}
                    >
                      {t.difficulty}: {c.difficulty}
                    </span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                      {c.accessLevel}{" "}
                      {c.difficulty === "Hard"
                        ? "(300 intel)"
                        : c.difficulty === "Medium"
                          ? "(200 intel)"
                          : c.difficulty === "Easy"
                            ? "(100 intel)"
                            : ""}
                    </span>
                  </div>
                  <h3 className="text-3xl font-serif font-bold text-white leading-tight mb-2 group-hover:text-red-600 transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 italic font-serif opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                    "{c.teaser}"
                  </p>
                </div>
              </div>
            );
          })}
      </div>
      {showPaywall && <PaywallModal setShowPaywall={setShowPaywall} />}
      {showComingSoon && (
        <ComingSoonModal setShowComingSoon={setShowComingSoon} />
      )}
    </div>
  );
};

export default Lobby;
