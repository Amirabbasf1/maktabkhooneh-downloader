import React, { useEffect, useState } from 'react';
import { LibraryFile } from '../types';
import {
  X,
  FolderOpen,
  FileVideo,
  FileText,
  Paperclip,
  Download,
  Archive,
  RefreshCw,
  Folder,
} from 'lucide-react';

interface LibraryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fa' | 'en';
}

export const LibraryManager: React.FC<LibraryManagerProps> = ({ isOpen, onClose, lang }) => {
  const isFa = lang === 'fa';
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/download/files');
      if (!res.ok) throw new Error('Failed to load files');
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(1)} ${units[i]}`;
  };

  // Group by top-level course folders
  const courseFolders = files.filter(
    (f) => f.isDirectory && !f.relativePath.includes('/') && !f.relativePath.includes('\\')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {isFa ? 'کتابخانه فایل‌های ذخیره شده' : 'Saved Downloads Library'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isFa
                  ? 'مشاهده و دانلود دوره‌ها و ویدیوهای ذخیره شده در پوشه download/'
                  : 'Manage and download offline files from server directory'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchFiles}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFa ? 'بروزرسانی لیست' : 'Refresh list'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Course Fast Zips Bar if any exist */}
        {courseFolders.length > 0 && (
          <div className="px-6 py-3 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-500 dark:text-slate-400 shrink-0 font-medium">
              {isFa ? 'دانلود پکیج ZIP:' : 'Download ZIP:'}
            </span>
            {courseFolders.map((cf) => (
              <a
                key={cf.name}
                href={`/api/download/zip?folder=${encodeURIComponent(cf.name)}`}
                className="px-3 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-300 dark:border-teal-500/30 text-teal-800 dark:text-teal-300 flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                download
              >
                <Archive className="w-3.5 h-3.5" />
                <span className="max-w-[180px] truncate">{cf.name}</span>
              </a>
            ))}
          </div>
        )}

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1 text-xs">
          {loading && (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-500 mb-2" />
              <span>{isFa ? 'در حال اسکن پوشه‌ها...' : 'Scanning folders...'}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <FolderOpen className="w-12 h-12 mx-auto stroke-[1.5] text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-400">
                {isFa ? 'پوشه دانلود خالی است' : 'Download folder is empty'}
              </p>
              <p className="text-slate-500 dark:text-slate-600">
                {isFa
                  ? 'هنوز هیچ فایلی از دوره‌ها در سرور ذخیره نشده است.'
                  : 'Files will appear here once you download lectures.'}
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            files.length > 0 &&
            files.map((file, idx) => {
              const isVideo = file.name.endsWith('.mp4');
              const isVtt = file.name.endsWith('.vtt') || file.name.endsWith('.srt');
              const isDir = file.isDirectory;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                    isDir
                      ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 font-semibold'
                      : 'bg-white dark:bg-slate-950/80 border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {isDir ? (
                      <Folder className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                    ) : isVideo ? (
                      <FileVideo className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : isVtt ? (
                      <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    ) : (
                      <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate font-mono" title={file.relativePath}>
                      {file.relativePath}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formatBytes(file.size)}
                    </span>
                    {!isDir ? (
                      <a
                        href={`/api/download/file?path=${encodeURIComponent(file.relativePath)}`}
                        download={file.name}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title={isFa ? 'دانلود به کامپیوتر' : 'Download to computer'}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <a
                        href={`/api/download/zip?folder=${encodeURIComponent(file.relativePath)}`}
                        download
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 flex items-center gap-1 text-[11px] transition-colors"
                        title={isFa ? 'دانلود پوشه به صورت ZIP' : 'Download folder as ZIP'}
                      >
                        <Archive className="w-3 h-3" />
                        <span>ZIP</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
