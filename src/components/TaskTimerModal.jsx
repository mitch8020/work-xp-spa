import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Timer as TimerIcon, Check, BellRing, BellOff } from "lucide-react";
import { formatDurationMs } from "../helpers.jsx";

export default function TaskTimerModal({ task, maxMinutes, onComplete, onClose, defaultAlarmEnabled = true }) {
  const [startMs] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainRef = useRef(null);
  const oscRef = useRef(null);
  const pulseRef = useRef(null);
  const [alarmActive, setAlarmActive] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(Boolean(defaultAlarmEnabled));
  const originalTitleRef = useRef(document.title);
  const originalFaviconRef = useRef(null);

  const maxMs = maxMinutes * 60 * 1000;
  const remainingMs = Math.max(0, maxMs - elapsedMs);
  const done = remainingMs <= 0;

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsedMs(Date.now() - startMs), 300);
    return () => {
      clearInterval(intervalRef.current);
      stopAlarm();
      restoreAttention();
    };
  }, [startMs]);

  useEffect(() => {
    if (done && !alarmActive && alarmEnabled) {
      startAlarm();
    }
  }, [done, alarmEnabled]);

  function setAttention(active) {
    try {
      const link = document.querySelector("link[rel='icon']");
      if (!originalFaviconRef.current && link) originalFaviconRef.current = link.getAttribute("href");
      if (active) {
        document.title = "⏰ Time's up — Work XP";
        if (link) link.setAttribute("href", "/favicon-alert.svg");
      } else {
        restoreAttention();
      }
    } catch {}
  }

  function restoreAttention() {
    try {
      document.title = originalTitleRef.current || document.title;
      const link = document.querySelector("link[rel='icon']");
      if (link && originalFaviconRef.current) link.setAttribute("href", originalFaviconRef.current);
    } catch {}
  }

  function startAlarm() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880; // A5
      gain.gain.value = 0.0;
      osc.connect(gain).connect(ctx.destination);
      osc.start();

      // Pulse the bell: on/off every 350ms
      const pulse = setInterval(() => {
        if (!gain) return;
        gain.gain.value = gain.gain.value > 0 ? 0.0 : 0.12;
      }, 350);

      audioCtxRef.current = ctx;
      gainRef.current = gain;
      oscRef.current = osc;
      pulseRef.current = pulse;
      setAlarmActive(true);
      setAttention(true);
    } catch (e) {
      // ignore alarm start errors
    }
  }

  function stopAlarm() {
    try {
      if (pulseRef.current) {
        clearInterval(pulseRef.current);
        pulseRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.gain.value = 0;
      }
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } finally {
      setAlarmActive(false);
      setAttention(false);
    }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { stopAlarm(); onClose(); }}>
      <div className="absolute inset-0 bg-black/70" />
      <motion.div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 22 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Timer — {task?.name}</h3>
          <button className="text-slate-400 hover:text-white" onClick={() => { stopAlarm(); onClose(); }} aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="text-xs text-slate-400">Max allotted: {maxMinutes} min</div>
        <div className="mt-4 flex items-center justify-center">
          <div className={`text-4xl font-mono ${done ? 'text-red-300' : 'text-emerald-300'}`}>{formatDurationMs(remainingMs)}</div>
        </div>
        <div className="mt-2 text-center text-xs text-slate-400">Elapsed: {formatDurationMs(elapsedMs)}</div>

        <div className="mt-4 flex items-center justify-between gap-2">
          {done ? (
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 text-sm disabled:opacity-60"
              onClick={stopAlarm}
              disabled={!alarmActive}
              title="Stop alarm"
            >
              {alarmActive ? <BellOff className="w-4 h-4"/> : <BellRing className="w-4 h-4"/>}
              {alarmActive ? 'Alarm off' : 'Alarm off'}
            </button>
          ) : (
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 text-sm"
              onClick={() => setAlarmEnabled((v) => !v)}
              title={alarmEnabled ? 'Disable alarm' : 'Enable alarm'}
            >
              {alarmEnabled ? <BellOff className="w-4 h-4"/> : <BellRing className="w-4 h-4"/>}
              {alarmEnabled ? 'Disable alarm' : 'Enable alarm'}
            </button>
          )}
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-sm"
            onClick={() => {
              const durationMs = Date.now() - startMs;
              stopAlarm();
              onComplete({ taskId: task.id, name: task.name, xp: task.xp, durationMs });
            }}
          >
            <Check className="w-4 h-4" /> Complete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


