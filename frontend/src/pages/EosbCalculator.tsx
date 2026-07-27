import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { client } from '@/lib/sdk';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import {
  Calculator,
  Loader2,
  LogIn,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Banknote,
  CalendarDays,
  FileText,
  Briefcase,
  Download,
  Share2,
  RotateCcw,
  Edit3,
  Clock,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  Palmtree,
  Info,
} from 'lucide-react';

// ─── Retry Helper ───────────────────────────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const msg = (err as { message?: string })?.message || '';
      const isDns = msg.includes('dns') || msg.includes('balancer') || msg.includes('timeout');
      if (!isDns || i === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

// ─── Types ──────────────────────────────────────────────────────────────────────
interface EosbResult {
  type: string;
  input: Record<string, unknown>;
  service_duration?: { years: number; months: number; days: number };
  eosb_breakdown: {
    first_5_years: { years: number; rate: string; calculation: string; amount: number };
    after_5_years: { years: number; rate: string; calculation: string; amount: number };
    gross_eosb: number;
  };
  adjustment: {
    reason: string;
    factor: number;
    explanation: string;
    adjusted_eosb: number;
  };
  vacation_allowance: {
    daily_wage: number;
    unused_days: number;
    calculation: string;
    amount: number;
  };
  compensation?: {
    early_termination?: { amount: number; explanation: string };
    notice_period?: { amount: number; explanation: string };
    total: number;
  };
  deductions?: {
    items: { description: string; amount: number }[];
    total: number;
  };
  legal_reference?: {
    articles: string[];
    explanation: string;
  };
  total_entitlement: number;
  explanation: string;
  next_steps: string[];
  disclaimer: string;
}

// ─── HRSD Termination Reasons ───────────────────────────────────────────────────
interface ReasonOption {
  value: string;
  label: string;
  desc: string;
  icon: typeof FileText;
  impact: 'full' | 'partial' | 'none';
  impactLabel: string;
}

const TERMINATION_REASONS: ReasonOption[] = [
  {
    value: 'انتهاء مدة العقد',
    label: 'انتهاء مدة العقد',
    desc: 'انتهت المدة المحددة في العقد دون تجديد',
    icon: FileText,
    impact: 'full',
    impactLabel: 'مكافأة كاملة',
  },
  {
    value: 'اتفاق الطرفين على إنهاء العقد',
    label: 'اتفاق الطرفين',
    desc: 'تم الاتفاق بين العامل وصاحب العمل على إنهاء العقد',
    icon: CheckCircle2,
    impact: 'full',
    impactLabel: 'مكافأة كاملة',
  },
  {
    value: 'فسخ العقد من قبل صاحب العمل',
    label: 'فصل من صاحب العمل',
    desc: 'قام صاحب العمل بإنهاء العقد (غير المادة 80)',
    icon: AlertCircle,
    impact: 'full',
    impactLabel: 'مكافأة كاملة',
  },
  {
    value: 'فسخ العقد من قبل صاحب العمل لأحد الحالات الواردة في المادة 80',
    label: 'فصل بموجب المادة 80',
    desc: 'إنهاء العقد لأسباب مشروعة وفق المادة 80 من نظام العمل',
    icon: XCircle,
    impact: 'none',
    impactLabel: 'لا يستحق مكافأة',
  },
  {
    value: 'ترك الموظف العمل نتيجة لقوة قاهرة',
    label: 'قوة قاهرة',
    desc: 'ترك العمل بسبب ظروف خارجة عن الإرادة',
    icon: Shield,
    impact: 'full',
    impactLabel: 'مكافأة كاملة',
  },
  {
    value: 'إنهاء الموظفة لعقد العمل خلال 6 أشهر من الزواج أو 3 أشهر من الوضع',
    label: 'استقالة الموظفة (زواج/وضع)',
    desc: 'إنهاء العقد خلال 6 أشهر من الزواج أو 3 أشهر من الوضع',
    icon: CheckCircle2,
    impact: 'full',
    impactLabel: 'مكافأة كاملة',
  },
  {
    value: 'ترك الموظف العمل لأحد الحالات الواردة في المادة 81',
    label: 'ترك العمل بموجب المادة 81',
    desc: 'ترك العمل لأسباب مشروعة وفق المادة 81 (إخلال صاحب العمل)',
    icon: Scale,
    impact: 'full',
    impactLabel: 'مكافأة كاملة',
  },
  {
    value: 'فسخ العقد من قبل الموظف أو ترك العمل لغير الحالات الواردة في المادة 81',
    label: 'ترك العمل بدون سبب مشروع',
    desc: 'ترك العمل دون أسباب واردة في المادة 81',
    icon: AlertTriangle,
    impact: 'none',
    impactLabel: 'لا يستحق مكافأة',
  },
  {
    value: 'استقالة الموظف',
    label: 'استقالة',
    desc: 'تقديم الاستقالة بإرادة العامل',
    icon: Briefcase,
    impact: 'partial',
    impactLabel: 'حسب مدة الخدمة',
  },
];

// ─── Steps Config ───────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: 'العقد والتواريخ', icon: Briefcase },
  { id: 2, title: 'الراتب', icon: Banknote },
  { id: 3, title: 'سبب الانتهاء', icon: FileText },
  { id: 4, title: 'المراجعة', icon: CheckCircle2 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────
function formatNumber(value: string): string {
  const num = value.replace(/[^\d.]/g, '');
  const parts = num.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function parseFormattedNumber(value: string): number {
  return parseFloat(value.replace(/,/g, '')) || 0;
}

function calculateServiceDuration(start: string, end: string) {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (endDate <= startDate) return null;

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  let days = endDate.getDate() - startDate.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function EosbCalculator() {
  const [user, setUser] = useState<unknown>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Step state
  const [step, setStep] = useState(1);

  // Step 1: Contract & Dates
  const [contractType, setContractType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [remainingContractMonths, setRemainingContractMonths] = useState('');

  // Step 2: Salary
  const [basicSalary, setBasicSalary] = useState('');
  const [actualSalary, setActualSalary] = useState('');

  // Step 3: Reason
  const [reason, setReason] = useState('');
  const [noticeServed, setNoticeServed] = useState(true);

  // Step 4: Vacation
  const [unusedVacationDays, setUnusedVacationDays] = useState('0');

  // Result state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EosbResult | null>(null);

  // ─── Auth ───────────────────────────────────────────────────────────────────
  const checkAuth = async () => {
    setAuthChecked(false);
    setAuthError(false);
    try {
      const res = await withRetry(() => client.auth.me());
      setUser((res as { data?: unknown })?.data || null);
    } catch {
      setUser(null);
      setAuthError(true);
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // ─── Computed Values ────────────────────────────────────────────────────────
  const serviceDuration = useMemo(
    () => calculateServiceDuration(startDate, endDate),
    [startDate, endDate]
  );

  const dailyWage = useMemo(() => {
    const salary = parseFormattedNumber(actualSalary);
    return salary > 0 ? salary / 30 : 0;
  }, [actualSalary]);

  // ─── Validation ─────────────────────────────────────────────────────────────
  const canProceed = () => {
    switch (step) {
      case 1:
        return contractType !== '' && startDate !== '' && endDate !== '' && serviceDuration !== null;
      case 2:
        return parseFormattedNumber(basicSalary) > 0 && parseFormattedNumber(actualSalary) > 0;
      case 3:
        return reason !== '';
      case 4:
        return true;
      default:
        return false;
    }
  };

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      calculate();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const goToStep = (targetStep: number) => {
    if (targetStep < step) setStep(targetStep);
  };

  // ─── Calculate ──────────────────────────────────────────────────────────────
  const calculate = async () => {
    setLoading(true);
    setResult(null);

    const payload: Record<string, unknown> = {
      contract_type: contractType,
      start_date: startDate,
      end_date: endDate,
      basic_salary: parseFormattedNumber(basicSalary),
      actual_salary: parseFormattedNumber(actualSalary),
      monthly_salary: parseFormattedNumber(actualSalary),
      reason,
      unused_vacation_days: parseFloat(unusedVacationDays) || 0,
      notice_served: noticeServed,
    };

    if (serviceDuration) {
      payload.service_years = serviceDuration.years + serviceDuration.months / 12;
      payload.service_months = serviceDuration.months;
    }

    if (contractType === 'محدد المدة' && remainingContractMonths) {
      payload.remaining_contract_months = parseFloat(remainingContractMonths) || 0;
    }

    try {
      const res = await withRetry(() =>
        client.apiCall.invoke({
          url: '/api/v1/salmo/calculate-eosb',
          method: 'POST',
          data: payload,
        })
      );
      setResult((res as { data: { result: EosbResult } }).data.result);
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { detail?: string }; response?: { data?: { detail?: string } } };
      const msg = error?.message || '';
      const isDns = msg.includes('dns') || msg.includes('balancer') || msg.includes('timeout');
      const detail = isDns
        ? 'تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى'
        : error?.data?.detail || error?.response?.data?.detail || msg || 'حدث خطأ غير متوقع';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  // ─── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep(1);
    setContractType('');
    setStartDate('');
    setEndDate('');
    setRemainingContractMonths('');
    setBasicSalary('');
    setActualSalary('');
    setReason('');
    setNoticeServed(true);
    setUnusedVacationDays('0');
    setResult(null);
  };

  // ─── PDF Export ─────────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica');
    doc.setFontSize(18);
    doc.text('SALMO - EOSB Calculator Report', 105, 20, { align: 'center' });
    doc.setFontSize(12);

    let y = 40;
    const addLine = (label: string, value: string) => {
      doc.text(`${label}: ${value}`, 20, y);
      y += 8;
    };

    addLine('Contract Type', contractType);
    addLine('Service Period', `${startDate} to ${endDate}`);
    if (serviceDuration) {
      addLine('Duration', `${serviceDuration.years}y ${serviceDuration.months}m ${serviceDuration.days}d`);
    }
    addLine('Basic Salary', `${parseFormattedNumber(basicSalary).toLocaleString()} SAR`);
    addLine('Actual Salary', `${parseFormattedNumber(actualSalary).toLocaleString()} SAR`);
    addLine('Reason', reason);
    addLine('Unused Vacation Days', unusedVacationDays);

    y += 10;
    doc.setFontSize(14);
    doc.text('Results', 20, y);
    y += 10;
    doc.setFontSize(12);

    addLine('Gross EOSB', `${result.eosb_breakdown.gross_eosb.toLocaleString()} SAR`);
    addLine('Adjustment Factor', `${(result.adjustment.factor * 100).toFixed(0)}%`);
    addLine('Adjusted EOSB', `${result.adjustment.adjusted_eosb.toLocaleString()} SAR`);
    if (result.vacation_allowance.amount > 0) {
      addLine('Vacation Allowance', `${result.vacation_allowance.amount.toLocaleString()} SAR`);
    }
    if (result.compensation && result.compensation.total > 0) {
      addLine('Compensation', `${result.compensation.total.toLocaleString()} SAR`);
    }
    y += 5;
    doc.setFontSize(14);
    doc.text(`Total Entitlement: ${result.total_entitlement.toLocaleString()} SAR`, 20, y);

    doc.save('SALMO_EOSB_Report.pdf');
    toast.success('تم تحميل التقرير بنجاح');
  };

  // ─── Share ──────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!result) return;
    const text = `حاسبة مستحقات نهاية الخدمة - SALMO AI\nإجمالي المستحقات: ${result.total_entitlement.toLocaleString('ar-SA')} ريال`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'حاسبة مستحقات نهاية الخدمة', text });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('تم نسخ النتيجة');
    }
  };

  // ─── Auth States ────────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authError && !user) {
    return (
      <div dir="rtl" className="min-h-screen bg-background font-[Cairo,Inter,sans-serif]">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl glass-card ai-glow-sm">
            <AlertCircle className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">تعذر الاتصال بالخادم</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            حدث خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.
          </p>
          <Button onClick={checkAuth} className="mt-6 gradient-primary text-white">
            <RefreshCw className="ml-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div dir="rtl" className="min-h-screen bg-background font-[Cairo,Inter,sans-serif]">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary ai-glow">
            <Calculator className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">سجّل الدخول لحساب المستحقات</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            لحساب مستحقات نهاية الخدمة، سجّل الدخول مجاناً.
          </p>
          <Button onClick={() => client.auth.toLogin()} className="mt-6 gradient-primary text-white">
            <LogIn className="ml-2 h-4 w-4" />
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-background font-[Cairo,Inter,sans-serif]">
      <Navbar />

      <div className="flex-1">
        {/* Background Mesh */}
        <div className="pointer-events-none fixed inset-0 gradient-mesh opacity-50" />

        <div className="relative mx-auto max-w-4xl px-4 py-10 md:px-6">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary ai-glow">
              <Calculator className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              حاسبة مستحقات نهاية الخدمة
            </h1>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              احسب مكافأة نهاية الخدمة وبدل الإجازات والتعويضات وفق نظام العمل السعودي
            </p>
          </div>

          {!result ? (
            <>
              {/* Step Indicator */}
              <div className="mb-8 flex items-center justify-center gap-1 md:gap-3">
                {STEPS.map((s, i) => {
                  const StepIcon = s.icon;
                  return (
                    <div key={s.id} className="flex items-center">
                      <button
                        onClick={() => goToStep(s.id)}
                        disabled={s.id >= step}
                        className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all md:px-4 md:text-sm ${
                          step === s.id
                            ? 'gradient-primary text-white ai-glow-sm'
                            : step > s.id
                              ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                              : 'bg-muted text-muted-foreground cursor-default'
                        }`}
                      >
                        {step > s.id ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <StepIcon className="h-4 w-4" />
                        )}
                        <span className="hidden md:inline">{s.title}</span>
                        <span className="md:hidden">{s.id}</span>
                      </button>
                      {i < STEPS.length - 1 && (
                        <div
                          className={`mx-1 h-0.5 w-4 rounded-full transition-colors md:w-8 ${
                            step > s.id ? 'bg-primary' : 'bg-border'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Step Content Card */}
              <div className="glass-card rounded-2xl p-6 md:p-8 transition-all">
                {/* ─── Step 1: Contract & Dates ─── */}
                {step === 1 && (
                  <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary">
                        <Briefcase className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">نوع العقد وتواريخ الخدمة</h2>
                        <p className="text-sm text-muted-foreground">حدد نوع عقدك وتاريخ بداية ونهاية الخدمة</p>
                      </div>
                    </div>

                    {/* Contract Type Selection */}
                    <div>
                      <label className="mb-3 block text-sm font-semibold text-foreground">نوع العقد</label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          { value: 'غير محدد المدة', label: 'غير محدد المدة', desc: 'عقد مفتوح بدون تاريخ انتهاء محدد' },
                          { value: 'محدد المدة', label: 'محدد المدة', desc: 'عقد بمدة زمنية محددة' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setContractType(opt.value)}
                            className={`flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-right transition-all ${
                              contractType === opt.value
                                ? 'border-primary bg-primary/5 shadow-md'
                                : 'border-border hover:border-primary/40 hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <span className="font-semibold text-foreground">{opt.label}</span>
                              {contractType === opt.value && (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Pickers */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-foreground">
                          <CalendarDays className="ml-1 inline h-4 w-4" />
                          تاريخ بداية العمل
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-foreground">
                          <CalendarDays className="ml-1 inline h-4 w-4" />
                          تاريخ نهاية العمل
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate}
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    {/* Service Duration Display */}
                    {serviceDuration && (
                      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <Clock className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">مدة الخدمة المحسوبة</p>
                          <p className="text-lg font-bold gradient-text">
                            {serviceDuration.years > 0 && `${serviceDuration.years} سنة`}
                            {serviceDuration.months > 0 && ` و ${serviceDuration.months} شهر`}
                            {serviceDuration.days > 0 && ` و ${serviceDuration.days} يوم`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Remaining Contract Months (for fixed-term) */}
                    {contractType === 'محدد المدة' && (
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-foreground">
                          الأشهر المتبقية من العقد (في حالة الإنهاء المبكر)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={remainingContractMonths}
                          onChange={(e) => setRemainingContractMonths(e.target.value)}
                          placeholder="اتركه فارغاً إذا انتهى العقد بشكل طبيعي"
                          className="border-border text-base"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          يُستخدم لحساب تعويض الإنهاء المبكر إن وُجد
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Step 2: Salary ─── */}
                {step === 2 && (
                  <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary">
                        <Banknote className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">بيانات الراتب</h2>
                        <p className="text-sm text-muted-foreground">أدخل الأجر الأساسي والأجر الفعلي</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-foreground">
                          الأجر الأساسي (ريال)
                        </label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={basicSalary}
                          onChange={(e) => setBasicSalary(formatNumber(e.target.value))}
                          placeholder="مثال: 8,000"
                          className="border-border text-lg"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          الراتب الأساسي بدون البدلات
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-foreground">
                          الأجر الفعلي (ريال)
                          <span className="mr-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            يُستخدم في الحساب
                          </span>
                        </label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={actualSalary}
                          onChange={(e) => setActualSalary(formatNumber(e.target.value))}
                          placeholder="مثال: 12,000"
                          className="border-border text-lg"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          الأجر الفعلي يشمل الراتب الأساسي + بدل السكن + بدل النقل + البدلات الثابتة
                        </p>
                      </div>
                    </div>

                    {/* Daily Wage Preview */}
                    {dailyWage > 0 && (
                      <div className="flex items-center gap-3 rounded-xl border border-info/20 bg-info/5 p-4">
                        <Info className="h-5 w-5 text-cyan-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">الأجر اليومي (الأجر الفعلي ÷ 30)</p>
                          <p className="text-lg font-bold text-foreground">
                            {dailyWage.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Step 3: Termination Reason ─── */}
                {step === 3 && (
                  <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">سبب انتهاء العلاقة العمالية</h2>
                        <p className="text-sm text-muted-foreground">اختر السبب الرسمي وفق تصنيف وزارة الموارد البشرية</p>
                      </div>
                    </div>

                    {/* Impact Legend */}
                    <div className="flex flex-wrap gap-3 rounded-xl bg-muted/50 p-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-muted-foreground">مكافأة كاملة</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Minus className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-muted-foreground">حسب المدة</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                        <span className="text-muted-foreground">لا يستحق</span>
                      </div>
                    </div>

                    {/* Reason Cards */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {TERMINATION_REASONS.map((opt) => {
                        const ReasonIcon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setReason(opt.value)}
                            className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-right transition-all md:p-4 ${
                              reason === opt.value
                                ? 'border-primary bg-primary/5 shadow-md'
                                : 'border-border hover:border-primary/40 hover:bg-muted/30'
                            }`}
                          >
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                opt.impact === 'full'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : opt.impact === 'partial'
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-rose-500/10 text-rose-500'
                              }`}
                            >
                              <ReasonIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground text-sm">{opt.label}</p>
                              <p className="text-xs text-muted-foreground truncate">{opt.desc}</p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {reason === opt.value && (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              )}
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  opt.impact === 'full'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : opt.impact === 'partial'
                                      ? 'bg-amber-500/10 text-amber-600'
                                      : 'bg-rose-500/10 text-rose-600'
                                }`}
                              >
                                {opt.impactLabel}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Notice Served Toggle */}
                    {reason && !reason.includes('المادة 80') && reason !== 'فسخ العقد من قبل الموظف أو ترك العمل لغير الحالات الواردة في المادة 81' && (
                      <div className="flex items-center justify-between rounded-xl border border-border p-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">هل تم تقديم إشعار مسبق؟</p>
                          <p className="text-xs text-muted-foreground">فترة الإشعار 60 يوماً للعقود غير المحددة</p>
                        </div>
                        <button
                          onClick={() => setNoticeServed(!noticeServed)}
                          className={`relative h-7 w-12 rounded-full transition-colors ${
                            noticeServed ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                              noticeServed ? 'right-0.5' : 'right-[22px]'
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Resignation Warning */}
                    {reason === 'استقالة الموظف' && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <div>
                            <p className="font-semibold text-foreground mb-1">تنبيه: الاستقالة تؤثر على المكافأة</p>
                            <ul className="space-y-0.5 text-xs text-muted-foreground">
                              <li>• أقل من سنتين: لا يستحق مكافأة</li>
                              <li>• من 2 إلى 5 سنوات: ثلث المكافأة</li>
                              <li>• من 5 إلى 10 سنوات: ثلثا المكافأة</li>
                              <li>• أكثر من 10 سنوات: كامل المكافأة</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Step 4: Vacation & Review ─── */}
                {step === 4 && (
                  <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary">
                        <Palmtree className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">الإجازات ومراجعة البيانات</h2>
                        <p className="text-sm text-muted-foreground">أدخل أيام الإجازات وراجع بياناتك قبل الحساب</p>
                      </div>
                    </div>

                    {/* Vacation Days */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-foreground">
                        أيام الإجازات السنوية غير المستخدمة
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={unusedVacationDays}
                        onChange={(e) => setUnusedVacationDays(e.target.value)}
                        placeholder="0"
                        className="border-border text-lg"
                      />
                      {dailyWage > 0 && parseFloat(unusedVacationDays) > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          بدل الإجازات التقريبي: {(dailyWage * parseFloat(unusedVacationDays)).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ريال
                        </p>
                      )}
                    </div>

                    {/* Review Summary */}
                    <div className="rounded-xl border border-border bg-muted/30 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground">ملخص البيانات المدخلة</h3>
                      </div>
                      <div className="space-y-3">
                        {/* Contract Type */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">نوع العقد</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{contractType}</span>
                            <button onClick={() => goToStep(1)} className="text-primary hover:text-primary/80">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {/* Service Period */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">فترة الخدمة</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {serviceDuration
                                ? `${serviceDuration.years} سنة ${serviceDuration.months > 0 ? `و ${serviceDuration.months} شهر` : ''}`
                                : '-'}
                            </span>
                            <button onClick={() => goToStep(1)} className="text-primary hover:text-primary/80">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {/* Salary */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">الأجر الفعلي</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{actualSalary} ريال</span>
                            <button onClick={() => goToStep(2)} className="text-primary hover:text-primary/80">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {/* Reason */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">سبب الانتهاء</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground max-w-[180px] truncate">
                              {TERMINATION_REASONS.find((r) => r.value === reason)?.label || reason}
                            </span>
                            <button onClick={() => goToStep(3)} className="text-primary hover:text-primary/80">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {/* Vacation */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">أيام الإجازات</span>
                          <span className="text-sm font-medium text-foreground">{unusedVacationDays || '0'} يوم</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── Navigation Buttons ─── */}
                <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
                  <Button
                    onClick={handleBack}
                    variant="ghost"
                    disabled={step === 1}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="ml-1 h-4 w-4" />
                    السابق
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed() || loading}
                    className="gradient-primary text-white min-w-[140px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري الحساب...
                      </>
                    ) : step === 4 ? (
                      <>
                        <Calculator className="ml-2 h-4 w-4" />
                        احسب المستحقات
                      </>
                    ) : (
                      <>
                        التالي
                        <ChevronLeft className="mr-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* ═══════════════════════════════════════════════════════════════════════
               RESULTS SECTION
            ═══════════════════════════════════════════════════════════════════════ */
            <div className="flex flex-col gap-6 animate-[slideUp_0.4s_ease-out]">
              {/* Total Entitlement Hero Card */}
              <div className="glass-card ai-border-glow rounded-2xl p-8 text-center">
                <p className="text-sm text-muted-foreground mb-2">💰 إجمالي المستحقات</p>
                <p className="text-4xl font-bold text-foreground md:text-5xl">
                  {result.total_entitlement.toLocaleString('ar-SA', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <span className="text-lg text-muted-foreground mr-2">ريال</span>
                </p>
                {result.service_duration && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    مدة الخدمة: {result.service_duration.years || 0} سنة و {result.service_duration.months || 0} شهر و {result.service_duration.days || 0} يوم
                  </p>
                )}
              </div>

              {/* EOSB Breakdown */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    تفاصيل مكافأة نهاية الخدمة
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        أول 5 سنوات ({result.eosb_breakdown.first_5_years.years} سنة × {result.eosb_breakdown.first_5_years.rate})
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {result.eosb_breakdown.first_5_years.amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{result.eosb_breakdown.first_5_years.calculation}</p>
                  </div>

                  {result.eosb_breakdown.after_5_years.years > 0 && (
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          بعد 5 سنوات ({result.eosb_breakdown.after_5_years.years} سنة × {result.eosb_breakdown.after_5_years.rate})
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {result.eosb_breakdown.after_5_years.amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.eosb_breakdown.after_5_years.calculation}</p>
                    </div>
                  )}

                  <div className="px-5 py-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">إجمالي المكافأة قبل التعديل</span>
                      <span className="text-sm font-bold text-foreground">
                        {result.eosb_breakdown.gross_eosb.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adjustment */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Scale className="h-5 w-5 text-violet-500" />
                    معامل التعديل حسب السبب
                  </h2>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">سبب الانتهاء</span>
                    <span className="text-sm font-medium text-foreground">{result.adjustment.reason}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">نسبة الاستحقاق</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        result.adjustment.factor === 0
                          ? 'bg-rose-500/10 text-rose-600'
                          : result.adjustment.factor === 1
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {result.adjustment.factor === 0
                        ? 'لا يستحق (0%)'
                        : result.adjustment.factor === 1
                          ? 'كامل المكافأة (100%)'
                          : `${(result.adjustment.factor * 100).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-muted-foreground">
                    {result.adjustment.explanation}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">مكافأة نهاية الخدمة المعدّلة</span>
                    <span className="text-xl font-bold gradient-text">
                      {result.adjustment.adjusted_eosb.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                    </span>
                  </div>
                </div>
              </div>

              {/* Vacation Allowance */}
              {result.vacation_allowance.amount > 0 && (
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Palmtree className="h-5 w-5 text-cyan-500" />
                      بدل الإجازات غير المستخدمة
                    </h2>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">الأجر اليومي</span>
                      <span className="text-sm font-medium text-foreground">
                        {result.vacation_allowance.daily_wage.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">عدد الأيام</span>
                      <span className="text-sm font-medium text-foreground">{result.vacation_allowance.unused_days} يوم</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{result.vacation_allowance.calculation}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-sm font-semibold text-foreground">إجمالي بدل الإجازات</span>
                      <span className="text-lg font-bold text-foreground">
                        {result.vacation_allowance.amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Compensation */}
              {result.compensation && result.compensation.total > 0 && (
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-emerald-500" />
                      التعويضات
                    </h2>
                  </div>
                  <div className="p-5 space-y-3">
                    {result.compensation.early_termination && result.compensation.early_termination.amount > 0 && (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">تعويض الإنهاء المبكر</span>
                          <span className="text-sm font-medium text-foreground">
                            {result.compensation.early_termination.amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{result.compensation.early_termination.explanation}</p>
                      </div>
                    )}
                    {result.compensation.notice_period && result.compensation.notice_period.amount > 0 && (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">تعويض فترة الإشعار</span>
                          <span className="text-sm font-medium text-foreground">
                            {result.compensation.notice_period.amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{result.compensation.notice_period.explanation}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-sm font-semibold text-foreground">إجمالي التعويضات</span>
                      <span className="text-lg font-bold text-foreground">
                        {result.compensation.total.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Deductions */}
              {result.deductions && result.deductions.total > 0 && (
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-rose-500" />
                      الخصومات
                    </h2>
                  </div>
                  <div className="p-5 space-y-3">
                    {(result.deductions?.items || []).map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{item.description}</span>
                        <span className="text-sm font-medium text-rose-600">
                          -{item.amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-sm font-semibold text-foreground">إجمالي الخصومات</span>
                      <span className="text-lg font-bold text-rose-600">
                        -{(result.deductions?.total || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Legal Reference */}
              {result.legal_reference && (
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      المرجع النظامي
                    </h2>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(result.legal_reference?.articles || []).map((article, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                        >
                          {article}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {result.legal_reference?.explanation || ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div className="glass-card rounded-2xl p-5">
                <h2 className="mb-3 text-base font-bold text-foreground flex items-center gap-2">
                  <Info className="h-5 w-5 text-cyan-500" />
                  التوضيح
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{result.explanation}</p>
              </div>

              {/* Next Steps */}
              {Array.isArray(result.next_steps) && result.next_steps.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                  <h2 className="mb-3 text-base font-bold text-foreground">🧭 الإجراءات الموصى بها</h2>
                  <ul className="space-y-2">
                    {result.next_steps.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div className="rounded-xl border border-border bg-muted/30 px-5 py-3 text-center text-xs text-muted-foreground">
                ⚠️ {result.disclaimer}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button onClick={exportPDF} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  تحميل PDF
                </Button>
                <Button onClick={handleShare} variant="outline" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  مشاركة
                </Button>
                <Button onClick={reset} className="gap-2 gradient-primary text-white">
                  <RotateCcw className="h-4 w-4" />
                  حساب جديد
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}