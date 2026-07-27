import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  fetchCoupons, createCoupon, updateCoupon, deleteCoupon,
  fetchCouponStats, fetchCouponUsages, fetchActivePlans,
  type Coupon, type CouponStats, type CouponUsage, type Plan
} from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Pencil, Trash2, Tag, Copy, Search, BarChart3,
  Users, TrendingUp, DollarSign, Clock, CheckCircle2,
  XCircle, Eye, Percent, Hash, Gift, Zap, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const AdminCoupons: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [selectedCouponStats, setSelectedCouponStats] = useState<CouponStats | null>(null);
  const [selectedCouponUsages, setSelectedCouponUsages] = useState<CouponUsage[]>([]);
  const [selectedCouponForStats, setSelectedCouponForStats] = useState<Coupon | null>(null);

  const [form, setForm] = useState({
    code: '',
    discount: '',
    discount_type: 'percentage',
    coupon_type: 'general',
    applicable_plans: '',
    applicable_cycles: '',
    max_uses: 100,
    max_uses_per_user: 1,
    min_amount: '',
    max_discount_amount: '',
    trial_days: '',
    starts_at: '',
    expires_at: '',
    is_active: true,
    stackable: false,
    description_ar: '',
    description_en: '',
  });

  useEffect(() => {
    loadCoupons();
    loadPlans();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await fetchCoupons();
      setCoupons(data);
    } catch {
      toast.error(t('فشل تحميل الكوبونات', 'Failed to load coupons'));
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const data = await fetchActivePlans();
      setPlans(data);
    } catch {
      // Plans loading is optional
    }
  };

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setForm({
      code: '',
      discount: '',
      discount_type: 'percentage',
      coupon_type: 'general',
      applicable_plans: '',
      applicable_cycles: '',
      max_uses: 100,
      max_uses_per_user: 1,
      min_amount: '',
      max_discount_amount: '',
      trial_days: '',
      starts_at: '',
      expires_at: '',
      is_active: true,
      stackable: false,
      description_ar: '',
      description_en: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      discount: coupon.discount,
      discount_type: coupon.discount_type || 'percentage',
      coupon_type: coupon.coupon_type || 'general',
      applicable_plans: coupon.applicable_plans || '',
      applicable_cycles: coupon.applicable_cycles || '',
      max_uses: coupon.max_uses || 100,
      max_uses_per_user: coupon.max_uses_per_user || 1,
      min_amount: coupon.min_amount ? String(coupon.min_amount) : '',
      max_discount_amount: coupon.max_discount_amount ? String(coupon.max_discount_amount) : '',
      trial_days: coupon.trial_days ? String(coupon.trial_days) : '',
      starts_at: coupon.starts_at || '',
      expires_at: coupon.expires_at || '',
      is_active: coupon.is_active,
      stackable: coupon.stackable || false,
      description_ar: coupon.description_ar || '',
      description_en: coupon.description_en || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.discount) {
      toast.error(t('يرجى ملء جميع الحقول المطلوبة', 'Please fill all required fields'));
      return;
    }

    const data: Partial<Coupon> = {
      code: form.code.toUpperCase(),
      discount: form.discount,
      discount_type: form.discount_type,
      coupon_type: form.coupon_type,
      applicable_plans: form.applicable_plans || null,
      applicable_cycles: form.applicable_cycles || null,
      max_uses: form.max_uses || null,
      max_uses_per_user: form.max_uses_per_user || 1,
      min_amount: form.min_amount ? parseFloat(form.min_amount) : null,
      max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
      trial_days: form.trial_days ? parseInt(form.trial_days) : null,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
      stackable: form.stackable,
      description_ar: form.description_ar || null,
      description_en: form.description_en || null,
    };

    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, data);
        toast.success(t('تم تحديث الكوبون', 'Coupon updated'));
      } else {
        await createCoupon(data);
        toast.success(t('تم إنشاء الكوبون', 'Coupon created'));
      }
      setDialogOpen(false);
      loadCoupons();
    } catch {
      toast.error(t('فشلت العملية', 'Operation failed'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('هل أنت متأكد من حذف هذا الكوبون؟', 'Are you sure you want to delete this coupon?'))) return;
    try {
      await deleteCoupon(id);
      toast.success(t('تم حذف الكوبون', 'Coupon deleted'));
      loadCoupons();
    } catch {
      toast.error(t('فشل حذف الكوبون', 'Failed to delete coupon'));
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await updateCoupon(coupon.id, { is_active: !coupon.is_active });
      toast.success(coupon.is_active
        ? t('تم تعطيل الكوبون', 'Coupon deactivated')
        : t('تم تفعيل الكوبون', 'Coupon activated'));
      loadCoupons();
    } catch {
      toast.error(t('فشلت العملية', 'Operation failed'));
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t('تم نسخ الكود', 'Code copied'));
  };

  const handleGenerateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm({ ...form, code });
  };

  const handleViewStats = async (coupon: Coupon) => {
    setSelectedCouponForStats(coupon);
    setStatsDialogOpen(true);
    try {
      const [stats, usages] = await Promise.all([
        fetchCouponStats(coupon.id),
        fetchCouponUsages(coupon.id),
      ]);
      setSelectedCouponStats(stats);
      setSelectedCouponUsages(usages.items || []);
    } catch {
      toast.error(t('فشل تحميل الإحصائيات', 'Failed to load stats'));
    }
  };

  const getDiscountTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      percentage: { ar: 'نسبة مئوية', en: 'Percentage' },
      fixed: { ar: 'مبلغ ثابت', en: 'Fixed Amount' },
      free_trial: { ar: 'تجربة مجانية', en: 'Free Trial' },
      upgrade: { ar: 'ترقية خطة', en: 'Plan Upgrade' },
      time_limited: { ar: 'خصم لفترة محددة', en: 'Time Limited' },
    };
    return labels[type] ? t(labels[type].ar, labels[type].en) : type;
  };

  const getCouponTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      general: { ar: 'عام', en: 'General' },
      first_purchase: { ar: 'أول شراء', en: 'First Purchase' },
      renewal: { ar: 'تجديد', en: 'Renewal' },
      referral: { ar: 'إحالة', en: 'Referral' },
      affiliate: { ar: 'تسويق بالعمولة', en: 'Affiliate' },
      seasonal: { ar: 'موسمي', en: 'Seasonal' },
    };
    return labels[type] ? t(labels[type].ar, labels[type].en) : type;
  };

  const getDiscountTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage': return <Percent className="h-4 w-4" />;
      case 'fixed': return <DollarSign className="h-4 w-4" />;
      case 'free_trial': return <Gift className="h-4 w-4" />;
      case 'upgrade': return <Zap className="h-4 w-4" />;
      case 'time_limited': return <Clock className="h-4 w-4" />;
      default: return <Tag className="h-4 w-4" />;
    }
  };

  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = !searchQuery ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description_ar && c.description_ar.includes(searchQuery));

    if (activeTab === 'active') return matchesSearch && c.is_active;
    if (activeTab === 'inactive') return matchesSearch && !c.is_active;
    if (activeTab === 'expired') {
      return matchesSearch && c.expires_at && new Date(c.expires_at) < new Date();
    }
    return matchesSearch;
  });

  // Summary stats
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.is_active).length;
  const totalUsage = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0);
  const expiredCoupons = coupons.filter(c => c.expires_at && new Date(c.expires_at) < new Date()).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('إدارة الكوبونات', 'Coupon Management')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('إنشاء وإدارة أكواد الخصم والعروض', 'Create and manage discount codes and offers')}
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('إنشاء كوبون', 'Create Coupon')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Tag className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCoupons}</p>
              <p className="text-xs text-muted-foreground">{t('إجمالي الكوبونات', 'Total Coupons')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCoupons}</p>
              <p className="text-xs text-muted-foreground">{t('كوبونات نشطة', 'Active Coupons')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsage}</p>
              <p className="text-xs text-muted-foreground">{t('إجمالي الاستخدامات', 'Total Usage')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{expiredCoupons}</p>
              <p className="text-xs text-muted-foreground">{t('منتهية الصلاحية', 'Expired')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">{t('الكل', 'All')}</TabsTrigger>
            <TabsTrigger value="active">{t('نشط', 'Active')}</TabsTrigger>
            <TabsTrigger value="inactive">{t('معطل', 'Inactive')}</TabsTrigger>
            <TabsTrigger value="expired">{t('منتهي', 'Expired')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('بحث بالكود...', 'Search by code...')}
            className="pr-9"
          />
        </div>
      </div>

      {/* Coupons List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredCoupons.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">{t('لا توجد كوبونات', 'No coupons found')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('ابدأ بإنشاء كوبون جديد', 'Start by creating a new coupon')}
            </p>
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('إنشاء كوبون', 'Create Coupon')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map(coupon => {
            const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
            const usagePercent = coupon.max_uses ? Math.round(((coupon.usage_count || 0) / coupon.max_uses) * 100) : 0;

            return (
              <Card key={coupon.id} className={`relative overflow-hidden transition-all hover:shadow-md ${!coupon.is_active ? 'opacity-60' : ''}`}>
                {/* Status indicator */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  isExpired ? 'bg-red-500' : coupon.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                }`} />

                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        coupon.discount_type === 'percentage' ? 'bg-blue-100 text-blue-600' :
                        coupon.discount_type === 'fixed' ? 'bg-green-100 text-green-600' :
                        coupon.discount_type === 'free_trial' ? 'bg-purple-100 text-purple-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        {getDiscountTypeIcon(coupon.discount_type)}
                      </div>
                      <div>
                        <p className="font-mono font-bold text-sm">{coupon.code}</p>
                        <p className="text-xs text-muted-foreground">{getDiscountTypeLabel(coupon.discount_type)}</p>
                      </div>
                    </div>
                    <Badge variant={coupon.is_active && !isExpired ? 'default' : 'secondary'} className="text-xs">
                      {isExpired ? t('منتهي', 'Expired') : coupon.is_active ? t('نشط', 'Active') : t('معطل', 'Inactive')}
                    </Badge>
                  </div>

                  {/* Discount Value */}
                  <div className="mb-3 p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-center">
                      {coupon.discount_type === 'percentage' ? `${coupon.discount}%` :
                       coupon.discount_type === 'free_trial' ? `${coupon.trial_days || coupon.discount} ${t('يوم', 'days')}` :
                       `${coupon.discount} ${t('ر.س', 'SAR')}`}
                    </p>
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      {getCouponTypeLabel(coupon.coupon_type || 'general')}
                    </p>
                  </div>

                  {/* Usage Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{t('الاستخدام', 'Usage')}</span>
                      <span className="font-medium">
                        {coupon.usage_count || 0} / {coupon.max_uses || '∞'}
                      </span>
                    </div>
                    {coupon.max_uses && (
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Expiry */}
                  {coupon.expires_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <Calendar className="h-3 w-3" />
                      <span>{t('ينتهي:', 'Expires:')} {coupon.expires_at}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-3 border-t">
                    <Button variant="ghost" size="icon" onClick={() => handleCopyCode(coupon.code)} title={t('نسخ', 'Copy')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleViewStats(coupon)} title={t('إحصائيات', 'Stats')}>
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(coupon)} title={t('تعديل', 'Edit')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleActive(coupon)} title={coupon.is_active ? t('تعطيل', 'Deactivate') : t('تفعيل', 'Activate')}>
                      {coupon.is_active ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)} title={t('حذف', 'Delete')}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? t('تعديل الكوبون', 'Edit Coupon') : t('إنشاء كوبون جديد', 'Create New Coupon')}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Code */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('الكود', 'Code')} *</Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE50"
                  className="font-mono"
                  dir="ltr"
                />
                <Button variant="outline" onClick={handleGenerateCode} type="button" className="whitespace-nowrap">
                  <Hash className="h-4 w-4 mr-1" />
                  {t('توليد', 'Generate')}
                </Button>
              </div>
            </div>

            {/* Discount Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('نوع الخصم', 'Discount Type')} *</Label>
              <div className="col-span-3">
                <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('نسبة مئوية (%)', 'Percentage (%)')}</SelectItem>
                    <SelectItem value="fixed">{t('مبلغ ثابت', 'Fixed Amount')}</SelectItem>
                    <SelectItem value="free_trial">{t('تجربة مجانية', 'Free Trial')}</SelectItem>
                    <SelectItem value="upgrade">{t('ترقية خطة', 'Plan Upgrade')}</SelectItem>
                    <SelectItem value="time_limited">{t('خصم لفترة محددة', 'Time Limited Discount')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Discount Value */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                {form.discount_type === 'free_trial' ? t('أيام التجربة', 'Trial Days') : t('قيمة الخصم', 'Discount Value')} *
              </Label>
              <div className="col-span-3">
                <Input
                  value={form.discount}
                  onChange={e => setForm({ ...form, discount: e.target.value })}
                  type="number"
                  placeholder={form.discount_type === 'percentage' ? '50' : '100'}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Coupon Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('تصنيف الكوبون', 'Coupon Category')}</Label>
              <div className="col-span-3">
                <Select value={form.coupon_type} onValueChange={v => setForm({ ...form, coupon_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('عام', 'General')}</SelectItem>
                    <SelectItem value="first_purchase">{t('أول شراء فقط', 'First Purchase Only')}</SelectItem>
                    <SelectItem value="renewal">{t('تجديد', 'Renewal')}</SelectItem>
                    <SelectItem value="referral">{t('إحالة', 'Referral')}</SelectItem>
                    <SelectItem value="affiliate">{t('تسويق بالعمولة', 'Affiliate')}</SelectItem>
                    <SelectItem value="seasonal">{t('عرض موسمي', 'Seasonal')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Applicable Plans */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('الباقات المتاحة', 'Applicable Plans')}</Label>
              <div className="col-span-3">
                <Select
                  value={form.applicable_plans || 'all'}
                  onValueChange={v => setForm({ ...form, applicable_plans: v === 'all' ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder={t('جميع الباقات', 'All Plans')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('جميع الباقات', 'All Plans')}</SelectItem>
                    {plans.map(p => (
                      <SelectItem key={p.id} value={JSON.stringify([p.id])}>{p.name_ar || p.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('اتركه فارغاً لتطبيقه على جميع الباقات', 'Leave empty to apply to all plans')}
                </p>
              </div>
            </div>

            {/* Applicable Cycles */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('دورات الدفع', 'Billing Cycles')}</Label>
              <div className="col-span-3">
                <Select
                  value={form.applicable_cycles || 'all'}
                  onValueChange={v => setForm({ ...form, applicable_cycles: v === 'all' ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder={t('جميع الدورات', 'All Cycles')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('جميع الدورات', 'All Cycles')}</SelectItem>
                    <SelectItem value='["monthly"]'>{t('شهري فقط', 'Monthly Only')}</SelectItem>
                    <SelectItem value='["yearly"]'>{t('سنوي فقط', 'Yearly Only')}</SelectItem>
                    <SelectItem value='["monthly","yearly"]'>{t('شهري وسنوي', 'Monthly & Yearly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Max Uses */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('الحد الأقصى للاستخدام', 'Max Uses')}</Label>
              <div className="col-span-3 grid grid-cols-2 gap-2">
                <div>
                  <Input
                    value={form.max_uses}
                    onChange={e => setForm({ ...form, max_uses: parseInt(e.target.value) || 0 })}
                    type="number"
                    placeholder="100"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('إجمالي', 'Total')}</p>
                </div>
                <div>
                  <Input
                    value={form.max_uses_per_user}
                    onChange={e => setForm({ ...form, max_uses_per_user: parseInt(e.target.value) || 1 })}
                    type="number"
                    placeholder="1"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('لكل مستخدم', 'Per User')}</p>
                </div>
              </div>
            </div>

            {/* Min Amount & Max Discount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('حدود المبلغ', 'Amount Limits')}</Label>
              <div className="col-span-3 grid grid-cols-2 gap-2">
                <div>
                  <Input
                    value={form.min_amount}
                    onChange={e => setForm({ ...form, min_amount: e.target.value })}
                    type="number"
                    placeholder={t('الحد الأدنى', 'Min Amount')}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('الحد الأدنى للطلب', 'Min Order')}</p>
                </div>
                <div>
                  <Input
                    value={form.max_discount_amount}
                    onChange={e => setForm({ ...form, max_discount_amount: e.target.value })}
                    type="number"
                    placeholder={t('أقصى خصم', 'Max Discount')}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('أقصى قيمة خصم', 'Max Discount Cap')}</p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('الفترة', 'Period')}</Label>
              <div className="col-span-3 grid grid-cols-2 gap-2">
                <div>
                  <Input
                    value={form.starts_at}
                    onChange={e => setForm({ ...form, starts_at: e.target.value })}
                    type="date"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('تاريخ البدء', 'Start Date')}</p>
                </div>
                <div>
                  <Input
                    value={form.expires_at}
                    onChange={e => setForm({ ...form, expires_at: e.target.value })}
                    type="date"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('تاريخ الانتهاء', 'Expiry Date')}</p>
                </div>
              </div>
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('الوصف', 'Description')}</Label>
              <div className="col-span-3 grid grid-cols-2 gap-2">
                <Input
                  value={form.description_ar}
                  onChange={e => setForm({ ...form, description_ar: e.target.value })}
                  placeholder={t('وصف بالعربية', 'Arabic description')}
                />
                <Input
                  value={form.description_en}
                  onChange={e => setForm({ ...form, description_en: e.target.value })}
                  placeholder={t('وصف بالإنجليزية', 'English description')}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Switches */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('الإعدادات', 'Settings')}</Label>
              <div className="col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('نشط', 'Active')}</span>
                  <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('قابل للدمج مع كوبونات أخرى', 'Stackable with other coupons')}</span>
                  <Switch checked={form.stackable} onCheckedChange={v => setForm({ ...form, stackable: v })} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('إلغاء', 'Cancel')}
            </Button>
            <Button onClick={handleSave}>
              {editingCoupon ? t('تحديث', 'Update') : t('إنشاء', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('إحصائيات الكوبون', 'Coupon Statistics')}
              {selectedCouponForStats && (
                <Badge variant="outline" className="font-mono">{selectedCouponForStats.code}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedCouponStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-xl font-bold">{selectedCouponStats.total_uses}</p>
                    <p className="text-xs text-muted-foreground">{t('مرات الاستخدام', 'Total Uses')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xl font-bold">{selectedCouponStats.unique_users}</p>
                    <p className="text-xs text-muted-foreground">{t('مستخدمين فريدين', 'Unique Users')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <DollarSign className="h-5 w-5 text-red-500 mx-auto mb-1" />
                    <p className="text-xl font-bold">{selectedCouponStats.total_discount} <span className="text-xs">{t('ر.س', 'SAR')}</span></p>
                    <p className="text-xs text-muted-foreground">{t('إجمالي الخصومات', 'Total Discounts')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-xl font-bold">{selectedCouponStats.total_revenue} <span className="text-xs">{t('ر.س', 'SAR')}</span></p>
                    <p className="text-xs text-muted-foreground">{t('الإيرادات بعد الخصم', 'Revenue After Discount')}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Usage Logs */}
              {selectedCouponUsages.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm mb-2">{t('سجل الاستخدام', 'Usage Log')}</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-right">{t('المستخدم', 'User')}</th>
                          <th className="p-2 text-right">{t('المبلغ الأصلي', 'Original')}</th>
                          <th className="p-2 text-right">{t('الخصم', 'Discount')}</th>
                          <th className="p-2 text-right">{t('النهائي', 'Final')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCouponUsages.slice(0, 10).map(usage => (
                          <tr key={usage.id} className="border-t">
                            <td className="p-2 font-mono text-xs">{usage.user_id.slice(0, 8)}...</td>
                            <td className="p-2">{usage.original_amount} {t('ر.س', 'SAR')}</td>
                            <td className="p-2 text-red-600">-{usage.discount_amount}</td>
                            <td className="p-2 font-bold">{usage.final_amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;