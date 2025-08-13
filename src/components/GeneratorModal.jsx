import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, ListChecks, Plus } from "lucide-react";
import { fetchOpenAIChat } from "../helpers.jsx";

export default function GeneratorModal({ onClose, onGenerateReplace, onGenerateAppend, openaiKey, defaultMinutes = 240 }) {
  const [text, setText] = useState("");
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function callOpenAI() {
    setError("");
    if (!openaiKey) {
      setError("OpenAI API key missing (set it in Settings)");
      return null;
    }
    try {
      setLoading(true);
      const system = "You are a productivity assistant. Break down a user's to-do list into small, actionable tasks that can be completed today within the available time. Assign an XP value per task in the 5..25 range depending on difficulty. Prefer 10-30 minute tasks. Return strictly valid JSON for {\\\"tasks\\\": [{\\\"name\\\": string, \\\"xp\\\": number}]} with no extra commentary.";
      const user = `Available minutes today: ${minutes}\nTo-do list (one per line):\n${text}`;
      const data = await fetchOpenAIChat(openaiKey, {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });
      const content = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content);
      if (!parsed || !Array.isArray(parsed.tasks)) throw new Error("Invalid AI response");
      let tasks = parsed.tasks.map((t) => ({
        name: String(t.name || "Task"),
        xp: Math.max(5, Math.min(25, parseInt(t.xp, 10) || 10)),
      }));
      const minutesForXp = (xp) => xp * 2;
      let used = 0;
      tasks = tasks.filter((t) => {
        const m = minutesForXp(t.xp);
        if (used + m <= minutes) {
          used += m;
          return true;
        }
        return false;
      });
      return tasks;
    } catch (e) {
      setError(e.message || String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <motion.div className="relative z-10 mx-4 w-full max-w-2xl rounded-2xl border border-indigo-400/30 bg-slate-900/90 p-4 shadow-xl" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 22 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Generate tasks from your to‑do list</h3>
          <button className="text-slate-400 hover:text-white" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">Paste one item per line. We’ll break them down and size to your time.</p>
        <div className="mt-2 space-y-2">
          <textarea className="w-full h-40 md:h-48 resize-y rounded-xl bg-slate-950 px-2.5 py-2 text-sm outline-none focus:ring focus:ring-indigo-500/30" placeholder={"Example:\n- Implement login with OAuth\n- Fix checkout bug when coupon applied\n- Refactor header nav layout"} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
            <div className="w-full md:w-auto flex items-center gap-2 justify-center md:justify-start text-xs text-slate-400">
              <span>Minutes</span>
              <button
                type="button"
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => setMinutes((v) => Math.max(30, (parseInt(v, 10) || 0) - 30))}
                disabled={minutes <= 30}
                title="-30 min"
              >
                −
              </button>
              <input
                type="number"
                className="w-20 bg-slate-950 rounded px-2 py-1 text-xs text-center"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(30, Math.min(720, parseInt(e.target.value || 0, 10))))}
              />
              <button
                type="button"
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => setMinutes((v) => Math.min(720, (parseInt(v, 10) || 0) + 30))}
                disabled={minutes >= 720}
                title="+30 min"
              >
                +
              </button>
            </div>
            <div className="w-full md:w-auto flex justify-center md:justify-end gap-2 md:ml-auto">
              <button className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-60 disabled:cursor-not-allowed" disabled={loading || !text.trim()} onClick={async () => { const tasks = await callOpenAI(); if (tasks) onGenerateReplace(tasks); }} title="AI Replace">
                <ListChecks className="w-3.5 h-3.5" />
                {loading ? "Generating…" : "AI Replace"}
              </button>
              <button className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-60 disabled:cursor-not-allowed" disabled={loading || !text.trim()} onClick={async () => { const tasks = await callOpenAI(); if (tasks) onGenerateAppend(tasks); }} title="AI Append">
                <Plus className="w-3.5 h-3.5" />
                {loading ? "Generating…" : "AI Append"}
              </button>
            </div>
          </div>
        </div>
        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
        <div className="mt-2 flex items-center gap-2 justify-center md:justify-start">
          <button className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg text-xs" onClick={() => text.trim() && onGenerateReplace(text)}>
            <ListChecks className="w-3.5 h-3.5" /> Replace
          </button>
          <button className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1.5 rounded-lg text-xs" onClick={() => text.trim() && onGenerateAppend(text)}>
            <Plus className="w-3.5 h-3.5" /> Append
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


