import React from 'react';
import { AuthStatus, DownloadTaskStatus } from '../types';
import {
  Download,
  User,
  AlertCircle,
  FolderOpen,
  Terminal,
  Activity,
  Globe,
  Loader2,
  ShieldCheck,
  Clock,
  Sun,
  Moon,
  Keyboard,
} from 'lucide-react';

interface NavbarProps {
  auth: AuthStatus | null;
  task: DownloadTaskStatus | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  onOpenLibrary: () => void;
  onOpenCli: () => void;
  onOpenTask: () => void;
  onOpenScheduler: () => void;
  onOpenShortcuts?: () => void;
  lang: 'fa' | 'en';
  setLang: (l: 'fa' | 'en') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  auth,
  task,
  theme,
  onToggleTheme,
  onOpenAuth,
  onOpenLibrary,
  onOpenCli,
  onOpenTask,
  onOpenScheduler,
  onOpenShortcuts,
  lang,
  setLang,
}) => {
  const isFa = lang === 'fa';
  const isDark = theme === 'dark';
  const isDownloading = task?.status === 'running';

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white font-bold">
            <Download className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {isFa ? 'دانلودر مکتب‌خونه' : 'Maktabkhooneh Downloader'}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                v1.3.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              {isFa ? 'دانلود دوره‌ها، ویدیوها، زیرنویس و ضمیمه‌های آموزشی' : 'Download courses, videos & learning attachments'}
            </p>
          </div>
        </div>

        {/* Center Task Tracker (if active) */}
        {isDownloading && (
          <button
            onClick={onOpenTask}
            className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-500/30 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-500/40 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all cursor-pointer animate-pulse"
          >
            <Loader2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <div className="text-right text-xs">
              <div className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                <span>{isFa ? 'در حال دانلود:' : 'Downloading:'}</span>
                <span className="font-mono">{task.currentPercentage}%</span>
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400/80 font-mono">{task.currentSpeed}</div>
            </div>
          </button>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Scheduler button */}
          <button
            onClick={onOpenScheduler}
            title={isFa ? 'زمان‌بندی دانلود شبانه' : 'Night Scheduler'}
            className="p-2 sm:px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="hidden lg:inline">{isFa ? 'زمان‌بند' : 'Scheduler'}</span>
          </button>

          {/* Library / Downloaded files */}
          <button
            onClick={onOpenLibrary}
            title={isFa ? 'فایل‌های دانلود شده' : 'Downloaded Files'}
            className="p-2 sm:px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="hidden md:inline">{isFa ? 'فایل‌ها' : 'Files'}</span>
          </button>

          {/* CLI Generator */}
          <button
            onClick={onOpenCli}
            title={isFa ? 'دستورات ترمینال (CLI)' : 'Terminal Commands'}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </button>

          {/* Active Tasks button */}
          <button
            onClick={onOpenTask}
            title={isFa ? 'مدیریت دانلودها' : 'Download Manager'}
            className={`p-2 rounded-lg border text-sm flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDownloading
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Theme Toggle (Light / Dark) */}
          <button
            onClick={onToggleTheme}
            title={
              isFa
                ? isDark
                  ? 'تغییر به حالت روز (روشن)'
                  : 'تغییر به حالت شب (تاریک)'
                : isDark
                ? 'Switch to Light mode'
                : 'Switch to Dark mode'
            }
            aria-label="Toggle Theme"
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-xs flex items-center transition-colors cursor-pointer group"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-sky-600 group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* Keyboard Shortcuts button */}
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              title={isFa ? 'کلیدهای میانبر (راهنما)' : 'Keyboard Shortcuts (?)'}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-400 text-xs hidden sm:flex items-center transition-colors cursor-pointer"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          )}

          {/* Auth / Account button */}
          <button
            onClick={onOpenAuth}
            className={`p-2 sm:px-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
              auth?.isAuthenticated
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                : auth?.hasCookie
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500/30 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40'
            }`}
          >
            {auth?.isAuthenticated ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="max-w-[100px] truncate hidden sm:inline">
                  {auth.coreData?.auth?.details?.email || auth.activeUser}
                </span>
                <span className="sm:hidden font-mono text-[11px]">{isFa ? 'کاربر' : 'Auth'}</span>
              </>
            ) : auth?.hasCookie ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">{isFa ? 'کوکی فعال' : 'Cookie'}</span>
                <span className="sm:hidden text-[11px]">{isFa ? 'کوکی' : 'Cookie'}</span>
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>{isFa ? 'ورود' : 'Sign In'}</span>
              </>
            )}
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLang(isFa ? 'en' : 'fa')}
            title={isFa ? 'تغییر زبان به انگلیسی' : 'Switch language to Persian'}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isFa ? 'EN' : 'فا'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
