import { motion } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import { clamp } from "../helpers.jsx";

export default function LootEditorModal({ loot, setLoot, onClose }) {
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
          {loot.length < 10 && (
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


