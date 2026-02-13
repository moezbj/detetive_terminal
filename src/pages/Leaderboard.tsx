/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useEffect, useState } from 'react';
import { useGame } from '../hooks/useGame';
import { getRealtimeLeaderboard } from '../../supabaseService';
import { UI_TEXT } from '../../translations';

const Leaderboard: React.FC = () => {
  const { lang } = useGame();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = UI_TEXT[lang];

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      const res = await getRealtimeLeaderboard();
      setData(res);
      setIsLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-12 animate-fadeIn space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-6xl font-serif font-bold text-white tracking-tighter">Global Merit</h2>
        <p className="text-gray-500 font-serif italic text-xl">The elite operatives currently on the grid.</p>
      </div>

      <div className="bg-neutral-900 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="p-20 text-center animate-pulse text-red-600 font-mono">RETRIEVING_NETWORK_RANKINGS...</div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.map((entry, i) => (
              <div key={i} className="p-8 flex items-center justify-between hover:bg-white/5 transition-all">
                <div className="flex items-center gap-8">
                  <span className={`text-4xl font-mono font-bold ${i < 3 ? 'text-red-600' : 'text-gray-800'}`}>{i + 1}</span>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-white">{entry.name}</h3>
                    <div className="flex gap-2 mt-1">
                      {entry.badges.map((b: string) => (
                        <span key={b} className="text-[8px] bg-white/5 px-2 py-0.5 rounded uppercase font-black text-gray-500">{b}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-serif text-white">{entry.points.toLocaleString()}</div>
                  <div className="text-[9px] font-black text-red-700 uppercase tracking-widest">Points Secured</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
