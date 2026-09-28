import React, { useState, useMemo } from 'react';
import { CourseOutline, CourseChapter, CourseUnit, CourseHistoryItem } from '../types';
import {
  Search,
  BookOpen,
  Film,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Sparkles,
  Clock,
  Check,
  CheckCircle,
  Circle,
  HardDrive,
  Bookmark,
  History,
  Info,
} from 'lucide-react';

interface CourseExplorerProps {
  courseUrl: string;
  setCourseUrl: (url: string) => void;
  outline: CourseOutline | null;
  loading: boolean;
  onFetchOutline: (url: string) => void;
  selectedUnits: string[];
  setSelectedUnits: React.Dispatch<React.SetStateAction<string[]>>;
  onOpenUnitDetails: (unit: CourseUnit, chapter: CourseChapter) => void;
  onStartDownloadTask: (options: {
    selectedUnitIds: string[];
    sampleBytes: number;
    downloadSubtitles: boolean;
    downloadAttachments: boolean;
    qualityPreference: string;
  }) => void;
  onOpenCli: () => void;
  onOpenScheduler: () => void;
  sampleBytes: number;
  setSampleBytes: (b: number) => void;
  qualityPreference: string;
  setQualityPreference: (q: string) => void;
  downloadSubtitles: boolean;
  setDownloadSubtitles: (b: boolean) => void;
  downloadAttachments: boolean;
  setDownloadAttachments: (b: boolean) => void;
  watchedUnits: Record<string, boolean>;
  onToggleWatched: (unitId: string | number) => void;
  historyCourses?: CourseHistoryItem[];
  onSelectHistoryCourse?: (url: string) => void;
  onToggleBookmark?: (slug: string) => void;
  onClearHistory?: () => void;
  lang: 'fa' | 'en';
}

export const CourseExplorer: React.FC<CourseExplorerProps> = ({
  courseUrl,
  setCourseUrl,
  outline,
  loading,
  onFetchOutline,
  selectedUnits,
  setSelectedUnits,
  onOpenUnitDetails,
  onStartDownloadTask,
  onOpenCli,
  onOpenScheduler,
  sampleBytes,
  setSampleBytes,
  qualityPreference,
  setQualityPreference,
  downloadSubtitles,
  setDownloadSubtitles,
  downloadAttachments,
  setDownloadAttachments,
  watchedUnits,
  onToggleWatched,
  historyCourses = [],
  onSelectHistoryCourse,
  onToggleBookmark,
  onClearHistory,
  lang,
}) => {
  const isFa = lang === 'fa';
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({ '1': true });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'subtitles' | 'attachments' | 'unwatched' | 'watched' | 'free'
  >('all');

  const toggleChapter = (chId: string | number) => {
    setOpenChapters((prev) => ({
      ...prev,
      [String(chId)]: !prev[String(chId)],
    }));
  };

  const handleSelectAllVideos = () => {
    if (!outline) return;
    const allVideoUnitIds: string[] = [];
    outline.chapters.forEach((ch) => {
      ch.units.forEach((u) => {
        if (u.isVideo) allVideoUnitIds.push(String(u.id));
      });
    });
    setSelectedUnits(allVideoUnitIds);
  };

  const handleSelectAllNonVideos = () => {
    if (!outline) return;
    const allNonVideoIds: string[] = [];
    outline.chapters.forEach((ch) => {
      ch.units.forEach((u) => {
        if (!u.isVideo) allNonVideoIds.push(String(u.id));
      });
    });
    setSelectedUnits(allNonVideoIds);
  };

  const handleSelectUnwatchedOnly = () => {
    if (!outline) return;
    const unwatchedIds: string[] = [];
    outline.chapters.forEach((ch) => {
      ch.units.forEach((u) => {
        if (!watchedUnits[String(u.id)]) {
          unwatchedIds.push(String(u.id));
        }
      });
    });
    setSelectedUnits(unwatchedIds);
  };

  const handleInvertSelection = () => {
    if (!outline) return;
    const allIds: string[] = [];
    outline.chapters.forEach((ch) => {
      ch.units.forEach((u) => {
        allIds.push(String(u.id));
      });
    });
    setSelectedUnits(allIds.filter((id) => !selectedUnits.includes(id)));
  };

  const handleDeselectAll = () => {
    setSelectedUnits([]);
  };

  const handleSelectChapter = (ch: CourseChapter) => {
    const chVideoIds = ch.units.filter((u) => u.isVideo).map((u) => String(u.id));
    const allSelected = chVideoIds.every((id) => selectedUnits.includes(id));
    if (allSelected) {
      setSelectedUnits((prev) => prev.filter((id) => !chVideoIds.includes(id)));
    } else {
      setSelectedUnits((prev) => Array.from(new Set([...prev, ...chVideoIds])));
    }
  };

  const toggleUnit = (uId: string | number) => {
    const strId = String(uId);
    setSelectedUnits((prev) =>
      prev.includes(strId) ? prev.filter((id) => id !== strId) : [...prev, strId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (courseUrl.trim()) {
      onFetchOutline(courseUrl.trim());
    }
  };

  // Estimated Size Calculation
  const sizeEstimates = useMemo(() => {
    const count = selectedUnits.length;
    return {
      '1080': count * 95,
      '720': count * 48,
      '480': count * 26,
      '360': count * 16,
      audio: count * 8,
    };
  }, [selectedUnits.length]);

  const formatSize = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  };

  // Watched progress calculation
  const totalVideoUnits = useMemo(() => {
    if (!outline) return 0;
    return outline.chapters.reduce(
      (acc, ch) => acc + ch.units.filter((u) => u.isVideo).length,
      0
    );
  }, [outline]);

  const totalOtherUnits = useMemo(() => {
    if (!outline) return 0;
    return outline.chapters.reduce(
      (acc, ch) => acc + ch.units.filter((u) => !u.isVideo).length,
      0
    );
  }, [outline]);

  const watchedCount = useMemo(() => {
    return Object.values(watchedUnits).filter(Boolean).length;
  }, [watchedUnits]);

  const watchedPercentage =
    totalVideoUnits > 0 ? Math.round((watchedCount / totalVideoUnits) * 100) : 0;

  // Filtered chapters & units
  const filteredChapters = useMemo(() => {
    if (!outline) return [];
    return outline.chapters
      .map((ch) => {
        const units = ch.units.filter((u) => {
          const matchesQuery =
            !searchQuery.trim() ||
            u.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.slug.toLowerCase().includes(searchQuery.toLowerCase());

          if (!matchesQuery) return false;

          const isWatched = !!watchedUnits[String(u.id)];
          if (filterType === 'subtitles') return u.hasCaption;
          if (filterType === 'attachments') return true;
          if (filterType === 'watched') return isWatched;
          if (filterType === 'unwatched') return !isWatched;
          if (filterType === 'free') return !u.isLocked;

          return true;
        });

        return {
          ...ch,
          units,
        };
      })
      .filter((ch) => ch.units.length > 0 || !searchQuery.trim());
  }, [outline, searchQuery, filterType, watchedUnits]);

  const isCurrentCourseBookmarked = useMemo(() => {
    if (!outline) return false;
    const found = historyCourses.find((h) => h.slug === outline.courseSlug);
    return !!found?.isBookmarked;
  }, [outline, historyCourses]);

  return (
    <div className="space-y-6">
      {/* Course Search Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl backdrop-blur-sm space-y-4 transition-colors">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{isFa ? 'تحلیل و دانلود دوره مکتب‌خونه' : 'Inspect & Download Maktabkhooneh Course'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isFa
              ? 'آدرس صفحه یا جلسه دوره مکتب‌خونه را وارد کنید یا از تاریخچه انتخاب نمایید.'
              : 'Enter course or lecture URL, or choose from recent history.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              dir="ltr"
              value={courseUrl}
              onChange={(e) => setCourseUrl(e.target.value)}
              placeholder="https://maktabkhooneh.org/course/.../ or /lms/course/.../unit/.../"
              className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm font-mono transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          </div>

          <button
            type="submit"
            disabled={loading || !courseUrl.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isFa ? 'در حال واکشی...' : 'Analyzing...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isFa ? 'دریافت اطلاعات دوره' : 'Analyze Course'}</span>
              </>
            )}
          </button>
        </form>

        {/* Course History & Bookmark Quick Chips */}
        {historyCourses.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
              <History className="w-3.5 h-3.5" />
              <span>{isFa ? 'دوره‌های اخیر:' : 'Recent:'}</span>
            </div>
            {historyCourses.slice(0, 6).map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => {
                  setCourseUrl(item.url);
                  if (onSelectHistoryCourse) onSelectHistoryCourse(item.url);
                  else onFetchOutline(item.url);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  outline?.courseSlug === item.slug
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title={item.title}
              >
                {item.isBookmarked && (
                  <Bookmark className="w-3 h-3 fill-amber-400 text-amber-500" />
                )}
                <span className="max-w-[140px] truncate">{item.title}</span>
              </button>
            ))}

            {onClearHistory && (
              <button
                type="button"
                onClick={onClearHistory}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer mr-auto"
              >
                {isFa ? 'پاکسازی' : 'Clear'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Course Overview & Outline */}
      {outline && (
        <div className="space-y-6">
          {/* Overview Info Bar */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl space-y-4 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    {outline.isNewFormat ? 'LMS API v1' : 'Standard API'}
                  </span>
                  {outline.courseId && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                      ID: {outline.courseId}
                    </span>
                  )}
                  {onToggleBookmark && (
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(outline.courseSlug)}
                      title={isCurrentCourseBookmarked ? 'نشان‌شده (حذف)' : 'نشان کردن دوره'}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-500 cursor-pointer transition-colors"
                    >
                      <Bookmark
                        className={`w-4 h-4 ${
                          isCurrentCourseBookmarked ? 'fill-amber-400' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-1">
                  {outline.displayName || outline.courseSlug}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-xl">
                  {outline.courseUrl}
                </p>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isFa ? 'فصل‌ها' : 'Chapters'}
                  </div>
                  <div className="text-base font-bold text-slate-800 dark:text-white font-mono">
                    {outline.totalChapters}
                  </div>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    {isFa ? 'ویدیوها' : 'Lectures'}
                  </div>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {outline.totalLectures}
                  </div>
                </div>
                {totalOtherUnits > 0 && (
                  <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[11px] text-blue-600 dark:text-blue-400">
                      {isFa ? 'تمرین/متن' : 'Other'}
                    </div>
                    <div className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {totalOtherUnits}
                    </div>
                  </div>
                )}
                <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[11px] text-teal-600 dark:text-teal-400">
                    {isFa ? 'پیشرفت' : 'Progress'}
                  </div>
                  <div className="text-base font-bold text-teal-600 dark:text-teal-400 font-mono">
                    {watchedPercentage}%
                  </div>
                </div>
              </div>
            </div>

            {/* Course Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{isFa ? 'پیشرفت مطالعه و مشاهده دوره:' : 'Course Study Progress:'}</span>
                <span className="font-mono">
                  {watchedCount} / {totalVideoUnits} {isFa ? 'درس دیده شده' : 'watched'} ({watchedPercentage}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${watchedPercentage}%` }}
                />
              </div>
            </div>

            {/* Quick Actions Row: Scheduler & Size Estimator */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenScheduler}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-300 dark:border-purple-500/40 text-purple-800 dark:text-purple-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>{isFa ? 'زمان‌بندی شبانه و اعلان' : 'Night Scheduler'}</span>
                </button>
              </div>

              {/* Size Estimator Badge */}
              {selectedUnits.length > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>{isFa ? 'تخمین حجم انتخابی:' : 'Estimated size:'}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    ~{formatSize(
                      sizeEstimates[
                        qualityPreference === 'lowest'
                          ? '360'
                          : qualityPreference === '480'
                          ? '480'
                          : qualityPreference === '720'
                          ? '720'
                          : '1080'
                      ]
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    ({isFa ? 'صوتی:' : 'Audio:'} ~{formatSize(sizeEstimates.audio)})
                  </span>
                </div>
              )}
            </div>

            {/* Smart Batch Selection Tools & Filters */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Advanced Selection Buttons */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  onClick={handleSelectAllVideos}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  {isFa ? 'انتخاب همه ویدیوها' : 'All Videos'}
                </button>
                {totalOtherUnits > 0 && (
                  <button
                    onClick={handleSelectAllNonVideos}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    {isFa ? 'فقط تمرین‌ها و متنی‌ها' : 'Non-Videos'}
                  </button>
                )}
                <button
                  onClick={handleSelectUnwatchedOnly}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-800 dark:text-teal-300 transition-colors cursor-pointer"
                >
                  {isFa ? 'فقط تماشا نشده‌ها' : 'Unwatched Only'}
                </button>
                <button
                  onClick={handleInvertSelection}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {isFa ? 'معکوس کردن' : 'Invert'}
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {isFa ? 'لغو انتخاب' : 'Clear'}
                </button>

                <div className="text-slate-500 dark:text-slate-400 mr-2">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {selectedUnits.length}
                  </span>{' '}
                  <span>{isFa ? 'درس انتخاب شده' : 'selected'}</span>
                </div>
              </div>

              {/* Options: Quality, Sample Mode, Subs, Attachments */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* Quality selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400">
                    {isFa ? 'کیفیت:' : 'Quality:'}
                  </span>
                  <select
                    value={qualityPreference}
                    onChange={(e) => setQualityPreference(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="highest">
                      {isFa ? 'بهترین کیفیت (1080/720)' : 'Highest (1080/720)'}
                    </option>
                    <option value="720">720p (HQ)</option>
                    <option value="480">480p</option>
                    <option value="lowest">{isFa ? 'کم‌حجم‌ترین (LQ)' : 'Lowest (LQ)'}</option>
                  </select>
                </div>

                {/* Sample Mode Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400">
                    {isFa ? 'نمونه‌گیری:' : 'Sample:'}
                  </span>
                  <select
                    value={sampleBytes}
                    onChange={(e) => setSampleBytes(parseInt(e.target.value, 10))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value={0}>{isFa ? 'کامل (بدون محدودیت)' : 'Full Download'}</option>
                    <option value={65536}>64 KB (Test)</option>
                    <option value={262144}>256 KB</option>
                    <option value={524288}>512 KB</option>
                    <option value={1048576}>1 MB</option>
                  </select>
                </div>

                {/* Subtitles & Attachments toggles */}
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={downloadSubtitles}
                    onChange={(e) => setDownloadSubtitles(e.target.checked)}
                    className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-emerald-600 focus:ring-0"
                  />
                  <span>{isFa ? 'زیرنویس' : 'Subtitles'}</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={downloadAttachments}
                    onChange={(e) => setDownloadAttachments(e.target.checked)}
                    className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-emerald-600 focus:ring-0"
                  />
                  <span>{isFa ? 'ضمیمه‌ها' : 'Attachments'}</span>
                </label>

                {/* Main Action: Download on server */}
                <button
                  onClick={() =>
                    onStartDownloadTask({
                      selectedUnitIds: selectedUnits,
                      sampleBytes,
                      downloadSubtitles,
                      downloadAttachments,
                      qualityPreference,
                    })
                  }
                  disabled={selectedUnits.length === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isFa
                      ? `دانلود ${selectedUnits.length} درس در سرور`
                      : `Download ${selectedUnits.length} Units`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar inside Course */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isFa ? 'جستجو در عنوان یا متن درس‌ها...' : 'Search units...'}
                className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs w-full sm:w-auto">
              <span className="text-slate-400 text-[11px] hidden md:inline">
                {isFa ? 'فیلتر:' : 'Filter:'}
              </span>
              {[
                { id: 'all', label: isFa ? 'همه' : 'All' },
                { id: 'unwatched', label: isFa ? 'تماشا نشده' : 'Unwatched' },
                { id: 'watched', label: isFa ? 'دیده‌شده' : 'Watched' },
                { id: 'subtitles', label: isFa ? 'دارای زیرنویس' : 'Subtitles' },
                { id: 'free', label: isFa ? 'رایگان' : 'Free' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    filterType === f.id
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chapters & Units Accordion List */}
          <div className="space-y-4">
            {filteredChapters.map((chapter) => {
              const isOpen = openChapters[String(chapter.id)] !== false;
              const chVideoUnits = chapter.units.filter((u) => u.isVideo);
              const allChSelected =
                chVideoUnits.length > 0 &&
                chVideoUnits.every((u) => selectedUnits.includes(String(u.id)));

              return (
                <div
                  key={chapter.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition-colors"
                >
                  {/* Chapter Header */}
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-850 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSelectChapter(chapter)}
                        title={allChSelected ? 'لغو انتخاب فصل' : 'انتخاب همه ویدیوهای فصل'}
                        className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                      >
                        {allChSelected ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {isFa ? `فصل ${chapter.order}` : `Chapter ${chapter.order}`}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {chapter.unitsCount} {isFa ? 'درس' : 'units'}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          {chapter.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleChapter(chapter.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
                      >
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Units List */}
                  {isOpen && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {chapter.units.map((unit) => {
                        const isSelected = selectedUnits.includes(String(unit.id));
                        const isWatched = !!watchedUnits[String(unit.id)];

                        return (
                          <div
                            key={unit.id}
                            className={`p-3.5 sm:px-5 flex items-center justify-between gap-3 transition-colors ${
                              isSelected
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-850/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Checkbox for batch download */}
                              <button
                                onClick={() => toggleUnit(unit.id)}
                                className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer shrink-0"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                )}
                              </button>

                              {/* Watched toggle checkmark */}
                              <button
                                onClick={() => onToggleWatched(unit.id)}
                                title={isWatched ? 'علامت به عنوان مشاهده نشده' : 'علامت به عنوان دیده شده'}
                                className="cursor-pointer shrink-0"
                              >
                                {isWatched ? (
                                  <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 fill-teal-500/20" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 hover:text-slate-400" />
                                )}
                              </button>

                              {/* Unit icon */}
                              <div className="shrink-0">
                                {unit.isVideo ? (
                                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <Film className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <FileText className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>

                              {/* Unit Info */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                                    #{unit.order}
                                  </span>
                                  <h5
                                    className={`text-xs sm:text-sm font-medium truncate ${
                                      isWatched
                                        ? 'text-slate-400 dark:text-slate-500 line-through'
                                        : 'text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    {unit.title}
                                  </h5>
                                </div>

                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                  {unit.hasCaption && (
                                    <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                      {isFa ? 'زیرنویس' : 'Sub'}
                                    </span>
                                  )}
                                  {unit.duration && (
                                    <span className="font-mono">{unit.duration}</span>
                                  )}
                                  {unit.isLocked ? (
                                    <span className="flex items-center gap-1 text-amber-500">
                                      <Lock className="w-3 h-3" />
                                      <span>{isFa ? 'قفل (نیاز به لاگین)' : 'Locked'}</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                      <Unlock className="w-3 h-3" />
                                      <span>{isFa ? 'رایگان' : 'Free'}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons for Unit - Details & Direct Download links (Play removed) */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => onOpenUnitDetails(unit, chapter)}
                                title={isFa ? 'مشاهده کیفیت‌ها و لینک‌های دانلود' : 'Qualities & Download Links'}
                                className="p-1.5 sm:px-3 sm:py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>
                                  {isFa ? 'کیفیت‌ها و دانلود' : 'Qualities & Download'}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
