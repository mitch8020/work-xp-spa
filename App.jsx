import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, RotateCcw, Save, Download, Upload, Trophy, Target, Swords, Settings, RefreshCcw, Info, Trash2, Circle, ListChecks, Eye, EyeOff, X, Loader2, Sparkles, Edit3 } from "lucide-react";

// --- Helpers ---
const STORAGE_KEY = "work-xp-spa:v1";
const todayISO = () => new Date().toISOString().slice(0, 10);

const defaultTasks = [
  { id: crypto.randomUUID(), name: "Open laptop & set up environment", xp: 5, completed: false },
  { id: crypto.randomUUID(), name: "Finish a tiny task (5–10 min)", xp: 10, completed: false },
  { id: crypto.randomUUID(), name: "Solve a tricky bug", xp: 20, completed: false },
  { id: crypto.randomUUID(), name: "Push code to repo", xp: 15, completed: false },
  { id: crypto.randomUUID(), name: "Work uninterrupted for 25 min (Pomodoro)", xp: 10, completed: false },
  { id: crypto.randomUUID(), name: "Streak bonus (3+ days in a row)", xp: 10, completed: false },
];

const defaultLoot = [
  { id: 1, threshold: 15, label: "Favorite snack", description: longDescription("Favorite snack", 15), claimed: false },
  { id: 2, threshold: 40, label: "Guilt‑free YouTube break", description: longDescription("Guilt‑free YouTube break", 40), claimed: false },
  { id: 3, threshold: 70, label: "Nice lunch or game time", description: longDescription("Nice lunch or game time", 70), claimed: false },
];

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const resolveOpenAIKey = (key) => (key === "hush_hush" ? import.meta.env.VITE_OPENAI_API_KEY : key);

async function fetchOpenAIChat(apiKey, {
  model,
  messages,
  temperature = 0.2,
  response_format = { type: "json_object" },
}) {
  const key = resolveOpenAIKey(apiKey);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, temperature, response_format }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "OpenAI error");
  }
  return data;
}

export default function App() {
  const [tasks, setTasks] = useState(defaultTasks);
  const [dailyGoal, setDailyGoal] = useState(100);
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
  const [lifetimeXP, setLifetimeXP] = useState(0);
  const [pointsSpent, setPointsSpent] = useState(0);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [profileAnswers, setProfileAnswers] = useState(null);
  const [openLootInfoId, setOpenLootInfoId] = useState(null);
  const [dailyEarnedXP, setDailyEarnedXP] = useState(0);
  const [lootVersion, setLootVersion] = useState(0);
  const [showLootEditor, setShowLootEditor] = useState(false);

  // --- Load / Save ---
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.tasks) setTasks(parsed.tasks);
      if (parsed.dailyGoal) setDailyGoal(parsed.dailyGoal);
      if (parsed.loot) setLoot(parsed.loot.map((l) => ({ claimed: false, description: l.description || defaultDescription(l.label, l.threshold), ...l })));
      if (parsed.streak != null) setStreak(parsed.streak);
      if (parsed.lastReset) setLastReset(parsed.lastReset);
      if (parsed.autoCarryStreak != null) setAutoCarryStreak(parsed.autoCarryStreak);
      if (parsed.openaiKey) setOpenaiKey(parsed.openaiKey);
      if (parsed.defaultAvailableMinutes) setDefaultAvailableMinutes(parsed.defaultAvailableMinutes);
      if (parsed.lifetimeXP != null) setLifetimeXP(parsed.lifetimeXP);
      if (parsed.pointsSpent != null) setPointsSpent(parsed.pointsSpent);
      if (parsed.profileAnswers) setProfileAnswers(parsed.profileAnswers);
      if (parsed.dailyEarnedXP != null) setDailyEarnedXP(parsed.dailyEarnedXP);
    } catch (e) {
      console.warn("Failed to load saved state", e);
    }
  }, []);

  useEffect(() => {
    const state = { tasks, dailyGoal, loot, streak, lastReset, autoCarryStreak, openaiKey, defaultAvailableMinutes, lifetimeXP, pointsSpent, dailyEarnedXP, profileAnswers };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [tasks, dailyGoal, loot, streak, lastReset, autoCarryStreak, openaiKey, defaultAvailableMinutes, lifetimeXP, pointsSpent, dailyEarnedXP, profileAnswers]);

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
    () => dailyEarnedXP + tasks.reduce((sum, t) => sum + (t.completed ? (t.xp || 0) : 0), 0),
    [tasks, dailyEarnedXP]
  );

  const availablePoints = Math.max(0, lifetimeXP - pointsSpent);

  const progress = useMemo(() => {
    const pct = dailyGoal > 0 ? totalXP / dailyGoal : 0;
    return clamp(pct, 0, 1);
  }, [dailyGoal, totalXP]);

  // --- Task Ops ---
  const completeTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const xp = Math.max(0, Number(task.xp) || 0);
    setLifetimeXP((v) => v + xp);
    setDailyEarnedXP((v) => v + xp);
    // Remove from list to animate out
    setTasks((ts) => ts.filter((t) => t.id !== id));
  };
  const updateTask = (id, patch) => setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  const deleteTask = (id) => setTasks(ts => ts.filter(t => t.id !== id));

  const addTask = () => {
    setTasks(ts => [
      ...ts,
      { id: crypto.randomUUID(), name: "New task", xp: 5, completed: false },
    ]);
  };

  // --- Reset Day (with streak logic) ---
  const resetDay = () => {
    const metGoal = totalXP >= dailyGoal && dailyGoal > 0;
    const confirmText = metGoal
      ? "Reset day and increment streak? (You met your goal!)"
      : "Reset day? (Today's progress will be cleared)";
    if (!confirm(confirmText)) return;

    setTasks(ts => ts.map(t => ({ ...t, completed: false })));
    setDailyEarnedXP(0);
    setLastReset(todayISO());
    if (autoCarryStreak) {
      setStreak(s => (metGoal ? s + 1 : 0));
    }
  };

  // --- Export / Import ---
  const exportJSON = () => {
    const data = { tasks, dailyGoal, loot, streak, lastReset, autoCarryStreak, lifetimeXP, pointsSpent, dailyEarnedXP };
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
         if (data.loot) setLoot(data.loot.map((l) => ({ claimed: false, description: l.description || defaultDescription(l.label, l.threshold), ...l })));
        if (data.streak != null) setStreak(data.streak);
        if (data.lastReset) setLastReset(data.lastReset);
        if (data.autoCarryStreak != null) setAutoCarryStreak(data.autoCarryStreak);
         if (data.lifetimeXP != null) setLifetimeXP(data.lifetimeXP);
         if (data.pointsSpent != null) setPointsSpent(data.pointsSpent);
         if (data.dailyEarnedXP != null) setDailyEarnedXP(data.dailyEarnedXP);
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
      // Clear current list to animate out, and close any open popovers
      setOpenLootInfoId(null);
      setLoot([]);
      setLootVersion((v) => v + 1);
      const system = "You tailor break reward ideas to a user's preferences. Output strictly JSON: {\\\"loot\\\":[{\\\"threshold\\\":number,\\\"label\\\":string,\\\"description\\\":string}]} with 5 base items between 10 and 80 points (ascending), PLUS 1 premium item at least 100 points. Each description must be a helpful, specific paragraph of at least 50 characters describing how to take that break within the day, including mindful and time-bound guidance aligned to the point cost."
      const prevSummary = loot.map(l=>`${l.label}`).join(" | ");
      const user = `${profileAnswers ? `User profile answers: ${JSON.stringify(profileAnswers)}.` : prevSummary}`;
      const data = await fetchOpenAIChat(openaiKey, {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      });
      const content = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(content);
      if (!parsed || !Array.isArray(parsed.loot)) throw new Error("Invalid AI response");
      console.debug("AI loot refresh response:", parsed);
      const cleaned = parsed.loot
        .map((x) => ({ threshold: Math.floor(Number(x.threshold) || 0), label: String(x.label || "Reward"), description: String(x.description || "") }))
        .filter((x) => Number.isFinite(x.threshold) && x.label);
      const base = cleaned
        .filter((x) => x.threshold >= 10 && x.threshold <= 80)
        .sort((a, b) => a.threshold - b.threshold)
        .slice(0, 5);
      const premium = cleaned.find((x) => x.threshold >= 100) || { threshold: 100, label: "Grand Reward" };
      let finalList = [...base, premium]
        .map((x) => ({ id: crypto.randomUUID(), threshold: x.threshold, label: x.label, description: ensureDescription(x.label, x.threshold, x.description), claimed: false }));
      // Enforce diversity from previous set on the client as a fallback
      const sameSet = isSameRewardSet(finalList, loot);
      if (sameSet) {
        finalList = nudgeRewards(finalList);
      }
      setLoot(finalList);
      setLootVersion((v) => v + 1);
    } catch (e) {
      console.error("Loot refresh failed:", e);
      setLootError(e.message || String(e));
      // Fallback locally generated set so the UI still updates
      const fallback = generateFallbackLoot();
      setLoot(fallback);
    } finally {
      setLootRefreshing(false);
    }
  }

  // Close loot info popovers on outside click
  useEffect(() => {
    const onDocClick = () => setOpenLootInfoId(null);
    window.addEventListener("click", onDocClick);
    return () => window.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex items-center justify-center">
      <div className="w-full max-w-7xl">
        <header className="mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
          <Swords className="w-6 h-6 md:w-7 md:h-7 text-indigo-400" />
          <h1 className="text-xl md:text-3xl font-semibold flex-1">Work XP — Daily Grind</h1>
          
          <button
            onClick={resetDay}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm"
            title="Reset today"
          >
            <RotateCcw className="w-4 h-4"/>
            <span className="hidden md:inline">Reset Day</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm"
            title="Settings"
          >
            <Settings className="w-4 h-4"/>
            <span className="hidden md:inline">Settings</span>
          </button>
        </header>

        {/* Top cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <Card>
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5" />
              <div className="text-sm opacity-80">Lifetime XP</div>
            </div>
            <div className="mt-2 text-2xl font-semibold">{lifetimeXP} XP</div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5" />
              <div className="text-sm opacity-80">Daily XP</div>
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

          {/* Removed Reward Points card per request */}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <div className="text-sm opacity-80">Daily Progress</div>
            <div className="text-sm opacity-80 flex items-center gap-2">
              <span>{totalXP} XP / {dailyGoal} XP</span>
              <span className="opacity-70">({Math.round(progress * 100)}%)</span>
            </div>
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

        {/* Main Content: Tasks (left) and Loot (right on desktop) */}
        <div className="grid grid-cols-1 gap-4 items-start mb-6">
        {/* Tasks Table */}
        <div className="relative bg-slate-900/60 rounded-2xl shadow p-3 md:p-4">
          <div className="hidden md:grid grid-cols-12 gap-3 px-2 py-2 text-xs uppercase tracking-wide text-slate-400">
            <div className="md:col-span-7">Task</div>
            <div className="text-center md:col-span-3">XP</div>
            <div className="text-right md:col-span-2">Actions</div>
          </div>
          <div>
            {tasks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-slate-300">
                <div className="text-sm">Your task list is empty.</div>
                <div className="mt-2 text-xs text-slate-400">Add a task or generate a list from your to‑do items to get started.</div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button onClick={addTask} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm">
                    <Plus className="w-4 h-4"/> Add Task
                  </button>
                </div>
          </div>
            )}
            <AnimatePresence initial={false}>
            {tasks.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -6 }}
                transition={{ duration: 0.18 }}
                className="mb-2 md:mb-0"
              >
                {/* Mobile condensed row */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-800/60 bg-slate-900/50 p-2 md:hidden">
                <input
                    className="flex-1 bg-transparent outline-none rounded focus:ring focus:ring-indigo-500/30 px-2 py-1 text-sm"
                  value={t.name}
                  onChange={(e) => updateTask(t.id, { name: e.target.value })}
                />
                <input
                  type="number"
                    className="w-16 bg-slate-950 rounded px-2 py-1 text-center text-xs"
                  value={t.xp}
                  onChange={(e) => updateTask(t.id, { xp: clamp(parseInt(e.target.value || 0, 10), 0, 100000) })}
                />
                  <button
                    className="inline-flex items-center justify-center text-slate-400 hover:text-emerald-400"
                    onClick={() => completeTask(t.id)}
                    aria-label="Complete task"
                    title="Complete task"
                  >
                    <Circle className="w-5 h-5" />
                  </button>
                  <button
                    className="inline-flex items-center justify-center text-slate-400 hover:text-red-400"
                    onClick={() => deleteTask(t.id)}
                    aria-label="Delete task"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Desktop grid row */}
                <div className="hidden md:grid md:grid-cols-12 md:gap-3 md:items-center md:px-2 md:py-3">
                  <input
                    className="w-full bg-transparent outline-none rounded focus:ring focus:ring-indigo-500/30 px-2 py-1 md:col-span-7"
                    value={t.name}
                    onChange={(e) => updateTask(t.id, { name: e.target.value })}
                  />
                  <div className="md:col-span-3">
                    <input
                      type="number"
                      className="w-full bg-slate-950 rounded px-2 py-1 text-center"
                      value={t.xp}
                      onChange={(e) => updateTask(t.id, { xp: clamp(parseInt(e.target.value || 0, 10), 0, 100000) })}
                    />
                </div>
                  <div className="flex justify-end items-center gap-2 md:col-span-2">
                    <button
                      className="inline-flex items-center justify-center text-slate-400 hover:text-emerald-400"
                      onClick={() => completeTask(t.id)}
                      aria-label="Complete task"
                      title="Complete task"
                    >
                      <Circle className="w-5 h-5" />
                    </button>
                    <button
                      className="inline-flex items-center justify-center text-slate-400 hover:text-red-400"
                      onClick={() => deleteTask(t.id)}
                      aria-label="Delete task"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
              </div>
              </div>

              </motion.div>
            ))}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGenerator(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm"
                title="Generate tasks"
              >
                <ListChecks className="w-4 h-4"/>
                <span className="hidden md:inline">Generate Tasks</span>
            </button>
              {tasks.length > 0 && (
                <button
                  onClick={addTask}
                  className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-sm"
                  title="Add task"
                  aria-label="Add task"
                >
                  <Plus className="w-4 h-4"/>
                  <span className="hidden md:inline">Add Task</span>
            </button>
              )}
            </div>
            <div className="text-sm opacity-80 pr-1">Daily Total: <span className="font-semibold">{totalXP} XP</span></div>
          </div>
        </div>

        {/* Loot / Rewards */}
        <div className="bg-slate-900/60 rounded-2xl shadow p-3 md:p-4">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5"/>
              <h2 className="text-base md:text-lg font-semibold">Loot Drops</h2>
              <span className="ml-2 text-xs text-slate-400">Points available: <span className="text-slate-200 font-semibold">{availablePoints}</span></span>
          </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLootEditor(true)}
                title="Edit loot drops"
                aria-label="Edit loot drops"
                className="inline-flex items-center justify-center px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowProfileWizard(true)}
                title="Profile wizard"
                aria-label="Profile wizard"
                className="inline-flex items-center justify-center px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={refreshLootFromAI}
                disabled={lootRefreshing || !openaiKey}
                title={openaiKey ? "Refresh rewards with AI" : "Add your OpenAI key in Settings"}
                className={`inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm ${openaiKey ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-800/50 text-slate-400 cursor-not-allowed"}`}
              >
                <RefreshCcw className={`w-4 h-4 ${lootRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          {lootError && <div className="mb-2 text-xs text-red-400">{lootError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2.5 md:gap-3">
            {lootRefreshing && (
              Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className="relative rounded-xl p-3 border border-slate-800 bg-slate-900/60 overflow-hidden"
                >
                  {/* Shimmer bar */}
                  <motion.div
                    className="pointer-events-none absolute inset-0"
                    initial={{ x: "-100%" }}
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.03 }}
                    style={{
                      background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(148,163,184,0.08) 50%, rgba(255,255,255,0) 100%)",
                    }}
                  />
                  {/* Placeholder content */}
                  <div className="h-3 w-16 bg-slate-800 rounded mb-2" />
                  <div className="h-4 w-40 bg-slate-800 rounded mb-3" />
                  <div className="h-2 w-24 bg-slate-800 rounded" />

                  {/* Floating dots animation */}
                  <div className="pointer-events-none absolute inset-0">
                    <motion.span
                      className="absolute w-2 h-2 bg-emerald-400/70 rounded-full"
                      initial={{ x: 6, y: 24, opacity: 0.7 }}
                      animate={{ x: [6, 90, 6], y: [24, 10, 24] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.05 * i }}
                    />
                    <motion.span
                      className="absolute w-2 h-2 bg-indigo-400/70 rounded-full"
                      initial={{ x: 14, y: 40, opacity: 0.7 }}
                      animate={{ x: [14, 70, 14], y: [40, 28, 40] }}
                      transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 0.07 * i }}
                    />
                    <motion.span
                      className="absolute w-1.5 h-1.5 bg-slate-400/70 rounded-full"
                      initial={{ x: 24, y: 12, opacity: 0.7 }}
                      animate={{ x: [24, 60, 24], y: [12, 18, 12] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.09 * i }}
                    />
                  </div>
                </motion.div>
              ))
            )}
            {!lootRefreshing && (
            <AnimatePresence key={lootVersion}>
            {loot.map((l) => {
              const canAfford = availablePoints >= l.threshold;
              const canClick = !l.claimed && availablePoints > 0;
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  role="button"
                  aria-disabled={!canClick}
                  tabIndex={canClick ? 0 : 0}
                  onKeyDown={(e) => {
                    if (!canClick) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (l.claimed || availablePoints <= 0) return;
                      if (!canAfford) {
                        alert(`Not enough points. Need ${l.threshold - availablePoints} more.`);
                        return;
                      }
                      setPointsSpent((p) => p + l.threshold);
                      setLoot((prev) => prev.map((x) => x.id === l.id ? { ...x, claimed: true } : x));
                      setCelebratingLoot(l);
                      setOpenLootInfoId(null);
                    }
                  }}
                  onClick={() => {
                    if (l.claimed || availablePoints <= 0) return;
                    if (!canAfford) {
                      alert(`Not enough points. Need ${l.threshold - availablePoints} more.`);
                      return;
                    }
                    // Deduct points and mark claimed
                    setPointsSpent((p) => p + l.threshold);
                    setLoot((prev) => prev.map((x) => x.id === l.id ? { ...x, claimed: true } : x));
                    setCelebratingLoot(l);
                    setOpenLootInfoId(null);
                  }}
                  className={
                    `relative text-left rounded-xl p-3 border transition-shadow ${
                      l.claimed
                        ? 'border-emerald-400/40 bg-emerald-500/10 opacity-70 cursor-not-allowed'
                        : canAfford
                          ? 'border-emerald-400/50 bg-emerald-500/10 hover:shadow-[0_0_0_3px_rgba(16,185,129,0.25)] cursor-pointer'
                          : (availablePoints > 0
                              ? 'border-yellow-400/40 bg-yellow-500/5 hover:bg-yellow-500/10 cursor-pointer'
                              : 'border-slate-800 cursor-not-allowed opacity-80')
                    }`
                  }
                >
                  <div className="text-sm opacity-80">{l.threshold} pts</div>
                  <div className="text-base font-medium">{l.label}</div>
                  {l.claimed ? (
                    <div className="mt-2 text-xs text-emerald-300">Claimed</div>
                  ) : canAfford ? (
                    <div className="mt-2 text-xs text-emerald-300">Click to claim</div>
                  ) : availablePoints > 0 ? (
                    <div className="mt-2 text-xs text-yellow-300">Need {l.threshold - availablePoints} more points</div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-400">No points available</div>
                  )}
                  <div className="mt-1 text-[10px] text-slate-400">Est: {estimateDurationLabel(l.threshold)}</div>

                  {/* Info hover at bottom-right */}
                  <span className="absolute bottom-2 right-2 inline-flex pointer-events-auto">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center"
                      aria-label="More info"
                      aria-expanded={openLootInfoId === l.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenLootInfoId((cur) => (cur === l.id ? null : l.id));
                      }}
                    >
                      <Info className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                    </button>
                    <span
                      className={`absolute z-50 right-0 bottom-full mb-2 ${openLootInfoId === l.id ? 'block' : 'hidden md:group-hover:block'} w-72 md:w-96 max-w-[calc(100vw-32px)] break-words whitespace-normal rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-[11px] leading-relaxed text-slate-200 shadow-2xl`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {l.description || defaultDescription(l.label, l.threshold)}
                    </span>
                  </span>
                </motion.div>
              );
            })}
            </AnimatePresence>
            )}
          </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center gap-2">

          {/* <label className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl cursor-pointer">
            <Upload className="w-4 h-4"/> Import
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
          </label>

          <button onClick={exportJSON} className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl">
            <Download className="w-4 h-4"/> Export
          </button> */}

          <span className="ml-auto" />
        </div>

        {/* Settings Modal */}
        <AnimatePresence>
        {showSettings && (
            <SettingsModal
              autoCarryStreak={autoCarryStreak}
              setAutoCarryStreak={setAutoCarryStreak}
              dailyGoal={dailyGoal}
              setDailyGoal={setDailyGoal}
              openaiKey={openaiKey}
              setOpenaiKey={setOpenaiKey}
              defaultAvailableMinutes={defaultAvailableMinutes}
              setDefaultAvailableMinutes={setDefaultAvailableMinutes}
              onStartProfile={() => {
                setShowSettings(false);
                setShowProfileWizard(true);
              }}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>

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
          {showLootEditor && (
            <LootEditorModal
              loot={loot}
              setLoot={setLoot}
              onClose={() => setShowLootEditor(false)}
            />
          )}
          {showProfileWizard && (
            <ProfileWizard
              onClose={() => setShowProfileWizard(false)}
              onComplete={async (answers) => {
                setShowProfileWizard(false);
                // Use answers to bias new loot recommendations
                if (!openaiKey) return;
                setLootRefreshing(true);
                setLootError("");
                try {
                  const system = "You tailor break reward ideas to a user's preferences. Output strictly JSON: {\\\"loot\\\":[{\\\"threshold\\\":number,\\\"label\\\":string,\\\"description\\\":string}]} with 5 base items between 10 and 80 points (ascending), PLUS 1 premium item at least 100 points. Each description must be a helpful, specific paragraph of at least 50 characters describing how to take that break within the day, including mindful and time-bound guidance aligned to the point cost.";
                  const user = `User answers: ${JSON.stringify(answers)}. Suggest six rewards.`;
                  const data = await fetchOpenAIChat(openaiKey, {
                    model: "gpt-4o-mini",
                    messages: [
                      { role: "system", content: system },
                      { role: "user", content: user },
                    ],
                    temperature: 0.4,
                    response_format: { type: "json_object" },
                  });
                  const content = data.choices?.[0]?.message?.content || "";
                  const parsed = JSON.parse(content);
                  if (!parsed || !Array.isArray(parsed.loot)) throw new Error("Invalid AI response");
                  const cleaned = parsed.loot
                    .map((x) => ({ threshold: Math.floor(Number(x.threshold) || 0), label: String(x.label || "Reward"), description: String(x.description || "") }))
                    .filter((x) => Number.isFinite(x.threshold) && x.label);
                  const base = cleaned
                    .filter((x) => x.threshold >= 10 && x.threshold <= 80)
                    .sort((a, b) => a.threshold - b.threshold)
                    .slice(0, 5);
                  const premium = cleaned.find((x) => x.threshold >= 100) || { threshold: 100, label: "Grand Reward" };
                  const finalList = [...base, premium]
                    .map((x) => ({ id: crypto.randomUUID(), threshold: x.threshold, label: x.label, description: ensureDescription(x.label, x.threshold, x.description), claimed: false }));
                  setLoot(finalList);
                  setProfileAnswers(answers);
                } catch (e) {
                  setLootError(e.message || String(e));
                } finally {
                  setLootRefreshing(false);
                }
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

function SettingsModal({
  autoCarryStreak,
  setAutoCarryStreak,
  dailyGoal,
  setDailyGoal,
  openaiKey,
  setOpenaiKey,
  defaultAvailableMinutes,
  setDefaultAvailableMinutes,
  onStartProfile,
  onClose,
}) {
  const [showKey, setShowKey] = useState(false);
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
        className="relative z-10 mx-4 w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-4 md:p-6 shadow-2xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Settings</h3>
          <button className="text-slate-400 hover:text-white" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm mb-1 opacity-80">Auto streak (reset to 0 on missed goal)</div>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={autoCarryStreak} onChange={(e) => setAutoCarryStreak(e.target.checked)} />
                  <span className="text-sm">Enabled</span>
                </label>
              </div>
              <div>
            <div className="text-sm mb-1 opacity-80">Daily Goal</div>
            <input
              type="number"
              className="w-full bg-slate-950 rounded px-2 py-1"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(clamp(parseInt(e.target.value || 0, 10), 0, 100000))}
            />
          </div>
          <div>
            <div className="text-sm mb-1 opacity-80">Default available minutes per day</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => setDefaultAvailableMinutes((v) => Math.max(30, (parseInt(v, 10) || 0) - 30))}
                disabled={defaultAvailableMinutes <= 30}
                title="-30 min"
              >
                −
              </button>
              <input
                type="number"
                className="w-24 bg-slate-950 rounded px-2 py-1 text-center"
                value={defaultAvailableMinutes}
                onChange={(e) => setDefaultAvailableMinutes(Math.max(30, Math.min(720, parseInt(e.target.value || 0, 10))))}
              />
              <button
                type="button"
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => setDefaultAvailableMinutes((v) => Math.min(720, (parseInt(v, 10) || 0) + 30))}
                disabled={defaultAvailableMinutes >= 720}
                title="+30 min"
              >
                +
              </button>
            </div>
            <div className="text-[10px] mt-1 text-slate-500">Step: 30 min (30–720)</div>
          </div>
          
          <div>
            <div className="text-sm mb-1 opacity-80">OpenAI API key (stored locally)</div>
            <div className="flex items-center gap-2">
              <input
                type={showKey ? "text" : "password"}
                className="w-full bg-slate-950 rounded px-2 py-1"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <button
                type="button"
                className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                onClick={() => setShowKey((v) => !v)}
                title={showKey ? "Hide" : "Show"}
              >
                {showKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
              </button>
            </div>
            <div className="text-[10px] mt-1 text-slate-500">Key is stored in your browser only and sent directly to OpenAI.</div>
          </div>
          {/* Loot editor moved to dedicated modal */}
            </div>
      </motion.div>
    </motion.div>
  );
}

function LootEditorModal({ loot, setLoot, onClose }) {
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
        className="relative z-10 mx-4 w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-4 md:p-6 shadow-2xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Edit loot drops</h3>
          <button className="text-slate-400 hover:text-white" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1">
          {loot.map((l) => (
            <div
              key={l.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="sm:hidden text-[10px] uppercase tracking-wide text-slate-400">Points</span>
                <input
                  type="number"
                  className="w-12 bg-slate-950 rounded px-2 py-1 text-xs"
                  value={l.threshold}
                  onChange={(e) => {
                    const v = clamp(parseInt(e.target.value || 0, 10), 0, 100000);
                    setLoot(prev => prev.map(x => x.id === l.id ? { ...x, threshold: v } : x));
                  }}
                />
              </div>
              <input
                className="w-full bg-slate-950 rounded px-2 py-1 text-sm"
                value={l.label}
                onChange={(e) => setLoot(prev => prev.map(x => x.id === l.id ? { ...x, label: e.target.value } : x))}
              />
              <button
                className="justify-self-end inline-flex items-center justify-center text-slate-400 hover:text-red-400"
                onClick={() => setLoot(prev => prev.filter(x => x.id !== l.id))}
                aria-label="Delete reward"
                title="Delete reward"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {loot.length < 6 && (
            <button
              onClick={() => setLoot(prev => [...prev, { id: crypto.randomUUID(), threshold: 150, label: "Your reward" }])}
              className="text-sm text-indigo-300 hover:text-indigo-200"
            >+ Add reward</button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function defaultDescription(label, threshold) {
  const est = estimateDurationLabel(Math.floor(Number(threshold) || 0));
  const name = String(label || "Reward");
  return (
    `${name}: This reward is designed as a mindful break you can accomplish in ${est}. Step away from your current task, change your environment, and give your brain space to reset.`
  );
}

function longDescription(label, threshold) {
  const est = estimateDurationLabel(Math.floor(Number(threshold) || 0));
  return (
    `${label}: Take a deliberate break lasting ${est}. Begin by closing your open tabs or pausing notifications to create a calm buffer. ` +
    `This rhythm makes rewards feel restorative and keeps your momentum sustainable across the day.`
  );
}

function ensureDescription(label, threshold, desc) {
  const text = String(desc || "");
  if (text.length >= 50) return text;
  return longDescription(label, threshold);
}

function isSameRewardSet(newList, oldList) {
  if (!Array.isArray(newList) || !Array.isArray(oldList)) return false;
  if (newList.length !== oldList.length) return false;
  const norm = (arr) => arr.map(r => ({ label: String(r.label || "").toLowerCase().trim(), threshold: Number(r.threshold) || 0 }))
    .sort((a,b) => (a.label === b.label ? a.threshold - b.threshold : a.label.localeCompare(b.label)));
  const a = norm(newList);
  const b = norm(oldList);
  return a.every((x,i) => x.label === b[i].label && x.threshold === b[i].threshold);
}

function nudgeRewards(list) {
  // Slightly adjust thresholds to ensure differences while respecting bands
  const out = list.map((r, idx) => {
    let t = Number(r.threshold) || 0;
    if (idx < 5) {
      // base: 10..80
      const delta = (idx % 2 === 0 ? 5 : -5);
      t = clamp(t + delta, 10, 80);
    } else {
      // premium: >=100
      t = Math.max(100, t + 5);
    }
    return { ...r, threshold: t };
  }).sort((a,b) => a.threshold - b.threshold);
  return out;
}

function generateFallbackLoot() {
  const base = [
    { threshold: 15, label: "Stretch + hydrate", description: longDescription("Stretch + hydrate", 15) },
    { threshold: 25, label: "Walk outside", description: longDescription("Walk outside", 25) },
    { threshold: 40, label: "Guilt‑free video", description: longDescription("Guilt‑free video", 40) },
    { threshold: 60, label: "Learning session", description: longDescription("Learning session", 60) },
    { threshold: 80, label: "Deep rest", description: longDescription("Deep rest", 80) },
  ];
  const premium = { threshold: 100, label: "Premium treat", description: longDescription("Premium treat", 100) };
  return [...base, premium].map((x) => ({ id: crypto.randomUUID(), claimed: false, ...x }));
}

function ProfileWizard({ onClose, onComplete }) {
  const questions = [
    { key: "mood", q: "What reward mood resonates most today?", options: ["Cozy & calm", "Playful & fun", "Focused & productive", "Adventurous & novel"] },
    { key: "place", q: "Where would you prefer to take a break?", options: ["Indoors at desk", "Indoors away from desk", "Outdoors nearby", "Outdoors longer"] },
    { key: "snacks", q: "Favorite treat style right now?", options: ["Savory", "Sweet", "Healthy/light", "Cafe drink"] },
    { key: "media", q: "Short-break content you enjoy?", options: ["Music/podcast", "YouTube/short video", "Reading/article", "No media"] },
    { key: "social", q: "Do you want this break solo or social?", options: ["Solo", "With friend/coworker", "Either"] },
    { key: "movement", q: "Preferred movement (if any)?", options: ["Walk", "Stretch/yoga", "Quick workout", "None"] },
    { key: "budget", q: "Reward budget today?", options: ["$0 (free)", "$1–$5", "$5–$15", "$15+"] },
    { key: "screen", q: "Screen preference for this break?", options: ["Screen-free", "Light screen ok", "Screen-heavy ok"] },
    { key: "time", q: "Typical break window that feels right?", options: ["10–20 min", "30–45 min", "60+ min"] },
    { key: "selfcare", q: "What self-care feels best right now?", options: ["Hydrate/snack", "Breathing/meditation", "Tidy/organize", "Journaling/notes"] },
  ];
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const cur = questions[idx];

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
        className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-indigo-400/30 bg-slate-900/90 p-4 shadow-xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Profile Wizard</h2>
        <div className="mt-1 text-xs text-slate-400">
          Answer a few quick questions so we can tailor loot drops to what you actually enjoy. Your choices influence the six rewards and their descriptions.
        </div>
        <h3 className="mt-2 text-lg font-semibold">{cur.q}</h3>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {cur.options.map((opt) => (
            <button
              key={opt}
              className="w-full text-left rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2"
              onClick={() => {
                const next = { ...answers, [cur.key]: opt };
                if (idx < questions.length - 1) {
                  setAnswers(next);
                  setIdx(idx + 1);
                } else {
                  onComplete(next);
                }
              }}
            >
              {opt}
            </button>
          ))}
          </div>
        <div className="mt-3 flex items-center gap-2 justify-between">
          <button
            className="text-xs text-slate-300 hover:text-white"
            onClick={() => (idx > 0 ? setIdx(idx - 1) : onClose())}
          >
            {idx > 0 ? "Back" : "Cancel"}
          </button>
          
          <div className="text-xs text-slate-400">Question {idx + 1} of {questions.length}</div>
        </div>
      </motion.div>
    </motion.div>
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

function estimateDurationLabel(points) {
  if (points > 80) return "~60+ min";
  if (points > 40) return "~30–45 min";
  return "~15–20 min";
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Generate tasks from your to‑do list</h3>
          <button className="text-slate-400 hover:text-white" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
      </div>
        <p className="mt-1 text-xs text-slate-400">Paste one item per line. We’ll break them down and size to your time.</p>
        <div className="mt-2 space-y-2">
          <textarea
            className="w-full h-40 md:h-48 resize-y rounded-xl bg-slate-950 px-2.5 py-2 text-sm outline-none focus:ring focus:ring-indigo-500/30"
            placeholder={"Example:\n- Implement login with OAuth\n- Fix checkout bug when coupon applied\n- Refactor header nav layout"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-slate-400">
              <span>Minutes</span>
              <input
                type="number"
                className="w-20 bg-slate-950 rounded px-2 py-1 text-xs"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(30, Math.min(720, parseInt(e.target.value || 0, 10))))}
              />
            </label>
            <div className="ml-auto flex gap-2">
              <button
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading || !text.trim()}
                onClick={async () => {
                  const tasks = await callOpenAI();
                  if (tasks) onGenerateReplace(tasks);
                }}
                title="AI Replace"
              >
                <ListChecks className="w-3.5 h-3.5" />
                {loading ? "Generating…" : "AI Replace"}
              </button>
              <button
                className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading || !text.trim()}
                onClick={async () => {
                  const tasks = await callOpenAI();
                  if (tasks) onGenerateAppend(tasks);
                }}
                title="AI Append"
              >
                <Plus className="w-3.5 h-3.5" />
                {loading ? "Generating…" : "AI Append"}
              </button>
    </div>
          </div>
        </div>
        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
        <div className="mt-2 flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg text-xs"
            onClick={() => text.trim() && onGenerateReplace(text)}
          >
            <ListChecks className="w-3.5 h-3.5" /> Replace
          </button>
          <button
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1.5 rounded-lg text-xs"
            onClick={() => text.trim() && onGenerateAppend(text)}
          >
            <Plus className="w-3.5 h-3.5" /> Append
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
        <button className="absolute top-2 right-2 text-slate-400 hover:text-white" onClick={onClose} aria-label="Close">
          <X className="w-4 h-4" />
        </button>
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
