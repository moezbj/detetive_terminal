
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { GameView, SuspectID, CrimeCase, User, UserStats, CaseProgress, Language, LeaderboardEntry } from '../types';
import { CASES, BADGE_DEFINITIONS } from './constants';
import { interrogateSuspect, evaluateAccusation, generateHint, generateSpeech } from './services/geminiService';
import { supabase, saveProfile, getProfile, getRealtimeLeaderboard } from '../supabaseService';
import { UI_TEXT } from '../translations';

// Audio decoding helpers
function decodeBase64ToUint8(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [view, setView] = useState<GameView>('lobby');
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('detective_lang') as Language) || 'en';
  });
  const [selectedCase, setSelectedCase] = useState<CrimeCase | null>(null);
  const [activeSuspect, setActiveSuspect] = useState<SuspectID | null>(null);
  const [selectedClueId, setSelectedClueId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Record<string, { role: 'user' | 'model'; text: string }[]>>({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [verdict, setVerdict] = useState<{ correct: boolean; feedback: string } | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [particles, setParticles] = useState<{ id: number; left: string; duration: string; content: string }[]>([]);
  const [shake, setShake] = useState(false);
  
  const [authForm, setAuthForm] = useState({ email: '', password: '', isLogin: true });

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const t = UI_TEXT[lang];
  const isRTL = lang === 'ar';

  // User State
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('detective_user');
    return saved ? JSON.parse(saved) : {
      id: 'local_user',
      name: 'OPERATOR_42',
      isPremium: false,
      stats: {
        casesSolved: 0,
        totalPoints: 1200,
        badges: ['Rookie Detective'],
        rank: 'Junior Agent',
        casesPlayed: [],
        caseProgress: {}
      }
    };
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync with LocalStorage and Supabase
  useEffect(() => {
    localStorage.setItem('detective_user', JSON.stringify(user));
    if (user.id !== 'local_user') {
      syncToCloud();
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('detective_lang', lang);
  }, [lang]);

  useEffect(() => {
    if (view === 'leaderboard') {
      fetchLeaderboardData();
    }
  }, [view]);

  const fetchLeaderboardData = async () => {
    setIsLoading(true);
    const data = await getRealtimeLeaderboard();
    if (data.length > 0) setLeaderboard(data);
    setIsLoading(false);
  };

  const syncToCloud = async () => {
    setIsSyncing(true);
    await saveProfile(user.id, user.name, user.stats, user.isPremium);
    setIsSyncing(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let result;
      if (authForm.isLogin) {
        result = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password });
      } else {
        result = await supabase.auth.signUp({ email: authForm.email, password: authForm.password });
      }

      if (result.data.user) {
        const cloudProfile = await getProfile(result.data.user.id);
        if (cloudProfile.data) {
          setUser({
            id: result.data.user.id,
            name: cloudProfile.data.name,
            isPremium: cloudProfile.data.is_premium,
            stats: cloudProfile.data.full_stats as UserStats
          });
        } else {
          const newUserId = result.data.user.id;
          const mergedUser = { ...user, id: newUserId, name: authForm.email.split('@')[0].toUpperCase() };
          setUser(mergedUser);
          await saveProfile(newUserId, mergedUser.name, mergedUser.stats, mergedUser.isPremium);
        }
        setView('lobby');
      } else if (result.error) {
        alert(result.error.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('detective_user');
    window.location.reload();
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

  const freeCasesPlayedCount = useMemo(() => {
    return user.stats.casesPlayed.filter(id => {
      const caseObj = CASES.find(cc => cc.id === id);
      return caseObj?.accessLevel === 'Free';
    }).length;
  }, [user.stats.casesPlayed]);

  const freeSlotsRemaining = Math.max(0, 2 - freeCasesPlayedCount);

  const currentProgress = useMemo(() => {
    if (!selectedCase) return null;
    return user.stats.caseProgress[selectedCase.id] || {
      discoveredClueIds: [],
      interrogatedSuspectIds: [],
      unlockedHintIds: [],
      isCompleted: false
    };
  }, [selectedCase, user.stats.caseProgress]);

  const updateProgress = (updates: Partial<CaseProgress>) => {
    if (!selectedCase) return;
    setUser(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        caseProgress: {
          ...prev.stats.caseProgress,
          [selectedCase.id]: {
            ...(prev.stats.caseProgress[selectedCase.id] || {
              discoveredClueIds: [],
              interrogatedSuspectIds: [],
              unlockedHintIds: [],
              isCompleted: false
            }),
            ...updates
          }
        }
      }
    }));
  };

  const startCase = (c: CrimeCase) => {
    if (!user.isPremium) {
      const isAlreadyStarted = user.stats.casesPlayed.includes(c.id);
      if (c.accessLevel !== 'Free' || (!isAlreadyStarted && freeSlotsRemaining <= 0)) {
        setShowPaywall(true);
        return;
      }
    }
    setSelectedCase(c);
    setChatHistory({});
    setVerdict(null);
    setActiveSuspect(null);
    setActiveHint(null);
    setSelectedClueId(null);
    setView('intro');
    if (!user.stats.casesPlayed.includes(c.id)) {
      setUser(prev => ({
        ...prev,
        stats: { ...prev.stats, casesPlayed: [...prev.stats.casesPlayed, c.id] }
      }));
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !activeSuspect || !selectedCase || isLoading) return;
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    const suspectHistory = chatHistory[activeSuspect] || [];
    const newHistory = [...suspectHistory, { role: 'user' as const, text: currentInput }];
    setChatHistory(prev => ({ ...prev, [activeSuspect]: newHistory }));
    if (!currentProgress?.interrogatedSuspectIds.includes(activeSuspect)) {
      updateProgress({ interrogatedSuspectIds: [...(currentProgress?.interrogatedSuspectIds || []), activeSuspect] });
    }
    try {
      const reply = await interrogateSuspect(selectedCase, activeSuspect, suspectHistory, currentInput, lang);
      setChatHistory(prev => ({ ...prev, [activeSuspect]: [...newHistory, { role: 'model' as const, text: reply }] }));
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const playBriefing = async () => {
    if (!selectedCase || isAudioLoading) return;
    setIsAudioLoading(true);
    try {
      if (!audioContextRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const audioBase64 = await generateSpeech(selectedCase.teaser, lang);
      const audioData = decodeBase64ToUint8(audioBase64);
      const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
      
      if (currentSourceRef.current) {
        currentSourceRef.current.stop();
      }
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
      currentSourceRef.current = source;
      source.onended = () => setIsAudioLoading(false);
    } catch (e) {
      console.error(e);
      setIsAudioLoading(false);
    }
  };

  const discoverClue = (clueId: string) => {
    if (!currentProgress?.discoveredClueIds.includes(clueId)) {
      updateProgress({ discoveredClueIds: [...(currentProgress?.discoveredClueIds || []), clueId] });
    }
    setSelectedClueId(clueId);
  };

  const requestHint = async () => {
    if (!selectedCase || !currentProgress || isLoading) return;
    const hintCost = user.isPremium ? 50 : 250;
    if (user.stats.totalPoints < hintCost) {
      setView('shop');
      return;
    }

    setIsLoading(true);
    try {
      const hint = await generateHint(selectedCase, currentProgress, lang);
      setActiveHint(hint);
      setUser(prev => ({
        ...prev,
        stats: { ...prev.stats, totalPoints: prev.stats.totalPoints - hintCost }
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeCheckout = async (amount: number, label: string) => {
    console.log('label', label)
    setIsCheckoutLoading(true);
    setTimeout(() => {
      setUser(prev => ({
        ...prev,
        stats: { ...prev.stats, totalPoints: prev.stats.totalPoints + amount }
      }));
      setIsCheckoutLoading(false);
      setView('lobby');
    }, 1500);
  };

  const triggerCelebration = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: Math.random(),
      left: `${Math.random() * 100}vw`,
      duration: `${1 + Math.random() * 3}s`,
      content: Math.random() > 0.5 ? '1' : '0'
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 4000);
  };

  const submitAccusation = async (id: SuspectID, theory: string) => {
    if (!selectedCase) return;
    setIsLoading(true);
    try {
      const res = await evaluateAccusation(selectedCase, id, theory, lang);
      setVerdict(res);
      setView('accusation');
      if (res.correct) {
        triggerCelebration();
        updateProgress({ isCompleted: true });
        const pointsAwarded = selectedCase.difficulty === 'Hard' ? 1200 : 600;
        setUser(prev => {
          const newSolved = prev.stats.casesSolved + 1;
          const newPoints = prev.stats.totalPoints + pointsAwarded;
          const newBadges = [...prev.stats.badges];
          if (newSolved === 1) newBadges.push('First Blood');
          if (newSolved === 5) newBadges.push('Elite Investigator');
          if (selectedCase.difficulty === 'Hard' && !newBadges.includes('Master Mind')) newBadges.push('Master Mind');
          return { ...prev, stats: { ...prev.stats, casesSolved: newSolved, totalPoints: newPoints, badges: newBadges } };
        });
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const togglePremium = (plan: 'Monthly' | 'Yearly') => {
    console.log('plan', plan)
    setIsCheckoutLoading(true);
    setTimeout(() => {
      setUser(prev => ({ ...prev, isPremium: true }));
      setIsCheckoutLoading(false);
      setShowPaywall(false);
    }, 2000);
  };

  const renderHeader = () => (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 shadow-2xl">
      <div className={`max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div 
            className={`flex items-center gap-2 cursor-pointer group ${isRTL ? 'flex-row-reverse' : ''}`}
            onClick={() => setView('lobby')}
          >
            <div className="w-8 h-8 bg-red-950 flex items-center justify-center border border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]">
              <i className="fa-solid fa-terminal text-red-600 text-xs group-hover:scale-110 transition-transform"></i>
            </div>
            <h1 className="text-xl font-mono font-bold text-red-600 tracking-tighter uppercase hidden sm:block">
              {t.terminal}<span className="animate-pulse">_</span>
            </h1>
          </div>
          
          <div 
            onClick={() => setView('shop')} 
            className={`flex items-center gap-3 bg-neutral-900/50 px-4 py-1.5 rounded-full border cursor-pointer hover:bg-neutral-800 transition-all border-glow ${view === 'shop' ? 'border-yellow-600' : 'border-white/10'} ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <i className="fa-solid fa-database text-yellow-500 text-xs"></i>
            <span className="text-xs font-mono text-yellow-500 font-bold">{user.stats.totalPoints.toLocaleString()} <span className="text-gray-600 ml-1">{t.intel}</span></span>
          </div>

          <div className={`flex gap-2 bg-neutral-900/40 p-1 rounded-lg border border-white/5 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {['en', 'fr', 'ar'].map((l) => (
              <button 
                key={l}
                onClick={() => setLang(l as Language)}
                className={`w-6 h-6 text-[8px] font-black rounded uppercase transition-all ${lang === l ? 'bg-red-700 text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {selectedCase && !['lobby', 'leaderboard', 'profile', 'intro', 'auth', 'shop'].includes(view) && (
          <div className={`flex gap-1 overflow-x-auto no-scrollbar bg-neutral-900/40 p-1 rounded-xl border border-white/5 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button onClick={() => setView('casefile')} className={`px-4 py-2 rounded-lg transition text-[10px] font-bold uppercase tracking-widest ${view === 'casefile' ? 'bg-red-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t.incidentReport.split(' ')[0]}</button>
            <button onClick={() => setView('interrogation')} className={`px-4 py-2 rounded-lg transition text-[10px] font-bold uppercase tracking-widest ${view === 'interrogation' ? 'bg-red-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t.interrogate}</button>
            <button onClick={() => setView('evidence')} className={`px-4 py-2 rounded-lg transition text-[10px] font-bold uppercase tracking-widest ${view === 'evidence' ? 'bg-red-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{t.evidence}</button>
            <button onClick={() => setView('accusation')} className={`px-4 py-2 rounded-lg transition text-[10px] font-bold uppercase tracking-widest ${view === 'accusation' ? 'bg-white text-black' : 'text-gray-500 hover:text-gray-300'}`}>{t.verdict}</button>
          </div>
        )}

        <div className={`flex gap-4 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => setView('leaderboard')} title="Leaderboard" className={`w-8 h-8 flex items-center justify-center transition-colors ${view === 'leaderboard' ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
            <i className="fa-solid fa-ranking-star"></i>
          </button>
          <button onClick={() => setView('profile')} title="Profile" className={`w-8 h-8 flex items-center justify-center transition-colors ${view === 'profile' ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
            <i className="fa-solid fa-user-secret"></i>
          </button>
          {user.id === 'local_user' ? (
            <button onClick={() => setView('auth')} className={`px-4 py-1.5 rounded font-black text-[10px] uppercase transition-all ${view === 'auth' ? 'bg-red-700 text-white' : 'bg-neutral-800 hover:bg-red-700 text-white'}`}>
              <i className={`fa-solid fa-cloud-arrow-up ${isRTL ? 'ml-2' : 'mr-2'}`}></i> {t.sync}
            </button>
          ) : (
            <button onClick={logout} className="px-4 py-1.5 bg-neutral-900 border border-white/10 text-gray-500 rounded font-black text-[10px] uppercase">
              {t.logout}
            </button>
          )}
        </div>
      </div>
    </nav>
  );

  const AuthView = () => (
    <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fadeIn">
      <div className={`max-w-md w-full bg-neutral-900 border border-white/5 rounded-[2rem] p-12 space-y-10 relative overflow-hidden shadow-2xl border-glow ${isRTL ? 'text-right' : ''}`}>
        {isLoading && <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center"><i className="fa-solid fa-spinner fa-spin text-red-600 text-2xl"></i></div>}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-red-950 border border-red-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
            <i className="fa-solid fa-shield-halved text-red-600 text-3xl"></i>
          </div>
          <h2 className="text-4xl font-serif font-bold text-white tracking-tight">Central Intelligence Auth</h2>
          <p className="text-gray-500 font-serif italic">Secure your career across terminals.</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <label className={`text-[10px] font-black text-gray-600 uppercase tracking-widest ${isRTL ? 'mr-1' : 'ml-1'}`}>Access Protocol</label>
            <input 
              type="email" 
              placeholder="EMAIL_ADDRESS" 
              className={`w-full bg-black border border-white/5 rounded-xl px-5 py-4 text-white font-mono text-xs focus:ring-1 focus:ring-red-600 outline-none transition-all ${isRTL ? 'text-right' : ''}`}
              value={authForm.email}
              onChange={e => setAuthForm({...authForm, email: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <label className={`text-[10px] font-black text-gray-600 uppercase tracking-widest ${isRTL ? 'mr-1' : 'ml-1'}`}>Security Key</label>
            <input 
              type="password" 
              placeholder="ENCRYPTED_PASSWORD" 
              className={`w-full bg-black border border-white/5 rounded-xl px-5 py-4 text-white font-mono text-xs focus:ring-1 focus:ring-red-600 outline-none transition-all ${isRTL ? 'text-right' : ''}`}
              value={authForm.password}
              onChange={e => setAuthForm({...authForm, password: e.target.value})}
              required
            />
          </div>
          <button className="w-full py-5 bg-red-700 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-xl hover:bg-red-600 shadow-[0_10px_30px_rgba(185,28,28,0.3)] transform active:scale-95 transition-all">
            {authForm.isLogin ? 'Initiate Login' : 'Register New Agent'}
          </button>
        </form>
        <div className="text-center pt-4 border-t border-white/5">
          <button 
            onClick={() => setAuthForm({...authForm, isLogin: !authForm.isLogin})}
            className="text-[10px] text-gray-600 uppercase font-black hover:text-white transition-colors tracking-widest"
          >
            {authForm.isLogin ? "Need new clearance? Create account" : "Already have clearance? Access login"}
          </button>
        </div>
        <div className="flex justify-center pt-4">
          <button onClick={() => setView('lobby')} className="text-[9px] text-gray-700 uppercase font-black hover:text-red-500 tracking-widest transition-colors">Abort Auth Procedure</button>
        </div>
      </div>
    </div>
  );

  const ShopView = () => (
    <div className={`max-w-6xl mx-auto p-8 animate-fadeIn space-y-16 ${isRTL ? 'text-right' : ''}`}>
      <div className="text-center space-y-4">
        <div className="inline-block px-4 py-1 border border-yellow-600/30 bg-yellow-600/5 rounded-full text-yellow-600 text-[10px] font-black uppercase tracking-[0.3em]">{t.shopTitle}</div>
        <h2 className="text-6xl font-serif font-bold text-white tracking-tighter">{t.shopTitle}</h2>
        <p className="text-gray-500 italic font-serif text-2xl max-w-2xl mx-auto">"Information is the only currency that matters in the dark."</p>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-12 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {[
          { amount: 1000, cost: 'DT 4.99', label: 'Field Kit', icon: 'fa-briefcase', desc: 'Basic data pack for minor leads.' },
          { amount: 3000, cost: 'DT 9.99', label: 'Wiretap Access', hot: true, icon: 'fa-tower-cell', desc: 'Deep-dive intelligence for complex cases.' },
          { amount: 7500, cost: 'DT 19.99', label: 'Classified Archive', icon: 'fa-vault', desc: 'Full-spectrum clearance for elite agents.' }
        ].map((p, i) => (
          <div 
            key={i} 
            className={`p-12 rounded-[3rem] border transition-all duration-500 group relative flex flex-col items-center text-center shadow-2xl ${p.hot ? 'border-yellow-600 bg-yellow-600/5' : 'border-white/5 bg-neutral-900/50 hover:border-red-600/30'}`}
          >
            {p.hot && <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-600 text-black text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Operator's Choice</span>}
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 transition-transform group-hover:scale-110 ${p.hot ? 'bg-yellow-600/10 text-yellow-600' : 'bg-neutral-950 text-gray-600'}`}>
              <i className={`fa-solid ${p.icon} text-4xl`}></i>
            </div>
            <div className="text-5xl font-mono font-bold text-white mb-2">+{p.amount}</div>
            <div className="text-[10px] text-gray-500 uppercase font-black mb-6 tracking-[0.2em]">{p.label}</div>
            <p className="text-sm text-gray-500 italic font-serif mb-10 leading-relaxed px-4">{p.desc}</p>
            <button 
              onClick={() => !isCheckoutLoading && initializeCheckout(p.amount, p.label)}
              disabled={isCheckoutLoading}
              className={`w-full py-5 rounded-2xl font-black text-xs transition-all transform active:scale-95 shadow-xl uppercase tracking-widest ${p.hot ? 'bg-yellow-600 text-black hover:bg-yellow-500' : 'bg-white text-black hover:bg-gray-200'}`}
            >
              {isCheckoutLoading ? 'Establishing Handshake...' : `PURCHASE ${p.cost}`}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-8 pt-12 border-t border-white/5">
        <div className={`flex gap-12 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] ${isRTL ? 'flex-row-reverse' : ''}`}>
           <div className="flex items-center gap-3"><i className="fa-solid fa-lock text-green-600"></i> Encrypted Transaction</div>
           <div className="flex items-center gap-3"><i className="fa-solid fa-bolt text-red-600"></i> Instant Credit</div>
           <div className="flex items-center gap-3"><i className="fa-solid fa-shield text-blue-600"></i> Bureau Verified</div>
        </div>
        <button onClick={() => setView('lobby')} className="text-gray-700 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">{t.returnToCentral}</button>
      </div>
    </div>
  );

  const PaywallModal = () => (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fadeIn">
      <div className="max-w-4xl w-full bg-neutral-900/50 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative">
        {isCheckoutLoading && (
          <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-yellow-500 font-mono text-xs uppercase animate-pulse">Syncing encrypted credentials...</p>
          </div>
        )}
        <div className="p-12 md:p-20 space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-1 bg-yellow-600/10 border border-yellow-600/30 rounded-full text-yellow-600 text-[10px] font-black uppercase tracking-[0.3em]">Special Access Required</div>
            <h2 className="text-5xl font-serif font-bold text-white tracking-tight">Elite Investigator Pass</h2>
            <p className="text-gray-500 italic font-serif text-xl">"True clearance isn't given, it's acquired."</p>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-10 rounded-[2rem] border border-white/5 bg-black/40 space-y-8 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Monthly Intel</h3>
                <p className="text-gray-500 text-sm italic font-serif">Perfect for a single operation.</p>
                <ul className="mt-8 space-y-4">
                  {['Unlimited Case Access','50% Intel Point Discount', 'Exclusive Badges'].map((feat, i) => (
                    <li key={i} className={`flex items-center gap-3 text-xs text-gray-300 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <i className="fa-solid fa-check text-yellow-600"></i> {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <div className="text-3xl font-mono font-bold text-white">DT 9.99<span className="text-xs text-gray-600 ml-2">/month</span></div>
                <button 
                  onClick={() => togglePremium('Monthly')}
                  className="w-full py-4 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Acquire Access
                </button>
              </div>
            </div>

            <div className="p-10 rounded-[2rem] border border-yellow-600/30 bg-yellow-600/5 space-y-8 flex flex-col justify-between relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-600 text-black text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">Best Value</span>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Annual Clearance</h3>
                <p className="text-gray-500 text-sm italic font-serif">For the professional agent.</p>
                <ul className="mt-8 space-y-4">
                  {['Everything in Monthly', 'Early Access to New Files', 'Veto Suspect Privilege'].map((feat, i) => (
                    <li key={i} className={`flex items-center gap-3 text-xs text-gray-300 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <i className="fa-solid fa-check text-yellow-600"></i> {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <div className="text-3xl font-mono font-bold text-white">DT 29.99<span className="text-xs text-gray-600 ml-2">/year</span></div>
                <button 
                  onClick={() => togglePremium('Yearly')}
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
              {isRTL ? 'العودة' : 'Back to Terminal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const ClueDetailModal = () => {
    if (!selectedClueId || !selectedCase) return null;
    const clue = selectedCase.clues.find(c => c.id === selectedClueId);
    if (!clue) return null;

    return (
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
        <div className={`max-w-2xl w-full bg-neutral-900 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative ${isRTL ? 'text-right' : ''}`}>
          <button 
            onClick={() => setSelectedClueId(null)} 
            className={`absolute top-10 ${isRTL ? 'left-10' : 'right-10'} text-gray-500 hover:text-red-500 transition-colors z-20`}
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
              <h3 className="text-4xl font-serif font-bold text-white uppercase tracking-tighter leading-none">{clue.title}</h3>
              <div className="h-0.5 w-16 bg-red-800 mx-auto"></div>
            </div>

            <p className="text-gray-400 font-serif italic text-2xl leading-relaxed px-4">
              "{clue.description}"
            </p>
            
            <button 
              onClick={() => setSelectedClueId(null)}
              className="px-12 py-4 bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
            >
              {isRTL ? 'العودة للمحفوظات' : 'Return to Archives'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ProgressBanner = () => {
    if (!selectedCase || !currentProgress) return null;
    const totalItems = selectedCase.suspects.length + selectedCase.clues.length;
    const completedItems = currentProgress.interrogatedSuspectIds.length + currentProgress.discoveredClueIds.length;
    const percentage = Math.round((completedItems / totalItems) * 100);
    return (
      <div className="bg-neutral-900/60 border-b border-white/5 p-3 px-8 sticky top-[73px] z-40 backdrop-blur-md">
        <div className={`max-w-6xl mx-auto flex items-center justify-between gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-6 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
             <div className={`flex flex-col ${isRTL ? 'items-end' : ''}`}>
               <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Investigation Alpha</span>
               <div className="w-64 h-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 transition-all duration-1000 shadow-[0_0_10px_rgba(220,38,38,0.5)]" style={{ width: `${percentage}%` }}></div>
               </div>
             </div>
             <span className="text-xs font-mono text-red-600 font-bold">{percentage}%</span>
          </div>
          <div className="flex gap-4 items-center">
             <button 
               onClick={requestHint}
               disabled={isLoading}
               className={`flex items-center gap-3 bg-red-700 hover:bg-red-600 px-6 py-2 rounded-lg transition-all transform active:scale-95 group shadow-lg ${isRTL ? 'flex-row-reverse' : ''}`}
             >
               <i className={`fa-solid fa-brain text-xs ${isLoading ? 'animate-spin' : ''}`}></i>
               <span className="text-[10px] font-black uppercase tracking-widest">{t.acquireIntel} ({user.isPremium ? '50' : '250'})</span>
             </button>
          </div>
        </div>
      </div>
    );
  };

  // View Router
  if (view === 'auth') return <div className="min-h-screen bg-neutral-950">{renderHeader()}<AuthView /></div>;
  if (view === 'shop') return <div className="min-h-screen bg-neutral-950">{renderHeader()}<ShopView /></div>;

  if (view === 'leaderboard') {
    return (
      <div className="min-h-screen bg-neutral-950 pb-12">
        {renderHeader()}
        <main className={`max-w-4xl mx-auto p-8 animate-fadeIn ${isRTL ? 'text-right' : ''}`}>
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-5xl font-serif font-bold text-white tracking-tighter">{t.rankings}</h2>
            <p className="text-gray-500 font-serif italic">Live intelligence from the field.</p>
          </div>
          <div className="bg-neutral-900 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <div className={`grid grid-cols-4 p-6 bg-black/40 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="col-span-2">Detective</div>
              <div className="text-center">Cases Solved</div>
              <div className="text-right">Score</div>
            </div>
            <div className="divide-y divide-white/5">
              {(leaderboard.length > 0 ? leaderboard : []).map((entry, idx) => (
                <div key={idx} className={`grid grid-cols-4 p-6 items-center hover:bg-white/5 transition ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`col-span-2 flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                    <span className={`text-xl font-bold ${idx < 3 ? 'text-yellow-500' : 'text-gray-600'}`}>{idx + 1}</span>
                    <div>
                      <div className="text-white font-bold">{entry.name}</div>
                      <div className={`flex gap-1 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {entry.badges.map((b: string) => (
                          <span key={b} className="px-2 py-0.5 bg-neutral-800 text-[8px] text-gray-400 rounded uppercase tracking-tighter">{b}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-red-500 font-mono text-xl">{entry.casesSolved}</div>
                  <div className={`font-mono ${isRTL ? 'text-left' : 'text-right'} text-gray-300`}>{entry.points.toLocaleString()}</div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="p-12 text-center text-gray-600 italic">No rankings found in cloud database.</div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'profile') {
    return (
      <div className="min-h-screen bg-neutral-950 pb-12">
        {renderHeader()}
        <main className={`max-w-4xl mx-auto p-8 animate-fadeIn ${isRTL ? 'text-right' : ''}`}>
          <div className={`grid md:grid-cols-3 gap-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="md:col-span-1 space-y-6">
              <div className="bg-neutral-900 p-8 rounded-3xl border border-white/5 text-center space-y-4 shadow-2xl">
                <div className="w-24 h-24 bg-red-900/30 border-2 border-red-500/30 rounded-full mx-auto flex items-center justify-center text-4xl text-red-500">
                  <i className="fa-solid fa-user-secret"></i>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{user.name}</h3>
                  <p className="text-red-500 text-sm font-bold uppercase tracking-widest">{user.stats.rank}</p>
                </div>
                {user.isPremium && (
                  <span className="inline-block px-3 py-1 bg-yellow-500 text-black text-[10px] font-black rounded-full uppercase">PRO MEMBER</span>
                )}
                {user.id === 'local_user' && (
                  <button onClick={() => setView('auth')} className="w-full py-3 bg-red-700 text-white rounded-xl text-[10px] uppercase font-black tracking-widest transform active:scale-95 transition-all">{t.syncCloud}</button>
                )}
              </div>
            </div>
            <div className="md:col-span-2 space-y-8">
              <div className={`grid grid-cols-2 gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="bg-neutral-900 p-8 rounded-2xl border border-white/5 shadow-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-2">Cases Solved</p>
                  <p className="text-4xl text-white font-serif">{user.stats.casesSolved}</p>
                </div>
                <div className="bg-neutral-900 p-8 rounded-2xl border border-white/5 shadow-xl cursor-pointer hover:border-yellow-600/30 transition-all" onClick={() => setView('shop')}>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-2">Total Intel</p>
                  <p className="text-4xl text-yellow-500 font-serif">{user.stats.totalPoints.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-neutral-900 p-8 rounded-3xl border border-white/5 shadow-xl">
                <h4 className={`text-xl font-bold text-white mb-6 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <i className="fa-solid fa-medal text-yellow-500"></i> {t.achievements}
                </h4>
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  {BADGE_DEFINITIONS.map(badge => {
                    const hasBadge = user.stats.badges.includes(badge.name);
                    return (
                      <div key={badge.name} className={`p-4 rounded-xl border transition flex items-center gap-4 ${hasBadge ? 'bg-black/40 border-white/10 shadow-lg' : 'bg-neutral-950/30 border-white/5 opacity-40'} ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <i className={`fa-solid ${badge.icon} text-2xl ${hasBadge ? badge.color : 'text-gray-700'}`}></i>
                        <div>
                          <p className="text-sm font-bold text-white">{badge.name}</p>
                          <p className="text-[10px] text-gray-500 leading-tight">{badge.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-neutral-950 pb-20">
        {renderHeader()}
        {showPaywall && <PaywallModal />}
        
        <div className={`max-w-6xl mx-auto px-6 py-20 space-y-24 ${isRTL ? 'text-right' : ''}`}>
          <header className="text-center space-y-6">
            <div className="inline-block px-4 py-1 border border-red-900/50 rounded-full bg-red-900/10 text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-4">Central Intelligence Bureau</div>
            <h1 className="text-8xl font-serif font-bold tracking-tighter text-white leading-none">{t.lobbyTitle}</h1>
            <p className="text-gray-500 font-serif italic text-2xl max-w-2xl mx-auto">{t.lobbySubtitle}</p>
            
            <div className="flex flex-col items-center gap-4 pt-8">
              <div className={`flex justify-center gap-12 text-[10px] font-bold uppercase tracking-widest text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <i className={`fa-solid fa-unlock ${freeSlotsRemaining > 0 ? 'text-green-500' : 'text-red-500'}`}></i> 
                  <span>{t.availableClearance}: <span className="text-white font-mono">{user.isPremium ? '∞' : freeSlotsRemaining}</span></span>
                </div>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <i className="fa-solid fa-shield-halved text-yellow-600"></i>
                  <span>{t.eliteMembership}: <span className={user.isPremium ? 'text-yellow-600' : 'text-gray-800'}>{user.isPremium ? t.online : t.locked}</span></span>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {CASES.map(c => {
              const isStarted = user.stats.casesPlayed.includes(c.id);
              const showLockUI = !user.isPremium && (c.accessLevel !== 'Free' || (!isStarted && freeSlotsRemaining <= 0));
              const progress = user.stats.caseProgress[c.id];
              const isSolved = progress?.isCompleted;
              
              return (
                <div 
                  key={c.id} 
                  onClick={() => startCase(c)}
                  className="group case-card relative overflow-hidden rounded-[2rem] border border-white/5 bg-neutral-900 cursor-pointer transition-all duration-700 hover:border-red-600/30"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    <img src={c.backgroundImage} alt={c.title} className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent"></div>
                    
                    {showLockUI && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-950 flex items-center justify-center border border-red-600/50">
                           <i className="fa-solid fa-lock text-red-600"></i>
                        </div>
                        <p className="text-red-600 text-[10px] font-black uppercase tracking-[0.2em]">Upgrade Membership</p>
                      </div>
                    )}
                    
                    {isSolved && (
                      <div className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} bg-green-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl`}>
                        <i className="fa-solid fa-check-double mr-2"></i> {t.resolved}
                      </div>
                    )}
                  </div>
                  
                  <div className={`p-10 relative -mt-32 ${isRTL ? 'text-right' : ''}`}>
                    <div className={`flex justify-between items-start mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded bg-black/80 border ${c.difficulty === 'Hard' ? 'text-red-500 border-red-500' : 'text-yellow-500 border-yellow-500'}`}>
                        {t.difficulty}: {c.difficulty}
                      </span>
                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{c.accessLevel}</span>
                    </div>
                    <h3 className="text-3xl font-serif font-bold text-white leading-tight mb-2 group-hover:text-red-600 transition-colors">{c.title}</h3>
                    <p className="text-xs text-red-700 font-black uppercase tracking-[0.2em] mb-4">{c.subtitle}</p>
                    <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 italic font-serif opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                      "{c.teaser}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'intro' && selectedCase) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <img src={selectedCase.backgroundImage} className="w-full h-full object-cover blur-md scale-110 brightness-[0.2]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black"></div>
        </div>
        <div className="relative z-10 max-w-4xl text-center space-y-12 animate-fadeIn">
          <div className="space-y-6">
            <span className="inline-block px-4 py-1 border border-red-600/30 text-red-600 text-[10px] font-black uppercase tracking-[0.5em] mb-4 animate-pulse">Establishing Signal...</span>
            <h1 className="text-9xl font-serif font-bold text-white tracking-tighter leading-none">{selectedCase.title}</h1>
            <p className="text-3xl text-gray-500 font-serif italic max-w-2xl mx-auto leading-relaxed">
              "{selectedCase.teaser}"
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-8">
            <button 
              onClick={playBriefing}
              disabled={isAudioLoading}
              className={`flex items-center gap-4 bg-white/10 border border-white/20 px-8 py-3 rounded-full hover:bg-white/20 transition-all ${isAudioLoading ? 'animate-pulse' : ''}`}
            >
              <i className={`fa-solid ${isAudioLoading ? 'fa-signal' : 'fa-volume-high'} text-red-600`}></i>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                {isAudioLoading ? 'Receiving Audio Transmission...' : 'Listen to Briefing'}
              </span>
            </button>

            <div className={`flex flex-col sm:flex-row justify-center gap-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button 
                onClick={() => setView('lobby')} 
                className="px-12 py-5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-2xl transition-all backdrop-blur-md uppercase tracking-[0.2em] text-[10px]"
              >
                {t.abort}
              </button>
              <button 
                onClick={() => setView('casefile')} 
                className="px-16 py-5 bg-red-700 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-[0_15px_60px_rgba(185,28,28,0.4)] uppercase tracking-[0.2em] text-[10px] transform active:scale-95"
              >
                {t.accessFile}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-neutral-950 pb-24 ${shake ? 'animate-shake' : ''}`}>
      {particles.map(p => (
        <div 
          key={p.id} 
          className="celebration-particle" 
          style={{ left: p.left, animationDuration: p.duration }}
        >
          {p.content}
        </div>
      ))}
      
      {renderHeader()}
      <ProgressBanner />
      {showPaywall && <PaywallModal />}
      {selectedClueId && <ClueDetailModal />}

      <main className="max-w-6xl mx-auto p-8 mt-4 relative">
        {activeHint && (
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[90%] bg-red-950/95 backdrop-blur-2xl border border-red-500/50 p-12 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.9)] animate-fadeIn">
            <div className={`flex justify-between items-center mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <i className="fa-solid fa-satellite-dish text-red-600 animate-pulse"></i>
                <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.5em]">Classified Leak intercepted</span>
              </div>
              <button onClick={() => setActiveHint(null)} className="text-gray-500 hover:text-white transition-colors">
                <i className="fa-solid fa-circle-xmark text-xl"></i>
              </button>
            </div>
            <p className={`text-white font-serif italic text-2xl leading-relaxed mb-8 select-none ${isRTL ? 'text-right' : ''}`}>
              {activeHint}
            </p>
            <div className="flex justify-center">
               <button onClick={() => setActiveHint(null)} className="px-10 py-3 bg-red-700 text-white font-black rounded-full text-[9px] uppercase tracking-widest shadow-xl">Purge Transmission</button>
            </div>
          </div>
        )}

        {selectedCase && view === 'casefile' && (
          <div className={`space-y-20 animate-fadeIn ${isRTL ? 'text-right' : ''}`}>
            <div className={`grid grid-cols-1 lg:grid-cols-5 gap-16 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <section className="lg:col-span-3 space-y-10">
                <div className={`flex items-center gap-6 border-b border-red-900/40 pb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 rounded-2xl bg-red-950 flex items-center justify-center text-red-600 border border-red-600/30">
                    <i className="fa-solid fa-file-invoice text-xl"></i>
                  </div>
                  <h2 className="text-5xl font-serif font-bold text-white tracking-tight">{t.incidentReport}</h2>
                </div>
                
                <div className="bg-neutral-900/40 p-12 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl backdrop-blur-md">
                  <p className="text-gray-300 leading-relaxed font-serif text-2xl">{selectedCase.description}</p>
                  
                  <div className="space-y-6 pt-10 border-t border-white/5">
                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-8">{t.chronology}</h4>
                    <div className="space-y-8">
                      {selectedCase.timeline.map((t, i) => (
                        <div key={i} className={`flex gap-8 items-start relative group ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          {i < selectedCase.timeline.length - 1 && <div className={`w-px h-full bg-red-900/30 absolute ${isRTL ? 'right-[22px]' : 'left-[22px]'} top-10`}></div>}
                          <div className="w-12 h-12 rounded-2xl bg-black border border-red-900/50 flex items-center justify-center text-[10px] font-mono text-red-600 shrink-0 z-10 shadow-lg group-hover:border-red-600 transition-colors">
                            {i + 1}
                          </div>
                          <div className="pt-2">
                            <span className="text-white font-mono text-xs block mb-1 opacity-60">{t.time}</span>
                            <span className="text-gray-400 text-lg italic font-serif group-hover:text-white transition-colors">"{t.event}"</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="lg:col-span-2 space-y-10">
                <div className={`flex items-center gap-6 border-b border-white/5 pb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-gray-500 border border-white/10">
                    <i className="fa-solid fa-users text-xl"></i>
                  </div>
                  <h2 className="text-5xl font-serif font-bold text-white tracking-tight">{t.subjects}</h2>
                </div>
                <div className="space-y-6">
                  {selectedCase.suspects.map(s => {
                    const isInterrogated = currentProgress?.interrogatedSuspectIds.includes(s.id);
                    return (
                      <div 
                        key={s.id} 
                        className={`bg-neutral-900/50 p-8 rounded-[2rem] border transition-all duration-500 flex gap-8 items-center group relative overflow-hidden ${isInterrogated ? 'border-red-600/30 shadow-[inset_0_0_20px_rgba(220,38,38,0.1)]' : 'border-white/5 hover:bg-neutral-900'} ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                      >
                        <div className="relative shrink-0">
                          <img src={s.imageUrl} className={`w-28 h-28 rounded-[1.5rem] object-cover grayscale transition-all duration-700 ${isInterrogated ? 'grayscale-0 scale-105 shadow-2xl' : 'group-hover:grayscale-0'}`} />
                          {isInterrogated && (
                            <div className={`absolute -top-3 ${isRTL ? '-left-3' : '-right-3'} w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-neutral-900 shadow-xl`}>
                               <i className="fa-solid fa-check text-black text-xs"></i>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-white group-hover:text-red-600 transition-colors">{s.name}</h3>
                          <p className="text-[10px] text-red-700 font-black uppercase tracking-widest mb-3">{s.role}</p>
                          <p className="text-sm text-gray-500 italic leading-snug">{s.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className={`flex flex-col sm:flex-row items-center justify-center gap-8 pt-20 border-t border-white/5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => setView('interrogation')} className={`flex items-center gap-6 px-12 py-8 bg-neutral-900/50 border border-white/5 hover:border-red-600/50 rounded-[2rem] transition-all group hover:scale-105 active:scale-95 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <i className="fa-solid fa-microphone-lines text-4xl text-red-700 group-hover:scale-110 transition-transform"></i>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">{t.inquire}</p>
                  <p className="text-2xl font-serif font-bold text-white">{t.interrogationRoom}</p>
                </div>
              </button>
              <button onClick={() => setView('evidence')} className={`flex items-center gap-6 px-12 py-8 bg-neutral-900/50 border border-white/5 hover:border-red-600/50 rounded-[2rem] transition-all group hover:scale-105 active:scale-95 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <i className="fa-solid fa-flask text-4xl text-red-700 group-hover:scale-110 transition-transform"></i>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">{t.analyze}</p>
                  <p className="text-2xl font-serif font-bold text-white">{t.forensicEvidence}</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {selectedCase && view === 'evidence' && (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 animate-fadeIn py-12 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {selectedCase.clues.map(clue => {
              const isFound = currentProgress?.discoveredClueIds.includes(clue.id);
              return (
                <div 
                  key={clue.id} 
                  onClick={() => discoverClue(clue.id)} 
                  className={`bg-neutral-900/40 p-12 rounded-[3rem] border transition-all duration-700 group relative overflow-hidden cursor-pointer flex flex-col items-center text-center ${isFound ? 'border-red-600/30 shadow-[0_0_30px_rgba(220,38,38,0.1)]' : 'border-white/5 grayscale blur-[1px] hover:blur-0'}`}
                >
                  <div className={`absolute ${isRTL ? '-left-8' : '-right-8'} -bottom-8 opacity-5 group-hover:opacity-10 transition-all duration-1000`}>
                    <i className={`fa-solid ${clue.icon} text-[15rem]`}></i>
                  </div>
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all duration-700 ${isFound ? 'bg-red-950/30 text-red-600 border border-red-600/30 group-hover:scale-110' : 'bg-neutral-950 text-gray-800'}`}>
                    <i className={`fa-solid ${clue.icon} text-5xl`}></i>
                  </div>
                  {isFound ? (
                    <div className="space-y-4 relative z-10">
                      <h3 className="text-3xl font-serif font-bold text-white uppercase tracking-tighter">{clue.title}</h3>
                      <p className="text-gray-500 text-lg leading-relaxed italic line-clamp-2">"{clue.description}"</p>
                      <button className="mt-4 px-6 py-2 bg-red-700 text-white rounded-full text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">{t.detailedAnalysis}</button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em]">Unknown Artifact</p>
                      <button className="px-10 py-4 bg-neutral-800 hover:bg-red-700 text-white font-black rounded-2xl text-[10px] uppercase transition-colors">{t.examineRecord}</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedCase && view === 'interrogation' && (
          <div className={`flex flex-col lg:flex-row gap-12 h-[85vh] animate-fadeIn pb-12 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-full lg:w-96 space-y-6 flex flex-col">
              <h3 className={`text-[10px] font-black text-gray-700 uppercase tracking-[0.4em] px-4 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'اختيار الشخص' : 'Subject Selection'}</h3>
              <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pr-2">
                {selectedCase.suspects.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setActiveSuspect(s.id)} 
                    className={`w-full text-left p-8 rounded-[2rem] border transition-all duration-500 flex justify-between items-center group relative overflow-hidden ${activeSuspect === s.id ? 'bg-red-950/20 border-red-600 text-white shadow-[0_15px_40px_rgba(220,38,38,0.15)]' : 'bg-neutral-900 border-white/5 text-gray-500 hover:bg-neutral-800 hover:border-white/10'} ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                  >
                    <div>
                      <div className="text-2xl font-serif font-bold mb-1">{s.name}</div>
                      <div className="text-[9px] uppercase font-black tracking-widest text-red-800 group-hover:text-red-600 transition-colors">{s.role}</div>
                    </div>
                    {currentProgress?.interrogatedSuspectIds.includes(s.id) && <i className="fa-solid fa-microphone text-red-600 text-xs animate-pulse"></i>}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 bg-neutral-900 rounded-[3rem] border border-white/5 flex flex-col overflow-hidden relative shadow-2xl border-glow">
              {!activeSuspect ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-800 bg-black/40 p-12 text-center">
                  <div className="w-32 h-32 bg-neutral-900 rounded-full flex items-center justify-center border border-white/5 mb-8 opacity-20">
                    <i className="fa-solid fa-microphone-slash text-5xl"></i>
                  </div>
                  <p className="text-3xl font-serif italic text-gray-600">{isRTL ? 'اختر شخصاً لبدء الاستجواب...' : 'Select a subject to begin interrogation...'}</p>
                </div>
              ) : (
                <>
                  <div className={`bg-black/60 p-8 border-b border-white/5 flex items-center justify-between backdrop-blur-xl z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center gap-2 px-3 py-1 bg-red-700/10 border border-red-700/50 rounded-full ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-2 h-2 rounded-full bg-red-600 animate-ping"></div>
                        <span className="font-black text-red-600 uppercase text-[9px] tracking-widest">{t.recording}</span>
                      </div>
                      <span className="font-black text-white uppercase text-[10px] tracking-widest ml-4">{selectedCase.suspects.find(s => s.id === activeSuspect)?.name}</span>
                    </div>
                  </div>
                  
                  <div ref={scrollRef} className={`flex-1 overflow-y-auto p-12 space-y-10 scroll-smooth no-scrollbar font-serif ${isRTL ? 'text-right' : ''}`}>
                    {(chatHistory[activeSuspect] || []).map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-8 rounded-[2rem] shadow-2xl relative transition-all ${msg.role === 'user' ? 'bg-white text-black rounded-tr-none' : 'bg-neutral-800 text-gray-300 border border-white/5 rounded-tl-none'} ${isRTL ? 'text-right' : ''}`}>
                          <div className={`absolute -top-3 ${msg.role === 'user' ? 'right-4' : 'left-4'} text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-black text-white rounded shadow-md`}>
                            {msg.role === 'user' ? (isRTL ? 'المحقق' : 'Detective') : (isRTL ? 'المشتبه به' : 'Suspect')}
                          </div>
                          <p className="text-lg leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                        <div className={`bg-neutral-800/50 p-6 rounded-[2rem] ${isRTL ? 'rounded-tr-none' : 'rounded-tl-none'} text-gray-500 flex gap-3 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">{t.processing}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-8 bg-black/60 border-t border-white/5 backdrop-blur-xl">
                    <div className={`flex gap-4 max-w-4xl mx-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <input 
                        type="text" 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                        placeholder={t.addressSuspect} 
                        className={`flex-1 bg-neutral-800/50 border border-white/10 rounded-2xl px-10 py-6 text-white focus:outline-none focus:ring-1 focus:ring-red-700 transition-all text-lg font-serif italic ${isRTL ? 'text-right' : ''}`}
                      />
                      <button 
                        onClick={handleSendMessage} 
                        disabled={isLoading} 
                        className="w-20 h-20 rounded-2xl bg-red-700 hover:bg-red-600 flex items-center justify-center transition-all transform active:scale-90 shadow-2xl disabled:opacity-50"
                      >
                        <i className={`fa-solid ${isRTL ? 'fa-arrow-left' : 'fa-paper-plane'} text-white text-xl`}></i>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {selectedCase && view === 'accusation' && (
          <div className="max-w-4xl mx-auto animate-fadeIn py-12">
            {verdict ? (
              <div className="bg-neutral-900/50 rounded-[4rem] border border-white/10 p-20 space-y-12 text-center shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="space-y-6">
                  <div className="relative inline-block">
                    <div className={`text-[12rem] ${verdict.correct ? 'text-green-500' : 'text-red-700'} animate-fadeIn`}>
                      {verdict.correct ? <i className="fa-solid fa-gavel"></i> : <i className="fa-solid fa-skull-crossbones"></i>}
                    </div>
                    {verdict.correct && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                         <div className="case-closed-stamp animate-stamp">{t.caseResolved}</div>
                      </div>
                    )}
                  </div>
                  <h2 className="text-7xl font-serif font-bold text-white uppercase tracking-tighter">
                    {verdict.correct ? t.caseResolved : t.trialFailed}
                  </h2>
                </div>
                <div className={`max-w-2xl mx-auto text-gray-300 font-serif text-2xl leading-relaxed italic bg-black/60 p-16 rounded-[3rem] border border-white/5 shadow-inner whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>
                  <div className={`text-[10px] font-mono text-red-600 mb-4 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>
                    {verdict.correct ? '>> BEGIN_DECLASSIFICATION_PROTOCOL' : '>> CASE_RECORDS_LOCKED'}
                  </div>
                  {verdict.feedback}
                </div>
                <div className="flex flex-col gap-6 items-center">
                  <button onClick={() => setView('lobby')} className="px-16 py-6 bg-white text-black font-black rounded-2xl hover:bg-gray-200 transition-all uppercase text-[10px] tracking-[0.4em] shadow-2xl">{t.returnToCentral}</button>
                </div>
              </div>
            ) : (
              <div className={`bg-neutral-900/40 p-16 rounded-[4rem] border border-white/5 shadow-2xl space-y-20 backdrop-blur-md ${isRTL ? 'text-right' : ''}`}>
                <div className="text-center space-y-6">
                  <h2 className="text-6xl font-serif font-bold text-white uppercase tracking-tighter">{t.formalAccusation}</h2>
                </div>
                
                <div className="space-y-10">
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {selectedCase.suspects.map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => setActiveSuspect(s.id)} 
                        className={`p-10 rounded-[2.5rem] border transition-all duration-500 text-left relative overflow-hidden group ${activeSuspect === s.id ? 'bg-red-950/20 border-red-600 shadow-2xl' : 'bg-neutral-950 border-white/5 hover:bg-neutral-900'} ${isRTL ? 'text-right' : ''}`}
                      >
                        <div className="font-bold text-3xl text-white group-hover:text-red-600 transition-colors font-serif">{s.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <textarea 
                    id="final-theory" 
                    rows={8} 
                    placeholder={t.theoryPlaceholder} 
                    className={`w-full bg-black/40 border border-white/5 rounded-[3rem] p-12 text-white focus:outline-none focus:ring-1 focus:ring-red-700 transition-all text-2xl font-serif italic shadow-inner ${isRTL ? 'text-right' : ''}`}
                  ></textarea>
                </div>

                <div className="flex justify-center">
                  <button 
                    disabled={!activeSuspect || isLoading} 
                    onClick={() => { 
                      const theory = (document.getElementById('final-theory') as HTMLTextAreaElement).value; 
                      if (activeSuspect) submitAccusation(activeSuspect, theory); 
                    }} 
                    className="w-full max-w-2xl py-8 bg-red-700 text-white font-black rounded-3xl text-3xl hover:bg-red-600 transition-all transform active:scale-95 shadow-[0_20px_80px_rgba(185,28,28,0.3)] uppercase tracking-[0.2em]"
                  >
                    {isLoading ? t.processing : t.deliverVerdict}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/5 p-4 z-40 text-center">
        <div className={`max-w-6xl mx-auto flex justify-between items-center text-[8px] font-mono text-gray-700 uppercase tracking-widest ${isRTL ? 'flex-row-reverse' : ''}`}>
           <span>Database Status: <span className={user.id !== 'local_user' ? 'text-green-600' : 'text-yellow-600'}>{user.id !== 'local_user' ? 'CONNECTED' : 'LOCAL_ONLY'}</span></span>
           {isSyncing && <span className="animate-pulse text-red-600">Syncing Intelligence...</span>}
           <span className="animate-pulse">System Online // Connected to Gemini.V3</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
