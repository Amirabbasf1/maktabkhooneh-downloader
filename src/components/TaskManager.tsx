import React, { useEffect, useRef } from 'react';
import { DownloadTaskStatus } from '../types';
import {
  X,
  Activity,
  Square,
  CheckCircle2,
  AlertTriangle,
  Folder,
  Loader2,
  Trash2,
  Terminal,
} from 'lucide-react';

interface TaskManagerProps {
  isOpen: boolean;
  onClose: () => void;
  task: DownloadTaskStatus | null;
  onCancelTask: () => void;
  lang: 'fa' | 'en';
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  isOpen,
  onClose,
  task,
  onCancelTask,
  lang,
}) => {
  const isFa = lang === 'fa';
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, task?.logs?.length]);

  if (!isOpen) return null;

  const isRunning = task?.status === 'running';

  const formatBytes = (bytes?: number) => {
    if (bytes == null || isNaN(bytes)) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let n = Number(bytes);
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isRunning
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : task?.status === 'completed'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Activity className={`w-5 h-5 ${isRunning ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {isFa ? 'مدیریت دانلودهای سرور' : 'Server Download Manager'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {task?.courseTitle || (isFa ? 'هیچ وظیفه‌ای در حال اجرا نیست' : 'No active task')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Progress & Status Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {task && task.status !== 'idle' ? (
            <>
              {/* Progress Overview Card */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isRunning
                          ? 'bg-emerald-500 animate-ping'
                          : task.status === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {isRunning
                        ? isFa
                          ? 'در حال دانلود'
                          : 'Downloading'
                        : task.status === 'completed'
                        ? isFa
                          ? 'تکمیل شده'
                          : 'Completed'
                        : task.status === 'cancelled'
                        ? isFa
                          ? 'لغو شده'
                          : 'Cancelled'
                        : isFa
                        ? 'خطا'
                        : 'Error'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-slate-500 dark:text-slate-400 text-xs">
                    <span>{task.currentSpeed || '0 B/s'}</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{task.currentPercentage}%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, task.currentPercentage))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span className="truncate max-w-xs">{task.currentUnitTitle}</span>
                    <span>
                      {formatBytes(task.currentDownloadedBytes)} /{' '}
                      {formatBytes(task.currentTotalBytes)}
                    </span>
                  </div>
                </div>

                {/* Counters Grid */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-center">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 shadow-2xs">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{isFa ? 'کل ویدیوها' : 'Total'}</div>
                    <div className="text-base font-bold text-slate-800 dark:text-slate-100 font-mono">
                      {task.totalUnits}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 shadow-2xs">
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400">{isFa ? 'دانلود شده' : 'Done'}</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {task.completedUnits}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 shadow-2xs">
                    <div className="text-[11px] text-amber-600 dark:text-amber-400">{isFa ? 'رد شده' : 'Skipped'}</div>
                    <div className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono">
                      {task.skippedUnits}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 shadow-2xs">
                    <div className="text-[11px] text-rose-600 dark:text-rose-400">{isFa ? 'ناموفق' : 'Failed'}</div>
                    <div className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono">
                      {task.failedUnits}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {isRunning && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={onCancelTask}
                      className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                    >
                      <Square className="w-3.5 h-3.5 fill-rose-600 dark:fill-rose-300 text-rose-600 dark:text-rose-300" />
                      <span>{isFa ? 'توقف و لغو دانلود' : 'Cancel Task'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Logs Console */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Terminal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>{isFa ? 'لاگ‌های زنده دانلود' : 'Live Execution Logs'}</span>
                  </div>
                  <span className="text-[11px] font-mono">{task.logs?.length || 0} {isFa ? 'خط' : 'lines'}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-56 overflow-y-auto space-y-1.5 leading-relaxed selection:bg-emerald-500/30">
                  {task.logs && task.logs.length > 0 ? (
                    task.logs.map((line, idx) => (
                      <div
                        key={idx}
                        className={`truncate ${
                          line.includes('❌') || line.includes('FAIL')
                            ? 'text-rose-400'
                            : line.includes('✅') || line.includes('DOWNLOADED')
                            ? 'text-emerald-400 font-semibold'
                            : line.includes('⚠️') || line.includes('SKIP')
                            ? 'text-amber-400'
                            : line.includes('🎬') || line.includes('▶️')
                            ? 'text-teal-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {line}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-600 italic">No logs yet...</div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-3">
              <Activity className="w-12 h-12 mx-auto stroke-[1.5] text-slate-300 dark:text-slate-700" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-400">
                  {isFa ? 'هیچ دانلودی در سرور در جریان نیست' : 'No active download task on server'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-600 mt-1">
                  {isFa
                    ? 'از صفحه دوره می‌توانید دکمه "دانلود در سرور" را بزنید.'
                    : 'Select lectures from a course to start batch downloading.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
