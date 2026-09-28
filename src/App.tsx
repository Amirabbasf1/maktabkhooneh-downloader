import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  AuthStatus,
  CourseOutline,
  CourseChapter,
  CourseUnit,
  DownloadTaskStatus,
  CourseHistoryItem,
} from './types';
import { Navbar } from './components/Navbar';
import { CourseExplorer } from './components/CourseExplorer';
import { AuthModal } from './components/AuthModal';
import { UnitDetailsModal } from './components/UnitDetailsModal';
import { TaskManager } from './components/TaskManager';
import { LibraryManager } from './components/LibraryManager';
import { CliModal } from './components/CliModal';
import { SchedulerModal } from './components/SchedulerModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import {
  ToastNotification,
  ToastItem,
  playNotificationChime,
} from './components/ToastNotification';
import {
  HelpCircle,
  Clock,
} from 'lucide-react';

export const App: React.FC = () => {
  const [lang, setLang] = useState<'fa' | 'en'>('fa');
  const isFa = lang === 'fa';

  // Theme State (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('mk_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('mk_theme', next);
      } catch {}
      return next;
    });
  }, []);

  // Sync theme with html root class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Auth State
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  // Course State
  const [courseUrl, setCourseUrl] = useState('');
  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);

  // Course History and Bookmarks
  const [historyCourses, setHistoryCourses] = useState<CourseHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('mk_course_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveHistoryCourse = useCallback((newOutline: CourseOutline) => {
    setHistoryCourses((prev) => {
      const existing = prev.find((h) => h.slug === newOutline.courseSlug);
      const isBookmarked = existing ? existing.isBookmarked : false;
      const updatedItem: CourseHistoryItem = {
        slug: newOutline.courseSlug,
        title: newOutline.displayName || newOutline.courseSlug,
        url: newOutline.courseUrl,
        viewedAt: Date.now(),
        isBookmarked,
      };
      const filtered = prev.filter((h) => h.slug !== newOutline.courseSlug);
      const combined = [updatedItem, ...filtered].slice(0, 15);
      try {
        localStorage.setItem('mk_course_history', JSON.stringify(combined));
      } catch {}
      return combined;
    });
  }, []);

  const handleToggleBookmark = useCallback((slug: string) => {
    setHistoryCourses((prev) => {
      const updated = prev.map((item) =>
        item.slug === slug ? { ...item, isBookmarked: !item.isBookmarked } : item
      );
      try {
        localStorage.setItem('mk_course_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistoryCourses((prev) => {
      const bookmarked = prev.filter((h) => h.isBookmarked);
      try {
        localStorage.setItem('mk_course_history', JSON.stringify(bookmarked));
      } catch {}
      return bookmarked;
    });
  }, []);

  // Selection & Options State
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [sampleBytes, setSampleBytes] = useState<number>(0);
  const [qualityPreference, setQualityPreference] = useState<string>('highest');
  const [downloadSubtitles, setDownloadSubtitles] = useState<boolean>(true);
  const [downloadAttachments, setDownloadAttachments] = useState<boolean>(true);

  // Watched checklist persistence (localStorage)
  const [watchedUnits, setWatchedUnits] = useState<Record<string, boolean>>({});

  // Scheduler state (night automation without webhook)
  const [scheduleSettings, setScheduleSettings] = useState<{
    startTime: string;
    stopTime: string;
    enabled: boolean;
    soundChime: boolean;
    desktopNotification: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('mk_scheduler_v2');
      return saved
        ? JSON.parse(saved)
        : {
            startTime: '02:00',
            stopTime: '07:00',
            enabled: false,
            soundChime: true,
            desktopNotification: true,
          };
    } catch {
      return {
        startTime: '02:00',
        stopTime: '07:00',
        enabled: false,
        soundChime: true,
        desktopNotification: true,
      };
    }
  });

  // Download Task State
  const [task, setTask] = useState<DownloadTaskStatus | null>(null);
  const prevTaskStatusRef = useRef<string | null>(null);

  // On-screen Toast notifications state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Request browser notification permission
  const requestBrowserNotification = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Modals State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isCliOpen, setIsCliOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Unit details modal state
  const [activeUnit, setActiveUnit] = useState<CourseUnit | null>(null);
  const [activeChapter, setActiveChapter] = useState<CourseChapter | null>(null);
  const [isUnitDetailsOpen, setIsUnitDetailsOpen] = useState(false);

  // Update HTML document direction & lang
  useEffect(() => {
    document.documentElement.dir = isFa ? 'rtl' : 'ltr';
    document.documentElement.lang = isFa ? 'fa' : 'en';
  }, [isFa]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        toggleTheme();
        addToast({
          type: 'info',
          title: isFa ? 'تم تغییر کرد' : 'Theme Toggled',
          message: theme === 'dark' ? (isFa ? 'حالت روز فعال شد' : 'Light Mode') : (isFa ? 'حالت شب فعال شد' : 'Dark Mode'),
          duration: 2000,
        });
      } else if (e.key === '?') {
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsAuthOpen(false);
        setIsLibraryOpen(false);
        setIsCliOpen(false);
        setIsTaskOpen(false);
        setIsSchedulerOpen(false);
        setIsUnitDetailsOpen(false);
        setIsShortcutsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme, theme, isFa, addToast]);

  // Load Watched state when course changes
  useEffect(() => {
    if (outline?.courseSlug) {
      try {
        const saved = localStorage.getItem(`mk_watched_${outline.courseSlug}`);
        setWatchedUnits(saved ? JSON.parse(saved) : {});
      } catch {
        setWatchedUnits({});
      }
    }
  }, [outline?.courseSlug]);

  const handleToggleWatched = (unitId: string | number) => {
    if (!outline?.courseSlug) return;
    const strId = String(unitId);
    setWatchedUnits((prev) => {
      const updated = { ...prev, [strId]: !prev[strId] };
      try {
        localStorage.setItem(`mk_watched_${outline.courseSlug}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Fetch Auth Status
  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        setAuth(data);
      }
    } catch (err) {
      console.error('Failed to load auth status:', err);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Poll Task Status & Trigger On-Screen Notification on Completion/Error
  useEffect(() => {
    const checkTask = async () => {
      try {
        const res = await fetch('/api/download/task/status');
        if (res.ok) {
          const data: DownloadTaskStatus = await res.json();
          const prevStatus = prevTaskStatusRef.current;
          setTask(data);

          // Detect transition to completed
          if (prevStatus === 'running' && data.status === 'completed') {
            if (scheduleSettings.soundChime !== false) {
              playNotificationChime('success');
            }

            // Show on-screen floating toast notification
            addToast({
              type: 'success',
              title: isFa ? 'دانلود دوره تکمیل شد! 🎉' : 'Course Download Completed! 🎉',
              message: isFa
                ? `تمام درس‌های انتخابی دوره "${data.courseTitle}" با موفقیت دانلود و ذخیره شدند (${data.completedUnits} درس).`
                : `All selected lectures for "${data.courseTitle}" have been downloaded (${data.completedUnits} units).`,
              actionLabel: isFa ? 'مشاهده و دریافت فایل‌ها' : 'View & Download Files',
              onAction: () => setIsLibraryOpen(true),
              duration: 10000,
            });

            // Browser native notification if permission granted
            if (
              scheduleSettings.desktopNotification !== false &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification(isFa ? 'دانلود دوره مکتب‌خونه به پایان رسید!' : 'Maktabkhooneh Download Complete!', {
                body: `${data.courseTitle} - ${data.completedUnits} ${isFa ? 'درس ذخیره شد' : 'lectures saved'}`,
              });
            }
          } else if (prevStatus === 'running' && data.status === 'error') {
            if (scheduleSettings.soundChime !== false) {
              playNotificationChime('alert');
            }

            addToast({
              type: 'error',
              title: isFa ? 'خطا در دانلود دوره' : 'Download Error',
              message: isFa
                ? `فرآیند دانلود دوره "${data.courseTitle}" متوقف شد.`
                : `Download for "${data.courseTitle}" encountered an issue.`,
              actionLabel: isFa ? 'مشاهده لاگ‌ها' : 'View Task Logs',
              onAction: () => setIsTaskOpen(true),
              duration: 8000,
            });
          }

          prevTaskStatusRef.current = data.status;
        }
      } catch (err) {
        console.error('Task poll error:', err);
      }
    };

    checkTask();
    const interval = setInterval(checkTask, 1500);
    return () => clearInterval(interval);
  }, [addToast, isFa, scheduleSettings]);

  // Night scheduler monitor
  useEffect(() => {
    if (!scheduleSettings.enabled) return;

    const checkSchedule = () => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      // Check start trigger
      if (currentHHMM === scheduleSettings.startTime && outline && selectedUnits.length > 0) {
        if (!task || task.status !== 'running') {
          addToast({
            type: 'info',
            title: isFa ? 'شروع دانلود خودکار شبانه' : 'Scheduled Download Started',
            message: isFa
              ? `طبق برنامه زمان‌بندی، دانلود دوره "${outline.displayName}" در ساعت ${scheduleSettings.startTime} آغاز گردید.`
              : `Scheduled download for "${outline.displayName}" started at ${scheduleSettings.startTime}.`,
          });
          handleStartDownloadTask({
            selectedUnitIds: selectedUnits,
            sampleBytes,
            downloadSubtitles,
            downloadAttachments,
            qualityPreference,
          });
        }
      }

      // Check stop trigger
      if (currentHHMM === scheduleSettings.stopTime && task?.status === 'running') {
        addToast({
          type: 'warning',
          title: isFa ? 'توقف دانلود طبق زمان‌بندی' : 'Scheduled Download Stopped',
          message: isFa
            ? `طبق برنامه زمان‌بندی، دانلود در ساعت ${scheduleSettings.stopTime} متوقف شد.`
            : `Scheduled download stopped at ${scheduleSettings.stopTime}.`,
        });
        handleCancelTask();
      }
    };

    const interval = setInterval(checkSchedule, 30000);
    return () => clearInterval(interval);
  }, [
    scheduleSettings,
    outline,
    selectedUnits,
    task,
    sampleBytes,
    downloadSubtitles,
    downloadAttachments,
    qualityPreference,
    addToast,
    isFa,
  ]);

  const handleSaveSchedule = (newSettings: {
    startTime: string;
    stopTime: string;
    enabled: boolean;
    soundChime: boolean;
    desktopNotification: boolean;
  }) => {
    setScheduleSettings(newSettings);
    try {
      localStorage.setItem('mk_scheduler_v2', JSON.stringify(newSettings));
    } catch {}

    addToast({
      type: 'info',
      title: isFa ? 'تنظیمات زمان‌بندی ذخیره شد' : 'Scheduler Saved',
      message: newSettings.enabled
        ? isFa
          ? `دانلود خودکار بین ساعات ${newSettings.startTime} تا ${newSettings.stopTime} فعال است.`
          : `Automated downloads active between ${newSettings.startTime} and ${newSettings.stopTime}.`
        : isFa
        ? 'زمان‌بند دانلود غیرفعال شد.'
        : 'Scheduler is disabled.',
    });
  };

  // Fetch Course Outline
  const handleFetchOutline = async (url: string) => {
    setLoadingOutline(true);
    setCourseError(null);
    setSelectedUnits([]);
    try {
      const res = await fetch('/api/course/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch course');
      }
      setOutline(data);
      saveHistoryCourse(data);

      // Pre-select all video units by default for user convenience
      const allVideoIds: string[] = [];
      data.chapters.forEach((ch: CourseChapter) => {
        ch.units.forEach((u: CourseUnit) => {
          if (u.isVideo) allVideoIds.push(String(u.id));
        });
      });
      setSelectedUnits(allVideoIds);

      addToast({
        type: 'success',
        title: isFa ? 'دوره بارگذاری شد' : 'Course Loaded',
        message: `${data.displayName || data.courseSlug} (${data.totalLectures} ${isFa ? 'درس ویدیویی' : 'lectures'})`,
        duration: 4000,
      });
    } catch (err: any) {
      setCourseError(err.message || 'Error occurred while loading course');
      setOutline(null);
      addToast({
        type: 'error',
        title: isFa ? 'خطا در بارگذاری دوره' : 'Course Load Failed',
        message: err.message || 'Could not fetch course outline.',
      });
    } finally {
      setLoadingOutline(false);
    }
  };

  // Unit inspector opener
  const handleOpenUnitDetails = (unit: CourseUnit, chapter: CourseChapter) => {
    setActiveUnit(unit);
    setActiveChapter(chapter);
    setIsUnitDetailsOpen(true);
  };

  // Start background download task
  const handleStartDownloadTask = async (options: {
    selectedUnitIds: string[];
    sampleBytes: number;
    downloadSubtitles: boolean;
    downloadAttachments: boolean;
    qualityPreference: string;
  }) => {
    if (!outline) return;
    try {
      const res = await fetch('/api/download/task/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseUrl: outline.courseUrl,
          courseSlug: outline.courseSlug,
          selectedUnitIds: options.selectedUnitIds,
          sampleBytes: options.sampleBytes,
          downloadSubtitles: options.downloadSubtitles,
          downloadAttachments: options.downloadAttachments,
          qualityPreference: options.qualityPreference,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start download');
      }

      addToast({
        type: 'info',
        title: isFa ? 'دانلود آغاز شد' : 'Download Started',
        message: isFa
          ? `دانلود ${options.selectedUnitIds.length} درس از دوره "${outline.displayName}" در سرور شروع شد.`
          : `Started downloading ${options.selectedUnitIds.length} lectures on server.`,
        actionLabel: isFa ? 'مشاهده پیشرفت' : 'View Progress',
        onAction: () => setIsTaskOpen(true),
      });

      setIsTaskOpen(true);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: isFa ? 'خطا در شروع دانلود' : 'Task Start Failed',
        message: err.message || 'Failed to start task',
      });
    }
  };

  // Cancel task
  const handleCancelTask = async () => {
    try {
      await fetch('/api/download/task/cancel', { method: 'POST' });
      addToast({
        type: 'warning',
        title: isFa ? 'دانلود متوقف شد' : 'Download Cancelled',
        message: isFa ? 'فرآیند دانلود توسط شما متوقف گردید.' : 'Download task was cancelled.',
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-['Vazirmatn',sans-serif] transition-colors duration-200">
      {/* Top Navbar with Theme Toggle */}
      <Navbar
        auth={auth}
        task={task}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenCli={() => setIsCliOpen(true)}
        onOpenTask={() => setIsTaskOpen(true)}
        onOpenScheduler={() => setIsSchedulerOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        lang={lang}
        setLang={setLang}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner / Auth Reminder if not authenticated */}
        {!auth?.isAuthenticated && !auth?.hasCookie && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-300">
                  {isFa ? 'نیاز به ورود به حساب کاربری مکتب‌خونه' : 'Maktabkhooneh Login Required'}
                </h4>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  {isFa
                    ? 'برای دسترسی و دانلود کامل دوره‌های خریداری شده یا ویدیوهای اشتراکی، لطفاً وارد حساب خود شوید.'
                    : 'To access and download purchased or subscription courses, sign in with your credentials.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium shrink-0 transition-colors cursor-pointer text-xs shadow-2xs"
            >
              {isFa ? 'ورود به حساب کاربری' : 'Sign In Now'}
            </button>
          </div>
        )}

        {/* Scheduler Active Indicator Bar */}
        {scheduleSettings.enabled && (
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 flex items-center justify-between text-xs text-purple-900 dark:text-purple-300 transition-colors">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>
                {isFa ? 'زمان‌بند دانلود شبانه فعال است:' : 'Night scheduler is active:'}{' '}
                <strong className="font-mono text-purple-950 dark:text-white">
                  {scheduleSettings.startTime} تا {scheduleSettings.stopTime}
                </strong>
              </span>
            </div>
            <button
              onClick={() => setIsSchedulerOpen(true)}
              className="text-purple-600 dark:text-purple-400 font-medium hover:underline cursor-pointer"
            >
              {isFa ? 'تنظیم مجدد' : 'Configure'}
            </button>
          </div>
        )}

        {/* Course Error alert */}
        {courseError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
            <span>{courseError}</span>
            <button
              onClick={() => setCourseError(null)}
              className="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-white font-mono cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Course Explorer Workspace */}
        <CourseExplorer
          courseUrl={courseUrl}
          setCourseUrl={setCourseUrl}
          outline={outline}
          loading={loadingOutline}
          onFetchOutline={handleFetchOutline}
          selectedUnits={selectedUnits}
          setSelectedUnits={setSelectedUnits}
          onOpenUnitDetails={handleOpenUnitDetails}
          onStartDownloadTask={handleStartDownloadTask}
          onOpenCli={() => setIsCliOpen(true)}
          onOpenScheduler={() => setIsSchedulerOpen(true)}
          sampleBytes={sampleBytes}
          setSampleBytes={setSampleBytes}
          qualityPreference={qualityPreference}
          setQualityPreference={setQualityPreference}
          downloadSubtitles={downloadSubtitles}
          setDownloadSubtitles={setDownloadSubtitles}
          downloadAttachments={downloadAttachments}
          setDownloadAttachments={setDownloadAttachments}
          watchedUnits={watchedUnits}
          onToggleWatched={handleToggleWatched}
          historyCourses={historyCourses}
          onSelectHistoryCourse={(url) => {
            setCourseUrl(url);
            handleFetchOutline(url);
          }}
          onToggleBookmark={handleToggleBookmark}
          onClearHistory={handleClearHistory}
          lang={lang}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 py-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Maktabkhooneh Downloader v1.3</span>
            <span>•</span>
            <span>GPL-3.0 License</span>
            <span>•</span>
            <span className="text-slate-400">Node.js 22 + React</span>
          </div>
          <div className="text-slate-500">
            {isFa
              ? 'فقط برای دوره‌ها و محتوایی که دسترسی قانونی به آن دارید.'
              : 'Only download content you have legal access to.'}
          </div>
        </div>
      </footer>

      {/* On-Screen Floating Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} lang={lang} />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        auth={auth}
        onRefreshAuth={refreshAuth}
        lang={lang}
      />

      <UnitDetailsModal
        isOpen={isUnitDetailsOpen}
        onClose={() => setIsUnitDetailsOpen(false)}
        unit={activeUnit}
        courseUrl={outline?.courseUrl || courseUrl}
        courseSlug={outline?.courseSlug || ''}
        isNewFormat={outline?.isNewFormat || true}
        lang={lang}
      />

      <TaskManager
        isOpen={isTaskOpen}
        onClose={() => setIsTaskOpen(false)}
        task={task}
        onCancelTask={handleCancelTask}
        lang={lang}
      />

      <LibraryManager
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        lang={lang}
      />

      <CliModal
        isOpen={isCliOpen}
        onClose={() => setIsCliOpen(false)}
        courseUrl={outline?.courseUrl || courseUrl}
        sampleBytes={sampleBytes}
        auth={auth}
        lang={lang}
      />

      <SchedulerModal
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        onSaveSchedule={handleSaveSchedule}
        currentSchedule={scheduleSettings}
        onRequestBrowserNotification={requestBrowserNotification}
        lang={lang}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        lang={lang}
      />
    </div>
  );
};

export default App;
