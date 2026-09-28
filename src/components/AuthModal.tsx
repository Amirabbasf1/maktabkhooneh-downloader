import React, { useState } from 'react';
import { AuthStatus } from '../types';
import {
  X,
  Lock,
  Mail,
  Key,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Check,
  RefreshCw,
  Cookie,
  UserCheck,
  Info,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: AuthStatus | null;
  onRefreshAuth: () => Promise<void>;
  lang: 'fa' | 'en';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  auth,
  onRefreshAuth,
  lang,
}) => {
  const isFa = lang === 'fa';
  const [tab, setTab] = useState<'login' | 'cookie' | 'sessions'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  // Cookie form state
  const [cookieInput, setCookieInput] = useState('');
  const [cookieLabel, setCookieLabel] = useState('');
  const [isCookieSubmitting, setIsCookieSubmitting] = useState(false);
  const [cookieError, setCookieError] = useState<string | null>(null);
  const [cookieSuccess, setCookieSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      setLoginSuccess(isFa ? 'ورود با موفقیت انجام شد و نشست ذخیره گردید.' : 'Logged in successfully!');
      await onRefreshAuth();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setLoginError(err.message || 'Error logging in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetCookie = async (e: React.FormEvent) => {
    e.preventDefault();
    setCookieError(null);
    setCookieSuccess(null);
    setIsCookieSubmitting(true);

    try {
      const res = await fetch('/api/auth/set-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookie: cookieInput.trim(),
          label: cookieLabel.trim() || 'manual_cookie',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply cookie');
      }
      setCookieSuccess(isFa ? 'کوکی با موفقیت تأیید و ثبت شد.' : 'Cookie validated and saved!');
      await onRefreshAuth();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setCookieError(err.message || 'Error saving cookie');
    } finally {
      setIsCookieSubmitting(false);
    }
  };

  const handleSwitchUser = async (userEmail: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      if (res.ok) {
        await onRefreshAuth();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userEmail: string) => {
    if (!confirm(isFa ? `آیا از حذف نشست ${userEmail} اطمینان دارید؟` : `Delete session for ${userEmail}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/auth/user/${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await onRefreshAuth();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                {isFa ? 'احراز هویت و حساب مکتب‌خونه' : 'Maktabkhooneh Account & Auth'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isFa ? 'مدیریت ورود، نشست‌ها و کوکی‌های کاربری' : 'Manage login, sessions & authentication'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Pill */}
        <div className="px-6 py-3 bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">{isFa ? 'وضعیت فعلی:' : 'Current Status:'}</span>
            {auth?.isAuthenticated ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                {isFa ? 'وارد شده' : 'Authenticated'} (
                {auth.coreData?.auth?.details?.email || auth.activeUser})
              </span>
            ) : auth?.hasCookie ? (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <Cookie className="w-3.5 h-3.5" />
                {isFa ? 'کوکی فعال' : 'Cookie active'}
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                {isFa ? 'وارد نشده' : 'Not Logged In'}
              </span>
            )}
          </div>
          <button
            onClick={() => onRefreshAuth()}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            title={isFa ? 'بروزرسانی وضعیت' : 'Refresh status'}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isFa ? 'بررسی مجدد' : 'Check'}</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2 gap-4 text-xs font-medium bg-slate-50 dark:bg-slate-900/40">
          <button
            onClick={() => setTab('login')}
            className={`pb-2.5 transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              tab === 'login'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{isFa ? 'ورود با ایمیل و رمز' : 'Email & Password'}</span>
          </button>

          <button
            onClick={() => setTab('cookie')}
            className={`pb-2.5 transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              tab === 'cookie'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{isFa ? 'تنظیم دستی کوکی' : 'Manual Cookie'}</span>
          </button>

          <button
            onClick={() => setTab('sessions')}
            className={`pb-2.5 transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              tab === 'sessions'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>
              {isFa ? 'حساب‌های ذخیره شده' : 'Stored Accounts'} (
              {auth?.users?.length || 0})
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm">
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <span>
                  {isFa
                    ? 'مشخصات شما مستقیماً برای سرور مکتب‌خونه ارسال شده و کوکی نشست به صورت امن در session.json ذخیره می‌شود تا در دفعات بعدی نیازی به ورود مجدد نباشد.'
                    : 'Your credentials authenticate directly with Maktabkhooneh API and save sessionid securely in session.json for subsequent requests.'}
                </span>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {loginSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{loginSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isFa ? 'ایمیل حساب مکتب‌خونه:' : 'Email Address:'}</span>
                </label>
                <input
                  type="email"
                  dir="ltr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isFa ? 'کلمه عبور:' : 'Password:'}</span>
                </label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-sm font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isFa ? 'در حال برقراری ارتباط با مکتب‌خونه...' : 'Authenticating...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isFa ? 'ورود و ذخیره نشست' : 'Sign In & Save Session'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {tab === 'cookie' && (
            <form onSubmit={handleSetCookie} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {isFa
                    ? 'اگر نمی‌خواهید پسورد وارد کنید، می‌توانید مقدار sessionid و csrftoken را از مرورگر (بخش Inspect > Application/Storage یا Network) کپی کرده و در کادر زیر وارد کنید.'
                    : 'You can paste your sessionid & csrftoken manually from browser DevTools (Cookies or Network headers).'}
                </span>
              </div>

              {cookieError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{cookieError}</span>
                </div>
              )}

              {cookieSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{cookieSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {isFa ? 'رشته کوکی (Cookie String):' : 'Cookie String:'}
                </label>
                <textarea
                  rows={3}
                  dir="ltr"
                  required
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder="csrftoken=...; sessionid=..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {isFa ? 'نام یا ایمیل این نشست (اختیاری):' : 'Account label / Email (optional):'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={cookieLabel}
                  onChange={(e) => setCookieLabel(e.target.value)}
                  placeholder="my_account@example.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isCookieSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isCookieSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isFa ? 'در حال اعتبارسنجی کوکی...' : 'Validating cookie...'}</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>{isFa ? 'بررسی و ذخیره کوکی' : 'Validate & Save Cookie'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {tab === 'sessions' && (
            <div className="space-y-3">
              {auth?.users && auth.users.length > 0 ? (
                auth.users.map((u) => {
                  const isCurrent = u.isActive || u.email === auth.activeUser;
                  return (
                    <div
                      key={u.email}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold">{u.email}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-medium">
                              {isFa ? 'فعال' : 'Active'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {isFa ? 'آخرین بروزرسانی: ' : 'Updated: '}
                          {new Date(u.updated).toLocaleString(isFa ? 'fa-IR' : 'en-US')}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isCurrent && (
                          <button
                            onClick={() => handleSwitchUser(u.email)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                          >
                            {isFa ? 'انتخاب' : 'Switch'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(u.email)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={isFa ? 'حذف نشست' : 'Remove session'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  {isFa ? 'هیچ حسابی ذخیره نشده است.' : 'No saved accounts found in session.json.'}
                </div>
              )}
            </div>
          )}

          {/* User Profile summary if authenticated */}
          {auth?.coreData?.auth?.details && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs space-y-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <div className="text-slate-600 dark:text-slate-400 font-semibold flex items-center justify-between">
                <span>{isFa ? 'اطلاعات پروفایل مکتب‌خونه' : 'Profile Information'}</span>
                <span className="text-emerald-600 dark:text-emerald-400">● {isFa ? 'فعال' : 'Online'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-slate-500">{isFa ? 'شناسه کاربری:' : 'User ID:'} </span>
                  <span className="font-mono">{auth.coreData.auth.details.user_id || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">{isFa ? 'شناسه دانشجو:' : 'Student ID:'} </span>
                  <span className="font-mono">{auth.coreData.auth.details.student_id || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">{isFa ? 'اشتراک فعال:' : 'Subscription:'} </span>
                  <span
                    className={
                      auth.coreData.auth.conditions?.has_subscription
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-slate-400'
                    }
                  >
                    {auth.coreData.auth.conditions?.has_subscription
                      ? isFa
                        ? 'دارد'
                        : 'Yes'
                      : isFa
                      ? 'ندارد'
                      : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">{isFa ? 'خرید دوره:' : 'Purchased Courses:'} </span>
                  <span
                    className={
                      auth.coreData.auth.conditions?.has_course_purchase
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-slate-400'
                    }
                  >
                    {auth.coreData.auth.conditions?.has_course_purchase
                      ? isFa
                        ? 'دارد'
                        : 'Yes'
                      : isFa
                      ? 'ندارد'
                      : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
