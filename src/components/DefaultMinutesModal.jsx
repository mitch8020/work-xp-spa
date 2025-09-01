import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function DefaultMinutesModal({
  minutes,
  onSave,
  onClose,
}) {
  const [value, setValue] = useState(() => Math.max(30, Math.min(720, parseInt(minutes || 240, 10))));

  const dec = () => setValue((v) => Math.max(30, (parseInt(v, 10) || 0) - 30));
  const inc = () => setValue((v) => Math.min(720, (parseInt(v, 10) || 0) + 30));

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
        className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Edit default available minutes</h3>
          <button className="text-slate-400 hover:text-white" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <div className="text-sm mb-1 opacity-80">Default available minutes per day</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={dec}
              disabled={value <= 30}
              title="-30 min"
            >
              −
            </button>
            <input
              type="number"
              className="w-24 bg-slate-950 rounded px-2 py-1 text-center"
              value={value}
              onChange={(e) => setValue(Math.max(30, Math.min(720, parseInt(e.target.value || 0, 10))))}
            />
            <button
              type="button"
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={inc}
              disabled={value >= 720}
              title="+30 min"
            >
              +
            </button>
          </div>
          <div className="text-[10px] mt-1 text-slate-500">Step: 30 min (30–720)</div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm" onClick={() => onSave(value)}>Save</button>
        </div>
      </motion.div>
    </motion.div>
  );
}


