import type { CrimeCase } from "../types";
import { useGame } from "../hooks/useGame";
import { UI_TEXT } from "../../translations";

interface ClueModal {
  selectedClueId: string | null;
  selectedCase: CrimeCase | null;
  setSelectedClueId: (d: string | null) => void;
  syncCaseToCloud: () => void;
}
const ClueDetailModal = ({
  selectedCase,
  selectedClueId,
  setSelectedClueId,
  syncCaseToCloud,
}: ClueModal) => {
  const { lang } = useGame();

  if (!selectedClueId || !selectedCase) return null;
  const clue = selectedCase.clues.find((c) => c.id === selectedClueId);
  if (!clue) return null;
  const t = UI_TEXT[lang];
  const isRTL = lang === "ar";

  return (
    <div className="fixed  inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
      <div
        className={`max-w-2xl w-full bg-neutral-900 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative ${isRTL ? "text-right" : ""}`}
      >
        <button
          onClick={() => {
            setSelectedClueId(null);
            syncCaseToCloud();
          }}
          className={`absolute top-10 ${isRTL ? "left-10" : "right-10"} text-gray-500 hover:text-red-500 transition-colors z-20`}
        >
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>

        <div className="p-16 space-y-12 text-center">
          <div className="relative inline-block">
            <div className="w-56 h-56 bg-neutral-950 border border-white/5 rounded-full flex items-center justify-center text-8xl text-red-600 shadow-[inset_0_0_30px_rgba(220,38,38,0.2)]">
              <i className={`fa-solid ${clue.icon} animate-pulse`}></i>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-red-700 text-white px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.4em] shadow-xl">
              {t.secured}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-4xl font-serif font-bold text-white uppercase tracking-tighter leading-none">
              {clue.title}
            </h3>
            <div className="h-0.5 w-16 bg-red-800 mx-auto"></div>
          </div>

          <p className="text-gray-400 font-serif italic text-2xl leading-relaxed px-4">
            "{clue.description}"
          </p>

          <button
            onClick={() => {
              setSelectedClueId(null);
              syncCaseToCloud();
            }}
            className="px-12 py-4 bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
          >
            {isRTL ? "العودة للمحفوظات" : "Return to Archives"}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ClueDetailModal;
