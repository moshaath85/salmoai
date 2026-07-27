import { memo } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  FileSearch,
  Calculator,
  Shield,
  Mail,
  Sparkles,
} from 'lucide-react';

function Footer() {
  const currentYear = new Date().getFullYear();

  const services = [
    { to: '/chat', label: 'المساعد القانوني', icon: MessageSquare },
    { to: '/law-search', label: 'البحث في النظام', icon: Search },
    { to: '/contract-analysis', label: 'تحليل العقود', icon: FileSearch },
    { to: '/eosb-calculator', label: 'حساب المستحقات', icon: Calculator },
  ];

  const resources = [
    { to: '/company-policies', label: 'السياسات الداخلية' },
    { to: '/pricing', label: 'خطط الاشتراك' },
    { to: '/resume-analysis', label: 'تحليل السير الذاتية' },
  ];

  return (
    <footer className="relative border-t border-border bg-card dark:bg-[#0F172A] overflow-hidden" dir="rtl">
      <div className="relative mx-auto max-w-7xl px-6 py-16">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand section */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src="/assets/salmo-logo.avif" alt="SALMO" className="h-10 w-auto" />
                <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold gradient-text">
                  SALMO
                </h3>
                <p className="text-[11px] text-muted-foreground">مساعدك القانوني الذكي</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              منصة ذكية مدعومة بالذكاء الاصطناعي لمساعدتك في فهم نظام العمل السعودي وحماية حقوقك الوظيفية.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>مدعوم بأحدث تقنيات الذكاء الاصطناعي</span>
            </div>
          </div>

          {/* Services section */}
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="h-1 w-6 rounded-full bg-primary" />
              خدماتنا
            </h4>
            <ul className="space-y-3">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <li key={service.to}>
                    <Link
                      to={service.to}
                      className="group flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span>{service.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Resources & Contact section */}
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="h-1 w-6 rounded-full bg-primary" />
              روابط مهمة
            </h4>
            <ul className="space-y-3">
              {resources.map((resource) => (
                <li key={resource.to}>
                  <Link
                    to={resource.to}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                  >
                    {resource.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Contact */}
            <div className="pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="h-1 w-6 rounded-full bg-emerald-500" />
                تواصل معنا
              </h4>
              <a
                href="mailto:support@salmo.sa"
                className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span>support@salmo.sa</span>
              </a>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4 mb-8">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-amber-600 dark:text-amber-400 font-medium">إخلاء مسؤولية:</span>{' '}
              هذه الأداة مصممة للمساعدة والتوعية فقط ولا تُعد استشارة قانونية رسمية. للاستشارات الرسمية يرجى التواصل مع محامٍ مختص أو الجهات المعنية.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © {currentYear} Salmo Solutions. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">صُنع بـ ❤️ في المملكة العربية السعودية 🇸🇦</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default memo(Footer);