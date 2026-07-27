import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, TrendingUp, Activity, FileText, Scale, Calculator, Search } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const monthlyData = [
  { month: 'يناير', revenue: 12000, customers: 45, churn: 3 },
  { month: 'فبراير', revenue: 15000, customers: 52, churn: 2 },
  { month: 'مارس', revenue: 18000, customers: 61, churn: 4 },
  { month: 'أبريل', revenue: 22000, customers: 78, churn: 3 },
  { month: 'مايو', revenue: 28000, customers: 95, churn: 5 },
  { month: 'يونيو', revenue: 32000, customers: 112, churn: 4 },
  { month: 'يوليو', revenue: 35000, customers: 128, churn: 3 },
  { month: 'أغسطس', revenue: 38000, customers: 142, churn: 6 },
  { month: 'سبتمبر', revenue: 41000, customers: 158, churn: 4 },
  { month: 'أكتوبر', revenue: 44000, customers: 175, churn: 5 },
  { month: 'نوفمبر', revenue: 48000, customers: 192, churn: 3 },
  { month: 'ديسمبر', revenue: 52000, customers: 210, churn: 4 },
];

const serviceUsage = [
  { name: 'تحليل السير الذاتية', usage: 4500, icon: FileText, color: '#3B82F6' },
  { name: 'البحث في النظام', usage: 3200, icon: Search, color: '#8B5CF6' },
  { name: 'تحليل العقود', usage: 2100, icon: Scale, color: '#10B981' },
  { name: 'حاسبة نهاية الخدمة', usage: 1800, icon: Calculator, color: '#F59E0B' },
  { name: 'المحادثة الذكية', usage: 5200, icon: Activity, color: '#EF4444' },
];

const dailyActiveUsers = [
  { day: 'سبت', users: 85 }, { day: 'أحد', users: 120 }, { day: 'اثنين', users: 145 },
  { day: 'ثلاثاء', users: 132 }, { day: 'أربعاء', users: 155 }, { day: 'خميس', users: 140 },
  { day: 'جمعة', users: 78 },
];

const AdminAnalytics: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const metrics = [
    { label: t('إجمالي الإيرادات', 'Total Revenue'), value: '385,000 ر.س', change: '+32%', icon: DollarSign, color: 'from-emerald-500 to-emerald-600' },
    { label: t('العملاء النشطين', 'Active Customers'), value: '210', change: '+18%', icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: t('معدل النمو', 'Growth Rate'), value: '23%', change: '+5%', icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
    { label: t('معدل الإلغاء', 'Churn Rate'), value: '2.1%', change: '-0.5%', icon: Activity, color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <Card key={idx} className="border-0 shadow-sm dark:bg-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center`}>
                  <m.icon className="h-5 w-5 text-white" />
                </div>
                <Badge variant="secondary" className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {m.change}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{m.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue & Customers Chart */}
      <Card className="border-0 shadow-sm dark:bg-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('الإيرادات ونمو العملاء', 'Revenue & Customer Growth')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCust" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fill="url(#colorRev)" name={t('الإيرادات', 'Revenue')} />
                <Area yAxisId="right" type="monotone" dataKey="customers" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorCust)" name={t('العملاء', 'Customers')} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Active Users */}
        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('المستخدمين النشطين يومياً', 'Daily Active Users')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyActiveUsers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="users" fill="#3B82F6" radius={[4, 4, 0, 0]} name={t('المستخدمين', 'Users')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Churn Rate */}
        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('معدل الإلغاء الشهري', 'Monthly Churn Rate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="churn" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 4 }} name={t('الإلغاءات', 'Churn')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Usage */}
      <Card className="border-0 shadow-sm dark:bg-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('أكثر الخدمات استخداماً', 'Most Used Services')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {serviceUsage.sort((a, b) => b.usage - a.usage).map((service, idx) => {
              const maxUsage = Math.max(...serviceUsage.map(s => s.usage));
              const percentage = (service.usage / maxUsage) * 100;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${service.color}15` }}>
                    <service.icon className="h-4 w-4" style={{ color: service.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{service.name}</span>
                      <span className="text-sm text-gray-500">{service.usage.toLocaleString()} {t('استخدام', 'uses')}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: service.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;