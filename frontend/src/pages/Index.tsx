import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MessageSquare,
  Search,
  FileCheck,
  Users,
  Calculator,
  BookOpen,
  Sparkles,
  Shield,
  Zap,
  Brain,
  Scale,
  ThumbsUp,
} from 'lucide-react';

/* ===== Intersection Observer Hook for scroll animations ===== */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = ref.current?.querySelectorAll('.reveal-on-scroll');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ===== Animated Counter Component ===== */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !counted.current) {
            counted.current = true;
            animateCount();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();

    function animateCount() {
      const duration = 2000;
      const start = performance.now();

      function update(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * target);

        if (ref.current) {
          ref.current.textContent = current.toLocaleString('ar-SA') + suffix;
        }

        if (progress < 1) {
          requestAnimationFrame(update);
        }
      }

      requestAnimationFrame(update);
    }
  }, [target, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

/* ===== Main Landing Page ===== */
export default function Index() {
  const scrollRef = useScrollReveal();

  const services = [
    {
      icon: MessageSquare,
      title: 'المساعد الذكي',
      desc: 'اسأل أي سؤال عن نظام العمل واحصل على إجابة فورية مع المادة القانونية والإجراء المناسب.',
      to: '/chat',
      bgColor: 'bg-teal-50 dark:bg-teal-500/10',
      iconColor: 'text-teal-600 dark:text-teal-400',
    },
    {
      icon: Search,
      title: 'البحث في النظام',
      desc: 'ابحث في مواد نظام العمل السعودي بالرقم أو الموضوع أو الكلمة المفتاحية.',
      to: '/law-search',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: FileCheck,
      title: 'تحليل العقود',
      desc: 'ارفع عقد العمل واكتشف المخالفات والمخاطر القانونية قبل التوقيع.',
      to: '/contract-analysis',
      bgColor: 'bg-cyan-50 dark:bg-cyan-500/10',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      icon: Users,
      title: 'تحليل السير الذاتية',
      desc: 'قيّم السير الذاتية وقارن المرشحين مع وصف الوظيفة بتقييم احترافي.',
      to: '/resume-analysis',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: Calculator,
      title: 'حاسبة المستحقات',
      desc: 'احسب مكافأة نهاية الخدمة وبدل الإجازات وفق نظام العمل السعودي.',
      to: '/eosb-calculator',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      icon: BookOpen,
      title: 'السياسات الداخلية',
      desc: 'تصفح وابحث في السياسات الداخلية للشركات والأنظمة واللوائح.',
      to: '/company-policies',
      bgColor: 'bg-rose-50 dark:bg-rose-500/10',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
  ];



  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <style>{`
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .reveal-on-scroll.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-on-scroll:nth-child(2) { transition-delay: 0.1s; }
        .reveal-on-scroll:nth-child(3) { transition-delay: 0.2s; }
        .reveal-on-scroll:nth-child(4) { transition-delay: 0.3s; }
        .reveal-on-scroll:nth-child(5) { transition-delay: 0.4s; }
        .reveal-on-scroll:nth-child(6) { transition-delay: 0.5s; }
      `}</style>

      <Navbar />

      {/* ===== Hero Section — Clean and professional ===== */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-[#0F172A] dark:to-[#1E293B]">
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-[0.04] dark:opacity-[0.06]"
            style={{
              background: 'radial-gradient(circle, #0891B2 0%, transparent 70%)',
              top: '-10%',
              right: '-5%',
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full opacity-[0.03] dark:opacity-[0.04]"
            style={{
              background: 'radial-gradient(circle, #0E7490 0%, transparent 70%)',
              bottom: '10%',
              left: '-5%',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-medium text-primary mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            <span>مدعوم بالذكاء الاصطناعي المتقدم</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Main heading */}
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl lg:text-7xl text-foreground">
            <span className="block">مساعدك القانوني الذكي</span>
            <span className="block mt-2 gradient-text">لنظام العمل السعودي</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed">
            منصة ذكية مبنية وفق نظام العمل السعودي والأنظمة المعمول بها في المملكة
            <br className="hidden md:block" />
            احصل على استشارات قانونية فورية، وحلّل عقودك، وافهم حقوقك والتزاماتك بدقة وسرعة عالية.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/chat">
              <Button
                size="lg"
                className="gradient-primary text-white border-0 px-8 py-6 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group"
              >
                <Brain className="ml-2 h-5 w-5 group-hover:animate-pulse" />
                ابدأ المحادثة مجاناً
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-border text-foreground hover:bg-muted px-8 py-6 text-base transition-all duration-300"
              >
                عرض الخطط والأسعار
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>آمن وموثوق</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>إجابات فورية</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-primary" />
              <span>مبني على النظام الرسمي</span>
            </div>
          </div>

          {/* Hero Stats Counter */}
          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-500/10">
                <MessageSquare className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="text-2xl font-bold text-foreground md:text-3xl">
                <AnimatedCounter target={10000} suffix="+" />
              </div>
              <p className="text-xs text-muted-foreground">عدد الاستشارات</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-foreground md:text-3xl">
                <AnimatedCounter target={5000} suffix="+" />
              </div>
              <p className="text-xs text-muted-foreground">عدد المستخدمين</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <ThumbsUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-foreground md:text-3xl">
                <AnimatedCounter target={98} suffix="%" />
              </div>
              <p className="text-xs text-muted-foreground">نسبة الرضا</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Services Section ===== */}
      <section ref={scrollRef} className="relative py-24 overflow-hidden bg-background">
        <div className="relative mx-auto max-w-7xl px-6">
          {/* Section header */}
          <div className="text-center mb-16 reveal-on-scroll">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary mb-4">
              <Sparkles className="h-3 w-3" />
              خدماتنا
            </div>
            <h2 className="text-3xl font-bold md:text-5xl text-foreground">
              كل ما تحتاجه في <span className="gradient-text">مكان واحد</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              أدوات ذكية مصممة خصيصاً لمساعدتك في فهم وتطبيق نظام العمل السعودي
            </p>
          </div>

          {/* Services grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <Link
                key={i}
                to={service.to}
                className="reveal-on-scroll group relative rounded-2xl p-6 bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/20 cursor-pointer overflow-hidden transition-all duration-300"
              >
                {/* Icon */}
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${service.bgColor} transition-all duration-300 group-hover:scale-110`}>
                  <service.icon className={`h-6 w-6 ${service.iconColor}`} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {service.desc}
                </p>

                {/* Arrow indicator */}
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                  <span>استكشف</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>



      {/* ===== How It Works Section ===== */}
      <section className="relative py-24 overflow-hidden bg-secondary/30 dark:bg-secondary/10">
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="text-center mb-16 reveal-on-scroll">
            <h2 className="text-3xl font-bold md:text-5xl text-foreground">
              كيف يعمل <span className="gradient-text">SALMO</span>؟
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">ثلاث خطوات بسيطة للحصول على إجابتك القانونية</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'اطرح سؤالك',
                desc: 'اكتب أو تحدث بسؤالك عن فصل، راتب، إجازات، عقد، أو مكافأة نهاية الخدمة.',
                icon: MessageSquare,
              },
              {
                step: '02',
                title: 'تحليل ذكي',
                desc: 'يحلل SALMO سؤالك ويربطه بالمادة القانونية المناسبة من نظام العمل.',
                icon: Brain,
              },
              {
                step: '03',
                title: 'إجابة شاملة',
                desc: 'احصل على الحكم القانوني، المادة، الشرح المبسط، والإجراء العملي.',
                icon: Scale,
              },
            ].map((s, i) => (
              <div key={i} className="reveal-on-scroll relative text-center group">
                {/* Step icon */}
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border shadow-sm group-hover:shadow-md group-hover:border-primary/20 transition-all duration-300">
                  <s.icon className="h-7 w-7 text-primary" />
                </div>

                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-0 w-full h-px bg-border -translate-x-1/2" />
                )}

                <div className="text-xs font-mono text-primary/60 mb-2">{s.step}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Final CTA Section ===== */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 dark:from-[#0F172A] dark:to-[#1E293B]">
        {/* Subtle decorative */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-teal-400/30 loading-particle" />
          <div className="absolute top-1/3 left-1/3 w-1.5 h-1.5 rounded-full bg-teal-300/20 loading-particle" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-1/4 right-1/3 w-2.5 h-2.5 rounded-full bg-cyan-400/20 loading-particle" style={{ animationDelay: '4s' }} />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 mb-8">
            <Sparkles className="h-3.5 w-3.5 text-teal-300" />
            ابدأ مجاناً — بدون بطاقة ائتمان
          </div>

          <h2 className="text-3xl font-bold text-white md:text-5xl">
            جاهز لتفهم <span className="gradient-text-cyan">حقوقك</span>؟
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70 text-lg">
            ابدأ بـ 3 أسئلة مجانية يوميًا — أو ارتقِ للخطة المدفوعة بوصول غير محدود لجميع الأدوات.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/chat">
              <Button
                size="lg"
                className="bg-white text-slate-900 hover:bg-white/90 px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                <Brain className="ml-2 h-5 w-5" />
                ابدأ الآن مجاناً
              </Button>
            </Link>
            <Link to="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="!bg-transparent border-white/20 text-white hover:text-white hover:border-white/40 hover:!bg-white/5 px-8 py-6 text-base transition-all duration-300"
              >
                اطلع على الخطط
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}