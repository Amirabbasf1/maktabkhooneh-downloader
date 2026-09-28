import React, { useState } from 'react';
import { AuthStatus } from '../types';
import { X, Terminal, Copy, Check, Info } from 'lucide-react';

interface CliModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseUrl: string;
  sampleBytes: number;
  auth: AuthStatus | null;
  lang: 'fa' | 'en';
}

export const CliModal: React.FC<CliModalProps> = ({
  isOpen,
  onClose,
  courseUrl,
  sampleBytes,
  auth,
  lang,
}) => {
  const isFa = lang === 'fa';
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const url = courseUrl.trim() || 'https://maktabkhooneh.org/course/<slug>/';
  const sampleArg = sampleBytes > 0 ? ` --sample-bytes ${sampleBytes}` : '';
  const user = auth?.activeUser ? ` --user ${auth.activeUser}` : '';

  const psCmd = `node download.mjs "${url}"${user ? ` --user "${auth?.activeUser}" --pass "YOUR_PASSWORD"` : ''}${sampleArg}`;
  const cookiePsCmd = `$env:MK_COOKIE = "csrftoken=...; sessionid=..."\nnode download.mjs "${url}"${sampleArg}`;
  const bashCmd = `export MK_COOKIE="csrftoken=...; sessionid=..."\nnode download.mjs "${url}"${sampleArg}`;

  const copyText = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {isFa ? 'دستورات خط فرمان (CLI)' : 'Terminal & CLI Commands'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isFa ? 'اجرای مستقیم اسکریپت download.mjs در ترمینال سیستم' : 'Run download.mjs in your terminal'}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-slate-800/40 border border-amber-200 dark:border-slate-700/60 leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              {isFa
                ? 'فایل download.mjs در ریشه همین پروژه قرار دارد. برای اجرا در سیستم خود کافیست Node.js 18+ را داشته باشید و دستورات زیر را کپی و اجرا کنید.'
                : 'The download.mjs script is available in the root folder. You can run it on your local machine using Node.js 18+.'}
            </span>
          </div>

          {/* Option 1: Login with user/pass */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
              <span>{isFa ? 'روش ۱: ورود با مشخصات کاربری' : 'Method 1: Email & Password'}</span>
              <button
                onClick={() => copyText(psCmd, 'cmd1')}
                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-normal cursor-pointer"
              >
                {copiedId === 'cmd1' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'cmd1' ? (isFa ? 'کپی شد' : 'Copied') : (isFa ? 'کپی' : 'Copy')}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-100 dark:bg-black/90 border border-slate-300 dark:border-slate-800 font-mono text-[11px] text-slate-900 dark:text-slate-200 overflow-x-auto selection:bg-emerald-500/30">
              {psCmd}
            </pre>
          </div>

          {/* Option 2: Cookie env var (Windows PowerShell) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
              <span>
                {isFa
                  ? 'روش ۲: استفاده از متغیر محیطی کوکی (ویندوز PowerShell)'
                  : 'Method 2: Cookie via PowerShell Env Var'}
              </span>
              <button
                onClick={() => copyText(cookiePsCmd, 'cmd2')}
                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-normal cursor-pointer"
              >
                {copiedId === 'cmd2' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'cmd2' ? (isFa ? 'کپی شد' : 'Copied') : (isFa ? 'کپی' : 'Copy')}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-100 dark:bg-black/90 border border-slate-300 dark:border-slate-800 font-mono text-[11px] text-slate-900 dark:text-slate-200 overflow-x-auto selection:bg-emerald-500/30 whitespace-pre">
              {cookiePsCmd}
            </pre>
          </div>

          {/* Option 3: Cookie env var (Linux/macOS Bash) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
              <span>
                {isFa
                  ? 'روش ۳: استفاده از متغیر محیطی کوکی (لینوکس و مک Bash)'
                  : 'Method 3: Cookie via Bash Env Var'}
              </span>
              <button
                onClick={() => copyText(bashCmd, 'cmd3')}
                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-normal cursor-pointer"
              >
                {copiedId === 'cmd3' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'cmd3' ? (isFa ? 'کپی شد' : 'Copied') : (isFa ? 'کپی' : 'Copy')}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-100 dark:bg-black/90 border border-slate-300 dark:border-slate-800 font-mono text-[11px] text-slate-900 dark:text-slate-200 overflow-x-auto selection:bg-emerald-500/30 whitespace-pre">
              {bashCmd}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
