import { memo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserRound, LogOut, LayoutDashboard, User, Settings, Sparkles } from 'lucide-react';
import MobileNav from './MobileNav';
import ThemeToggle from './ThemeToggle';

function Navbar() {
  const { user, loading, login, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { to: '/', label: 'الرئيسية' },
    { to: '/chat', label: 'المساعد' },
    { to: '/contract-analysis', label: 'تحليل العقود' },
    { to: '/resume-analysis', label: 'محلل السيرة الذاتية' },
    { to: '/law-search', label: 'البحث في النظام' },
    { to: '/eosb-calculator', label: 'حساب المستحقات' },
    { to: '/pricing', label: 'الأسعار' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm'
          : 'bg-background/80 backdrop-blur-sm border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Mobile menu button */}
        <div className="flex items-center gap-3 lg:hidden">
          <MobileNav />
        </div>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <img src="/assets/salmo-logo.avif" alt="SALMO" className="h-9 w-auto relative z-10" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-foreground tracking-tight">SALMO</span>
            <span className="hidden text-[10px] text-muted-foreground sm:block">مساعد قانوني ذكي</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`relative px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                location.pathname === l.to
                  ? 'text-primary font-medium bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {l.label}
              {location.pathname === l.to && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden md:flex" />

          {loading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex h-9 w-9 items-center justify-center rounded-full gradient-primary cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all duration-300">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || user.email}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-medium">
                      {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border border-border shadow-lg">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground">{user.name || 'المستخدم'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-primary mt-0.5">
                    {isAdmin ? '🛡️ مدير النظام' : '👤 مستخدم'}
                  </p>
                </div>

                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>لوحة التحكم</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem asChild>
                  <Link to={isAdmin ? '/admin/profile' : '/pricing'} className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    <span>الملف الشخصي</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/pricing" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    <span>الاشتراك</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={logout}
                  className="flex items-center gap-2 text-destructive cursor-pointer focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={login}
              className="hidden md:flex items-center gap-2 h-9 px-4 rounded-lg gradient-primary text-white text-sm font-medium cursor-pointer hover:shadow-md transition-all duration-300"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>ابدأ مجاناً</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default memo(Navbar);