import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Receipt, Check, Star, Zap, Crown, Building, Plus, Copy, Tag,
  Loader2, RefreshCw, Pencil, Trash2, Eye, EyeOff, ArrowUp, ArrowDown,
  Sparkles, Users, TrendingUp, DollarSign
} from 'lucide-react';
import {
  fetchPlans, createPlan, updatePlan, deletePlan,
  fetchInvoices, fetchCoupons, createCoupon, fetchAllUserSubscriptions,
  type Plan, type Invoice, type Coupon, type UserSubscription
} from '@/lib/adminApi';

const iconOptions = [
  { value: 'Zap', label: 'Zap ⚡', Icon: Zap },
  { value: 'Star', label: 'Star ⭐', Icon: Star },
  { value: 'Crown', label: 'Crown 👑', Icon: Crown },
  { value: 'Building', label: 'Building 🏢', Icon: Building },
  { value: 'Sparkles', label: 'Sparkles ✨', Icon: Sparkles },
];

const iconMap: Record<string, React.ElementType> = { Zap, Star, Crown, Building, Sparkles };

const emptyPlanForm = {
  name_ar: '',
  name_en: '',
  description_ar: '',
  description_en: '',
  price_monthly: 0,
  price_yearly: 0,
  price_lifetime: 0,
  billing_type: 'monthly',
  features: '[]',
  limits: '{}',
  trial_days: 0,
  status: 'active' as const,
  is_recommended: false,
  sort_order: 1,
  color: 'from-blue-500 to-blue-600',
  icon: 'Star',
};

const AdminSubscriptions: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [userSubs, setUserSubs] = useState<UserSubscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Plan dialog state
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [savingPlan, setSavingPlan] = useState(false);
  const [featuresInput, setFeaturesInput] = useState('');

  // Coupon dialog
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount: '', max_uses: 100, expires_at: '' });
  const [savingCoupon, setSavingCoupon] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, subsData, invs, coups] = await Promise.all([
        fetchPlans(),
        fetchAllUserSubscriptions(),
        fetchInvoices(),
        fetchCoupons(),
      ]);
      setPlans(plansData);
      setUserSubs(subsData);
      setInvoices(invs);
      setCoupons(coups);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const parseFeatures = (featuresStr: string): string[] => {
    try {
      return JSON.parse(featuresStr);
    } catch {
      return featuresStr ? featuresStr.split(',').map(f => f.trim()) : [];
    }
  };

  const getSubscriberCount = (planId: number) => {
    return userSubs.filter(s => s.plan_id === planId && s.status === 'active').length;
  };

  const getRevenueForPlan = (planId: number) => {
    return userSubs
      .filter(s => s.plan_id === planId)
      .reduce((sum, s) => sum + (s.amount_paid || 0), 0);
  };

  // Plan CRUD
  const handleCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({ ...emptyPlanForm, sort_order: plans.length + 1 });
    setFeaturesInput('');
    setPlanDialogOpen(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name_ar: plan.name_ar,
      name_en: plan.name_en || '',
      description_ar: plan.description_ar || '',
      description_en: plan.description_en || '',
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly || 0,
      price_lifetime: plan.price_lifetime || 0,
      billing_type: plan.billing_type || 'monthly',
      features: plan.features || '[]',
      limits: plan.limits || '{}',
      trial_days: plan.trial_days || 0,
      status: plan.status as 'active' | 'hidden' | 'draft',
      is_recommended: plan.is_recommended || false,
      sort_order: plan.sort_order,
      color: plan.color || 'from-blue-500 to-blue-600',
      icon: plan.icon || 'Star',
    });
    setFeaturesInput(parseFeatures(plan.features).join('\n'));
    setPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
    try {
      const featuresArray = featuresInput.split('\n').filter(f => f.trim());
      const dataToSave = {
        ...planForm,
        features: JSON.stringify(featuresArray),
      };

      if (editingPlan) {
        await updatePlan(editingPlan.id, dataToSave);
      } else {
        await createPlan(dataToSave);
      }
      setPlanDialogOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save plan:', err);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!deletingPlan) return;
    try {
      await deletePlan(deletingPlan.id);
      setDeleteDialogOpen(false);
      setDeletingPlan(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete plan:', err);
    }
  };

  const handleToggleStatus = async (plan: Plan) => {
    const newStatus = plan.status === 'active' ? 'hidden' : 'active';
    await updatePlan(plan.id, { status: newStatus });
    await loadData();
  };

  const handleToggleRecommended = async (plan: Plan) => {
    // Remove recommended from all others first
    for (const p of plans) {
      if (p.is_recommended && p.id !== plan.id) {
        await updatePlan(p.id, { is_recommended: false });
      }
    }
    await updatePlan(plan.id, { is_recommended: !plan.is_recommended });
    await loadData();
  };

  const handleReorder = async (plan: Plan, direction: 'up' | 'down') => {
    const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(p => p.id === plan.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    await updatePlan(sorted[idx].id, { sort_order: sorted[swapIdx].sort_order });
    await updatePlan(sorted[swapIdx].id, { sort_order: sorted[idx].sort_order });
    await loadData();
  };

  // Coupons
  const handleAddCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount) return;
    setSavingCoupon(true);
    try {
      await createCoupon({
        code: newCoupon.code,
        discount: newCoupon.discount,
        discount_type: 'percentage',
        usage_count: 0,
        max_uses: newCoupon.max_uses,
        expires_at: newCoupon.expires_at,
        is_active: true,
      });
      setCouponDialogOpen(false);
      setNewCoupon({ code: '', discount: '', max_uses: 100, expires_at: '' });
      await loadData();
    } catch (err) {
      console.error('Failed to create coupon:', err);
    } finally {
      setSavingCoupon(false);
    }
  };

  const statusConfig: Record<string, { label: string; class: string }> = {
    active: { label: t('نشط', 'Active'), class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    hidden: { label: t('مخفي', 'Hidden'), class: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    draft: { label: t('مسودة', 'Draft'), class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  };

  const invoiceStatusConfig: Record<string, { label: string; class: string }> = {
    paid: { label: t('مدفوع', 'Paid'), class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    pending: { label: t('معلق', 'Pending'), class: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    overdue: { label: t('متأخر', 'Overdue'), class: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // Stats
  const totalSubscribers = userSubs.filter(s => s.status === 'active').length;
  const totalRevenue = userSubs.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
  const activePlans = plans.filter(p => p.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('إجمالي الخطط', 'Total Plans')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{plans.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('خطط نشطة', 'Active Plans')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{activePlans}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('المشتركين', 'Subscribers')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalSubscribers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('الإيرادات', 'Revenue')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalRevenue} {t('ر.س', 'SAR')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-gray-100 dark:bg-slate-800 p-1">
            <TabsTrigger value="plans">{t('الخطط', 'Plans')}</TabsTrigger>
            <TabsTrigger value="subscribers">{t('المشتركين', 'Subscribers')}</TabsTrigger>
            <TabsTrigger value="invoices">{t('الفواتير', 'Invoices')}</TabsTrigger>
            <TabsTrigger value="coupons">{t('الكوبونات', 'Coupons')}</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleCreatePlan} className="gap-2">
              <Plus className="h-4 w-4" />{t('إضافة خطة', 'Add Plan')}
            </Button>
          </div>
        </div>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plans.sort((a, b) => a.sort_order - b.sort_order).map(plan => {
              const IconComp = iconMap[plan.icon] || Star;
              const features = parseFeatures(plan.features);
              const subCount = getSubscriberCount(plan.id);
              const revenue = getRevenueForPlan(plan.id);

              return (
                <Card key={plan.id} className={`border-0 shadow-sm dark:bg-slate-800 overflow-hidden ${plan.status !== 'active' ? 'opacity-70' : ''}`}>
                  <div className={`h-2 bg-gradient-to-r ${plan.color || 'from-gray-400 to-gray-600'}`} />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                          <IconComp className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white">{plan.name_ar}</h3>
                          <p className="text-[10px] text-gray-500">{plan.name_en}</p>
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${statusConfig[plan.status]?.class || ''}`}>
                        {statusConfig[plan.status]?.label || plan.status}
                      </Badge>
                    </div>

                    {plan.is_recommended && (
                      <Badge className="mb-2 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px]">
                        ⭐ {t('موصى بها', 'Recommended')}
                      </Badge>
                    )}

                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{plan.price_monthly}</span>
                      <span className="text-xs text-gray-500">{t('ر.س/شهر', 'SAR/mo')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                        <p className="text-gray-500">{t('سنوي', 'Yearly')}</p>
                        <p className="font-bold text-gray-900 dark:text-white">{plan.price_yearly || 0} {t('ر.س', 'SAR')}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                        <p className="text-gray-500">{t('مشتركين', 'Subs')}</p>
                        <p className="font-bold text-gray-900 dark:text-white">{subCount}</p>
                      </div>
                    </div>

                    <ul className="space-y-1 mb-4 max-h-24 overflow-y-auto">
                      {features.slice(0, 4).map((f, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                          <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                          <span className="truncate">{f}</span>
                        </li>
                      ))}
                      {features.length > 4 && (
                        <li className="text-[10px] text-gray-400">+{features.length - 4} {t('مميزات أخرى', 'more')}</li>
                      )}
                    </ul>

                    <div className="flex gap-1.5 flex-wrap">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleEditPlan(plan)}>
                        <Pencil className="h-3 w-3" />{t('تعديل', 'Edit')}
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleToggleStatus(plan)}>
                        {plan.status === 'active' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleToggleRecommended(plan)}>
                        <Star className={`h-3 w-3 ${plan.is_recommended ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleReorder(plan, 'up')}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleReorder(plan, 'down')}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 hover:bg-red-50 gap-1" onClick={() => { setDeletingPlan(plan); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers">
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />{t('المشتركين', 'Subscribers')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-slate-700/50">
                      <TableHead>{t('المستخدم', 'User')}</TableHead>
                      <TableHead>{t('الخطة', 'Plan')}</TableHead>
                      <TableHead>{t('الدورة', 'Cycle')}</TableHead>
                      <TableHead>{t('المبلغ', 'Amount')}</TableHead>
                      <TableHead>{t('البداية', 'Start')}</TableHead>
                      <TableHead>{t('الانتهاء', 'End')}</TableHead>
                      <TableHead>{t('الحالة', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSubs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          {t('لا يوجد مشتركين حالياً', 'No subscribers yet')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      userSubs.map(sub => {
                        const plan = plans.find(p => p.id === sub.plan_id);
                        return (
                          <TableRow key={sub.id}>
                            <TableCell className="text-sm font-mono">{sub.user_id?.slice(0, 8)}...</TableCell>
                            <TableCell className="text-sm">{plan?.name_ar || `Plan #${sub.plan_id}`}</TableCell>
                            <TableCell className="text-sm">{sub.billing_cycle}</TableCell>
                            <TableCell className="text-sm font-medium">{sub.amount_paid} {t('ر.س', 'SAR')}</TableCell>
                            <TableCell className="text-sm text-gray-500">{sub.start_date || '—'}</TableCell>
                            <TableCell className="text-sm text-gray-500">{sub.end_date || '—'}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${
                                sub.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                                sub.status === 'trial' ? 'bg-blue-50 text-blue-700' :
                                sub.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {sub.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />{t('الفواتير', 'Invoices')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-slate-700/50">
                      <TableHead>{t('رقم الفاتورة', 'Invoice #')}</TableHead>
                      <TableHead>{t('العميل', 'Customer')}</TableHead>
                      <TableHead>{t('الباقة', 'Plan')}</TableHead>
                      <TableHead>{t('المبلغ', 'Amount')}</TableHead>
                      <TableHead>{t('التاريخ', 'Date')}</TableHead>
                      <TableHead>{t('الحالة', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {t('لا توجد فواتير', 'No invoices')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                          <TableCell className="text-sm">{inv.customer_name}</TableCell>
                          <TableCell className="text-sm">{inv.plan}</TableCell>
                          <TableCell className="text-sm font-medium">{inv.amount} {t('ر.س', 'SAR')}</TableCell>
                          <TableCell className="text-sm text-gray-500">{inv.date}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${invoiceStatusConfig[inv.status]?.class || ''}`}>
                              {invoiceStatusConfig[inv.status]?.label || inv.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setCouponDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />{t('إضافة كوبون', 'Add Coupon')}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.length === 0 ? (
                <Card className="border-0 shadow-sm dark:bg-slate-800 col-span-full">
                  <CardContent className="p-8 text-center text-gray-500">
                    {t('لا توجد كوبونات', 'No coupons')}
                  </CardContent>
                </Card>
              ) : (
                coupons.map(coupon => (
                  <Card key={coupon.id} className={`border-0 shadow-sm dark:bg-slate-800 ${!coupon.is_active ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-purple-500" />
                          <code className="text-sm font-bold text-gray-900 dark:text-white">{coupon.code}</code>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(coupon.code)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-2">{coupon.discount}</p>
                      <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <p>{t('الاستخدام', 'Usage')}: {coupon.usage_count}/{coupon.max_uses}</p>
                        <p>{t('ينتهي', 'Expires')}: {coupon.expires_at}</p>
                      </div>
                      <Badge className={`mt-3 text-xs ${coupon.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {coupon.is_active ? t('نشط', 'Active') : t('منتهي', 'Expired')}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? t('تعديل الخطة', 'Edit Plan') : t('إنشاء خطة جديدة', 'Create New Plan')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium">{t('اسم الخطة (عربي)', 'Plan Name (Arabic)')}</label>
              <Input className="mt-1" value={planForm.name_ar} onChange={e => setPlanForm(f => ({ ...f, name_ar: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('اسم الخطة (إنجليزي)', 'Plan Name (English)')}</label>
              <Input className="mt-1" value={planForm.name_en} onChange={e => setPlanForm(f => ({ ...f, name_en: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('الوصف (عربي)', 'Description (Arabic)')}</label>
              <Input className="mt-1" value={planForm.description_ar} onChange={e => setPlanForm(f => ({ ...f, description_ar: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('الوصف (إنجليزي)', 'Description (English)')}</label>
              <Input className="mt-1" value={planForm.description_en} onChange={e => setPlanForm(f => ({ ...f, description_en: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('السعر الشهري (ر.س)', 'Monthly Price (SAR)')}</label>
              <Input type="number" className="mt-1" value={planForm.price_monthly} onChange={e => setPlanForm(f => ({ ...f, price_monthly: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('السعر السنوي (ر.س)', 'Yearly Price (SAR)')}</label>
              <Input type="number" className="mt-1" value={planForm.price_yearly} onChange={e => setPlanForm(f => ({ ...f, price_yearly: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('السعر مدى الحياة (ر.س)', 'Lifetime Price (SAR)')}</label>
              <Input type="number" className="mt-1" value={planForm.price_lifetime} onChange={e => setPlanForm(f => ({ ...f, price_lifetime: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('أيام التجربة', 'Trial Days')}</label>
              <Input type="number" className="mt-1" value={planForm.trial_days} onChange={e => setPlanForm(f => ({ ...f, trial_days: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('الحالة', 'Status')}</label>
              <Select value={planForm.status} onValueChange={(v) => setPlanForm(f => ({ ...f, status: v as 'active' | 'hidden' | 'draft' }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('نشط', 'Active')}</SelectItem>
                  <SelectItem value="hidden">{t('مخفي', 'Hidden')}</SelectItem>
                  <SelectItem value="draft">{t('مسودة', 'Draft')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t('الأيقونة', 'Icon')}</label>
              <Select value={planForm.icon} onValueChange={(v) => setPlanForm(f => ({ ...f, icon: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {iconOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t('اللون', 'Color Gradient')}</label>
              <Select value={planForm.color} onValueChange={(v) => setPlanForm(f => ({ ...f, color: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="from-gray-100 to-gray-200">{t('رمادي', 'Gray')}</SelectItem>
                  <SelectItem value="from-blue-500 to-blue-600">{t('أزرق', 'Blue')}</SelectItem>
                  <SelectItem value="from-purple-500 to-purple-600">{t('بنفسجي', 'Purple')}</SelectItem>
                  <SelectItem value="from-amber-500 to-orange-600">{t('ذهبي', 'Gold')}</SelectItem>
                  <SelectItem value="from-emerald-500 to-emerald-600">{t('أخضر', 'Green')}</SelectItem>
                  <SelectItem value="from-rose-500 to-rose-600">{t('وردي', 'Rose')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t('ترتيب العرض', 'Sort Order')}</label>
              <Input type="number" className="mt-1" value={planForm.sort_order} onChange={e => setPlanForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={planForm.is_recommended} onCheckedChange={(v) => setPlanForm(f => ({ ...f, is_recommended: v }))} />
              <label className="text-sm font-medium">{t('الخطة الموصى بها', 'Recommended Plan')}</label>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">{t('المميزات (سطر لكل ميزة)', 'Features (one per line)')}</label>
              <Textarea
                className="mt-1 min-h-[120px]"
                placeholder={t('ميزة 1\nميزة 2\nميزة 3', 'Feature 1\nFeature 2\nFeature 3')}
                value={featuresInput}
                onChange={e => setFeaturesInput(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">{t('الحدود (JSON)', 'Limits (JSON)')}</label>
              <Textarea
                className="mt-1 min-h-[80px] font-mono text-xs"
                placeholder='{"max_questions_daily": 10, "max_contracts": 5}'
                value={planForm.limits}
                onChange={e => setPlanForm(f => ({ ...f, limits: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={handleSavePlan} disabled={savingPlan || !planForm.name_ar}>
              {savingPlan && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {editingPlan ? t('حفظ التعديلات', 'Save Changes') : t('إنشاء الخطة', 'Create Plan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">{t('حذف الخطة', 'Delete Plan')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t(
              `هل أنت متأكد من حذف خطة "${deletingPlan?.name_ar}"؟ لا يمكن التراجع عن هذا الإجراء.`,
              `Are you sure you want to delete "${deletingPlan?.name_en}"? This action cannot be undone.`
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button variant="destructive" onClick={handleDeletePlan}>{t('حذف', 'Delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Coupon Dialog */}
      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('إضافة كوبون جديد', 'Add New Coupon')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">{t('كود الكوبون', 'Coupon Code')}</label>
              <Input placeholder="e.g. SAVE20" className="mt-1" value={newCoupon.code} onChange={e => setNewCoupon(c => ({ ...c, code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('نسبة الخصم', 'Discount')}</label>
              <Input placeholder="20%" className="mt-1" value={newCoupon.discount} onChange={e => setNewCoupon(c => ({ ...c, discount: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('الحد الأقصى للاستخدام', 'Max Uses')}</label>
              <Input type="number" className="mt-1" value={newCoupon.max_uses} onChange={e => setNewCoupon(c => ({ ...c, max_uses: parseInt(e.target.value) || 100 }))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('تاريخ الانتهاء', 'Expiry Date')}</label>
              <Input type="date" className="mt-1" value={newCoupon.expires_at} onChange={e => setNewCoupon(c => ({ ...c, expires_at: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponDialogOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={handleAddCoupon} disabled={savingCoupon}>
              {savingCoupon && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('إضافة', 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;