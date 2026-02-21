import { useGame } from "../hooks/useGame";
import type { CrimeCase, CaseProgress } from "../types";
import { UI_TEXT } from "../../translations";

interface Progress {
  currentCase: CrimeCase;
  currentProgress: CaseProgress;
  requestHint: () => void;
  isLoadingHint: boolean;
}
const ProgressBanner = ({
  currentCase,
  currentProgress,
  requestHint,
  isLoadingHint
}: Progress) => {
  const { lang, user } = useGame();

  const isRTL = lang === "ar";
  const t = UI_TEXT[lang];

  const totalItems = currentCase.suspects.length + currentCase.clues.length;
  const completedItems =
    currentProgress.interrogatedSuspectIds.length +
    currentProgress.discoveredClueIds.length;
  const percentage = Math.round((completedItems / totalItems) * 100);
   

  if (!currentCase || !currentProgress) return null;

  return (
    <div className="bg-neutral-900/60 border-b border-white/5 p-3 px-8 sticky top-[73px] z-40 backdrop-blur-md">
      <div
        className={`max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6 ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <div
          className={`flex items-center gap-6 flex-1 ${isRTL ? "flex-row-reverse" : ""}`}
        >
          <div className={`flex flex-col ${isRTL ? "items-end" : ""}`}>
            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">
              Investigation Alpha
            </span>
            <div className="w-64 h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all duration-1000 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
          <span className="text-xs font-mono text-red-600 font-bold">
            {percentage}%
          </span>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={requestHint}
            disabled={isLoadingHint}
            className={`flex items-center gap-3 bg-red-700 hover:bg-red-600 px-6 py-2 rounded-lg transition-all transform active:scale-95 group shadow-lg ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <i
              className={`fa-solid fa-brain text-xs ${isLoadingHint ? "animate-spin" : ""}`}
            ></i>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {t.acquireIntel} ({user?.isPremium ? "50" : "250"})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default ProgressBanner;
