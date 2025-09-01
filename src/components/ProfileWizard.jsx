import { useState } from "react";
import { motion } from "framer-motion";

export default function ProfileWizard({ onClose, onComplete }) {
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
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <motion.div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-indigo-400/30 bg-slate-900/90 p-4 shadow-xl" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 22 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Profile Wizard</h2>
        <div className="mt-1 text-xs text-slate-400">Answer a few quick questions so we can tailor loot drops to what you actually enjoy. Your choices influence the ten rewards and their descriptions.</div>
        <h3 className="mt-2 text-lg font-semibold">{cur.q}</h3>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {cur.options.map((opt) => (
            <button key={opt} className="w-full text-left rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2" onClick={() => {
              const next = { ...answers, [cur.key]: opt };
              if (idx < questions.length - 1) { setAnswers(next); setIdx(idx + 1); } else { onComplete(next); }
            }}>{opt}</button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 justify-between">
          <button className="text-xs text-slate-300 hover:text-white" onClick={() => (idx > 0 ? setIdx(idx - 1) : onClose())}>{idx > 0 ? "Back" : "Cancel"}</button>
          <div className="text-xs text-slate-400">Question {idx + 1} of {questions.length}</div>
        </div>
      </motion.div>
    </motion.div>
  );
}


