import React, { useEffect, useState } from 'react';
import { CourseUnit, UnitDetails } from '../types';
import {
  X,
  Film,
  Download,
  FileText,
  Paperclip,
  Check,
  Copy,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface UnitDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: CourseUnit | null;
  courseUrl: string;
  courseSlug: string;
  isNewFormat: boolean;
  lang: 'fa' | 'en';
}

export const UnitDetailsModal: React.FC<UnitDetailsModalProps> = ({
  isOpen,
  onClose,
  unit,
  courseUrl,
  courseSlug,
  isNewFormat,
  lang,
}) => {
  const isFa = lang === 'fa';
  const [details, setDetails] = useState<UnitDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !unit) {
      setDetails(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch('/api/course/unit-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitId: unit.id,
        courseUrl,
        courseSlug,
        unitSlug: unit.slug,
        isNewFormat,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) setDetails(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to fetch details');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, unit, courseUrl, courseSlug, isNewFormat]);

  if (!isOpen || !unit) return null;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getProxyDownloadUrl = (url: string, filename: string, sampleBytes = 0) => {
    const params = new URLSearchParams({
      url,
      filename,
      referer: courseUrl,
    });
    if (sampleBytes > 0) params.set('sampleBytes', String(sampleBytes));
    return `/api/download/proxy?${params.toString()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Film className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  #{unit.order}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                  {unit.title}
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{unit.slug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-xs">
                {isFa ? 'در حال واکشی کیفیت‌ها و فایل‌های پیوست از مکتب‌خونه...' : 'Fetching qualities and assets...'}
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
              <p className="font-semibold mb-1">{isFa ? 'خطا در بارگذاری:' : 'Load error:'}</p>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && details && (
            <>
              {/* Qualities Section (Direct download & copy only) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{isFa ? 'کیفیت‌های ویدیو جهت دانلود مستقیم' : 'Available Video Qualities for Download'}</span>
                  </h4>
                </div>

                {details.qualities && details.qualities.length > 0 ? (
                  <div className="space-y-2">
                    {details.qualities.map((q, idx) => {
                      const fileName = `${String(unit.order).padStart(2, '0')} - ${unit.title} (${q.label || q.resolution}p).mp4`;
                      const proxyUrl = getProxyDownloadUrl(q.download_url, fileName);
                      const sampleUrl = getProxyDownloadUrl(q.download_url, fileName, 262144);

                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-transparent">
                              {q.label || `${q.resolution}p`}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">MP4 Video</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Sample test */}
                            <a
                              href={sampleUrl}
                              download
                              title={isFa ? 'دانلود نمونه ۲۵۶ کیلوبایت' : 'Download 256KB Sample'}
                              className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] transition-colors"
                            >
                              {isFa ? 'نمونه' : 'Sample'}
                            </a>

                            {/* Direct browser download via proxy */}
                            <a
                              href={proxyUrl}
                              download
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{isFa ? 'دانلود مستقیم' : 'Download'}</span>
                            </a>

                            {/* Copy URL */}
                            <button
                              onClick={() => handleCopy(q.download_url)}
                              title={isFa ? 'کپی لینک مستقیم' : 'Copy direct URL'}
                              className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedUrl === q.download_url ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 text-center text-xs text-slate-500">
                    {isFa
                      ? 'کیفیت ویدیویی برای این درس یافت نشد یا ممکن است نیاز به ورود به حساب کاربری داشته باشد.'
                      : 'No video stream found for this unit. Check your login status.'}
                  </div>
                )}
              </div>

              {/* Subtitles (VTT and SRT) */}
              {details.captionFile && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-500" />
                    <span>{isFa ? 'زیرنویس ویدیو (VTT / SRT)' : 'Video Subtitles'}</span>
                  </h4>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono font-medium">
                        Sub
                      </span>
                      <span className="text-slate-800 dark:text-slate-300 truncate max-w-xs">
                        {unit.title} - {isFa ? 'زیرنویس فارسی' : 'Subtitles'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/api/media/vtt-to-srt?url=${encodeURIComponent(
                          details.captionFile
                        )}&filename=${encodeURIComponent(
                          `${String(unit.order).padStart(2, '0')} - ${unit.title}.srt`
                        )}`}
                        download
                        className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-300 dark:border-teal-500/30 text-teal-800 dark:text-teal-300 font-medium flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>SRT</span>
                      </a>

                      <a
                        href={getProxyDownloadUrl(
                          details.captionFile,
                          `${String(unit.order).padStart(2, '0')} - ${unit.title}.vtt`
                        )}
                        download
                        className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1 transition-colors"
                      >
                        <span>VTT</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments */}
              {details.attachments && details.attachments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {isFa ? 'فایل‌های ضمیمه و جزوات' : 'Attachments & Course Notes'} (
                      {details.attachments.length})
                    </span>
                  </h4>
                  <div className="space-y-1.5">
                    {details.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <Paperclip className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-slate-800 dark:text-slate-300 truncate" title={att.name}>
                            {att.name}
                          </span>
                        </div>
                        <a
                          href={getProxyDownloadUrl(att.download_url, att.name)}
                          download
                          className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1 shrink-0 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{isFa ? 'دانلود ضمیمه' : 'Download'}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
