/* eslint-disable @typescript-eslint/no-explicit-any */
import { useGame } from "../hooks/useGame";

interface ComingSoonModalProps {
  setShowComingSoon: (showComingSoon: boolean) => void;
}

const ComingSoonModal = ({ setShowComingSoon }: ComingSoonModalProps) => {
  const { lang } = useGame();
  const isRTL = lang === "ar";

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full bg-neutral-900/50 border border-white/10 rounded-[2rem] shadow-2xl relative max-h-screen overflow-y-auto">
        <div className="p-6 md:p-12 space-y-8 text-center">
          <div className="inline-block px-4 py-1 bg-blue-600/10 border border-blue-600/30 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-[0.3em]">
            Feature Update
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
            Coming Soon!
          </h2>
          <p className="text-base sm:text-xl text-gray-500 italic font-serif">
            "Good things come to those who wait... and investigate."
          </p>
          <p className="text-gray-400 text-sm">
            We're working hard to bring you exciting new features. Stay tuned for updates!
          </p>
        </div>
        <div className="text-center py-4 border-t border-white/5">
          <button
            onClick={() => setShowComingSoon(false)}
            className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
          >
            {isRTL ? "العودة" : "Back to Terminal"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonModal;
