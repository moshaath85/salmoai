import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, TicketCheck, CreditCard, Bell, BarChart3,
  Moon, Sun, Languages, Menu, X, LogOut, ChevronLeft, UserCircle, Home,
  Receipt, ExternalLink, Tag, Mail, Activity, Settings2, Webhook, Shield, PieChart, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import ServerStatus from './ServerStatus';

const AdminLayout: React.FC = () => {
  const { theme, toggleTheme, language, toggleLanguage, isRTL } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: t('لوحة التحكم', 'Dashboard') },
    { path: '/admin/customers', icon: Users, label: t('العملاء', 'Customers') },
    { path: '/admin/tickets', icon: TicketCheck, label: t('الدعم الفني', 'Support') },
    { path: '/admin/subscriptions', icon: CreditCard, label: t('الاشتراكات', 'Subscriptions') },
    { path: '/admin/payments', icon: Receipt, label: t('المدفوعات', 'Payments') },
    { path: '/admin/payment-gateways', icon: Settings2, label: t('بوابات الدفع', 'Gateways') },
    { path: '/admin/webhooks', icon: Webhook, label: t('Webhooks', 'Webhooks') },
    { path: '/admin/gateway-logs', icon: Shield, label: t('سجل APIs', 'API Logs') },
    { path: '/admin/payment-logos', icon: Image, label: t('شعارات الدفع', 'Payment Logos') },
    { path: '/admin/coupons', icon: Tag, label: t('الكوبونات', 'Coupons') },
    { path: '/admin/coupon-analytics', icon: PieChart, label: t('تحليلات الكوبونات', 'Coupon Analytics') },
    { path: '/admin/notifications', icon: Bell, label: t('الإشعارات', 'Notifications') },
    { path: '/admin/email-settings', icon: Mail, label: t('البريد', 'Email') },
    { path: '/admin/activity-logs', icon: Activity, label: t('السجلات', 'Logs') },
    { path: '/admin/analytics', icon: BarChart3, label: t('التحليلات', 'Analytics') },
    { path: '/admin/profile', icon: UserCircle, label: t('الملف الشخصي', 'Profile') },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0f1d35] to-[#1a0533] transition-colors duration-300 ${isRTL ? 'font-arabic' : ''}`}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 ${isRTL ? 'right-0' : 'left-0'} z-50 h-full
        bg-[rgba(15,23,42,0.85)] backdrop-blur-xl
        border-white/[0.08]
        ${isRTL ? 'border-l' : 'border-r'}
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-[270px]' : 'w-[72px]'}
        ${mobileOpen ? 'translate-x-0' : `${isRTL ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0`}
        shadow-[0_0_40px_rgba(59,130,246,0.05)]
      `}>
        {/* Logo area with gradient */}
        <div className="relative h-[72px] flex items-center justify-between px-4 overflow-hidden">
          {/* Gradient background for logo area */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-violet-600/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

          {sidebarOpen && (
            <Link to="/admin" className="relative flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                <img src="/assets/salmo-logo.avif" alt="SALMO" className="h-5 w-auto" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">Salmo</span>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] px-1.5 py-0">
                Admin
              </Badge>
            </Link>
          )}
          {!sidebarOpen && (
            <div className="relative w-full flex justify-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <img src="/assets/salmo-logo.avif" alt="SALMO" className="h-5 w-auto" />
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="relative hidden lg:flex h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''} ${isRTL && sidebarOpen ? 'rotate-180' : ''} ${isRTL && !sidebarOpen ? 'rotate-0' : ''}`} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 mt-2 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-white/10">
          {navItems.map((item, idx) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                ${isActive(item.path)
                  ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/10 text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                }
              `}
              style={{ animationDelay: `${idx * 20}ms` }}
            >
              {/* Active indicator */}
              {isActive(item.path) && (
                <div className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-gradient-to-b from-blue-400 to-violet-500`} />
              )}
              <div className={`flex-shrink-0 ${isActive(item.path) ? 'text-blue-400' : 'text-gray-500 group-hover:text-blue-400'} transition-colors`}>
                <item.icon className="h-[18px] w-[18px]" />
              </div>
              {sidebarOpen && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {/* Hover glow */}
              {!isActive(item.path) && (
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/[0.08] transition-all group"
          >
            <Home className="h-[18px] w-[18px] flex-shrink-0" />
            {sidebarOpen && (
              <span className="text-sm font-medium flex items-center gap-2">
                {t('الصفحة الرئيسية', 'Homepage')}
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            )}
          </a>
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-all"
          >
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">{t('العودة للموقع', 'Back to Site')}</span>}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? (isRTL ? 'mr-[270px]' : 'ml-[270px]') : (isRTL ? 'mr-[72px]' : 'ml-[72px]')} lg:block`}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-[72px] bg-[rgba(15,23,42,0.6)] backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-gray-400 hover:text-white hover:bg-white/10"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-violet-500 animate-pulse" />
              <h1 className="text-lg font-semibold text-white">
                {navItems.find(i => isActive(i.path))?.label || t('لوحة التحكم', 'Dashboard')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Server Status */}
            <ServerStatus />

            {/* Notifications */}
            <Link to="/admin/notifications">
              <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white hover:bg-white/10 rounded-xl">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full text-[9px] font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30">
                  3
                </span>
              </Button>
            </Link>

            {/* Language toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              title={t('English', 'العربية')}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
            >
              <Languages className="h-5 w-5" />
            </Button>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10 mx-1" />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2.5 px-2 hover:bg-white/10 rounded-xl h-10">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-2 ring-white/10">
                    <span className="text-white text-sm font-semibold">
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
                    </span>
                  </div>
                  {sidebarOpen && (
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-medium text-white leading-tight">
                        {user?.name || 'Admin'}
                      </span>
                      <span className="text-[11px] text-gray-400 leading-tight">
                        {t('مدير', 'Administrator')}
                      </span>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isRTL ? 'start' : 'end'}
                className="w-52 bg-[rgba(15,23,42,0.95)] backdrop-blur-xl border-white/10 text-gray-200"
              >
                <DropdownMenuItem asChild className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                  <Link to="/admin/profile" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-blue-400" />
                    {t('الملف الشخصي', 'Profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/10 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  {t('تسجيل الخروج', 'Logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;