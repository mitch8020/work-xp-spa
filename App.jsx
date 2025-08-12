import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, RotateCcw, Save, Download, Upload, Trophy, Target, Swords, Settings } from "lucide-react";

// --- Helpers ---
const STORAGE_KEY = "work-xp-spa:v1";
const todayISO = () => new Date().toISOString().slice(0, 10);

const defaultTasks = [
  { id: crypto.randomUUID(), name: "Open laptop & set up environment", xp: 5, count: 0 },
  { id: crypto.randomUUID(), name: "Finish a tiny task (5–10 min)", xp: 10, count: 0 },
  { id: crypto.randomUUID(), name: "Solve a tricky bug", xp: 20, count: 0 },
  { id: crypto.randomUUID(), name: "Push code to repo", xp: 15, count: 0 },
  { id: crypto.randomUUID(), name: "Work uninterrupted for 25 min (Pomodoro)", xp: 10, count: 0 },
  { id: crypto.randomUUID(), name: "Streak bonus (3+ days in a row)", xp: 10, count: 0 },
];

const defaultLoot = [
  { id: 1, threshold: 50, label: "Favorite snack" },
  { id: 2, threshold: 100, label: "Guilt‑free YouTube break" },
  { id: 3, threshold: 200, label: "Nice lunch or game time" },
];

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

export default function App() {
  const [tasks, setTasks] = useState(defaultTasks);
  const [dailyGoal, setDailyGoal] = useState(50);
  const [loot, setLoot] = useState(defaultLoot);
  const [streak, setStreak] = useState(0);
  const [lastReset, setLastReset] = useState(todayISO());
  const [autoCarryStreak, setAutoCarryStreak] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // --- Load / Save ---
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.tasks) setTasks(parsed.tasks);
      if (parsed.dailyGoal) setDailyGoal(parsed.dailyGoal);
      if (parsed.loot) setLoot(parsed.loot);
      if (parsed.streak != null) setStreak(parsed.streak);
      if (parsed.lastReset) setLastReset(parsed.lastReset);
      if (parsed.autoCarryStreak != null) setAutoCarryStreak(parsed.autoCarryStreak);
    } catch (e) {
      console.warn("Failed to load saved state", e);
    }
  }, []);

  useEffect(() => {
    const state = { tasks, dailyGoal, loot, streak, lastReset, autoCarryStreak };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [tasks, dailyGoal, loot, streak, lastReset, autoCarryStreak]);

  // Auto-check for day change to suggest reset
  useEffect(() => {
    const id = setInterval(() => {
      const t = todayISO();
      if (t !== lastReset) {
        // Day rolled over; keep UI subtle, don't force reset
        // Optionally, carry streak if yesterday met goal
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [lastReset]);

  const totalXP = useMemo(
    () => tasks.reduce((sum, t) => sum + t.xp * (t.count || 0), 0),
    [tasks]
  );

  const progress = useMemo(() => {
    const pct = dailyGoal > 0 ? totalXP / dailyGoal : 0;
    return clamp(pct, 0, 1);
  }, [dailyGoal, totalXP]);

  // --- Task Ops ---
  const inc = (id) => setTasks(ts => ts.map(t => t.id === id ? { ...t, count: (t.count || 0) + 1 } : t));
  const dec = (id) => setTasks(ts => ts.map(t => t.id === id ? { ...t, count: clamp((t.count || 0) - 1, 0, 999) } : t));
  const updateTask = (id, patch) => setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  const deleteTask = (id) => setTasks(ts => ts.filter(t => t.id !== id));

  const addTask = () => {
    setTasks(ts => [
      ...ts,
      { id: crypto.randomUUID(), name: "New task", xp: 5, count: 0 },
    ]);
  };

  // --- Reset Day (with streak logic) ---
  const resetDay = () => {
    const metGoal = totalXP >= dailyGoal && dailyGoal > 0;
    const confirmText = metGoal
      ? "Reset day and increment streak? (You met your goal!)"
      : "Reset day? (Today's progress will be cleared)";
    if (!confirm(confirmText)) return;

    setTasks(ts => ts.map(t => ({ ...t, count: 0 })));
    setLastReset(todayISO());
    if (autoCarryStreak) {
      setStreak(s => (metGoal ? s + 1 : 0));
    }
  };

  // --- Export / Import ---
  const exportJSON = () => {
    const data = { tasks, dailyGoal, loot, streak, lastReset, autoCarryStreak };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-xp-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.tasks) setTasks(data.tasks);
        if (data.dailyGoal != null) setDailyGoal(data.dailyGoal);
        if (data.loot) setLoot(data.loot);
        if (data.streak != null) setStreak(data.streak);
        if (data.lastReset) setLastReset(data.lastReset);
        if (data.autoCarryStreak != null) setAutoCarryStreak(data.autoCarryStreak);
      } catch (e) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <header className="mb-6 flex items-center gap-3">
          <Swords className="w-7 h-7 text-indigo-400" />
          <h1 className="text-2xl md:text-3xl font-semibold">Work XP — Daily Grind</h1>
        </header>

        {/* Top cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5" />
              <div className="text-sm opacity-80">Daily Goal</div>
            </div>
            <input
              type="number"
              className="mt-2 w-full bg-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:ring focus:ring-indigo-500/40"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(clamp(parseInt(e.target.value || 0, 10), 0, 100000))}
            />
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5" />
              <div className="text-sm opacity-80">Current Total</div>
            </div>
            <div className="mt-2 text-2xl font-semibold">{totalXP} XP</div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <img alt="streak" className="w-5 h-5" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='white'><path d='M13 3a9 9 0 0 1 9 9c0 3.12-1.6 5.85-4.02 7.43.44-1.07.68-2.23.68-3.43A8.01 8.01 0 0 0 5.47 8.47 9 9 0 0 1 13 3z'/></svg>" />
              <div className="text-sm opacity-80">Streak</div>
            </div>
            <div className="mt-2 text-2xl font-semibold">{streak} days</div>
          </Card>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <div className="text-sm opacity-80">Progress</div>
            <div className="text-sm opacity-80">{Math.round(progress * 100)}%</div>
          </div>
          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        {/* Tasks Table */}
        <div className="bg-slate-900/60 rounded-2xl shadow p-3 md:p-4 mb-6">
          <div className="grid grid-cols-12 gap-3 px-2 py-2 text-xs uppercase tracking-wide text-slate-400">
            <div className="col-span-6">Task</div>
            <div className="col-span-2 text-center">XP</div>
            <div className="col-span-2 text-center">Times</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          <div className="divide-y divide-slate-800/80">
            {tasks.map((t) => (
              <div key={t.id} className="grid grid-cols-12 gap-3 items-center px-2 py-3">
                <input
                  className="col-span-6 bg-transparent outline-none rounded focus:ring focus:ring-indigo-500/30 px-2 py-1"
                  value={t.name}
                  onChange={(e) => updateTask(t.id, { name: e.target.value })}
                />
                <input
                  type="number"
                  className="col-span-2 bg-slate-950 rounded px-2 py-1 text-center"
                  value={t.xp}
                  onChange={(e) => updateTask(t.id, { xp: clamp(parseInt(e.target.value || 0, 10), 0, 100000) })}
                />

                <div className="col-span-2 flex items-center justify-center gap-2">
                  <button onClick={() => dec(t.id)} className="p-1 rounded bg-slate-800 hover:bg-slate-700"><Minus className="w-4 h-4"/></button>
                  <div className="min-w-[2ch] text-center">{t.count || 0}</div>
                  <button onClick={() => inc(t.id)} className="p-1 rounded bg-slate-800 hover:bg-slate-700"><Plus className="w-4 h-4"/></button>
                </div>

                <div className="col-span-2 text-right font-medium">{t.xp * (t.count || 0)} XP</div>

                <div className="col-span-12 flex justify-end mt-2">
                  <button className="text-xs text-slate-400 hover:text-red-400" onClick={() => deleteTask(t.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3">
            <button onClick={addTask} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm">
              <Plus className="w-4 h-4"/> Add Task
            </button>
            <div className="text-sm opacity-80 pr-1">Daily Total: <span className="font-semibold">{totalXP} XP</span></div>
          </div>
        </div>

        {/* Loot / Rewards */}
        <div className="bg-slate-900/60 rounded-2xl shadow p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5"/>
            <h2 className="text-lg font-semibold">Loot Drops</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {loot.map((l) => {
              const unlocked = totalXP >= l.threshold;
              return (
                <div key={l.id} className={`rounded-xl p-3 border ${unlocked ? "border-emerald-400/50 bg-emerald-500/10" : "border-slate-800"}`}>
                  <div className="text-sm opacity-80">{l.threshold} XP</div>
                  <div className="text-base font-medium">{l.label}</div>
                  <div className={`mt-2 text-xs ${unlocked ? "text-emerald-300" : "text-slate-400"}`}>
                    {unlocked ? "Unlocked — claim it!" : "Keep grinding"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={resetDay} className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl">
            <RotateCcw className="w-4 h-4"/> Reset Day
          </button>

          <label className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl cursor-pointer">
            <Upload className="w-4 h-4"/> Import
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
          </label>

          <button onClick={exportJSON} className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl">
            <Download className="w-4 h-4"/> Export
          </button>

          <button onClick={() => setShowSettings(s => !s)} className="ml-auto inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl">
            <Settings className="w-4 h-4"/> Settings
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 bg-slate-900/80 rounded-2xl p-4">
            <h3 className="text-lg font-semibold mb-3">Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm mb-1 opacity-80">Auto streak (reset to 0 on missed goal)</div>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={autoCarryStreak} onChange={(e) => setAutoCarryStreak(e.target.checked)} />
                  <span className="text-sm">Enabled</span>
                </label>
              </div>
              <div>
                <div className="text-sm mb-1 opacity-80">Edit loot drops</div>
                <div className="space-y-2">
                  {loot.map((l, i) => (
                    <div key={l.id} className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-24 bg-slate-950 rounded px-2 py-1"
                        value={l.threshold}
                        onChange={(e) => {
                          const v = clamp(parseInt(e.target.value || 0, 10), 0, 100000);
                          setLoot(prev => prev.map(x => x.id === l.id ? { ...x, threshold: v } : x));
                        }}
                      />
                      <input
                        className="flex-1 bg-slate-950 rounded px-2 py-1"
                        value={l.label}
                        onChange={(e) => setLoot(prev => prev.map(x => x.id === l.id ? { ...x, label: e.target.value } : x))}
                      />
                      <button className="text-xs text-slate-400 hover:text-red-400" onClick={() => setLoot(prev => prev.filter(x => x.id !== l.id))}>Delete</button>
                    </div>
                  ))}
                  <button
                    onClick={() => setLoot(prev => [...prev, { id: crypto.randomUUID(), threshold: 150, label: "Your reward" }])}
                    className="text-sm text-indigo-300 hover:text-indigo-200"
                  >+ Add reward</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8 text-center text-xs text-slate-500">
          Built for momentum, not perfection. Reset tomorrow and keep the streak alive.
        </footer>
      </div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="bg-slate-900/60 rounded-2xl shadow p-4 border border-slate-800/60">
      {children}
    </div>
  );
}
