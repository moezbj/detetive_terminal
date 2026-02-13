/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useGame } from "../hooks/useGame";

interface paywallModal {
  setUser?: (user: any) => void;
  setShowPaywall: (showPaywall: boolean) => void;
}

const PaywallModal = ({ setShowPaywall }: paywallModal) => {
  const { lang } = useGame();
  const isRTL = lang === "ar";
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const togglePremium = (plan: "Monthly" | "Yearly") => {
    console.log("plan", plan);
    setIsCheckoutLoading(true);
    setTimeout(() => {
      //setUser((prev: any) => ({ ...prev, isPremium: true }));
      setIsCheckoutLoading(false);
      setShowPaywall(false);
    }, 2000);
  };
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fadeIn">
      <div className="max-w-4xl w-full bg-neutral-900/50 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative">
        {isCheckoutLoading && (
          <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-yellow-500 font-mono text-xs uppercase animate-pulse">
              Syncing encrypted credentials...
            </p>
          </div>
        )}
        <div className="p-12 md:p-20 space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-1 bg-yellow-600/10 border border-yellow-600/30 rounded-full text-yellow-600 text-[10px] font-black uppercase tracking-[0.3em]">
              Special Access Required
            </div>
            <h2 className="text-5xl font-serif font-bold text-white tracking-tight">
              Elite Investigator Pass
            </h2>
            <p className="text-gray-500 italic font-serif text-xl">
              "True clearance isn't given, it's acquired."
            </p>
          </div>

          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <div className="p-10 rounded-[2rem] border border-white/5 bg-black/40 space-y-8 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Monthly Intel
                </h3>
                <p className="text-gray-500 text-sm italic font-serif">
                  Perfect for a single operation.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    "Unlimited Case Access",
                    "50% Intel Point Discount",
                    "Exclusive Badges",
                  ].map((feat, i) => (
                    <li
                      key={i}
                      className={`flex items-center gap-3 text-xs text-gray-300 ${isRTL ? "flex-row-reverse text-right" : ""}`}
                    >
                      <i className="fa-solid fa-check text-yellow-600"></i>{" "}
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <div className="text-3xl font-mono font-bold text-white">
                  DT 9.99
                  <span className="text-xs text-gray-600 ml-2">/month</span>
                </div>
                <button
                  onClick={() => togglePremium("Monthly")}
                  className="w-full py-4 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Acquire Access
                </button>
              </div>
            </div>

            <div className="p-10 rounded-[2rem] border border-yellow-600/30 bg-yellow-600/5 space-y-8 flex flex-col justify-between relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-600 text-black text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">
                Best Value
              </span>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Annual Clearance
                </h3>
                <p className="text-gray-500 text-sm italic font-serif">
                  For the professional agent.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    "Everything in Monthly",
                    "Early Access to New Files",
                    "Veto Suspect Privilege",
                  ].map((feat, i) => (
                    <li
                      key={i}
                      className={`flex items-center gap-3 text-xs text-gray-300 ${isRTL ? "flex-row-reverse text-right" : ""}`}
                    >
                      <i className="fa-solid fa-check text-yellow-600"></i>{" "}
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <div className="text-3xl font-mono font-bold text-white">
                  DT 29.99
                  <span className="text-xs text-gray-600 ml-2">/year</span>
                </div>
                <button
                  onClick={() => togglePremium("Yearly")}
                  className="w-full py-4 bg-yellow-600 text-black font-black rounded-xl text-xs uppercase tracking-widest hover:bg-yellow-500 transition-all shadow-xl"
                >
                  Secure Clearance
                </button>
              </div>
            </div>
          </div>

          <div className="text-center pt-8">
            <button
              onClick={() => setShowPaywall(false)}
              className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
            >
              {isRTL ? "العودة" : "Back to Terminal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
