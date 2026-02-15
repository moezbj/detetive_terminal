/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../hooks/useGame";
import { createCase } from "../../supabaseService";
import type { CrimeCase } from "../types";

const Admin: React.FC = () => {
  const { user } = useGame();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const [newCase, setNewCase] = useState<CrimeCase>({
    id: "",
    title: "",
    subtitle: "",
    teaser: "",
    difficulty: "Medium",
    backgroundImage: "",
    victim: "",
    description: "",
    suspects: [],
    clues: [],
    timeline: [],
    killerId: "",
    solutionSecret: "",
    accessLevel: "Free",
  });

  if (!user?.isAdmin)
    return (
      <div className="h-screen flex items-center justify-center text-red-600 font-mono">
        ACCESS_DENIED: INSUFFICIENT_CLEARANCE
      </div>
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await createCase(newCase);
    if (error) {
      alert(error.message);
    } else {
      alert("CASE_DEPLOYED: Successfully transmitted to central database.");
      navigate("/");
    }
    setIsLoading(false);
  };

  const addSuspect = () => {
    setNewCase((prev) => ({
      ...prev,
      suspects: [
        ...prev.suspects,
        {
          id: "",
          name: "",
          role: "",
          description: "",
          motive: "",
          alibi: "",
          imageUrl: "",
        },
      ],
    }));
  };

  const addClue = () => {
    setNewCase((prev) => ({
      ...prev,
      clues: [
        ...prev.clues,
        { id: "", title: "", description: "", icon: "fa-magnifying-glass" },
      ],
    }));
  };

  const addTimeline = () => {
    setNewCase((prev) => ({
      ...prev,
      timeline: [...prev.timeline, { time: "", event: "" }],
    }));
  };

  /*   const addClue = () => {
    setNewCase(prev => ({
      ...prev,
      clues: [...prev.clues, { id: '', title: '', description: '', icon: 'fa-magnifying-glass' }]
    }));
  };

  const addTimeline = () => {
    setNewCase(prev => ({
      ...prev,
      timeline: [...prev.timeline, { time: '', event: '' }]
    }));
  }; */

  return (
    <div className="max-w-4xl mx-auto p-12 space-y-12 animate-fadeIn pb-32">
      <div className="text-center space-y-4">
        <div className="inline-block px-4 py-1 border border-red-950 bg-red-950/20 rounded-full text-red-600 text-[10px] font-black uppercase tracking-[0.3em]">
          Operator Authority
        </div>
        <h2 className="text-5xl font-serif font-bold text-white tracking-tighter uppercase">
          Dossier Management
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-10 bg-neutral-900/50 p-8 md:p-12 rounded-[3rem] border border-white/5 shadow-2xl"
      >
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              Case ID (unique slug)
            </label>
            <input
              className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white font-mono text-xs focus:ring-1 focus:ring-red-600 outline-none"
              required
              value={newCase.id}
              onChange={(e) => setNewCase({ ...newCase, id: e.target.value })}
              placeholder="mystery-slug"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              Title
            </label>
            <input
              className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white font-mono text-xs focus:ring-1 focus:ring-red-600 outline-none"
              required
              value={newCase.title}
              onChange={(e) =>
                setNewCase({ ...newCase, title: e.target.value })
              }
              placeholder="The Nightshade Incident"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              Subtitle
            </label>
            <input
              className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white font-mono text-xs focus:ring-1 focus:ring-red-600 outline-none"
              required
              value={newCase.subtitle}
              onChange={(e) =>
                setNewCase({ ...newCase, subtitle: e.target.value })
              }
              placeholder="A chilling tale of betrayal"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              Background Image URL
            </label>
            <input
              className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white font-mono text-xs focus:ring-1 focus:ring-red-600 outline-none"
              required
              value={newCase.backgroundImage}
              onChange={(e) =>
                setNewCase({ ...newCase, backgroundImage: e.target.value })
              }
              placeholder="https://images.unsplash.com/photo..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
            Teaser Quote
          </label>
          <input
            className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white font-serif italic text-lg focus:ring-1 focus:ring-red-600 outline-none"
            required
            value={newCase.teaser}
            onChange={(e) => setNewCase({ ...newCase, teaser: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              Difficulty
            </label>
            <select
              className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white font-mono text-xs"
              value={newCase.difficulty}
              onChange={(e) =>
                setNewCase({ ...newCase, difficulty: e.target.value as any })
              }
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              Access
            </label>
            <select
              className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white font-mono text-xs"
              value={newCase.accessLevel}
              onChange={(e) =>
                setNewCase({ ...newCase, accessLevel: e.target.value as any })
              }
            >
              <option>Free</option>
              <option>Premium</option>
              <option>Expert</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              Victim
            </label>
            <input
              className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white font-mono text-xs focus:ring-1 focus:ring-red-600 outline-none"
              required
              value={newCase.victim}
              onChange={(e) =>
                setNewCase({ ...newCase, victim: e.target.value })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
            Full Description
          </label>
          <textarea
            rows={6}
            className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white font-serif text-lg focus:ring-1 focus:ring-red-600 outline-none"
            required
            value={newCase.description}
            onChange={(e) =>
              setNewCase({ ...newCase, description: e.target.value })
            }
          ></textarea>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              Killer ID (Suspect ID)
            </label>
            <input
              className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white font-mono text-xs focus:ring-1 focus:ring-red-600 outline-none"
              required
              value={newCase.killerId}
              onChange={(e) =>
                setNewCase({ ...newCase, killerId: e.target.value })
              }
              placeholder="marcus"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              Solution Secret
            </label>
            <textarea
              rows={3}
              className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white font-serif text-lg focus:ring-1 focus:ring-red-600 outline-none"
              required
              value={newCase.solutionSecret}
              onChange={(e) =>
                setNewCase({ ...newCase, solutionSecret: e.target.value })
              }
              placeholder="Detailed explanation of how the crime was solved..."
            ></textarea>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest">
              Suspects
            </h4>
            <button
              type="button"
              onClick={addSuspect}
              className="text-[10px] font-black text-white bg-white/5 border border-white/10 px-4 py-2 rounded"
            >
              + Add
            </button>
          </div>
          {newCase.suspects.map((s, i) => (
            <div
              key={i}
              className="p-6 bg-black/40 border border-white/5 rounded-2xl space-y-4"
            >
              <input
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Suspect ID"
                value={s.id}
                onChange={(e) => {
                  const u = [...newCase.suspects];
                  u[i].id = e.target.value;
                  setNewCase({ ...newCase, suspects: u });
                }}
              />

              <input
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Full Name"
                value={s.name}
                onChange={(e) => {
                  const u = [...newCase.suspects];
                  u[i].name = e.target.value;
                  setNewCase({ ...newCase, suspects: u });
                }}
              />
              <input
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Role"
                value={s.role}
                onChange={(e) => {
                  const u = [...newCase.suspects];
                  u[i].role = e.target.value;
                  setNewCase({ ...newCase, suspects: u });
                }}
              />
              <textarea
                rows={2}
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Description"
                value={s.description}
                onChange={(e) => {
                  const u = [...newCase.suspects];
                  u[i].description = e.target.value;
                  setNewCase({ ...newCase, suspects: u });
                }}
              />
              <input
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Motive"
                value={s.motive}
                onChange={(e) => {
                  const u = [...newCase.suspects];
                  u[i].motive = e.target.value;
                  setNewCase({ ...newCase, suspects: u });
                }}
              />
              <input
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Alibi"
                value={s.alibi}
                onChange={(e) => {
                  const u = [...newCase.suspects];
                  u[i].alibi = e.target.value;
                  setNewCase({ ...newCase, suspects: u });
                }}
              />
              <input
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Image URL"
                value={s.imageUrl}
                onChange={(e) => {
                  const u = [...newCase.suspects];
                  u[i].imageUrl = e.target.value;
                  setNewCase({ ...newCase, suspects: u });
                }}
              />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest">
              Clues
            </h4>
            <button
              type="button"
              onClick={addClue}
              className="text-[10px] font-black text-white bg-white/5 border border-white/10 px-4 py-2 rounded"
            >
              + Add
            </button>
          </div>
          {newCase.clues.map((c, i) => (
            <div
              key={i}
              className="p-6 bg-black/40 border border-white/5 rounded-2xl space-y-4"
            >
              <input
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Clue ID"
                value={c.id}
                onChange={(e) => {
                  const u = [...newCase.clues];
                  u[i].id = e.target.value;
                  setNewCase({ ...newCase, clues: u });
                }}
              />
              <input
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Title"
                value={c.title}
                onChange={(e) => {
                  const u = [...newCase.clues];
                  u[i].title = e.target.value;
                  setNewCase({ ...newCase, clues: u });
                }}
              />
              <textarea
                rows={2}
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Description"
                value={c.description}
                onChange={(e) => {
                  const u = [...newCase.clues];
                  u[i].description = e.target.value;
                  setNewCase({ ...newCase, clues: u });
                }}
              />
              <input
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Icon (e.g., fa-magnifying-glass)"
                value={c.icon}
                onChange={(e) => {
                  const u = [...newCase.clues];
                  u[i].icon = e.target.value;
                  setNewCase({ ...newCase, clues: u });
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const u = [...newCase.clues];
                  u.splice(i, 1);
                  setNewCase({ ...newCase, clues: u });
                }}
                className="text-[10px] font-black text-red-600 bg-red-950/20 border border-red-950 px-4 py-2 rounded"
              >
                Remove Clue
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest">
              Timeline
            </h4>
            <button
              type="button"
              onClick={addTimeline}
              className="text-[10px] font-black text-white bg-white/5 border border-white/10 px-4 py-2 rounded"
            >
              + Add
            </button>
          </div>
          {newCase.timeline.map((t, i) => (
            <div
              key={i}
              className="p-6 bg-black/40 border border-white/5 rounded-2xl space-y-4"
            >
              <input
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Time (e.g., 10:00 PM)"
                value={t.time}
                onChange={(e) => {
                  const u = [...newCase.timeline];
                  u[i].time = e.target.value;
                  setNewCase({ ...newCase, timeline: u });
                }}
              />
              <textarea
                rows={2}
                className="w-full bg-transparent border-b border-white/10 py-2 outline-none text-white text-xs"
                placeholder="Event Description"
                value={t.event}
                onChange={(e) => {
                  const u = [...newCase.timeline];
                  u[i].event = e.target.value;
                  setNewCase({ ...newCase, timeline: u });
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const u = [...newCase.timeline];
                  u.splice(i, 1);
                  setNewCase({ ...newCase, timeline: u });
                }}
                className="text-[10px] font-black text-red-600 bg-red-950/20 border border-red-950 px-4 py-2 rounded"
              >
                Remove Event
              </button>
            </div>
          ))}
        </div>

        <button
          disabled={isLoading}
          className="w-full py-6 bg-red-700 text-white font-black text-[10px] uppercase tracking-[0.5em] rounded-2xl hover:bg-red-600 transition-all shadow-2xl"
        >
          {isLoading ? "Transmitting..." : "Authorize Case Deployment"}
        </button>
      </form>
    </div>
  );
};

export default Admin;
