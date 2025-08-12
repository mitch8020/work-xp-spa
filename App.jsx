import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, RotateCcw, Save, Download, Upload, Trophy, Target, Swords, Settings, RefreshCcw } from "lucide-react";

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
  const [celebratingLoot, setCelebratingLoot] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [defaultAvailableMinutes, setDefaultAvailableMinutes] = useState(240);
  const [lootRefreshing, setLootRefreshing] = useState(false);
  const [lootError, setLootError] = useState("");

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
      if (parsed.openaiKey) setOpenaiKey(parsed.openaiKey);
      if (parsed.defaultAvailableMinutes) setDefaultAvailableMinutes(parsed.defaultAvailableMinutes);
    } catch (e) {
      console.warn("Failed to load saved state", e);
    }
  }, []);

  useEffect(() => {
    const state = { tasks, dailyGoal, loot, streak, lastReset, autoCarryStreak, openaiKey, defaultAvailableMinutes };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [tasks, dailyGoal, loot, streak, lastReset, autoCarryStreak, openaiKey, defaultAvailableMinutes]);

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

  // --- Loot recommendations (client-side OpenAI) ---
  async function refreshLootFromAI() {
    setLootError("");
    if (!openaiKey) {
      setLootError("Add your OpenAI key in Settings");
      return;
    }
    try {
      setLootRefreshing(true);
      const system = "You recommend motivating reward ideas for personal productivity. Output strictly JSON: {\\\"loot\\\":[{\\\"threshold\\\":number,\\\"label\\\":string}]} with 3-5 items, thresholds ascending and practical for a daily XP system (typical 30..300). Keep labels short and fun.";
      const user = `Current total XP today: ${totalXP}. Daily goal: ${dailyGoal}. Existing rewards: ${loot.map(l=>`${l.threshold}:${l.label}`).join(" | ")}. Suggest fresh rewards and thresholds that unlock progressively.`;
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.4,
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "OpenAI error");
      const content = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content);
      if (!parsed || !Array.isArray(parsed.loot)) throw new Error("Invalid AI response");
      const next = parsed.loot
        .map((x) => ({ threshold: Math.max(5, Math.floor(Number(x.threshold) || 0)), label: String(x.label || "Reward") }))
        .filter((x) => Number.isFinite(x.threshold) && x.label)
        .sort((a, b) => a.threshold - b.threshold)
        .slice(0, 5)
        .map((x, i) => ({ id: crypto.randomUUID(), threshold: x.threshold, label: x.label }));
      if (next.length === 0) throw new Error("No loot returned");
      setLoot(next);
    } catch (e) {
      setLootError(e.message || String(e));
    } finally {
      setLootRefreshing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <header className="mb-6 flex items-center gap-3">
          <Swords className="w-7 h-7 text-indigo-400" />
          <h1 className="text-2xl md:text-3xl font-semibold flex-1">Work XP — Daily Grind</h1>
          <button
            onClick={() => setShowGenerator(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm"
          >
            Generate from To‑Do
          </button>
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5"/>
              <h2 className="text-lg font-semibold">Loot Drops</h2>
            </div>
            <button
              onClick={refreshLootFromAI}
              disabled={lootRefreshing || !openaiKey}
              title={openaiKey ? "Refresh rewards with AI" : "Add your OpenAI key in Settings"}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${openaiKey ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-800/50 text-slate-400 cursor-not-allowed"}`}
            >
              <RefreshCcw className={`w-4 h-4 ${lootRefreshing ? "animate-spin" : ""}`} />
              {lootRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {lootError && <div className="mb-2 text-xs text-red-400">{lootError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {loot.map((l) => {
              const unlocked = totalXP >= l.threshold;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => unlocked && setCelebratingLoot(l)}
                  className={
                    `text-left rounded-xl p-3 border transition-shadow ${
                      unlocked
                        ? "border-emerald-400/50 bg-emerald-500/10 hover:shadow-[0_0_0_3px_rgba(16,185,129,0.25)] cursor-pointer"
                        : "border-slate-800 cursor-not-allowed opacity-80"
                    }`
                  }
                  disabled={!unlocked}
                >
                  <div className="text-sm opacity-80">{l.threshold} XP</div>
                  <div className="text-base font-medium">{l.label}</div>
                  <div className={`mt-2 text-xs ${unlocked ? "text-emerald-300" : "text-slate-400"}`}>
                    {unlocked ? "Unlocked — click to claim" : "Keep grinding"}
                  </div>
                </button>
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
                <div className="text-sm mb-1 opacity-80">OpenAI API key (stored locally)</div>
                <input
                  type="password"
                  className="w-full bg-slate-950 rounded px-2 py-1"
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                <div className="text-[10px] mt-1 text-slate-500">Key is stored in your browser only and sent directly to OpenAI.</div>
              </div>
              <div>
                <div className="text-sm mb-1 opacity-80">Default available minutes per day</div>
                <input
                  type="number"
                  className="w-28 bg-slate-950 rounded px-2 py-1"
                  value={defaultAvailableMinutes}
                  onChange={(e) => setDefaultAvailableMinutes(Math.max(30, Math.min(720, parseInt(e.target.value || 0, 10))))}
                />
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

        <AnimatePresence>
          {celebratingLoot && (
            <CelebrationModal
              loot={celebratingLoot}
              onClose={() => setCelebratingLoot(null)}
            />
          )}
          {showGenerator && (
            <GeneratorModal
              onClose={() => setShowGenerator(false)}
              openaiKey={openaiKey}
              defaultMinutes={defaultAvailableMinutes}
              onGenerateReplace={(itemsOrTasks) => {
                const generated = Array.isArray(itemsOrTasks)
                  ? itemsOrTasks.map((t) => ({ id: crypto.randomUUID(), name: t.name, xp: t.xp, count: 0 }))
                  : generateTasksFromTodo(itemsOrTasks);
                setTasks(generated);
                setShowGenerator(false);
              }}
              onGenerateAppend={(itemsOrTasks) => {
                const generated = Array.isArray(itemsOrTasks)
                  ? itemsOrTasks.map((t) => ({ id: crypto.randomUUID(), name: t.name, xp: t.xp, count: 0 }))
                  : generateTasksFromTodo(itemsOrTasks);
                setTasks(prev => [...prev, ...generated]);
                setShowGenerator(false);
              }}
            />
          )}
        </AnimatePresence>

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

// -------- To‑Do → Tasks generator (rule-based) --------
function generateTasksFromTodo(rawItems) {
  const lines = rawItems
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
  const tasks = [];
  for (const line of lines) {
    const subtasks = breakdownLineToSubtasks(line);
    for (const label of subtasks) {
      const xp = estimateXpForLabel(label);
      tasks.push({ id: crypto.randomUUID(), name: label, xp, count: 0 });
    }
  }
  return tasks;
}

function breakdownLineToSubtasks(line) {
  const basicSplits = line
    .split(/\band\b|;|,|\s->\s|\/|\\|\s\|\s|\s>\s/i)
    .map((s) => s.trim())
    .filter(Boolean);

  // If user wrote explicit separators, use them
  const seeds = basicSplits.length > 1 ? basicSplits : [line];

  const label = seeds.join(" ").toLowerCase();
  const isBug = /(bug|fix|issue|error|crash|defect)/.test(label);
  const isFeature = /(feature|implement|add|build|create)/.test(label);
  const isRefactor = /(refactor|cleanup|restructure|reorganize)/.test(label);
  const isSetup = /(setup|configure|install|init|bootstrap)/.test(label);
  const isResearch = /(research|investigate|spike|explore)/.test(label);

  if (isBug) {
    return [
      `Reproduce: ${line}`,
      `Find root cause: ${line}`,
      `Fix: ${line}`,
      `Verify & tests: ${line}`,
    ];
  }
  if (isFeature) {
    return [
      `Design plan: ${line}`,
      `Implement core: ${line}`,
      `Wire UI/API: ${line}`,
      `Test & polish: ${line}`,
    ];
  }
  if (isRefactor) {
    return [
      `Identify hotspots: ${line}`,
      `Refactor modules: ${line}`,
      `Fix regressions: ${line}`,
      `Run tests & lint: ${line}`,
    ];
  }
  if (isSetup) {
    return [
      `Install & config: ${line}`,
      `Verify locally: ${line}`,
      `Docs/notes: ${line}`,
    ];
  }
  if (isResearch) {
    return [
      `Gather sources: ${line}`,
      `Summarize options: ${line}`,
      `Next steps: ${line}`,
    ];
  }

  // Generic heuristic split for long lines
  if (line.split(/\s+/).length > 8) {
    return [
      `Plan steps: ${line}`,
      `Do core work: ${line}`,
      `Verify & wrap-up: ${line}`,
    ];
  }

  // Fallback to seeds
  return seeds;
}

function estimateXpForLabel(label) {
  const text = label.toLowerCase();
  let score = 1;

  const hardKeywords = [
    "migrate",
    "database",
    "schema",
    "auth",
    "oauth",
    "deploy",
    "kubernetes",
    "integrate",
    "performance",
    "security",
    "webpack",
    "vite",
  ];
  const mediumKeywords = [
    "implement",
    "refactor",
    "optimize",
    "tests",
    "state",
    "api",
    "compose",
    "build",
  ];
  const easyKeywords = ["docs", "typo", "styles", "ui", "copy", "format", "lint"];

  const words = text.split(/\s+/);
  score += Math.min(4, Math.floor(words.length / 5));

  for (const k of hardKeywords) if (text.includes(k)) score += 3;
  for (const k of mediumKeywords) if (text.includes(k)) score += 2;
  for (const k of easyKeywords) if (text.includes(k)) score -= 1;

  // Clamp score 1..8 and map to XP buckets
  score = Math.max(1, Math.min(8, score));
  const buckets = { 1: 5, 2: 8, 3: 10, 4: 12, 5: 15, 6: 18, 7: 20, 8: 25 };
  return buckets[score] || 10;
}

function GeneratorModal({ onClose, onGenerateReplace, onGenerateAppend, openaiKey, defaultMinutes = 240 }) {
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
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "OpenAI error");
      }
      const content = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content);
      if (!parsed || !Array.isArray(parsed.tasks)) throw new Error("Invalid AI response");
      let tasks = parsed.tasks.map((t) => ({
        name: String(t.name || "Task"),
        xp: Math.max(5, Math.min(25, parseInt(t.xp, 10) || 10)),
      }));
      // Trim to fit available minutes
      const minutesForXp = (xp) => xp * 2; // 5xp≈10m, 10xp≈20m, 25xp≈50m
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
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <motion.div
        className="relative z-10 mx-4 w-full max-w-2xl rounded-2xl border border-indigo-400/30 bg-slate-900/90 p-4 shadow-xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">Generate tasks from your to‑do list</h3>
        <p className="mt-1 text-xs text-slate-400">Paste one item per line. We will break them into actionable steps and assign XP. Optionally, generate with AI to fit the available time.</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
          <textarea
            className="w-full h-48 resize-y rounded-xl bg-slate-950 px-3 py-2 outline-none focus:ring focus:ring-indigo-500/30"
            placeholder={"Example:\n- Implement login with OAuth\n- Fix checkout bug when coupon applied\n- Refactor header nav layout"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex md:flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Available minutes</span>
              <input
                type="number"
                className="w-24 bg-slate-950 rounded px-2 py-1"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(30, Math.min(720, parseInt(e.target.value || 0, 10))))}
              />
            </div>
            <button
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading || !text.trim()}
              onClick={async () => {
                const tasks = await callOpenAI();
                if (tasks) onGenerateReplace(tasks);
              }}
            >
              {loading ? "Generating…" : "AI Generate (replace)"}
            </button>
            <button
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading || !text.trim()}
              onClick={async () => {
                const tasks = await callOpenAI();
                if (tasks) onGenerateAppend(tasks);
              }}
            >
              {loading ? "Generating…" : "AI Generate (append)"}
            </button>
          </div>
        </div>
        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
        <div className="mt-3 flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm"
            onClick={() => text.trim() && onGenerateReplace(text)}
          >
            Replace tasks
          </button>
          <button
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-sm"
            onClick={() => text.trim() && onGenerateAppend(text)}
          >
            Append tasks
          </button>
          <button
            className="ml-auto inline-flex items-center gap-2 text-slate-300 hover:text-white px-2 py-2 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CelebrationModal({ loot, onClose }) {
  const pieces = useMemo(() => {
    const colors = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa"];
    const result = [];
    const count = 60;
    for (let i = 0; i < count; i += 1) {
      result.push({
        id: i,
        leftPct: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.2 + Math.random() * 0.9,
        size: 6 + Math.floor(Math.random() * 10),
        color: colors[i % colors.length],
        rotate: Math.random() * 360,
      });
    }
    return result;
  }, [loot?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <motion.div
        className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-emerald-400/30 bg-slate-900/90 p-6 text-center shadow-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
          <Trophy className="h-6 w-6 text-emerald-300" />
        </div>
        <h3 className="text-xl font-semibold">Milestone unlocked!</h3>
        <p className="mt-1 text-sm text-slate-300">{loot.label}</p>
        <p className="mt-2 text-xs text-slate-400">Reached {loot.threshold} XP</p>

        <button
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          onClick={onClose}
        >
          Awesome!
        </button>
      </motion.div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((p) => (
          <motion.div
            key={p.id}
            className="absolute"
            style={{ left: `${p.leftPct}%`, top: "-5%" }}
            initial={{ y: "-10%", rotate: p.rotate, opacity: 0 }}
            animate={{ y: "110%", rotate: p.rotate + 360, opacity: 1 }}
            transition={{ delay: p.delay, duration: p.duration, ease: "easeOut" }}
          >
            <div
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: 2,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.05)",
              }}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
