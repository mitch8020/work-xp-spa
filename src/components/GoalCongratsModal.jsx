import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, Trophy } from "lucide-react";
import { formatDurationMs, todayISO } from "../helpers.jsx";

export default function GoalCongratsModal({ tasks, onClose, manualOpen = false, metGoal = false }) {
  const shownKey = `work-xp-spa:goalCongratsShown:${todayISO()}`;
  const alreadyShown = (() => {
    try { return Boolean(localStorage.getItem(shownKey)); } catch { return false; }
  })();

  useEffect(() => {
    if (!manualOpen) {
      if (alreadyShown) { onClose(); return; }
      try { localStorage.setItem(shownKey, "1"); } catch {}
    }
  }, [alreadyShown, onClose, shownKey, manualOpen]);

  if (!manualOpen && alreadyShown) return null;
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <motion.div className="relative z-10 mx-4 w-full max-w-2xl rounded-2xl border border-emerald-400/30 bg-slate-900 p-4 md:p-6 shadow-2xl" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 22 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold inline-flex items-center gap-2"><Trophy className="w-5 h-5 text-emerald-300"/> {metGoal ? 'Daily goal complete!' : 'Completed tasks so far'}</h3>
          <button className="text-slate-400 hover:text-white" onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="text-sm text-slate-300">
          {metGoal ? (
            <span>Nice work. Here's what you completed today:</span>
          ) : (
            <span>You're making progress! Here's what you've completed so far — keep going and fill that XP bar!</span>
          )}
        </div>
        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900/80 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Task</th>
                <th className="px-3 py-2">XP</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Completed</th>
              </tr>
            </thead>
            <tbody>
            {tasks.map(t => (
              <tr key={t.id} className="border-t border-slate-800">
                <td className="px-3 py-2">{t.name}</td>
                <td className="px-3 py-2">{t.xp}</td>
                <td className="px-3 py-2">{formatDurationMs(t.durationMs || 0)}</td>
                <td className="px-3 py-2 text-slate-400">{new Date(t.completedAt).toLocaleTimeString()}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}


