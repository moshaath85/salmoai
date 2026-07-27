import { memo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Menu,
  Home,
  MessageSquare,
  FileSearch,
  Users,
  Search,
  Calculator,
  CreditCard,
  LogIn,
  LogOut,
  LayoutDashboard,
  User,
  Settings,
  FileText,
  Sparkles,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user, login, logout, isAdmin } = useAuth();
  const location = useLocation();

  const links = [
    { to: '/', label: 'الرئيسية', icon: Home },
    { to: '/chat', label: 'المساعد', icon: MessageSquare },
    { to: '/contract-analysis', label: 'تحليل العقود', icon: FileSearch },
    { to: '/resume-analysis', label: 'تحليل السير الذاتية', icon: Users },
    { to: '/law-search', label: 'البحث في النظام', icon: Search },
    { to: '/company-policies', label: 'السياسات الداخلية', icon: FileText },
    { to: '/eosb-calculator', label: 'حساب المستحقات', icon: Calculator },
    { to: '/pricing', label: 'الأسعار', icon: CreditCard },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-300 md:hidden dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
          aria-label="فتح القائمة"
        >
          <Menu className="h-5 w-5 text-slate-700 dark:text-white" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[320px] p-0 overflow-y-auto border-l border-white/10 bg-gradient-to-b from-slate-900 via-slate-900 to-[#0A1628] dark:from-[#0A1628] dark:via-slate-900 dark:to-[#1a0533]"
      >
        {/* Header with branding */}
        <SheetHeader className="border-b border-white/10 p-5">
          <SheetTitle className="flex items-center gap-3 text-right">
            <div className="relative">
              <img src="/assets/salmo-logo.avif" alt="SALMO" className="h-9 w-auto" />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold bg-gradient-to-l from-blue-400 to-violet-400 bg-clip-text text-transparent">
                SALMO
              </span>
              <span className="text-[11px] text-slate-400">مساعدك القانوني الذكي</span>
            </div>
            <Sparkles className="h-4 w-4 text-cyan-400 mr-auto animate-pulse" />
          </SheetTitle>
        </SheetHeader>

        {/* User info section */}
        {user && (
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 ring-2 ring-blue-400/30">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || user.email}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-semibold">
                      {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  {user.name || 'المستخدم'}
                </span>
                <span className="text-xs text-slate-400">{user.email}</span>
                <span className="text-[11px] mt-0.5 font-medium">
                  {isAdmin ? (
                    <span className="text-amber-400">🛡️ مدير النظام</span>
                  ) : (
                    <span className="text-blue-400">👤 مستخدم</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation links */}
        <nav className="p-4 space-y-1" dir="rtl">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm transition-all duration-300 ${
                  active
                    ? 'bg-gradient-to-l from-blue-600/20 to-violet-600/20 border border-blue-500/30 text-white font-medium shadow-lg shadow-blue-500/10'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white hover:border-white/10 border border-transparent'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 ${
                    active
                      ? 'bg-gradient-to-br from-blue-500 to-violet-600 shadow-md shadow-blue-500/30'
                      : 'bg-white/5 group-hover:bg-white/10'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                </div>
                <span>{link.label}</span>
                {active && (
                  <div className="mr-auto h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle */}
        <div className="border-t border-white/10 mx-4 px-4 py-4 flex items-center justify-between" dir="rtl">
          <span className="text-sm text-slate-300">الوضع الداكن</span>
          <ThemeToggle />
        </div>

        {/* Admin & account actions */}
        <div className="border-t border-white/10 p-4 space-y-1" dir="rtl">
          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-slate-300 hover:bg-amber-500/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20 transition-all duration-300"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-amber-500/20 transition-all">
                    <LayoutDashboard className="h-4 w-4 text-slate-400 group-hover:text-amber-400" />
                  </div>
                  <span>لوحة التحكم</span>
                </Link>
              )}
              <Link
                to={isAdmin ? '/admin/profile' : '/pricing'}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10 transition-all duration-300"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-all">
                  <User className="h-4 w-4 text-slate-400 group-hover:text-white" />
                </div>
                <span>الملف الشخصي</span>
              </Link>
              <Link
                to="/pricing"
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10 transition-all duration-300"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-all">
                  <Settings className="h-4 w-4 text-slate-400 group-hover:text-white" />
                </div>
                <span>الاشتراك</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-300"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-red-500/20 transition-all">
                  <LogOut className="h-4 w-4 text-red-400" />
                </div>
                <span>تسجيل الخروج</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                login();
                setOpen(false);
              }}
              className="flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium bg-gradient-to-l from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:scale-[1.02]"
            >
              <LogIn className="h-4.5 w-4.5" />
              <span>تسجيل الدخول</span>
            </button>
          )}
        </div>

        {/* Bottom branding */}
        <div className="mt-auto p-4 border-t border-white/5">
          <p className="text-center text-[11px] text-slate-500">
            مدعوم بالذكاء الاصطناعي • Salmo Solutions © {new Date().getFullYear()}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default memo(MobileNav);