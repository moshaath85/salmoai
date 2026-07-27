import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Crown, Star, Zap, Building, Loader2, ChevronDown, Shield, Headphones, Clock } from 'lucide-react';
import { fetchActivePlans, type Plan } from '@/lib/adminApi';

const iconMap: Record<string, React.ElementType> = {
  Zap, Star, Crown, Building, Sparkles,
};

export default function Pricing() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await fetchActivePlans();
      setPlans(data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (plan: Plan) => {
    if (billingCycle === 'yearly' && plan.price_yearly > 0) {
      return Math.round(plan.price_yearly / 12);
    }
    return plan.price_monthly;
  };

  const getTotalPrice = (plan: Plan) => {
    if (billingCycle === 'yearly' && plan.price_yearly > 0) {
      return plan.price_yearly;
    }
    return plan.price_monthly;
  };

  const getSavings = (plan: Plan) => {
    if (plan.price_monthly === 0) return 0;
    const yearlyMonthly = plan.price_yearly / 12;
    const savings = Math.round(((plan.price_monthly - yearlyMonthly) / plan.price_monthly) * 100);
    return savings > 0 ? savings : 0;
  };

  const parseFeatures = (featuresStr: string): string[] => {
    try {
      return JSON.parse(featuresStr);
    } catch {
      return featuresStr ? featuresStr.split(',').map(f => f.trim()) : [];
    }
  };

  const handleSubscribe = (plan: Plan) => {
    if (plan.price_monthly === 0) {
      navigate('/chat');
    } else {
      navigate(`/checkout?plan=${plan.id}&cycle=${billingCycle}`);
    }
  };

  const faqs = [
    {
      question: 'هل يمكنني تغيير خطتي في أي وقت؟',
      answer: 'نعم، يمكنك الترقية أو تخفيض خطتك في أي وقت. سيتم احتساب الفرق بشكل تناسبي.',
    },
    {
      question: 'ما هي طرق الدفع المتاحة؟',
      answer: 'نقبل مدى، فيزا، ماستركارد، Apple Pay، و STC Pay عبر بوابة مويسر الآمنة.',
    },
    {
      question: 'هل هناك فترة تجربة مجانية؟',
      answer: 'نعم، الخطط المدفوعة تأتي مع فترة تجربة مجانية. يمكنك الإلغاء قبل انتهاء التجربة دون أي رسوم.',
    },
    {
      question: 'كيف يمكنني إلغاء اشتراكي؟',
      answer: 'يمكنك إلغاء اشتراكك من صفحة إدارة الاشتراك. ستبقى المميزات متاحة حتى نهاية الفترة المدفوعة.',
    },
  ];

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#0A1628] dark:via-[#0f1d35] dark:to-[#1a0533] font-[Cairo,sans-serif]">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#0A1628] dark:via-[#0f1d35] dark:to-[#1a0533] font-[Cairo,sans-serif]">
      <Navbar />

      {/* Hero Header */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 dark:border-white/10 bg-primary/5 dark:bg-white/5 backdrop-blur-sm px-4 py-2 text-sm text-primary dark:text-blue-300 animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary dark:text-cyan-400" />
            خطط مرنة تناسب احتياجاتك
          </div>

          <h1 className="mt-8 text-4xl font-bold md:text-6xl animate-slide-up text-foreground">
            <span className="gradient-text">اختر خطتك المثالية</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-slide-up" style={{ animationDelay: '100ms' }}>
            ابدأ مجاناً واستكشف قوة الذكاء الاصطناعي في فهم نظام العمل السعودي — أو ارتقِ للوصول الكامل
          </p>

          {/* Billing Toggle */}
          <div className="mt-10 inline-flex items-center gap-1 rounded-full border border-border dark:border-white/10 bg-muted/50 dark:bg-white/5 backdrop-blur-xl p-1.5 animate-scale-in" style={{ animationDelay: '200ms' }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              شهري
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              سنوي
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                وفّر 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="relative pb-20">
        <div className={`mx-auto max-w-6xl px-6 grid gap-8 ${
          plans.length <= 2 ? 'md:grid-cols-2 max-w-4xl' :
          plans.length === 3 ? 'md:grid-cols-3 max-w-5xl' :
          'md:grid-cols-2 lg:grid-cols-4'
        }`}>
          {plans.map((plan, index) => {
            const IconComp = iconMap[plan.icon] || Star;
            const features = parseFeatures(plan.features);
            const price = getPrice(plan);
            const savings = getSavings(plan);
            const isRecommended = plan.is_recommended;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-8 transition-all duration-500 animate-slide-up ${
                  isRecommended
                    ? 'bg-card border-2 border-blue-500/40 shadow-2xl shadow-blue-500/10 dark:bg-white/[0.08] dark:backdrop-blur-xl dark:border-blue-500/30 scale-[1.03] dark:shadow-2xl dark:shadow-blue-500/10'
                    : 'bg-card border border-border shadow-lg hover:shadow-xl hover:border-primary/20 dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none dark:hover:border-white/20 dark:hover:bg-white/[0.08] dark:backdrop-blur-xl'
                }`}
                style={{ animationDelay: `${index * 100 + 300}ms` }}
              >
                {isRecommended && (
                  <div className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-500/30">
                    ⭐ الأكثر شعبية
                  </div>
                )}

                {billingCycle === 'yearly' && savings > 0 && (
                  <div className="absolute -top-3 left-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    وفّر {savings}%
                  </div>
                )}

                {/* Plan Icon & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${plan.color || 'from-gray-500 to-gray-700'} shadow-lg`}>
                    <IconComp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{plan.name_ar}</h3>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  {plan.description_ar}
                </p>

                {/* Price */}
                <div className="mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold gradient-text">{price}</span>
                    <span className="text-sm text-muted-foreground">
                      {plan.price_monthly === 0 ? 'مجاناً' : `ر.س / شهر`}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && plan.price_yearly > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      يُدفع {getTotalPrice(plan)} ر.س سنوياً
                    </p>
                  )}
                </div>

                {plan.trial_days > 0 && (
                  <p className="mt-2 mb-4 text-xs font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    تجربة مجانية {plan.trial_days} أيام
                  </p>
                )}

                {/* Divider */}
                <div className="h-px bg-border dark:bg-gradient-to-r dark:from-transparent dark:via-white/10 dark:to-transparent my-4" />

                {/* Features */}
                <ul className="flex-1 space-y-3 mb-8">
                  {features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full rounded-xl py-3 font-medium transition-all duration-300 ${
                    isRecommended
                      ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02]'
                      : plan.price_monthly === 0
                        ? 'bg-muted border border-border text-foreground hover:bg-muted/80 dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/20'
                        : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02]'
                  }`}
                >
                  {plan.price_monthly === 0 ? 'ابدأ مجاناً' : 'اشترك الآن'}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="mx-auto max-w-4xl px-6 mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'دفع آمن', desc: 'تشفير كامل عبر مويسر' },
              { icon: Clock, title: 'إلغاء في أي وقت', desc: 'بدون التزامات طويلة' },
              { icon: Headphones, title: 'دعم متواصل', desc: 'فريق دعم على مدار الساعة' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-card border border-border shadow-sm dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none p-4 rounded-xl animate-fade-in backdrop-blur-sm" style={{ animationDelay: `${idx * 100 + 600}ms` }}>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 border-t border-border dark:border-white/5">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            <span className="gradient-text">الأسئلة الشائعة</span>
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-card border border-border shadow-sm dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none rounded-xl overflow-hidden transition-all duration-300 animate-slide-up backdrop-blur-sm"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-right"
                >
                  <span className="font-medium text-foreground">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-300 flex-shrink-0 ms-3 ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === idx ? 'max-h-40 pb-5 px-5' : 'max-h-0'
                  }`}
                >
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="text-xs text-muted-foreground">
            جميع الأسعار بالريال السعودي شاملة الضريبة. يمكنك الإلغاء في أي وقت.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}