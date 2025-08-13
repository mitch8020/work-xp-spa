import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Eye, EyeOff } from "lucide-react";
import { clamp, STORAGE_KEY } from "../helpers.jsx";

export default function SettingsModal({
  autoCarryStreak,
  setAutoCarryStreak,
  dailyGoal,
  setDailyGoal,
  openaiKey,
  setOpenaiKey,
  defaultAvailableMinutes,
  setDefaultAvailableMinutes,
  onStartProfile,
  onEditDefaultTasks,
  onEditDefaultLoot,
  onClose,
}) {
  const [showKey, setShowKey] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const clearAllData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("work-xp-spa:completedLog");
    } catch {}
    window.location.reload();
  };
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
            <div className="text-sm mb-1 opacity-80">Track streak (reset to 0 on missed goal)</div>
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
        </div>

        <div className="mt-5 border-t border-slate-800 pt-4">
          <div className="mb-4">
            <div className="text-sm font-medium text-slate-200 mb-2">Defaults</div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm" onClick={onEditDefaultTasks}>Edit default tasks</button>
              <button type="button" className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm" onClick={onEditDefaultLoot}>Edit default loot drops</button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-200">Danger zone</div>
              <div className="text-xs text-slate-400">Permanently delete all app data saved in this browser.</div>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm"
              onClick={() => setShowConfirmClear(true)}
            >
              Clear data
            </button>
          </div>
        </div>

        {showConfirmClear && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70" />
            <motion.div
              className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
            >
              <div className="text-base font-semibold mb-1">Delete all data?</div>
              <div className="text-sm text-slate-300 mb-4">This will remove all saved tasks, settings, loot, and history from this browser. This action cannot be undone.</div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm" onClick={() => setShowConfirmClear(false)}>Cancel</button>
                <button type="button" className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm" onClick={clearAllData}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}


