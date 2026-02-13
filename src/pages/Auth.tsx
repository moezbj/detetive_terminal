
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from "../hooks/useGame";
import { supabase, getProfile } from '../../supabaseService';

const Auth: React.FC = () => {
  const [authForm, setAuthForm] = useState({ email: '', password: '', isLogin: true });
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useGame();
  const navigate = useNavigate();

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
            isAdmin: cloudProfile.data.role === 'admin' || !!cloudProfile.data.is_admin,
            stats: cloudProfile.data.full_stats
          });
          navigate(cloudProfile.data.role === 'admin' ? '/admin' : '/');
        } else {
          // New user logic
          navigate('/');
        }
      } else {
        alert(result.error?.message || "Auth Error");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-12 bg-neutral-900 border border-white/5 rounded-[2rem] shadow-2xl">
        <h2 className="text-4xl font-serif font-bold text-white text-center mb-8">Access Terminal</h2>
        <form onSubmit={handleAuth} className="space-y-6">
          <input className="w-full bg-black p-4 rounded-xl text-white font-mono text-sm" placeholder="EMAIL" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} />
          <input className="w-full bg-black p-4 rounded-xl text-white font-mono text-sm" type="password" placeholder="PASSWORD" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button className="w-full py-4 bg-red-700 text-white font-black rounded-xl uppercase tracking-widest">{isLoading ? 'Validating...' : (authForm.isLogin ? 'Login' : 'Join Bureau')}</button>
        </form>
        <button onClick={() => setAuthForm({...authForm, isLogin: !authForm.isLogin})} className="w-full mt-4 text-[10px] text-gray-500 uppercase font-black">{authForm.isLogin ? 'Need clearance? Register' : 'Existing agent? Login'}</button>
      </div>
    </div>
  );
};

export default Auth;
