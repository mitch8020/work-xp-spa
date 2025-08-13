// Shared helpers and utilities
import { } from "react";

export const STORAGE_KEY = "work-xp-spa:v1";

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

export const resolveOpenAIKey = (key) => (key === "hush_hush" ? import.meta.env.VITE_OPENAI_API_KEY : key);

export async function fetchOpenAIChat(apiKey, {
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

export function estimateDurationLabel(points) {
  if (points > 80) return "~60+ min";
  if (points > 40) return "~30–45 min";
  return "~15–20 min";
}

export function minutesForXp(xp) {
  const n = Math.max(0, parseInt(xp, 10) || 0);
  // rough mapping used elsewhere: 5xp≈10m, 10xp≈20m, 25xp≈50m
  return n * 2;
}

// Map loot threshold to a practical break timer length
export function lootMinutesForThreshold(threshold) {
  const t = Math.max(0, parseInt(threshold, 10) || 0);
  if (t > 80) return 60;
  if (t > 40) return 40;
  return 20;
}

export function formatDurationMs(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function defaultDescription(label, threshold) {
  const est = estimateDurationLabel(Math.floor(Number(threshold) || 0));
  const name = String(label || "Reward");
  return (
    `${name}: This reward is designed as a mindful break you can accomplish in ${est}. Step away from your current task, change your environment, and give your brain space to reset.`
  );
}

export function longDescription(label, threshold) {
  const est = estimateDurationLabel(Math.floor(Number(threshold) || 0));
  return (
    `${label}: Take a deliberate break lasting ${est}. Begin by closing your open tabs or pausing notifications to create a calm buffer. ` +
    `This rhythm makes rewards feel restorative and keeps your momentum sustainable across the day.`
  );
}

export function ensureDescription(label, threshold, desc) {
  const text = String(desc || "");
  if (text.length >= 50) return text;
  return longDescription(label, threshold);
}

export function isSameRewardSet(newList, oldList) {
  if (!Array.isArray(newList) || !Array.isArray(oldList)) return false;
  if (newList.length !== oldList.length) return false;
  const norm = (arr) => arr.map(r => ({ label: String(r.label || "").toLowerCase().trim(), threshold: Number(r.threshold) || 0 }))
    .sort((a,b) => (a.label === b.label ? a.threshold - b.threshold : a.label.localeCompare(b.label)));
  const a = norm(newList);
  const b = norm(oldList);
  return a.every((x,i) => x.label === b[i].label && x.threshold === b[i].threshold);
}

export function nudgeRewards(list) {
  const out = list.map((r, idx) => {
    let t = Number(r.threshold) || 0;
    if (idx < 5) {
      const delta = (idx % 2 === 0 ? 5 : -5);
      t = clamp(t + delta, 10, 80);
    } else {
      t = Math.max(100, t + 5);
    }
    return { ...r, threshold: t };
  }).sort((a,b) => a.threshold - b.threshold);
  return out;
}

export function generateFallbackLoot() {
  const base = [
    { threshold: 15, label: "Stretch + hydrate", description: longDescription("Stretch + hydrate", 15) },
    { threshold: 20, label: "Breathe + reset", description: longDescription("Breathe + reset", 20) },
    { threshold: 25, label: "Walk outside", description: longDescription("Walk outside", 25) },
    { threshold: 30, label: "Snack break", description: longDescription("Snack break", 30) },
    { threshold: 40, label: "Guilt‑free YouTube video", description: longDescription("Guilt‑free YouTube break", 40) },
    { threshold: 50, label: "Lunch break", description: longDescription("Lunch break", 50) },
    { threshold: 60, label: "Learning session", description: longDescription("Learning session", 60) },
    { threshold: 80, label: "Nap time", description: longDescription("Nap time", 80) },
  ];
  const premium = [
    { threshold: 100, label: "Premium treat", description: longDescription("Premium treat", 100) },
    { threshold: 140, label: "Extended break", description: longDescription("Extended break", 140) },
  ];
  return [...base, ...premium].map((x) => ({ id: crypto.randomUUID(), claimed: false, ...x }));
}

export function generateTasksFromTodo(rawItems) {
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

export function breakdownLineToSubtasks(line) {
  const basicSplits = line
    .split(/\band\b|;|,|\s->\s|\/|\\|\s\|\s|\s>\s/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const seeds = basicSplits.length > 1 ? basicSplits : [line];
  const label = seeds.join(" ").toLowerCase();
  const isBug = /(bug|fix|issue|error|crash|defect)/.test(label);
  const isFeature = /(feature|implement|add|build|create)/.test(label);
  const isRefactor = /(refactor|cleanup|restructure|reorganize)/.test(label);
  const isSetup = /(setup|configure|install|init|bootstrap)/.test(label);
  const isResearch = /(research|investigate|spike|explore)/.test(label);

  if (isBug) return [
    `Reproduce: ${line}`,
    `Find root cause: ${line}`,
    `Fix: ${line}`,
    `Verify & tests: ${line}`,
  ];
  if (isFeature) return [
    `Design plan: ${line}`,
    `Implement core: ${line}`,
    `Wire UI/API: ${line}`,
    `Test & polish: ${line}`,
  ];
  if (isRefactor) return [
    `Identify hotspots: ${line}`,
    `Refactor modules: ${line}`,
    `Fix regressions: ${line}`,
    `Run tests & lint: ${line}`,
  ];
  if (isSetup) return [
    `Install & config: ${line}`,
    `Verify locally: ${line}`,
    `Docs/notes: ${line}`,
  ];
  if (isResearch) return [
    `Gather sources: ${line}`,
    `Summarize options: ${line}`,
    `Next steps: ${line}`,
  ];

  if (line.split(/\s+/).length > 8) {
    return [
      `Plan steps: ${line}`,
      `Do core work: ${line}`,
      `Verify & wrap-up: ${line}`,
    ];
  }
  return seeds;
}

export function estimateXpForLabel(label) {
  const text = label.toLowerCase();
  let score = 1;
  const hardKeywords = [
    "migrate","database","schema","auth","oauth","deploy","kubernetes","integrate","performance","security","webpack","vite",
  ];
  const mediumKeywords = [
    "implement","refactor","optimize","tests","state","api","compose","build",
  ];
  const easyKeywords = ["docs","typo","styles","ui","copy","format","lint"];
  const words = text.split(/\s+/);
  score += Math.min(4, Math.floor(words.length / 5));
  for (const k of hardKeywords) if (text.includes(k)) score += 3;
  for (const k of mediumKeywords) if (text.includes(k)) score += 2;
  for (const k of easyKeywords) if (text.includes(k)) score -= 1;
  score = Math.max(1, Math.min(8, score));
  const buckets = { 1: 5, 2: 8, 3: 10, 4: 12, 5: 15, 6: 18, 7: 20, 8: 25 };
  return buckets[score] || 10;
}

// Build the default tasks list dynamically so the streak bonus reflects the next target day
export function buildDefaultTasksForStreak(currentStreakDays) {
  const nextTarget = Math.max(1, (parseInt(currentStreakDays, 10) || 0) + 1);
  const base = [
    { name: "Open laptop & set up environment", xp: 5 },
    { name: "Finish a tiny task (5–10 min)", xp: 5 },
    { name: "Journal your thoughts for the day", xp: 10 },
    { name: `Streak bonus (${nextTarget} days in a row)`, xp: 10 },
  ];
  return base.map((t) => ({ id: crypto.randomUUID(), completed: false, ...t }));
}

export const defaultLoot = generateFallbackLoot();


