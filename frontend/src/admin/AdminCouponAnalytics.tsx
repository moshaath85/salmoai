import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tag, TrendingUp, DollarSign, Users, AlertTriangle, BarChart3,
  Loader2, RefreshCw, Calendar, ArrowUpRight, ArrowDownRight, Percent
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  fetchAnalyticsSummary, fetchUsageOverTime, fetchCouponPerformance,
  fetchExpiringCoupons, checkAndNotifyExpiring,
  type AnalyticsSummary, type DailyUsageData, type CouponPerformance, type CouponExpiryAlert
} from '@/lib/couponAnalyticsApi';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

const AdminCouponAnalytics: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [usageData, setUsageData] = useState<DailyUsageData[]>([]);
  const [performance, setPerformance] = useState<CouponPerformance[]>([]);
  const [expiringCoupons, setExpiringCoupons] = useState<CouponExpiryAlert[]>([]);
  const [dateRange, setDateRange] = useState<number>(30);
  const [notifying, setNotifying] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, usage, perf, expiring] = await Promise.all([
        fetchAnalyticsSummary(),
        fetchUsageOverTime(dateRange),
        fetchCouponPerformance(),
        fetchExpiringCoupons(7),
      ]);
      setSummary(summaryData);
      setUsageData(usage);
      setPerformance(perf);
      setExpiringCoupons(expiring);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNotify = async () => {
    setNotifying(true);
    try {
      const result = await checkAndNotifyExpiring(7);
      alert(t(
        `تم إنشاء ${result.notifications_created} إشعار(ات) جديدة`,
        `Created ${result.notifications_created} new notification(s)`
      ));
      await loadData();
    } catch (err) {
      console.error('Failed to send notifications:', err);
    } finally {
      setNotifying(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `${val.toLocaleString()} ${t('ر.س', 'SAR')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Prepare pie chart data for discount types
  const discountTypeData = performance.reduce((acc, p) => {
    const existing = acc.find(a => a.name === p.discount_type);
    if (existing) {
      existing.value += p.usage_count;
    } else {
      acc.push({ name: p.discount_type, value: p.usage_count });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('تحليلات الكوبونات', 'Coupon Analytics')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('إحصائيات الاستخدام ومعدلات الاسترداد وتأثير الإيرادات', 'Usage statistics, redemption rates, and revenue impact')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 me-1" />
            {t('تحديث', 'Refresh')}
          </Button>
          {expiringCoupons.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleNotify}
              disabled={notifying}
            >
              {notifying ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <AlertTriangle className="h-4 w-4 me-1" />}
              {t('إرسال تنبيهات الانتهاء', 'Send Expiry Alerts')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-white" />
                </div>
                <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {summary.active_coupons} {t('نشط', 'active')}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_coupons}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('إجمالي الكوبونات', 'Total Coupons')}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3 w-3" />
                  <span className="text-xs font-medium">{summary.avg_redemption_rate}%</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_redemptions}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('إجمالي الاستردادات', 'Total Redemptions')}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center text-purple-600 dark:text-purple-400">
                  <ArrowDownRight className="h-3 w-3" />
                  <span className="text-xs font-medium">{t('خصم', 'discount')}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.total_discount_given)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('إجمالي الخصومات', 'Total Discounts Given')}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                {summary.expiring_soon > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {t('تحذير', 'Warning')}
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.expiring_soon}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('تنتهي خلال 7 أيام', 'Expiring in 7 days')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">{t('الفترة:', 'Period:')}</span>
        {[7, 30, 60, 90].map(d => (
          <Button
            key={d}
            variant={dateRange === d ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange(d)}
          >
            {d} {t('يوم', 'days')}
          </Button>
        ))}
      </div>

      {/* Usage Over Time Chart */}
      <Card className="border-0 shadow-sm dark:bg-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            {t('استخدام الكوبونات عبر الزمن', 'Coupon Usage Over Time')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {usageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData}>
                  <defs>
                    <linearGradient id="colorRedemptions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDiscount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="redemptions" stroke="#3B82F6" strokeWidth={2} fill="url(#colorRedemptions)" name={t('الاستردادات', 'Redemptions')} />
                  <Area yAxisId="right" type="monotone" dataKey="discount_amount" stroke="#EF4444" strokeWidth={2} fill="url(#colorDiscount)" name={t('مبلغ الخصم', 'Discount Amount')} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                {t('لا توجد بيانات استخدام في هذه الفترة', 'No usage data for this period')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Impact & Discount Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Impact */}
        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              {t('تأثير الإيرادات', 'Revenue Impact')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {usageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} name={t('الإيرادات', 'Revenue')} />
                    <Line type="monotone" dataKey="discount_amount" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 3 }} name={t('الخصومات', 'Discounts')} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  {t('لا توجد بيانات', 'No data available')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Discount Type Distribution */}
        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4 text-purple-500" />
              {t('توزيع أنواع الخصم', 'Discount Type Distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {discountTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={discountTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {discountTypeData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  {t('لا توجد بيانات', 'No data available')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Redemption Rate by Coupon */}
      <Card className="border-0 shadow-sm dark:bg-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            {t('معدل الاسترداد حسب الكوبون', 'Redemption Rate by Coupon')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {performance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94A3B8" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="code" tick={{ fontSize: 11 }} stroke="#94A3B8" width={100} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`${value}%`, t('معدل الاسترداد', 'Redemption Rate')]}
                  />
                  <Bar dataKey="redemption_rate" fill="#8B5CF6" radius={[0, 4, 4, 0]} name={t('معدل الاسترداد', 'Redemption Rate')} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                {t('لا توجد بيانات', 'No data available')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Coupons Table */}
      <Card className="border-0 shadow-sm dark:bg-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4 text-emerald-500" />
            {t('أفضل الكوبونات أداءً', 'Top Performing Coupons')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-start py-3 px-2 font-medium text-gray-500 dark:text-gray-400">{t('الكود', 'Code')}</th>
                  <th className="text-start py-3 px-2 font-medium text-gray-500 dark:text-gray-400">{t('النوع', 'Type')}</th>
                  <th className="text-start py-3 px-2 font-medium text-gray-500 dark:text-gray-400">{t('الاستخدام', 'Uses')}</th>
                  <th className="text-start py-3 px-2 font-medium text-gray-500 dark:text-gray-400">{t('إجمالي الخصم', 'Total Discount')}</th>
                  <th className="text-start py-3 px-2 font-medium text-gray-500 dark:text-gray-400">{t('الإيرادات', 'Revenue')}</th>
                  <th className="text-start py-3 px-2 font-medium text-gray-500 dark:text-gray-400">{t('متوسط الخصم', 'Avg Discount')}</th>
                  <th className="text-start py-3 px-2 font-medium text-gray-500 dark:text-gray-400">{t('المعدل', 'Rate')}</th>
                </tr>
              </thead>
              <tbody>
                {performance.slice(0, 10).map((p) => (
                  <tr key={p.coupon_id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-2">
                      <Badge variant="outline" className="font-mono text-xs">{p.code}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant="secondary" className="text-xs capitalize">{p.discount_type}</Badge>
                    </td>
                    <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{p.usage_count}</td>
                    <td className="py-3 px-2 text-red-600 dark:text-red-400">{formatCurrency(p.total_discount)}</td>
                    <td className="py-3 px-2 text-emerald-600 dark:text-emerald-400">{formatCurrency(p.total_revenue)}</td>
                    <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{formatCurrency(p.avg_discount)}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{ width: `${Math.min(p.redemption_rate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{p.redemption_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {performance.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      {t('لا توجد بيانات أداء', 'No performance data available')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Expiring Coupons Alert Section */}
      {expiringCoupons.length > 0 && (
        <Card className="border-0 shadow-sm dark:bg-slate-800 border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              {t('كوبونات تنتهي قريباً', 'Coupons Expiring Soon')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringCoupons.map((c) => (
                <div
                  key={c.coupon_id}
                  className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{c.code}</Badge>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {c.usage_count} {t('استخدام', 'uses')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={c.days_remaining <= 2 ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {c.days_remaining} {t('يوم متبقي', 'days left')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminCouponAnalytics;