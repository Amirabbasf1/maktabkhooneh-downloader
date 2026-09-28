import React, { useState, useEffect } from 'react';
import { Clock, Check, X, Bell, Volume2 } from 'lucide-react';

interface SchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSchedule: (options: {
    startTime: string;
    stopTime: string;
    enabled: boolean;
    soundChime: boolean;
    desktopNotification: boolean;
  }) => void;
  currentSchedule: {
    startTime: string;
    stopTime: string;
    enabled: boolean;
    soundChime?: boolean;
    desktopNotification?: boolean;
  };
  onRequestBrowserNotification: () => void;
  lang: 'fa' | 'en';
}

export const SchedulerModal: React.FC<SchedulerModalProps> = ({
  isOpen,
  onClose,
  onSaveSchedule,
  currentSchedule,
  onRequestBrowserNotification,
  lang,
}) => {
  const isFa = lang === 'fa';
  const [startTime, setStartTime] = useState(currentSchedule.startTime || '02:00');
  const [stopTime, setStopTime] = useState(currentSchedule.stopTime || '07:00');
  const [enabled, setEnabled] = useState(currentSchedule.enabled || false);
  const [soundChime, setSoundChime] = useState(currentSchedule.soundChime !== false);
  const [desktopNotification, setDesktopNotification] = useState(
    currentSchedule.desktopNotification !== false
  );

  useEffect(() => {
    setStartTime(currentSchedule.startTime || '02:00');
    setStopTime(currentSchedule.stopTime || '07:00');
    setEnabled(currentSchedule.enabled || false);
    setSoundChime(currentSchedule.soundChime !== false);
    setDesktopNotification(currentSchedule.desktopNotification !== false);
  }, [currentSchedule, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSchedule({
      startTime,
      stopTime,
      enabled,
      soundChime,
      desktopNotification,
    });
    if (desktopNotification) {
      onRequestBrowserNotification();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {isFa ? 'زمان‌بندی دانلود خودکار شبانه' : 'Night Download Scheduler'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isFa
                  ? 'تنظیم بازه دانلود شبانه و دریافت اعلان روی صفحه'
                  : 'Automate off-peak downloads with on-screen alerts'}
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

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {/* Enable Switch */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                {isFa ? 'فعال‌سازی دانلود خودکار زمان‌بندی‌شده' : 'Enable Scheduled Downloads'}
              </span>
              <span className="text-[11px] text-slate-500">
                {isFa
                  ? 'اجرای وظایف دانلود به صورت خودکار در ساعت تعیین‌شده'
                  : 'Automatically trigger tasks during set hours'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Time pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>{isFa ? 'ساعت شروع (مثلاً شبانه):' : 'Start Time:'}</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>{isFa ? 'ساعت توقف:' : 'Stop Time:'}</span>
              </label>
              <input
                type="time"
                value={stopTime}
                onChange={(e) => setStopTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Alert Preferences */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="font-semibold text-slate-900 dark:text-slate-200 block">
              {isFa ? 'تنظیمات اعلان‌های اتمام دانلود:' : 'Notification Preferences:'}
            </span>

            {/* Sound toggle */}
            <label className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="text-slate-900 dark:text-slate-200 block font-medium">
                    {isFa ? 'پخش صدای زنگ هنگام اتمام' : 'Play audio chime on finish'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isFa
                      ? 'یک زنگ ملایم صوتی جهت باخبر شدن کاربر'
                      : 'Pleasant audio chime when downloads complete'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundChime}
                onChange={(e) => setSoundChime(e.target.checked)}
                className="rounded bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-0"
              />
            </label>

            {/* Desktop Notification toggle */}
            <label className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <div>
                  <span className="text-slate-900 dark:text-slate-200 block font-medium">
                    {isFa ? 'اعلان سیستم مرورگر (Desktop Notification)' : 'Browser Desktop Notification'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isFa
                      ? 'نمایش اعلان حتی در صورتی که تب دیگری باز باشد'
                      : 'Show OS alert even when viewing another browser tab'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={desktopNotification}
                onChange={(e) => setDesktopNotification(e.target.checked)}
                className="rounded bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-0"
              />
            </label>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              {isFa ? 'انصراف' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isFa ? 'ذخیره تنظیمات' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
