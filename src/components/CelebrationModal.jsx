import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Trophy, BellRing, BellOff } from "lucide-react";
import { formatDurationMs, lootMinutesForThreshold } from "../helpers.jsx";

export default function CelebrationModal({ loot, onClose, defaultAlarmEnabled = true }) {
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

  const [startMs] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainRef = useRef(null);
  const oscRef = useRef(null);
  const pulseRef = useRef(null);
  const [alarmActive, setAlarmActive] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(Boolean(defaultAlarmEnabled));
  const maxMinutes = loot ? lootMinutesForThreshold(loot.threshold) : 20;
  const maxMs = maxMinutes * 60 * 1000;
  const remainingMs = Math.max(0, maxMs - elapsedMs);
  const done = remainingMs <= 0;

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsedMs(Date.now() - startMs), 300);
    return () => {
      clearInterval(intervalRef.current);
      stopAlarm();
    };
  }, [startMs]);

  useEffect(() => {
    if (done && !alarmActive && alarmEnabled) startAlarm();
  }, [done, alarmEnabled]);

  function startAlarm() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.0;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      const pulse = setInterval(() => {
        gain.gain.value = gain.gain.value > 0 ? 0.0 : 0.12;
      }, 350);
      audioCtxRef.current = ctx;
      gainRef.current = gain;
      oscRef.current = osc;
      pulseRef.current = pulse;
      setAlarmActive(true);
    } catch {}
  }

  function stopAlarm() {
    try {
      if (pulseRef.current) { clearInterval(pulseRef.current); pulseRef.current = null; }
      if (gainRef.current) { gainRef.current.gain.value = 0; }
      if (oscRef.current) { oscRef.current.stop(); oscRef.current.disconnect(); oscRef.current = null; }
      if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    } finally {
      setAlarmActive(false);
    }
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") { stopAlarm(); onClose(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <motion.div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-emerald-400/30 bg-slate-900/90 p-6 text-center shadow-xl" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-2 right-2 text-slate-400 hover:text-white" onClick={() => { stopAlarm(); onClose(); }} aria-label="Close">
          <X className="w-4 h-4" />
        </button>
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
          <Trophy className="h-6 w-6 text-emerald-300" />
        </div>
        <h3 className="text-xl font-semibold">Milestone unlocked!</h3>
        <p className="mt-1 text-sm text-slate-300">{loot.label}</p>
        <p className="mt-2 text-xs text-slate-400">Reached {loot.threshold} XP</p>
        <p className="mt-3 text-xs text-indigo-300">Time to take your break! A timer has started — try to complete it before returning.</p>

        <div className="mt-4">
          <div className={`text-3xl font-mono ${done ? 'text-red-300' : 'text-emerald-300'}`}>{formatDurationMs(remainingMs)}</div>
          <div className="mt-1 text-[11px] text-slate-400">Elapsed: {formatDurationMs(elapsedMs)} • Target: {maxMinutes} min</div>
          <div className="mt-3 flex items-center justify-center gap-2">
            {done ? (
              <button className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 text-xs disabled:opacity-60" onClick={stopAlarm} disabled={!alarmActive}>
                {alarmActive ? <BellOff className="w-4 h-4"/> : <BellRing className="w-4 h-4"/>}
                {alarmActive ? 'Alarm off' : 'Alarm off'}
              </button>
            ) : (
              <button className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 text-xs" onClick={() => setAlarmEnabled((v) => !v)}>
                {alarmEnabled ? <BellOff className="w-4 h-4"/> : <BellRing className="w-4 h-4"/>}
                {alarmEnabled ? 'Disable alarm' : 'Enable alarm'}
              </button>
            )}
          </div>
        </div>
        <button className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500" onClick={() => { stopAlarm(); onClose(); }}>Awesome!</button>
      </motion.div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((p) => (
          <motion.div key={p.id} className="absolute" style={{ left: `${p.leftPct}%`, top: "-5%" }} initial={{ y: "-10%", rotate: p.rotate, opacity: 0 }} animate={{ y: "110%", rotate: p.rotate + 360, opacity: 1 }} transition={{ delay: p.delay, duration: p.duration, ease: "easeOut" }}>
            <div style={{ width: p.size, height: p.size, backgroundColor: p.color, borderRadius: 2, boxShadow: "0 0 0 1px rgba(0,0,0,0.05)" }} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}


