 
import { useGame } from "../hooks/useGame";

interface InsufficientIntelModalProps {
  setShowInsufficientIntel: (showInsufficientIntel: boolean) => void;
}

const InsufficientIntelModal = ({ setShowInsufficientIntel }: InsufficientIntelModalProps) => {
  const { lang } = useGame();
  const isRTL = lang === "ar";

  return (
    <div className="fixed inset-0 z-100 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full bg-neutral-900/50 border border-white/10 rounded-4xl shadow-2xl relative">
        <div className="p-6 md:p-12 space-y-8 text-center">
          <div className="inline-block px-4 py-1 bg-red-600/10 border border-red-600/30 rounded-full text-red-600 text-[10px] font-black uppercase tracking-[0.3em]">
            Access Denied
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
            Insufficient Intel
          </h2>
          <p className="text-base sm:text-xl text-gray-500 italic font-serif">
            "Every investigation requires resources. Acquire more intel to proceed."
          </p>
          <p className="text-gray-400 text-sm">
            You need more intel points to access this file. Solve more cases or upgrade your pass to gain more intel.
          </p>
        </div>
        <div className="text-center py-4 border-t border-white/5">
          <button
            onClick={() => setShowInsufficientIntel(false)}
            className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
          >
            {isRTL ? "العودة" : "Back to Terminal"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsufficientIntelModal;
