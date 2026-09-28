import React from 'react';
import { X, Keyboard, Sun, Search } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fa' | 'en';
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen) return null;
  const isFa = lang === 'fa';

  const shortcuts = [
    {
      key: 'D',
      title: isFa ? 'تغییر تم تاریک / روشن' : 'Toggle Dark / Light Theme',
      desc: isFa ? 'جابجایی سریع بین حالت شب و روز' : 'Quickly toggle dark & light mode',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
    },
    {
      key: '/',
      title: isFa ? 'جستجو و درج لینک دوره' : 'Focus Course URL',
      desc: isFa ? 'فوکوس روی نوار آدرس دوره' : 'Jump to course URL input field',
      icon: <Search className="w-4 h-4 text-emerald-500" />,
    },
    {
      key: 'Esc',
      title: isFa ? 'بستن پنجره‌ها' : 'Close Modals',
      desc: isFa ? 'بستن کادرهای باز و بازگشت به صفحه' : 'Dismiss any open modal or drawer',
      icon: <X className="w-4 h-4 text-rose-500" />,
    },
    {
      key: '?',
      title: isFa ? 'نمایش این راهنما' : 'Help & Shortcuts',
      desc: isFa ? 'باز کردن همین پنجره میانبرها' : 'Show this shortcuts guide',
      icon: <Keyboard className="w-4 h-4 text-purple-500" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isFa ? 'راهنمای کلیدهای میانبر' : 'Keyboard Shortcuts'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isFa ? 'دسترسی سریع و روان به تمام بخش‌ها' : 'Quick navigation & power actions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          {shortcuts.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs">
                  {sc.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {sc.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{sc.desc}</div>
                </div>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-medium cursor-pointer transition-colors"
          >
            {isFa ? 'متوجه شدم' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
