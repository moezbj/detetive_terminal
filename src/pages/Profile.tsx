
import React from 'react';
import { useGame } from '../hooks/useGame';
import { BADGE_DEFINITIONS } from '../constants';

const Profile: React.FC = () => {
  const { user, lang } = useGame();
   
  const isRTL = lang === 'ar';

  return (
    <div className={`max-w-4xl mx-auto p-12 animate-fadeIn space-y-12 ${isRTL ? 'text-right' : ''}`}>
      <div className="flex flex-col md:flex-row items-center gap-12 border-b border-white/5 pb-12">
        <div className="w-48 h-48 rounded-[3rem] bg-red-950/20 border-2 border-red-600/30 flex items-center justify-center text-red-600 text-6xl shadow-[0_0_50px_rgba(220,38,38,0.2)]">
          <i className="fa-solid fa-user-secret"></i>
        </div>
        <div className="space-y-4 text-center md:text-left">
          <h2 className="text-6xl font-serif font-bold text-white tracking-tighter">{user?.name}</h2>
          <div className="flex gap-4 justify-center md:justify-start">
            <span className="px-4 py-1.5 bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{user?.stats.rank}</span>
            {user?.isPremium && <span className="px-4 py-1.5 bg-yellow-600 text-black text-[10px] font-black uppercase tracking-widest rounded-full">Elite Member</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-10 bg-neutral-900 border border-white/5 rounded-[2.5rem] shadow-xl space-y-2">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cases Resolved</p>
          <p className="text-6xl font-serif text-white">{user?.stats.casesSolved}</p>
        </div>
        <div className="p-10 bg-neutral-900 border border-white/5 rounded-[2.5rem] shadow-xl space-y-2">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Intelligence Points</p>
          <p className="text-6xl font-serif text-yellow-600">{user?.stats.totalPoints.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-2xl font-serif font-bold text-white uppercase tracking-widest flex items-center gap-4">
          <i className="fa-solid fa-medal text-yellow-600"></i> Bureau Achievements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BADGE_DEFINITIONS.map(badge => {
            const hasBadge = user?.stats.badges.includes(badge.name);
            return (
              <div key={badge.name} className={`p-6 rounded-2xl border transition-all flex items-center gap-6 ${hasBadge ? 'bg-black/40 border-white/10 opacity-100' : 'bg-neutral-950 border-white/5 opacity-20 grayscale'}`}>
                <i className={`fa-solid ${badge.icon} text-4xl ${hasBadge ? badge.color : 'text-gray-700'}`}></i>
                <div>
                  <h4 className="font-bold text-white">{badge.name}</h4>
                  <p className="text-xs text-gray-500">{badge.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Profile;
