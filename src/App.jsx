import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RotateCcw, Swords, Settings, RefreshCcw, Info, Trash2, Circle, ListChecks, Loader2, Sparkles, Edit3, Flame, Package, Trophy, Target, Clock } from "lucide-react";
import { Card, SettingsModal, LootEditorModal, GeneratorModal, CelebrationModal, ProfileWizard, TaskTimerModal, GoalCongratsModal, DefaultTasksEditorModal, DefaultLootTemplateEditorModal, DefaultMinutesModal } from "./components/index.js";
import {
  STORAGE_KEY,
  todayISO,
  clamp,
  fetchOpenAIChat,
  estimateDurationLabel,
  defaultDescription,
  ensureDescription,
  isSameRewardSet,
  nudgeRewards,
  generateFallbackLoot,
  generateTasksFromTodo,
  defaultLoot,
  buildDefaultTasksForStreak,
} from "./helpers.jsx";

export default function App() {
  const [tasks, setTasks] = useState(buildDefaultTasksForStreak(0));
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
  const [timerTask, setTimerTask] = useState(null);
  const [completedLog, setCompletedLog] = useState(() => {
    try {
      const saved = localStorage.getItem("work-xp-spa:completedLog");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showGoalCongrats, setShowGoalCongrats] = useState(false);
  const [hasShownGoalCongrats, setHasShownGoalCongrats] = useState(false);
  const [streakIncrementedToday, setStreakIncrementedToday] = useState(false);
  const [estimatingTaskId, setEstimatingTaskId] = useState(null);
  const [defaultTasksOverride, setDefaultTasksOverride] = useState(null);
  const [defaultLootOverride, setDefaultLootOverride] = useState(null);
  const [showDefaultTasksEditor, setShowDefaultTasksEditor] = useState(false);
  const [showDefaultLootEditor, setShowDefaultLootEditor] = useState(false);
  const [defaultAlarmEnabled, setDefaultAlarmEnabled] = useState(true);
  const [showDefaultMinutesEditor, setShowDefaultMinutesEditor] = useState(false);
  const [goalCongratsManual, setGoalCongratsManual] = useState(false);

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
      if (parsed.defaultTasksOverride) setDefaultTasksOverride(parsed.defaultTasksOverride);
      if (parsed.defaultLootOverride) setDefaultLootOverride(parsed.defaultLootOverride);
      if (parsed.defaultAlarmEnabled != null) setDefaultAlarmEnabled(Boolean(parsed.defaultAlarmEnabled));
    } catch (e) {
      console.warn("Failed to load saved state", e);
    }
  }, []);

  useEffect(() => {
    const state = { tasks, dailyGoal, loot, streak, lastReset, autoCarryStreak, openaiKey, defaultAvailableMinutes, lifetimeXP, pointsSpent, dailyEarnedXP, profileAnswers, streakIncrementedToday, defaultTasksOverride, defaultLootOverride, defaultAlarmEnabled };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem("work-xp-spa:completedLog", JSON.stringify(completedLog));
  }, [tasks, dailyGoal, loot, streak, lastReset, autoCarryStreak, openaiKey, defaultAvailableMinutes, lifetimeXP, pointsSpent, dailyEarnedXP, profileAnswers, streakIncrementedToday, completedLog, defaultTasksOverride, defaultLootOverride, defaultAlarmEnabled]);

  useEffect(() => {
    const id = setInterval(() => {
      const t = todayISO();
      if (t !== lastReset) {
        // day rollover handler (kept intentionally light)
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

  const completeTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const xp = Math.max(0, Number(task.xp) || 0);
    setLifetimeXP((v) => v + xp);
    setDailyEarnedXP((v) => v + xp);
    setCompletedLog((log) => [...log, { id: crypto.randomUUID(), name: task.name, xp: task.xp, durationMs: 0, completedAt: Date.now() }]);
    setTasks((ts) => ts.filter((t) => t.id !== id));
  };

  const buildDefaultTasksForStreakWithOverride = (currentStreakDays) => {
    if (Array.isArray(defaultTasksOverride) && defaultTasksOverride.length) {
      const nextTarget = Math.max(1, (parseInt(currentStreakDays, 10) || 0) + 1);
      const base = defaultTasksOverride;
      const withStreak = [...base, { name: `Streak bonus (${nextTarget} days in a row)`, xp: 10 }];
      return withStreak.map((t) => ({ id: crypto.randomUUID(), completed: false, ...t }));
    }
    return buildDefaultTasksForStreak(currentStreakDays);
  };

  const getDefaultLootPool = () => {
    if (Array.isArray(defaultLootOverride) && defaultLootOverride.length) {
      const pool = defaultLootOverride
        .map((x) => ({
          id: crypto.randomUUID(),
          threshold: Math.floor(Number(x.threshold) || 0),
          label: String(x.label || "Reward"),
          description: ensureDescription(String(x.label || "Reward"), Math.floor(Number(x.threshold) || 0), ""),
          claimed: false,
        }))
        .sort((a, b) => a.threshold - b.threshold);
      return pool;
    }
    return generateFallbackLoot();
  };
  const updateTask = (id, patch) => setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  const deleteTask = (id) => setTasks(ts => ts.filter(t => t.id !== id));
  const addTask = () => setTasks(ts => ([...ts, { id: crypto.randomUUID(), name: "New task", xp: 5, completed: false, isNew: true }]))
  ;

  const estimateTaskXP = async (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (!openaiKey) { alert("Add your OpenAI key in Settings"); return; }
    if (!task.isNew) return;
    try {
      setEstimatingTaskId(taskId);
      const system = "Estimate how long a single task would take for a focused individual contributor. Choose ONE number from {5,10,15,...,150} representing minutes. Respond strictly as JSON: {\"minutes\": number}.";
      const user = `Task: ${task.name}`;
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
      let minutes = Math.max(5, Math.min(150, Math.floor(Number(parsed?.minutes) || 0)));
      // snap to nearest 5
      minutes = Math.round(minutes / 5) * 5;
      const xp = Math.max(1, Math.round(minutes / 2));
      setTasks((ts) => ts.map((t) => t.id === taskId ? { ...t, xp, isNew: false } : t));
    } catch (e) {
      console.error(e);
      alert("Failed to estimate XP. Please try again.");
    } finally {
      setEstimatingTaskId(null);
    }
  };

  const resetDay = () => {
    const metGoal = totalXP >= dailyGoal && dailyGoal > 0;
    const confirmText = metGoal ? "Reset day and increment streak? (You met your goal!)" : "Reset day? (Today's progress will be cleared)";
    if (!confirm(confirmText)) return;
    // Restore default task list as undone, streak bonus reflects next streak day (prepend defaults)
    setTasks((prev)=> ([...buildDefaultTasksForStreakWithOverride(metGoal ? streak + 1 : streak), ...prev]));
    setDailyEarnedXP(0);
    setCompletedLog([]);
    setLastReset(todayISO());
    if (autoCarryStreak) setStreak(s => (metGoal ? s + 1 : 0));
    setShowGoalCongrats(false);
    setHasShownGoalCongrats(false);
    setStreakIncrementedToday(false);
    // Clear per-day goal congrats flag so it can auto-show once again after reset
    try { localStorage.removeItem(`work-xp-spa:goalCongratsShown:${todayISO()}`); } catch {}

    // Refresh loot list on reset: replace only claimed boxes with similar default loot
    setOpenLootInfoId(null);
    setLootVersion((v) => v + 1);
    const fallback = getDefaultLootPool();
    setLoot((prevLoot) => {
      const pool = [...fallback];
      const takeSimilar = (threshold) => {
        if (pool.length === 0) {
          return { ...fallback[0], id: crypto.randomUUID(), claimed: false };
        }
        let idx = pool.findIndex((x) => x.threshold === threshold);
        if (idx === -1) {
          const target = Number(threshold) || 0;
          let bestIdx = 0;
          let bestDiff = Math.abs((Number(pool[0]?.threshold) || 0) - target);
          for (let i = 1; i < pool.length; i++) {
            const diff = Math.abs((Number(pool[i]?.threshold) || 0) - target);
            if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
          }
          idx = bestIdx;
        }
        const [picked] = pool.splice(idx, 1);
        return { ...picked, id: crypto.randomUUID(), claimed: false };
      };
      return prevLoot.map((l) => (l.claimed ? takeSimilar(l.threshold) : l));
    });
  };

  async function refreshLootFromAI() {
    setLootError("");
    if (!openaiKey) { setLootError("Add your OpenAI key in Settings"); return; }
    try {
      setLootRefreshing(true);
      setOpenLootInfoId(null);
      setLoot([]);
      setLootVersion((v) => v + 1);
      const system = "You tailor break reward ideas to a user's preferences. Output strictly JSON: {\\\"loot\\\":[{\\\"threshold\\\":number,\\\"label\\\":string,\\\"description\\\":string}]} with 8 base items between 10 and 80 points (ascending), PLUS 2 premium item at least 100 points. Each description must be a helpful, specific paragraph of at least 50 characters describing how to take that break within the day, including mindful and time-bound guidance aligned to the point cost.";
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
      const cleaned = parsed.loot
        .map((x) => ({ threshold: Math.floor(Number(x.threshold) || 0), label: String(x.label || "Reward"), description: String(x.description || "") }))
        .filter((x) => Number.isFinite(x.threshold) && x.label);
      const base = cleaned
        .filter((x) => x.threshold >= 10 && x.threshold <= 80)
        .sort((a, b) => a.threshold - b.threshold)
        .slice(0, 8);
      const premiumList = cleaned
        .filter((x) => x.threshold >= 100)
        .sort((a, b) => a.threshold - b.threshold)
        .slice(0, 2);
      const ensuredPremium = premiumList.length === 2
        ? premiumList
        : [...premiumList, ...Array.from({ length: 2 - premiumList.length }).map((_, i) => ({ threshold: 100 + i * 20, label: i === 0 ? "Grand Reward" : "Epic Reward", description: "" }))];
      let finalList = [...base, ...ensuredPremium].map((x) => ({ id: crypto.randomUUID(), threshold: x.threshold, label: x.label, description: ensureDescription(x.label, x.threshold, x.description), claimed: false }));
      if (isSameRewardSet(finalList, loot)) finalList = nudgeRewards(finalList);
      setLoot(finalList);
      setLootVersion((v) => v + 1);
    } catch (e) {
      console.error("Loot refresh failed:", e);
      setLootError(e.message || String(e));
      const fallback = getDefaultLootPool();
      setLoot(fallback);
    } finally { setLootRefreshing(false); }
  }

  useEffect(() => {
    const onDocClick = () => setOpenLootInfoId(null);
    window.addEventListener("click", onDocClick);
    return () => window.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (totalXP >= dailyGoal && dailyGoal > 0) {
      if (!hasShownGoalCongrats) {
        setShowGoalCongrats(true);
        setHasShownGoalCongrats(true);
        setGoalCongratsManual(false);
      }
    }
  }, [totalXP, dailyGoal, hasShownGoalCongrats]);

  return (
    <div className="relative min-h-screen text-slate-100 p-4 md:p-6 flex items-center justify-center bg-[radial-gradient(120%_100%_at_50%_0%,_rgba(31,41,55,1)_0%,_rgba(2,6,23,1)_45%,_rgba(0,0,0,1)_100%)]">
      {/* Decorative background blobs (full-viewport) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-80 w-80 md:h-[28rem] md:w-[28rem] rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 md:h-[24rem] md:w-[24rem] rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 md:h-[28rem] md:w-[28rem] rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-1/4 -left-24 h-80 w-80 md:h-[28rem] md:w-[28rem] rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 h-80 w-80 md:h-[30rem] md:w-[30rem] rounded-full bg-purple-500/30 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-7xl">
        <header className="mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
          <Swords className="w-6 h-6 md:w-7 md:h-7 text-indigo-400" />
          <h1 className="text-xl md:text-3xl font-semibold flex-1">Work XP — Daily Grind</h1>
          <button onClick={resetDay} className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm" title="Reset today">
            <RotateCcw className="w-4 h-4"/>
            <span className="hidden md:inline">Reset Day</span>
          </button>
          <button onClick={() => { setGoalCongratsManual(true); setShowGoalCongrats(true); }} className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm" title="Completed Tasks">
            <ListChecks className="w-4 h-4"/>
            <span className="hidden md:inline">Completed Tasks</span>
          </button>
          <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm" title="Settings">
            <Settings className="w-4 h-4"/>
            <span className="hidden md:inline">Settings</span>
          </button>
        </header>

        

        <motion.div
          layout
          className={`grid grid-cols-1 sm:grid-cols-2 ${autoCarryStreak ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3 md:gap-4 mb-4 md:mb-6`}
        >
          <motion.div layout>
            <Card>
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5" />
                <div className="text-sm opacity-80">Lifetime XP</div>
              </div>
              <div className="mt-2 text-2xl font-semibold">{lifetimeXP} XP</div>
            </Card>
          </motion.div>
          <motion.div layout>
            <Card>
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5" />
                <div className="text-sm opacity-80">Daily XP</div>
              </div>
              <div className="mt-2 text-2xl font-semibold">{totalXP} XP</div>
            </Card>
          </motion.div>
          <AnimatePresence initial={false}>
            {autoCarryStreak && (
              <motion.div
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <div className="flex items-center gap-3">
                    <Flame className="w-5 h-5" />
                    <div className="text-sm opacity-80">Streak</div>
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{streak} days</div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <div className="text-sm opacity-80">Daily Progress</div>
            <div className="text-sm opacity-80 flex items-center gap-2">
              <span>{totalXP} XP / {dailyGoal} XP</span>
              <span className="opacity-70">({Math.round(progress * 100)}%)</span>
            </div>
          </div>
          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-indigo-500" initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 items-start mb-6">
          <div className="relative bg-slate-900/60 rounded-2xl shadow p-3 md:p-4">
            { tasks.length > 0 && (
            <div className="hidden md:grid grid-cols-12 gap-3 px-2 py-2 text-xs uppercase tracking-wide text-slate-400">
              <div className="md:col-span-7">Task</div>
              <div className="text-center md:col-span-3">XP</div>
              <div className="text-right md:col-span-2">Actions</div>
            </div>
            )}
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
                  <motion.div key={t.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: -6 }} transition={{ duration: 0.18 }} className="mb-2 md:mb-0">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-800/60 bg-slate-900/50 p-2 md:hidden">
                      <div className="relative flex-1">
                        <input className="w-full bg-transparent outline-none rounded focus:ring focus:ring-indigo-500/30 px-2 py-1 pr-16 text-sm" value={t.name} onChange={(e) => updateTask(t.id, { name: e.target.value })} />
                        {t.isNew && (
                          <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed" onClick={() => estimateTaskXP(t.id)} disabled={estimatingTaskId === t.id} title="Estimate XP via AI">
                            {estimatingTaskId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Est. XP"}
                          </button>
                        )}
                      </div>
                      <input type="number" className="w-16 bg-slate-950 rounded px-2 py-1 text-center text-xs" value={t.xp} onChange={(e) => updateTask(t.id, { xp: clamp(parseInt(e.target.value || 0, 10), 0, 100000) })} />
                      <button className="inline-flex items-center justify-center text-slate-400 hover:text-indigo-400" onClick={() => setTimerTask(t)} aria-label="Start timer" title="Start timer">
                        <Clock className="w-5 h-5" />
                      </button>
                      <button className="inline-flex items-center justify-center text-slate-400 hover:text-emerald-400" onClick={() => completeTask(t.id)} aria-label="Complete task" title="Complete task">
                        <Circle className="w-5 h-5" />
                      </button>
                      <button className="inline-flex items-center justify-center text-slate-400 hover:text-red-400" onClick={() => deleteTask(t.id)} aria-label="Delete task" title="Delete task">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="hidden md:grid md:grid-cols-12 md:gap-3 md:items-center md:px-2 md:py-3">
                      <div className="relative md:col-span-7">
                        <input className="w-full bg-transparent outline-none rounded focus:ring focus:ring-indigo-500/30 px-2 py-1 pr-20" value={t.name} onChange={(e) => updateTask(t.id, { name: e.target.value })} />
                        {t.isNew && (
                          <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed" onClick={() => estimateTaskXP(t.id)} disabled={estimatingTaskId === t.id} title="Estimate XP via AI">
                            {estimatingTaskId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Est. XP"}
                          </button>
                        )}
                      </div>
                      <div className="md:col-span-3">
                        <input type="number" className="w-full bg-slate-950 rounded px-2 py-1 text-center" value={t.xp} onChange={(e) => updateTask(t.id, { xp: clamp(parseInt(e.target.value || 0, 10), 0, 100000) })} />
                      </div>
                      <div className="flex justify-end items-center gap-2 md:col-span-2">
                        <button className="inline-flex items-center justify-center text-slate-400 hover:text-indigo-400" onClick={() => setTimerTask(t)} aria-label="Start timer" title="Start timer">
                          <Clock className="w-5 h-5" />
                        </button>
                        <button className="inline-flex items-center justify-center text-slate-400 hover:text-emerald-400" onClick={() => completeTask(t.id)} aria-label="Complete task" title="Complete task">
                          <Circle className="w-5 h-5" />
                        </button>
                        <button className="inline-flex items-center justify-center text-slate-400 hover:text-red-400" onClick={() => deleteTask(t.id)} aria-label="Delete task" title="Delete task">
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
                <button onClick={() => setShowGenerator(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm" title="Generate tasks">
                  <ListChecks className="w-4 h-4"/>
                  <span className="hidden md:inline">Generate Tasks</span>
                </button>
                {tasks.length > 0 && (
                  <button onClick={addTask} className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-sm" title="Add task" aria-label="Add task">
                    <Plus className="w-4 h-4"/>
                    <span className="hidden md:inline">Add Task</span>
                  </button>
                )}
              </div>
              <div className="text-sm opacity-80 pr-1">Daily Total: <span className="font-semibold">{totalXP} XP</span></div>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-2xl shadow p-3 md:p-4">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5"/>
                <h2 className="text-base md:text-lg font-semibold">Loot Drops</h2>
                <span className="block ml-2 text-xs text-slate-400">Points <span className="hidden md:inline">available</span>: <span className="text-slate-200 font-semibold">{availablePoints}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowLootEditor(true)} title="Edit loot drops" aria-label="Edit loot drops" className="inline-flex items-center justify-center px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => setShowProfileWizard(true)} title="Profile wizard" aria-label="Profile wizard" className={`inline-flex items-center justify-center px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white ${openaiKey ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-800/50 text-slate-400 cursor-not-allowed"}`}>
                  <Sparkles className="w-4 h-4" />
                </button>
                <button onClick={refreshLootFromAI} disabled={lootRefreshing || !openaiKey} title={openaiKey ? "Refresh rewards with AI" : "Add your OpenAI key in Settings"} className={`inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm ${openaiKey ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-800/50 text-slate-400 cursor-not-allowed"}`}>
                  <RefreshCcw className={`w-4 h-4 ${lootRefreshing ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
            {lootError && <div className="mb-2 text-xs text-red-400">{lootError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2.5 md:gap-3">
              {lootRefreshing && (
                Array.from({ length: 10 }).map((_, i) => (
                  <motion.div key={`skeleton-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.05 }} className="relative rounded-xl p-3 border border-slate-800 bg-slate-900/60 overflow-hidden">
                    <motion.div className="pointer-events-none absolute inset-0" initial={{ x: "-100%" }} animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.03 }} style={{ background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(148,163,184,0.08) 50%, rgba(255,255,255,0) 100%)" }} />
                    <div className="h-3 w-16 bg-slate-800 rounded mb-2" />
                    <div className="h-4 w-40 bg-slate-800 rounded mb-3" />
                    <div className="h-2 w-24 bg-slate-800 rounded" />
                    <div className="pointer-events-none absolute inset-0">
                      <motion.span className="absolute w-2 h-2 bg-emerald-400/70 rounded-full" initial={{ x: 6, y: 24, opacity: 0.7 }} animate={{ x: [6, 90, 6], y: [24, 10, 24] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.05 * i }} />
                      <motion.span className="absolute w-2 h-2 bg-indigo-400/70 rounded-full" initial={{ x: 14, y: 40, opacity: 0.7 }} animate={{ x: [14, 70, 14], y: [40, 28, 40] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 0.07 * i }} />
                      <motion.span className="absolute w-1.5 h-1.5 bg-slate-400/70 rounded-full" initial={{ x: 24, y: 12, opacity: 0.7 }} animate={{ x: [24, 60, 24], y: [12, 18, 12] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.09 * i }} />
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
                      <motion.div key={l.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} role="button" aria-disabled={!canClick} tabIndex={canClick ? 0 : 0}
                        onKeyDown={(e) => {
                          if (!canClick) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (l.claimed || availablePoints <= 0) return;
                            if (!canAfford) { alert(`Not enough points. Need ${l.threshold - availablePoints} more.`); return; }
                            setPointsSpent((p) => p + l.threshold);
                            setLoot((prev) => prev.map((x) => x.id === l.id ? { ...x, claimed: true } : x));
                            setCelebratingLoot(l);
                            setOpenLootInfoId(null);
                          }
                        }}
                        onClick={() => {
                          if (l.claimed || availablePoints <= 0) return;
                          if (!canAfford) { alert(`Not enough points. Need ${l.threshold - availablePoints} more.`); return; }
                          setPointsSpent((p) => p + l.threshold);
                          setLoot((prev) => prev.map((x) => x.id === l.id ? { ...x, claimed: true } : x));
                          setCelebratingLoot(l);
                          setOpenLootInfoId(null);
                        }}
                        className={`relative text-left rounded-xl p-3 border transition-shadow ${l.claimed ? 'border-indigo-400/40 bg-indigo-900/30 opacity-75 cursor-not-allowed' : canAfford ? 'border-emerald-400/50 bg-emerald-500/10 hover:shadow-[0_0_0_3px_rgba(16,185,129,0.25)] cursor-pointer' : (availablePoints > 0 ? 'border-yellow-400/40 bg-yellow-500/5 hover:bg-yellow-500/10 cursor-pointer' : 'border-slate-800 cursor-not-allowed opacity-80')}`}>
                        <div className="text-sm opacity-80">{l.threshold} pts</div>
                        <div className="text-base font-medium">{l.label}</div>
                        {l.claimed ? (<div className="mt-2 text-xs text-indigo-300">Claimed</div>) : canAfford ? (<div className="mt-2 text-xs text-emerald-300">Click to claim</div>) : availablePoints > 0 ? (<div className="mt-2 text-xs text-yellow-300">Need {l.threshold - availablePoints} more points</div>) : (<div className="mt-2 text-xs text-slate-400">No points available</div>)}
                        <div className="mt-1 text-[10px] text-slate-400">Est: {estimateDurationLabel(l.threshold)}</div>
                        <span className="absolute bottom-2 right-2 inline-flex pointer-events-auto">
                          <button type="button" className="inline-flex items-center justify-center" aria-label="More info" aria-expanded={openLootInfoId === l.id} onClick={(e) => { e.stopPropagation(); setOpenLootInfoId((cur) => (cur === l.id ? null : l.id)); }}>
                            <Info className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                          </button>
                          <span className={`absolute z-50 right-0 bottom-full mb-2 ${openLootInfoId === l.id ? 'block' : 'hidden md:group-hover:block'} w-72 md:w-96 max-w-[calc(100vw-32px)] break-words whitespace-normal rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-[11px] leading-relaxed text-slate-200 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="ml-auto" />
        </div>

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
              defaultAlarmEnabled={defaultAlarmEnabled}
              setDefaultAlarmEnabled={setDefaultAlarmEnabled}
              onEditDefaultTasks={() => { setShowSettings(false); setShowDefaultTasksEditor(true); }}
              onEditDefaultLoot={() => { setShowSettings(false); setShowDefaultLootEditor(true); }}
              onStartEditDefaultMinutes={() => { setShowSettings(false); setShowDefaultMinutesEditor(true); }}
              onStartProfile={() => { setShowSettings(false); setShowProfileWizard(true); }}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {celebratingLoot && (<CelebrationModal loot={celebratingLoot} defaultAlarmEnabled={defaultAlarmEnabled} onClose={() => setCelebratingLoot(null)} />)}
          {timerTask && (
            <TaskTimerModal
              task={timerTask}
              maxMinutes={Math.max(5, Math.min(120, (parseInt(timerTask.xp, 10) || 0) * 2))}
              onClose={() => setTimerTask(null)}
              onComplete={({ taskId, name, xp, durationMs }) => {
                setTimerTask(null);
                setCompletedLog((log) => [...log, { id: crypto.randomUUID(), name, xp, durationMs, completedAt: Date.now() }]);
                setLifetimeXP((v) => v + (Number(xp) || 0));
                setDailyEarnedXP((v) => v + (Number(xp) || 0));
                setTasks((ts) => ts.filter((t) => t.id !== taskId));
              }}
              defaultAlarmEnabled={defaultAlarmEnabled}
            />
          )}
          {showGoalCongrats && (
            <GoalCongratsModal
              tasks={completedLog}
              manualOpen={goalCongratsManual}
              metGoal={totalXP >= dailyGoal && dailyGoal > 0}
              onClose={() => { setShowGoalCongrats(false); if (!goalCongratsManual) setHasShownGoalCongrats(true); setGoalCongratsManual(false); }}
            />
          )}
          {showGenerator && (
            <GeneratorModal
              onClose={() => setShowGenerator(false)}
              openaiKey={openaiKey}
              defaultMinutes={defaultAvailableMinutes}
              onGenerateReplace={(itemsOrTasks) => {
                const generated = Array.isArray(itemsOrTasks) ? itemsOrTasks.map((t) => ({ id: crypto.randomUUID(), name: t.name, xp: t.xp, count: 0 })) : generateTasksFromTodo(itemsOrTasks);
                setTasks(generated);
                setShowGenerator(false);
              }}
              onGenerateAppend={(itemsOrTasks) => {
                const generated = Array.isArray(itemsOrTasks) ? itemsOrTasks.map((t) => ({ id: crypto.randomUUID(), name: t.name, xp: t.xp, count: 0 })) : generateTasksFromTodo(itemsOrTasks);
                setTasks(prev => [...prev, ...generated]);
                setShowGenerator(false);
              }}
            />
          )}
          {showLootEditor && (<LootEditorModal loot={loot} setLoot={setLoot} onClose={() => setShowLootEditor(false)} />)}
          {showDefaultTasksEditor && (
            <DefaultTasksEditorModal
              initialTasks={defaultTasksOverride}
              onSave={(items) => { setDefaultTasksOverride(items); setShowDefaultTasksEditor(false); setShowSettings(true); }}
              onClose={() => { setShowDefaultTasksEditor(false); setShowSettings(true); }}
            />
          )}
          {showDefaultLootEditor && (
            <DefaultLootTemplateEditorModal
              initialTemplates={defaultLootOverride}
              onSave={(items) => { setDefaultLootOverride(items); setShowDefaultLootEditor(false); setShowSettings(true); }}
              onClose={() => { setShowDefaultLootEditor(false); setShowSettings(true); }}
            />
          )}
          {showDefaultMinutesEditor && (
            <DefaultMinutesModal
              minutes={defaultAvailableMinutes}
              onSave={(val) => { setDefaultAvailableMinutes(val); setShowDefaultMinutesEditor(false); setShowSettings(true); }}
              onClose={() => { setShowDefaultMinutesEditor(false); setShowSettings(true); }}
            />
          )}
          {showProfileWizard && (
            <ProfileWizard
              onClose={() => setShowProfileWizard(false)}
              onComplete={async (answers) => {
                setShowProfileWizard(false);
                setProfileAnswers(answers);
                refreshLootFromAI();
              }}
            />
          )}
        </AnimatePresence>

        <footer className="mt-8 mb-2 text-center text-xs text-slate-500">Built for momentum, not perfection. Reset tomorrow and keep the streak alive.</footer>
      </div>
    </div>
  );
}


