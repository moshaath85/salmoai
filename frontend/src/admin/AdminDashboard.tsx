import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, TrendingUp, DollarSign, UserPlus, TicketCheck, Loader2,
  ArrowUpRight, Zap, FileText, MessageSquare, BarChart3, RefreshCw
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fetchDashboardStats } from '@/lib/adminApi';
import { Link } from 'react-router-dom';

const revenueData = [
  { month: 'يناير', revenue: 12000, customers: 45 },
  { month: 'فبراير', revenue: 15000, customers: 52 },
  { month: 'مارس', revenue: 18000, customers: 61 },
  { month: 'أبريل', revenue: 22000, customers: 78 },
  { month: 'مايو', revenue: 28000, customers: 95 },
  { month: 'يونيو', revenue: 32000, customers: 112 },
  { month: 'يوليو', revenue: 35000, customers: 128 },
];

const subscriptionData = [
  { name: 'أساسي', value: 45, color: '#3B82F6' },
  { name: 'احترافي', value: 35, color: '#8B5CF6' },
  { name: 'مؤسسي', value: 20, color: '#10B981' },
];

interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  openTickets: number;
  unreadNotifications: number;
  recentCustomers: any[];
  recentTickets: any[];
}

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 1200) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return count;
}

const StatCard: React.FC<{
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  glowColor: string;
  delay: number;
}> = ({ title, value, suffix, prefix, subtitle, icon: Icon, gradient, glowColor, delay }) => {
  const animatedValue = useAnimatedCounter(value);

  return (
    <div
      className="relative group rounded-2xl p-5 bg-[rgba(15,23,42,0.7)] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 overflow-hidden animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${glowColor} opacity-20 blur-3xl group-hover:opacity-30 transition-opacity`} />

      <div className="relative flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px] px-2 py-0.5">
          <TrendingUp className="h-3 w-3 mr-1" />
          +12%
        </Badge>
      </div>

      <div className="relative">
        <p className="text-3xl font-bold text-white mb-1 tabular-nums">
          {prefix}{animatedValue.toLocaleString()}{suffix}
        </p>
        <p className="text-sm text-gray-400 font-medium">{title}</p>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const { language } = useTheme();
  const { user } = useAuth();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-violet-500/20 border-b-violet-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <p className="text-gray-400 text-sm">{t('جاري التحميل...', 'Loading...')}</p>
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('صباح الخير', 'Good morning');
    if (hour < 18) return t('مساء الخير', 'Good afternoon');
    return t('مساء الخير', 'Good evening');
  };

  const today = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const quickActions = [
    { label: t('إدارة العملاء', 'Manage Customers'), icon: Users, path: '/admin/customers', gradient: 'from-blue-500 to-blue-600' },
    { label: t('التذاكر المفتوحة', 'Open Tickets'), icon: TicketCheck, path: '/admin/tickets', gradient: 'from-violet-500 to-violet-600' },
    { label: t('التحليلات', 'Analytics'), icon: BarChart3, path: '/admin/analytics', gradient: 'from-cyan-500 to-cyan-600' },
    { label: t('الاشتراكات', 'Subscriptions'), icon: DollarSign, path: '/admin/subscriptions', gradient: 'from-emerald-500 to-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative rounded-2xl p-6 bg-[rgba(15,23,42,0.5)] backdrop-blur-xl border border-white/[0.06] overflow-hidden animate-slide-up">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-violet-600/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {greeting()}، {user?.name || t('مدير', 'Admin')} 👋
            </h1>
            <p className="text-gray-400 text-sm">{today}</p>
          </div>
          <Button
            onClick={loadStats}
            className="bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10 rounded-xl gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('تحديث', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('إجمالي العملاء', 'Total Customers')}
          value={stats?.totalCustomers || 0}
          subtitle={`${stats?.activeCustomers || 0} ${t('نشط', 'active')}`}
          icon={Users}
          gradient="from-blue-500 to-blue-600"
          glowColor="bg-blue-500"
          delay={0}
        />
        <StatCard
          title={t('الإيرادات', 'Revenue')}
          value={stats?.totalRevenue || 0}
          suffix={` ${t('ر.س', 'SAR')}`}
          subtitle={t('من الفواتير المدفوعة', 'from paid invoices')}
          icon={DollarSign}
          gradient="from-emerald-500 to-emerald-600"
          glowColor="bg-emerald-500"
          delay={100}
        />
        <StatCard
          title={t('تذاكر مفتوحة', 'Open Tickets')}
          value={stats?.openTickets || 0}
          subtitle={t('بحاجة للرد', 'need response')}
          icon={TicketCheck}
          gradient="from-violet-500 to-violet-600"
          glowColor="bg-violet-500"
          delay={200}
        />
        <StatCard
          title={t('إشعارات جديدة', 'New Notifications')}
          value={stats?.unreadNotifications || 0}
          subtitle={t('غير مقروءة', 'unread')}
          icon={UserPlus}
          gradient="from-amber-500 to-orange-500"
          glowColor="bg-amber-500"
          delay={300}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-2xl p-5 bg-[rgba(15,23,42,0.7)] backdrop-blur-xl border border-white/[0.08] animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">{t('الإيرادات الشهرية', 'Monthly Revenue')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('آخر 7 أشهر', 'Last 7 months')}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-400">{t('الإيرادات', 'Revenue')}</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenueAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} stroke="rgba(255,255,255,0.05)" />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} stroke="rgba(255,255,255,0.05)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    backdropFilter: 'blur(12px)',
                    color: '#fff',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  }}
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} fill="url(#colorRevenueAdmin)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Distribution */}
        <div className="rounded-2xl p-5 bg-[rgba(15,23,42,0.7)] backdrop-blur-xl border border-white/[0.08] animate-slide-up" style={{ animationDelay: '300ms' }}>
          <h3 className="text-base font-semibold text-white mb-1">{t('توزيع الاشتراكات', 'Subscription Distribution')}</h3>
          <p className="text-xs text-gray-500 mb-4">{t('حسب نوع الخطة', 'By plan type')}</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subscriptionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4} strokeWidth={0}>
                  {subscriptionData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {subscriptionData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Growth */}
        <div className="rounded-2xl p-5 bg-[rgba(15,23,42,0.7)] backdrop-blur-xl border border-white/[0.08] animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">{t('نمو العملاء', 'Customer Growth')}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{t('عدد العملاء الجدد شهرياً', 'New customers per month')}</p>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} stroke="rgba(255,255,255,0.05)" />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} stroke="rgba(255,255,255,0.05)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="customers" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl p-5 bg-[rgba(15,23,42,0.7)] backdrop-blur-xl border border-white/[0.08] animate-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">{t('آخر العملاء', 'Recent Customers')}</h3>
            <Link to="/admin/customers" className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
              {t('عرض الكل', 'View all')}
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(stats?.recentCustomers || []).map((customer: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-all group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold text-white ${
                  customer.status === 'active' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                  customer.status === 'trial' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                  customer.status === 'suspended' ? 'bg-gradient-to-br from-rose-500 to-rose-600' :
                  'bg-gradient-to-br from-gray-500 to-gray-600'
                }`}>
                  {customer.owner_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{customer.owner_name}</p>
                  <p className="text-xs text-gray-500 truncate">{customer.company_name} • {customer.email}</p>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  customer.status === 'active' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' :
                  customer.status === 'trial' ? 'bg-blue-400 shadow-sm shadow-blue-400/50' :
                  customer.status === 'suspended' ? 'bg-rose-400 shadow-sm shadow-rose-400/50' : 'bg-gray-400'
                }`} />
              </div>
            ))}
            {(!stats?.recentCustomers || stats.recentCustomers.length === 0) && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-gray-600 mb-2" />
                <p className="text-sm text-gray-500">{t('لا يوجد عملاء بعد', 'No customers yet')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl p-5 bg-[rgba(15,23,42,0.5)] backdrop-blur-xl border border-white/[0.06] animate-slide-up" style={{ animationDelay: '600ms' }}>
        <h3 className="text-base font-semibold text-white mb-4">{t('إجراءات سريعة', 'Quick Actions')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              to={action.path}
              className="group relative flex flex-col items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-200"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs text-gray-400 group-hover:text-white transition-colors text-center font-medium">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;