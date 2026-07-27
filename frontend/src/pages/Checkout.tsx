import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Check, CreditCard, Shield, Lock, ArrowRight, CheckCircle2, AlertCircle, Tag, X } from 'lucide-react';
import PaymentLogo from '@/components/PaymentLogo';
import { fetchActivePlans, validateCoupon, applyCoupon, type Plan, type CouponValidationResult } from '@/lib/adminApi';
import { getMoyasarConfig } from '@/lib/moyasarApi';
import { client } from '@/lib/sdk';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type CheckoutStep = 'review' | 'payment' | 'processing' | 'success' | 'error';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('plan');
  const cycle = searchParams.get('cycle') || 'monthly';

  const { isAdmin } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<CheckoutStep>('review');
  const [paymentMethod, setPaymentMethod] = useState('creditcard');
  const [moyasarKey, setMoyasarKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [configError, setConfigError] = useState('');
  const [configErrorCode, setConfigErrorCode] = useState('');
  const [configLoading, setConfigLoading] = useState(true);
  const moyasarFormRef = useRef<HTMLDivElement>(null);
  const moyasarInitialized = useRef(false);
  // Track form loading state with useState so UI re-renders properly
  const [formLoading, setFormLoading] = useState(false);
  const [formReady, setFormReady] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    loadPlan();
    loadMoyasarConfig();
  }, [planId]);

  const loadPlan = async () => {
    if (!planId) {
      navigate('/pricing');
      return;
    }
    try {
      const plans = await fetchActivePlans();
      const found = plans.find((p: Plan) => p.id === parseInt(planId));
      if (found) {
        setPlan(found);
      } else {
        navigate('/pricing');
      }
    } catch (err) {
      console.error('Failed to load plan:', err);
      navigate('/pricing');
    } finally {
      setLoading(false);
    }
  };

  const loadMoyasarConfig = async () => {
    setConfigLoading(true);
    setConfigError('');
    setConfigErrorCode('');
    try {
      const config = await getMoyasarConfig();
      if (config?.publishable_key) {
        setMoyasarKey(config.publishable_key);
      } else {
        setConfigError('بوابة الدفع غير متاحة حالياً. يرجى المحاولة لاحقاً أو التواصل مع الدعم الفني.');
        setConfigErrorCode('PUBLISHABLE_KEY_MISSING');
      }
    } catch (err: unknown) {
      console.error('Failed to load Moyasar config:', err);
      const typedErr = err as { error_code?: string; detail?: string };
      if (typedErr?.error_code === 'PUBLISHABLE_KEY_MISSING') {
        setConfigErrorCode('PUBLISHABLE_KEY_MISSING');
        if (isAdmin) {
          setConfigError('⚠️ بوابة الدفع تحتاج إلى إعداد المفتاح العام (Publishable Key) من لوحة التحكم. يرجى الذهاب إلى: الإدارة > بوابات الدفع > إعدادات Moyasar وإدخال المفتاح العام.');
        } else {
          setConfigError('بوابة الدفع غير متاحة حالياً. يرجى المحاولة لاحقاً أو التواصل مع الدعم الفني.');
        }
      } else {
        setConfigErrorCode(typedErr?.error_code || '');
        setConfigError('بوابة الدفع غير متاحة حالياً. يرجى المحاولة لاحقاً أو التواصل مع الدعم الفني.');
      }
    } finally {
      setConfigLoading(false);
    }
  };

  const getPrice = () => {
    if (!plan) return 0;
    if (cycle === 'yearly') return plan.price_yearly;
    if (cycle === 'lifetime') return plan.price_lifetime;
    return plan.price_monthly;
  };

  const getFinalPrice = () => {
    if (appliedCoupon?.valid && appliedCoupon.final_amount !== undefined) {
      return appliedCoupon.final_amount;
    }
    return getPrice();
  };

  const getDiscountAmount = () => {
    if (appliedCoupon?.valid && appliedCoupon.discount_amount !== undefined) {
      return appliedCoupon.discount_amount;
    }
    return 0;
  };

  const getPeriodLabel = () => {
    if (cycle === 'yearly') return 'سنوياً';
    if (cycle === 'lifetime') return 'مدى الحياة';
    return 'شهرياً';
  };

  const parseFeatures = (featuresStr: string): string[] => {
    try {
      return JSON.parse(featuresStr);
    } catch {
      return featuresStr ? featuresStr.split(',').map(f => f.trim()) : [];
    }
  };

  // Coupon validation
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('يرجى إدخال كود الكوبون');
      return;
    }

    setCouponLoading(true);
    setCouponError('');
    setAppliedCoupon(null);

    try {
      let userId = 'anonymous';
      try {
        const userRes = await client.auth.me();
        if (userRes?.data?.id) userId = userRes.data.id;
      } catch {
        // continue with anonymous
      }

      const result = await validateCoupon({
        code: couponCode.trim().toUpperCase(),
        plan_id: parseInt(planId!),
        billing_cycle: cycle,
        amount: getPrice(),
        user_id: userId,
      });

      if (result.valid) {
        setAppliedCoupon(result);
        setCouponError('');
        toast.success('تم تطبيق الكوبون بنجاح! 🎉');
      } else {
        setCouponError(result.error || 'كود الكوبون غير صالح');
        setAppliedCoupon(null);
      }
    } catch (err) {
      console.error('Coupon validation error:', err);
      setCouponError('حدث خطأ أثناء التحقق من الكوبون');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  // Load Moyasar.js script once
  const loadMoyasarScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).Moyasar) {
        resolve();
        return;
      }

      if (document.getElementById('moyasar-script')) {
        // Script tag exists but Moyasar not ready yet, wait for it
        const checkInterval = setInterval(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window as any).Moyasar) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Moyasar script load timeout'));
        }, 10000);
        return;
      }

      // Add CSS
      if (!document.getElementById('moyasar-css')) {
        const link = document.createElement('link');
        link.id = 'moyasar-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';
        document.head.appendChild(link);
      }

      // Add script
      const script = document.createElement('script');
      script.id = 'moyasar-script';
      script.src = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Moyasar script'));
      document.head.appendChild(script);
    });
  }, []);

  // Render the Moyasar payment form
  const renderMoyasarForm = useCallback(async () => {
    if (!moyasarFormRef.current || !moyasarKey || !plan) return;

    setFormLoading(true);
    setFormReady(false);
    moyasarInitialized.current = false;

    try {
      await loadMoyasarScript();

      // Clear previous form content
      if (moyasarFormRef.current) {
        moyasarFormRef.current.innerHTML = '';
      }

      const amount = getFinalPrice() * 100; // Convert SAR to halalas
      const callbackUrl = `${window.location.origin}/checkout/callback?plan=${planId}&cycle=${cycle}${appliedCoupon?.code ? `&coupon=${appliedCoupon.code}` : ''}`;

      // Determine methods based on selection
      const methods: string[] = [];
      if (paymentMethod === 'applepay') {
        methods.push('applepay');
      } else if (paymentMethod === 'stcpay') {
        methods.push('stcpay');
      } else {
        // Both creditcard and mada use the creditcard form
        methods.push('creditcard');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Moyasar.init({
        element: moyasarFormRef.current,
        amount: amount,
        currency: 'SAR',
        description: `Salmo Assist - ${plan.name_ar} (${getPeriodLabel()})`,
        publishable_api_key: moyasarKey,
        callback_url: callbackUrl,
        methods: methods,
        on_completed: () => {
          // Payment completed - Moyasar will redirect to callback_url
        },
        metadata: {
          plan_id: planId,
          billing_cycle: cycle,
          coupon_code: appliedCoupon?.code || '',
          discount_amount: appliedCoupon?.discount_amount || 0,
        },
      });

      moyasarInitialized.current = true;
      setFormReady(true);
    } catch (err) {
      console.error('Failed to initialize Moyasar form:', err);
      setErrorMessage('فشل في تحميل نموذج الدفع. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
      setStep('error');
    } finally {
      setFormLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moyasarKey, plan, paymentMethod, appliedCoupon, planId, cycle]);

  // Initialize form when entering payment step
  useEffect(() => {
    if (step === 'payment' && moyasarKey && plan) {
      const timer = setTimeout(() => {
        renderMoyasarForm();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [step, moyasarKey, plan, paymentMethod, appliedCoupon, renderMoyasarForm]);

  const handleProceedToPayment = async () => {
    // Verify user is logged in
    try {
      const userRes = await client.auth.me();
      if (!userRes?.data) {
        await client.auth.toLogin();
        return;
      }

      // If coupon is applied, record the usage
      if (appliedCoupon?.valid && appliedCoupon.code) {
        try {
          await applyCoupon({
            code: appliedCoupon.code,
            plan_id: parseInt(planId!),
            billing_cycle: cycle,
            amount: getPrice(),
            user_id: userRes.data.id,
          });
        } catch (err) {
          console.error('Failed to record coupon usage:', err);
          // Continue with payment even if recording fails
        }
      }
    } catch {
      await client.auth.toLogin();
      return;
    }

    // Check that we have the publishable key before proceeding
    if (!moyasarKey) {
      // Try loading config one more time
      try {
        const config = await getMoyasarConfig();
        if (config?.publishable_key) {
          setMoyasarKey(config.publishable_key);
          setConfigError('');
        } else {
          toast.error('بوابة الدفع غير مُهيأة حالياً. يرجى التواصل مع الدعم الفني.');
          setConfigError('بوابة الدفع غير مُهيأة حالياً. يرجى التواصل مع الدعم الفني.');
          return;
        }
      } catch {
        toast.error('بوابة الدفع غير مُهيأة حالياً. يرجى التواصل مع الدعم الفني أو المحاولة لاحقاً.');
        setConfigError('بوابة الدفع غير مُهيأة حالياً. يرجى التواصل مع الدعم الفني أو المحاولة لاحقاً.');
        return;
      }
    }

    setStep('payment');
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 font-[Tajawal,Cairo,sans-serif]">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!plan) return null;

  const paymentMethods = [
    { id: 'creditcard', label: 'Visa / Mastercard', logoIds: ['visa', 'mastercard'], description: 'بطاقة ائتمانية' },
    { id: 'mada', label: 'مدى', logoIds: ['mada'], description: 'بطاقة مدى السعودية' },
    { id: 'applepay', label: 'Apple Pay', logoIds: ['apple-pay'], description: 'الدفع عبر Apple Pay' },
    { id: 'stcpay', label: 'STC Pay', logoIds: ['stc-pay'], description: 'الدفع عبر STC Pay' },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 font-[Tajawal,Cairo,sans-serif]">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-12">
        {step === 'success' ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h1 className="text-3xl font-bold text-[#0F0F0F] mb-3">تم الاشتراك بنجاح! 🎉</h1>
              <p className="text-[#666] mb-2">تم تفعيل {plan.name_ar} بنجاح.</p>
              <p className="text-sm text-[#999] mb-8">يمكنك الآن الاستمتاع بجميع مميزات الخطة.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/chat')} className="bg-[#0F0F0F] text-white hover:bg-[#1A1A1A]">
                  ابدأ الاستخدام
                </Button>
                <Button variant="outline" onClick={() => navigate('/my-subscription')}>
                  عرض اشتراكي
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : step === 'error' ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-[#0F0F0F] mb-3">فشل في عملية الدفع</h1>
              <p className="text-[#666] mb-6">{errorMessage || 'حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.'}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => { setStep('payment'); setErrorMessage(''); }} className="bg-[#0F0F0F] text-white hover:bg-[#1A1A1A]">
                  إعادة المحاولة
                </Button>
                <Button variant="outline" onClick={() => navigate('/pricing')}>
                  العودة للأسعار
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : step === 'processing' ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-[#0F0F0F] mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-[#0F0F0F] mb-3">جاري معالجة الدفع...</h1>
              <p className="text-[#666]">يرجى الانتظار بينما نتحقق من عملية الدفع.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <h1 className="text-2xl font-bold text-[#0F0F0F]">إتمام الاشتراك</h1>

              {step === 'review' && (
                <>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-6">
                      <h2 className="text-lg font-bold mb-4">مراجعة الطلب</h2>
                      <div className={`p-5 rounded-2xl bg-gradient-to-r ${plan.color || 'from-blue-500 to-blue-600'} text-white mb-6`}>
                        <h3 className="text-xl font-bold">{plan.name_ar}</h3>
                        <p className="text-sm opacity-80 mt-1">{plan.description_ar}</p>
                        <div className="mt-4 flex items-baseline gap-2">
                          <span className="text-3xl font-bold">{getPrice()}</span>
                          <span className="text-sm opacity-80">ر.س / {getPeriodLabel()}</span>
                        </div>
                      </div>

                      <h3 className="font-medium text-sm text-[#666] mb-3">المميزات المتضمنة:</h3>
                      <ul className="space-y-2 mb-6">
                        {parseFeatures(plan.features).map((f, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-emerald-500" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>

                      {plan.trial_days > 0 && (
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 mb-4">
                          <p className="text-sm text-blue-700 font-medium">
                            ✨ تجربة مجانية لمدة {plan.trial_days} أيام — لن يتم خصم أي مبلغ حتى انتهاء التجربة.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Coupon Code Section */}
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-6">
                      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Tag className="h-5 w-5 text-blue-500" />
                        كود الخصم
                      </h2>

                      {appliedCoupon?.valid ? (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              </div>
                              <div>
                                <p className="font-bold text-emerald-800 text-sm">
                                  تم تطبيق الكوبون: <span className="font-mono">{appliedCoupon.code}</span>
                                </p>
                                <p className="text-xs text-emerald-600 mt-0.5">
                                  {appliedCoupon.description_ar} — خصم {appliedCoupon.discount_amount} ر.س
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleRemoveCoupon}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={couponCode}
                              onChange={e => setCouponCode(e.target.value.toUpperCase())}
                              placeholder="أدخل كود الخصم مثل SAVE50"
                              className="font-mono text-left"
                              dir="ltr"
                              onKeyDown={e => e.key === 'Enter' && handleValidateCoupon()}
                            />
                            <Button
                              onClick={handleValidateCoupon}
                              disabled={couponLoading || !couponCode.trim()}
                              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
                            >
                              {couponLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'تطبيق'
                              )}
                            </Button>
                          </div>
                          {couponError && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                              <AlertCircle className="h-4 w-4 flex-shrink-0" />
                              <span>{couponError}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Payment config warning */}
                  {configError && !configLoading && (
                    <Card className="border-0 shadow-sm border-amber-200 bg-amber-50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-amber-800">{configError}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <Button
                                variant="link"
                                className="text-amber-700 underline p-0 h-auto text-xs"
                                onClick={() => loadMoyasarConfig()}
                              >
                                إعادة المحاولة
                              </Button>
                              {configErrorCode === 'PUBLISHABLE_KEY_MISSING' && isAdmin && (
                                <Link
                                  to="/admin/payment-gateways"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  <ArrowRight className="h-3 w-3 rotate-180" />
                                  الذهاب لإعدادات البوابة
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button
                    onClick={handleProceedToPayment}
                    disabled={!!configError || configLoading}
                    className="w-full bg-[#0F0F0F] text-white hover:bg-[#1A1A1A] gap-2 h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {configLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري تحميل إعدادات الدفع...
                      </>
                    ) : (
                      <>
                        متابعة للدفع — {getFinalPrice()} ر.س
                        <ArrowRight className="h-4 w-4 rotate-180" />
                      </>
                    )}
                  </Button>
                </>
              )}

              {step === 'payment' && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      اختر طريقة الدفع
                    </h2>

                    <div className="space-y-3 mb-6">
                      {paymentMethods.map(method => (
                        <button
                          key={method.id}
                          onClick={() => {
                            if (paymentMethod !== method.id) {
                              setPaymentMethod(method.id);
                              setFormReady(false);
                              moyasarInitialized.current = false;
                            }
                          }}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                            paymentMethod === method.id
                              ? 'border-[#0F0F0F] bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {method.logoIds.map((logoId: string) => (
                              <PaymentLogo key={logoId} logoId={logoId} size="sm" />
                            ))}
                          </div>
                          <div className="text-right">
                            <span className="font-medium text-sm block">{method.label}</span>
                            <span className="text-xs text-[#999]">{method.description}</span>
                          </div>
                          {paymentMethod === method.id && (
                            <Check className="h-4 w-4 text-[#0F0F0F] ms-auto" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Loading indicator while Moyasar form loads */}
                    {formLoading && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400 ml-2" />
                        <span className="text-sm text-gray-500">جاري تحميل نموذج الدفع...</span>
                      </div>
                    )}

                    {/* Moyasar Payment Form Container */}
                    <div className="mb-6">
                      <div
                        ref={moyasarFormRef}
                        id="moyasar-payment-form"
                        className="moyasar-form-container"
                      />
                    </div>

                    {/* Back button - always visible */}
                    <div className="flex gap-3 mt-4">
                      <Button variant="outline" onClick={() => { setStep('review'); setFormReady(false); }}>
                        رجوع
                      </Button>
                      {formReady && (
                        <div className="flex-1 text-center text-sm text-gray-500 flex items-center justify-center">
                          <Shield className="h-4 w-4 ml-1 text-emerald-500" />
                          أدخل بيانات البطاقة أعلاه ثم اضغط "ادفع"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#666] mt-4">
                      <Lock className="h-3 w-3" />
                      <span>جميع المعاملات مشفرة ومحمية عبر بوابة Moyasar المعتمدة من مؤسسة النقد السعودي</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-sm sticky top-6">
                <CardContent className="p-6">
                  <h3 className="font-bold text-sm mb-4">ملخص الطلب</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#666]">الخطة</span>
                      <span className="font-medium">{plan.name_ar}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666]">الدورة</span>
                      <span className="font-medium">{getPeriodLabel()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666]">السعر الأساسي</span>
                      <span className="font-medium">{getPrice()} ر.س</span>
                    </div>

                    {/* Coupon Discount */}
                    {appliedCoupon?.valid && (
                      <div className="flex justify-between text-emerald-600">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          خصم ({appliedCoupon.code})
                        </span>
                        <span className="font-medium">- {getDiscountAmount()} ر.س</span>
                      </div>
                    )}

                    <div className="border-t border-gray-100 pt-3 flex justify-between">
                      <span className="font-bold">المجموع النهائي</span>
                      <div className="text-left">
                        {appliedCoupon?.valid && (
                          <span className="text-xs text-[#999] line-through block">{getPrice()} ر.س</span>
                        )}
                        <span className="font-bold text-lg">{getFinalPrice()} ر.س</span>
                      </div>
                    </div>
                  </div>

                  {appliedCoupon?.valid && (
                    <div className="mt-3 p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                      <p className="text-xs text-emerald-700 font-medium text-center">
                        🎉 وفرت {getDiscountAmount()} ر.س
                      </p>
                    </div>
                  )}

                  {plan.trial_days > 0 && (
                    <Badge className="mt-4 bg-blue-50 text-blue-700 w-full justify-center">
                      تجربة مجانية {plan.trial_days} أيام
                    </Badge>
                  )}

                  <div className="mt-6 p-3 rounded-xl bg-gray-50 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[#666]">
                      <Shield className="h-3 w-3 text-emerald-500" />
                      <span>ضمان استرداد خلال 14 يوم</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#666]">
                      <Lock className="h-3 w-3 text-emerald-500" />
                      <span>دفع آمن عبر Moyasar</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#666]">
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span>إلغاء في أي وقت</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-[#999] mb-2">طرق الدفع المدعومة:</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <PaymentLogo logoId="visa" size="sm" />
                      <PaymentLogo logoId="mastercard" size="sm" />
                      <PaymentLogo logoId="mada" size="sm" />
                      <PaymentLogo logoId="apple-pay" size="sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}