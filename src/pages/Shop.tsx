/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState } from 'react';
import { useGame } from '../hooks/useGame';
import { UI_TEXT } from '../../translations';

const Shop: React.FC = () => {
  const { lang, user, setUser } = useGame();
  const [isProcessing, setIsProcessing] = useState(false);
  const t = UI_TEXT[lang];

  const handlePurchase = (amount: number) => {
    setIsProcessing(true);
    // Simulation of payment processing
    setTimeout(() => {
      setUser(prev => ({
        ...prev,
        stats: { ...prev.stats, totalPoints: prev.stats.totalPoints + amount }
      }));
      setIsProcessing(false);
      alert("ACQUISITION_COMPLETE: Intel points deposited.");
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto p-12 animate-fadeIn space-y-16">
      <div className="text-center space-y-4">
        <div className="inline-block px-4 py-1 border border-yellow-600/30 bg-yellow-600/5 rounded-full text-yellow-600 text-[10px] font-black uppercase tracking-[0.3em]">Bureau Vault</div>
        <h2 className="text-7xl font-serif font-bold text-white tracking-tighter">Intel Acquisition</h2>
        <p className="text-gray-500 italic font-serif text-2xl max-w-2xl mx-auto">"In the dark, information is the only currency with value."</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {[
          { amount: 1000, cost: '$4.99', label: 'Field Kit', icon: 'fa-briefcase' },
          { amount: 3000, cost: '$9.99', label: 'Wiretap Pack', hot: true, icon: 'fa-tower-cell' },
          { amount: 7500, cost: '$19.99', label: 'Classified Cache', icon: 'fa-vault' }
        ].map((pkg, i) => (
          <div key={i} className={`p-12 rounded-[3rem] border transition-all group flex flex-col items-center text-center shadow-2xl ${pkg.hot ? 'border-yellow-600 bg-yellow-600/5' : 'border-white/5 bg-neutral-900/50 hover:border-red-600/30'}`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 transition-transform group-hover:scale-110 ${pkg.hot ? 'bg-yellow-600/10 text-yellow-600' : 'bg-neutral-950 text-gray-600'}`}>
              <i className={`fa-solid ${pkg.icon} text-4xl`}></i>
            </div>
            <div className="text-5xl font-mono font-bold text-white mb-2">+{pkg.amount}</div>
            <div className="text-[10px] text-gray-500 uppercase font-black mb-10 tracking-widest">{pkg.label}</div>
            <button 
              disabled={isProcessing}
              onClick={() => handlePurchase(pkg.amount)}
              className={`w-full py-5 rounded-2xl font-black text-xs transition-all transform active:scale-95 uppercase tracking-widest ${pkg.hot ? 'bg-yellow-600 text-black hover:bg-yellow-500' : 'bg-white text-black hover:bg-gray-200'}`}
            >
              {isProcessing ? 'Processing...' : `Secure for ${pkg.cost}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shop;
