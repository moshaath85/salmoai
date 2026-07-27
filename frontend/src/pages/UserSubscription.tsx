import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, CreditCard, Calendar, ArrowUpCircle, XCircle, RefreshCw, Check, Crown, Receipt, Bell, Sparkles, Shield, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  fetchUserSubscription,
  fetchActivePlans,
  cancelUserSubscription,
  updateUserSubscription,
  createNotification,
  type UserSubscription as UserSubType,
  type Plan,
} from '@/lib/adminApi';
import NotificationBell from '@/components/NotificationBell';

export default function UserSubscriptionPage() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<UserSubType | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sub, plans] = await Promise.all([
        fetchUserSubscription(),
        fetchActivePlans(),
      ]);
      setSubscription(sub);
      setAllPlans(plans);
      if (sub && plans.length > 0) {
        const plan = plans.find(p => p.id === sub.plan_id);
        setCurrentPlan(plan || null);
      }
    } catch (err) {
      console.error('Failed to load subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;
    setCancelling(true);
    try {
      await cancelUserSubscription(subscription.id);
      await createNotification({
        type: 'subscription',
        title: 'تم إلغاء الاشتراك',
        message: `تم إلغاء اشتراكك في باقة ${currentPlan?.name_ar || 'الاشتراك'}. ستبقى المميزات متاحة حتى ${subscription.end_date}`,
        is_read: false,
      });
      setCancelDialogOpen(false);
      toast.success('تم إلغاء الاشتراك بنجاح');
      await loadData();
    } catch (err) {
      console.error('Failed to cancel:', err);
      toast.error('فشل إلغاء الاشتراك');
    } finally {
      setCancelling(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!subscription) return;
    setTogglingAutoRenew(true);
    try {
      const newValue = !subscription.auto_renew;
      await updateUserSubscription(subscription.id, { auto_renew: newValue });
      setSubscription({ ...subscription, auto_renew: newValue });

      await createNotification({
        type: 'subscription',
        title: newValue ? 'تم تفعيل التجديد التلقائي' : 'تم إيقاف التجديد التلقائي',
        message: newValue
          ? 'سيتم تجديد اشتراكك تلقائياً عند انتهاء الفترة الحالية'
          : 'لن يتم تجديد اشتراكك تلقائياً. سينتهي الاشتراك في التاريخ المحدد',
        is_read: false,
      });

      toast.success(newValue ? 'تم تفعيل التجديد التلقائي' : 'تم إيقاف التجديد التلقائي');
    } catch (err) {
      console.error('Failed to toggle auto-renew:', err);
      toast.error('فشل تحديث التجديد التلقائي');
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  const parseFeatures = (featuresStr: string): string[] => {
    try {
      return JSON.parse(featuresStr);
    } catch {
      return featuresStr ? featuresStr.split(',').map(f => f.trim()) : [];
    }
  };

  const statusConfig: Record<string, { label: string; class: string; dotClass: string }> = {
    active: { label: 'نشط', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dotClass: 'bg-emerald-400' },
    trial: { label: 'تجربة مجانية', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dotClass: 'bg-blue-400' },
    cancelled: { label: 'ملغي', class: 'bg-rose-500/20 text-rose-400 border-rose-500/30', dotClass: 'bg-rose-400' },
    expired: { label: 'منتهي', class: 'bg-gray-500/20 text-gray-400 border-gray-500/30', dotClass: 'bg-gray-400' },
  };

  const getDaysRemaining = () => {
    if (!subscription?.end_date) return null;
    const end = new Date(subscription.end_date);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getUsagePercentage = () => {
    // Simulated usage - in production this would come from API
    if (!subscription) return 0;
    if (subscription.status === 'active') return 65;
    if (subscription.status === 'trial') return 30;
    return 0;
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-[#0A1628] via-[#0f1d35] to-[#1a0533] font-[Cairo,sans-serif]">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();
  const usagePercent = getUsagePercentage();
  const status = statusConfig[subscription?.status || 'expired'] || statusConfig.expired;

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-[#0A1628] via-[#0f1d35] to-[#1a0533] dark:from-[#0A1628] dark:via-[#0f1d35] dark:to-[#1a0533] font-[Cairo,sans-serif]">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 animate-slide-up">
          <div>
            <h1 className="text-3xl font-bold text-white">اشتراكي</h1>
            <p className="text-gray-400 mt-1">إدارة خطتك ومتابعة استخدامك</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/payment-history')}
              className="gap-2 border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
            >
              <Receipt className="h-4 w-4" />
              سجل المدفوعات
            </Button>
          </div>
        </div>

        {!subscription ? (
          /* No Subscription State */
          <div className="glass-card rounded-2xl p-12 text-center animate-scale-in">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <CreditCard className="h-10 w-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">لا يوجد اشتراك حالي</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              اشترك الآن للحصول على وصول كامل لجميع مميزات SALMO AI — مساعدك القانوني بالذكاء الاصطناعي
            </p>
            <Button
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:shadow-lg hover:shadow-blue-500/25 px-8 py-3 rounded-xl"
            >
              <Sparkles className="h-4 w-4 me-2" />
              عرض الخطط المتاحة
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Current Plan Hero Card */}
            <div className="relative overflow-hidden rounded-2xl ai-border-glow animate-slide-up">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-violet-500/5 to-transparent" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />

              <div className="relative glass-card rounded-2xl border-0 p-8">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Crown className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {currentPlan?.name_ar || 'خطة غير معروفة'}
                        </h2>
                        <p className="text-sm text-gray-400">{currentPlan?.description_ar}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                      <Badge className={`${status.class} border rounded-full px-3 py-1 text-xs font-medium`}>
                        <span className={`inline-block w-2 h-2 rounded-full ${status.dotClass} me-2 animate-pulse`} />
                        {status.label}
                      </Badge>

                      {daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7 && (
                        <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-3 py-1 text-xs">
                          <Bell className="h-3 w-3 me-1" />
                          ينتهي خلال {daysRemaining} {daysRemaining === 1 ? 'يوم' : 'أيام'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-4xl font-bold">
                      <span className="gradient-text">{subscription.amount_paid}</span>
                      <span className="text-sm font-normal text-gray-400 ms-2">ر.س</span>
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {subscription.billing_cycle === 'yearly' ? 'سنوياً' : subscription.billing_cycle === 'lifetime' ? 'مدى الحياة' : 'شهرياً'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats & Usage */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
              {/* Usage Progress */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-cyan-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">الاستخدام الشهري</span>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">الاستعلامات</span>
                    <span className="text-white font-medium">{usagePercent}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Renewal Date */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-violet-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">تاريخ التجديد</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {subscription.end_date || '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {subscription.auto_renew ? 'تجديد تلقائي مفعّل' : 'لن يتم التجديد'}
                </p>
              </div>

              {/* Payment Method */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">طريقة الدفع</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {subscription.payment_method || 'غير محدد'}
                </p>
                <p className="text-xs text-gray-500 mt-1">دفع آمن ومشفر</p>
              </div>
            </div>

            {/* Details & Features Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
              {/* Subscription Details */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  تفاصيل الاشتراك
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'تاريخ البداية', value: subscription.start_date || '—' },
                    { label: 'تاريخ الانتهاء', value: subscription.end_date || '—' },
                    { label: 'دورة الفوترة', value: subscription.billing_cycle === 'monthly' ? 'شهري' : subscription.billing_cycle === 'yearly' ? 'سنوي' : 'مدى الحياة' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                      <span className="text-sm text-gray-400">{item.label}</span>
                      <span className="text-sm font-medium text-white">{item.value}</span>
                    </div>
                  ))}

                  {/* Auto Renew Toggle */}
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm text-gray-400">التجديد التلقائي</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {subscription.auto_renew ? 'مفعّل' : 'معطّل'}
                      </span>
                      <Switch
                        checked={subscription.auto_renew}
                        onCheckedChange={handleToggleAutoRenew}
                        disabled={togglingAutoRenew || subscription.billing_cycle === 'lifetime' || subscription.status !== 'active'}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                  المميزات المتاحة
                </h3>
                <ul className="space-y-3">
                  {currentPlan && parseFeatures(currentPlan.features).map((f, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-emerald-400" />
                      </div>
                      <span className="text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={() => navigate('/pricing')}
                  className="gap-2 bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:shadow-lg hover:shadow-blue-500/25 rounded-xl"
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  ترقية الخطة
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/payment-history')}
                  className="gap-2 border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white rounded-xl"
                >
                  <Receipt className="h-4 w-4" />
                  سجل المدفوعات
                </Button>
                {subscription.status === 'active' && (
                  <Button
                    variant="outline"
                    className="gap-2 border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <XCircle className="h-4 w-4" />
                    إلغاء الاشتراك
                  </Button>
                )}
                {subscription.status === 'cancelled' && (
                  <Button
                    variant="outline"
                    className="gap-2 border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white rounded-xl"
                    onClick={() => navigate('/pricing')}
                  >
                    <RefreshCw className="h-4 w-4" />
                    تجديد الاشتراك
                  </Button>
                )}
              </div>
            </div>

            {/* Upgrade Suggestions */}
            {currentPlan && allPlans.filter(p => p.price_monthly > currentPlan.price_monthly && p.status === 'active').length > 0 && (
              <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
                <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5 text-blue-400" />
                  خطط أعلى متاحة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allPlans
                    .filter(p => p.price_monthly > currentPlan.price_monthly && p.status === 'active')
                    .map(plan => (
                      <div
                        key={plan.id}
                        className="glass-card rounded-xl p-5 cursor-pointer hover:border-blue-500/30 hover:bg-white/[0.06] transition-all duration-300 group"
                        onClick={() => navigate(`/checkout?plan=${plan.id}&cycle=${subscription.billing_cycle}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-white group-hover:text-blue-300 transition-colors">{plan.name_ar}</h4>
                            <p className="text-sm text-gray-400 mt-1">{plan.description_ar}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-2xl font-bold">
                              <span className="gradient-text">{plan.price_monthly}</span>
                            </p>
                            <p className="text-xs text-gray-500">ر.س/شهر</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#0f1d35] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-rose-400 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              إلغاء الاشتراك
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-300 leading-relaxed">
            هل أنت متأكد من إلغاء اشتراكك؟ ستفقد الوصول إلى المميزات المدفوعة بعد انتهاء الفترة الحالية في {subscription?.end_date}.
          </p>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
            >
              تراجع
            </Button>
            <Button
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-rose-500 text-white hover:bg-rose-600"
            >
              {cancelling && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              تأكيد الإلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}