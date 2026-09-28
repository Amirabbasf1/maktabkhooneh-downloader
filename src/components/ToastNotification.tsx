import React, { useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  ArrowRight,
} from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  timestamp?: number;
  duration?: number; // ms
}

interface ToastNotificationProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  lang: 'fa' | 'en';
}

// Synthesize pleasant notification chime via Web Audio API
export function playNotificationChime(type: 'success' | 'alert' = 'success') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Harmonic chord chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.start(now);
      osc.stop(now + 0.6);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(330, now + 0.15);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    // Audio might be blocked if user hasn't interacted with page
  }
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  toasts,
  onDismiss,
  lang,
}) => {
  const isFa = lang === 'fa';

  useEffect(() => {
    toasts.forEach((toast) => {
      const duration = toast.duration || 6000;
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, duration);
      return () => clearTimeout(timer);
    });
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      dir={isFa ? 'rtl' : 'ltr'}
      className="fixed bottom-6 start-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300 flex items-start gap-3 transition-all ${
              isSuccess
                ? 'bg-white/95 dark:bg-slate-900/95 border-emerald-500/50 text-slate-800 dark:text-slate-100 shadow-emerald-500/10 dark:shadow-emerald-950/40'
                : isError
                ? 'bg-white/95 dark:bg-slate-900/95 border-rose-500/50 text-slate-800 dark:text-slate-100 shadow-rose-500/10 dark:shadow-rose-950/40'
                : isWarning
                ? 'bg-white/95 dark:bg-slate-900/95 border-amber-500/50 text-slate-800 dark:text-slate-100 shadow-amber-500/10 dark:shadow-amber-950/40'
                : 'bg-white/95 dark:bg-slate-900/95 border-blue-500/50 text-slate-800 dark:text-slate-100 shadow-blue-500/10 dark:shadow-blue-950/40'
            }`}
          >
            {/* Status Icon */}
            <div
              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                isSuccess
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : isError
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : isWarning
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
              }`}
            >
              {isSuccess && <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />}
              {isError && <AlertCircle className="w-5 h-5 stroke-[2.5]" />}
              {isWarning && <AlertTriangle className="w-5 h-5 stroke-[2.5]" />}
              {t.type === 'info' && <Info className="w-5 h-5 stroke-[2.5]" />}
            </div>

            {/* Message Body */}
            <div className="flex-1 min-w-0 space-y-1">
              <h5 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center justify-between">
                <span>{t.title}</span>
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">{t.message}</p>

              {/* Action button if provided */}
              {t.actionLabel && t.onAction && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      t.onAction?.();
                      onDismiss(t.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isSuccess
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40'
                        : isError
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <span>{t.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => onDismiss(t.id)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
