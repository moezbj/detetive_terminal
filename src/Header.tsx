import React from "react";
import { Link } from "react-router-dom";
import { useGame } from "./hooks/useGame";
import { UI_TEXT } from "../translations";

const Header: React.FC = () => {
  const { user, lang, setLang, logout } = useGame();
  const t = UI_TEXT[lang];
  const isRTL = lang === "ar";
console.log('ud',  user)
  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 shadow-2xl">
      <div
        className={`max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <div
          className={`flex items-center gap-6 ${isRTL ? "flex-row-reverse" : ""}`}
        >
          <Link
            to="/"
            className={`flex items-center gap-2 group ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <div className="w-8 h-8 bg-red-950 flex items-center justify-center border border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]">
              <i className="fa-solid fa-terminal text-red-600 text-xs"></i>
            </div>
            <h1 className="text-xl font-mono font-bold text-red-600 tracking-tighter uppercase hidden sm:block">
              {t.terminal}
              <span className="animate-pulse">_</span>
            </h1>
          </Link>

          <Link
            to="/shop"
            className={`flex items-center gap-3 bg-neutral-900/50 px-4 py-1.5 rounded-full border border-white/10 hover:bg-neutral-800 transition-all ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <i className="fa-solid fa-database text-yellow-500 text-xs"></i>
            <span className="text-xs font-mono text-yellow-500 font-bold">
              {user?.stats?.totalPoints.toLocaleString()}{" "}
              <span className="text-gray-600 ml-1">{t.intel}</span>
            </span>
          </Link>

          <div
            className={`flex gap-2 bg-neutral-900/40 p-1 rounded-lg border border-white/5 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            {["en", "fr", "ar"].map((l) => (
               
              <button
                key={l}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => setLang(l as any)}
                className={`w-6 h-6 text-[8px] font-black rounded uppercase transition-all ${lang === l ? "bg-red-700 text-white shadow-lg" : "text-gray-600 hover:text-gray-400"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`flex gap-4 items-center ${isRTL ? "flex-row-reverse" : ""}`}
        >
          {user?.isAdmin && (
            <Link
              to="/admin"
              title="Admin Panel"
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
            >
              <i className="fa-solid fa-folder-tree"></i>
            </Link>
          )}
          <Link
            to="/leaderboard"
            title="Leaderboard"
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
          >
            <i className="fa-solid fa-ranking-star"></i>
          </Link>
          <Link
            to="/profile"
            title="Profile"
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
          >
            <i className="fa-solid fa-user-secret"></i>
          </Link>
          {user?.id === "local_user" ? (
            <button
              onClick={logout}
              className="px-4 py-1.5 bg-neutral-900 border border-white/10 text-gray-500 rounded font-black text-[10px] uppercase"
            >
              {t.logout}
            </button>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-1.5 bg-red-700 text-white rounded font-black text-[10px] uppercase"
            >
              <i
                className={`fa-solid fa-cloud-arrow-up ${isRTL ? "ml-2" : "mr-2"}`}
              ></i>{" "}
              {t.sync}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;
