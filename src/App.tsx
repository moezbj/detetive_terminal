
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './contexts/GameContext';

import Header from './Header';

// Lazy load pages for performance
const Lobby = React.lazy(() => import('./pages/Lobby'));
const Auth = React.lazy(() => import('./pages/Auth'));
const Admin = React.lazy(() => import('./pages/Admin'));
const CaseView = React.lazy(() => import('./pages/CaseView'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Shop = React.lazy(() => import('./pages/Shop'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));

// Error Boundary Component to handle lazy loading failures or runtime crashes
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Critical System Failure:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
          <div className="w-20 h-20 bg-red-950 flex items-center justify-center border border-red-600 rounded-3xl mb-8 shadow-[0_0_30px_rgba(220,38,38,0.3)]">
            <i className="fa-solid fa-triangle-exclamation text-red-600 text-3xl"></i>
          </div>
          <h1 className="text-4xl font-serif font-bold text-white mb-4 uppercase tracking-tighter">Signal Interrupted</h1>
          <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.2em] max-w-md leading-relaxed mb-12">
            The encrypted link to the central database has been compromised. The dossier decryption protocol failed to initialize.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-10 py-4 bg-red-700 hover:bg-red-600 text-white font-black rounded-2xl uppercase tracking-[0.3em] text-[10px] transition-all transform active:scale-95 shadow-2xl"
          >
            Re-initiate Protocol
          </button>
          <div className="mt-8">
            <a href="/" className="text-[9px] text-gray-700 uppercase font-black hover:text-white transition-colors tracking-widest">Abort to Main Terminal</a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <Header />
      <main className="flex-grow">
        <ErrorBoundary>
          <Suspense fallback={
            <div className="h-[70vh] flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-red-900/20 border-t-red-700 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fa-solid fa-fingerprint text-red-700/40 text-xs animate-pulse"></i>
                </div>
              </div>
              <p className="text-red-700 font-mono text-[9px] uppercase tracking-[0.4em] animate-pulse">Decrypting Dossier Segment...</p>
            </div>
          }>
            <Routes>
              <Route path="/" element={<Lobby />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/case/:caseId/*" element={<CaseView />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="bg-black/80 backdrop-blur-xl border-t border-white/5 p-4 text-center">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-[8px] font-mono text-gray-700 uppercase tracking-widest">
           <span>Connected to Gemini.V3 Intelligence System</span>
           <span className="animate-pulse">Active Session Status: NORMAL</span>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <GameProvider>
      <AppContent />
    </GameProvider>
  </BrowserRouter>
);

export default App;
