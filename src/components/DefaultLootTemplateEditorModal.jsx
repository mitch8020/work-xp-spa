import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Trash2, Plus } from "lucide-react";

export default function DefaultLootTemplateEditorModal({
  initialTemplates,
  onSave,
  onClose,
}) {
  const [items, setItems] = useState(() => (Array.isArray(initialTemplates) && initialTemplates.length ? initialTemplates : [
    { threshold: 15, label: "Stretch + hydrate" },
    { threshold: 20, label: "Breathe + reset" },
    { threshold: 25, label: "Walk outside" },
    { threshold: 30, label: "Snack break" },
    { threshold: 40, label: "Guilt‑free YouTube video" },
    { threshold: 50, label: "Lunch break" },
    { threshold: 60, label: "Learning session" },
    { threshold: 80, label: "Nap time" },
    { threshold: 100, label: "Premium treat" },
    { threshold: 140, label: "Extended break" },
  ]));

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
          <h3 className="text-lg font-semibold">Edit default loot drops</h3>
          <button className="text-slate-400 hover:text-white" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <input
                type="number"
                className="w-16 bg-slate-950 rounded px-2 py-1 text-xs"
                value={it.threshold}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(100000, parseInt(e.target.value || 0, 10)));
                  setItems((prev) => prev.map((x,i) => i===idx ? { ...x, threshold: v } : x));
                }}
              />
              <input
                className="w-full bg-slate-950 rounded px-2 py-1 text-sm"
                value={it.label}
                onChange={(e) => setItems((prev) => prev.map((x,i) => i===idx ? { ...x, label: e.target.value } : x))}
              />
              <button
                className="justify-self-end inline-flex items-center justify-center text-slate-400 hover:text-red-400"
                onClick={() => setItems((prev) => prev.filter((_,i) => i!==idx))}
                aria-label="Delete reward"
                title="Delete reward"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {items.length < 10 && (
            <button className="inline-flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200" onClick={() => setItems((prev) => [...prev, { threshold: 150, label: "Your reward" }])}>
              <Plus className="w-4 h-4" /> Add reward
            </button>
          )}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm" onClick={() => onSave(items)}>Save</button>
        </div>
      </motion.div>
    </motion.div>
  );
}


