import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { client } from '@/lib/sdk';
import { toast } from 'sonner';
import { Send, Sparkles, Scale, BookOpen, Lightbulb, Compass, AlertCircle, Loader2, LogIn, RefreshCw, Plus, Database, Zap, ExternalLink, Mic, MicOff, Info, X, Volume2, Globe, MessageSquare, Bot, User, ChevronDown } from 'lucide-react';
import { useVoiceInput, ARABIC_DIALECTS } from '@/hooks/useVoiceInput';

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const isDns = err?.message?.includes?.('dns') || err?.message?.includes?.('balancer') || err?.message?.includes?.('timeout');
      if (!isDns || i === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

type StructuredReply = {
  type: 'answer' | 'clarification' | 'out_of_scope' | 'not_found';
  case_type?: string;
  ruling?: string;
  article?: string;
  amicable_solution?: string;
  explanation?: string;
  action?: string;
  notes?: string;
  follow_up_questions?: string[];
  disclaimer?: string;
  question?: string;
  message?: string;
};

type Message = {
  role: 'user' | 'assistant';
  content: string | StructuredReply;
};

const SUGGESTIONS_POOL = [
  { text: 'هل يحق لصاحب العمل فصلي بدون سبب؟', icon: '⚖️' },
  { text: 'كم مكافأة نهاية الخدمة؟', icon: '💰' },
  { text: 'هل يحق خصم راتبي بدون إذن؟', icon: '📋' },
  { text: 'ما حقوقي عند انتهاء العقد؟', icon: '📄' },
  { text: 'كم مدة الإجازة السنوية؟', icon: '🏖️' },
  { text: 'ما إجراءات تقديم شكوى عمالية؟', icon: '📝' },
  { text: 'ما هي حقوق المرأة العاملة في نظام العمل؟', icon: '👩‍💼' },
  { text: 'هل يحق لي رفض العمل الإضافي؟', icon: '⏰' },
  { text: 'ما هي مدة فترة التجربة وحقوقي خلالها؟', icon: '📋' },
  { text: 'كيف أحسب بدل الإجازة غير المستخدمة؟', icon: '🧮' },
  { text: 'ما هي شروط نقل الكفالة؟', icon: '🔄' },
  { text: 'هل يحق لصاحب العمل تغيير مهامي الوظيفية؟', icon: '🔧' },
  { text: 'ما هي حقوقي في حالة إصابة العمل؟', icon: '🏥' },
  { text: 'كم مدة إجازة الأمومة المستحقة؟', icon: '👶' },
  { text: 'هل يجوز إنهاء العقد خلال فترة التجربة؟', icon: '📑' },
  { text: 'ما هي ساعات العمل القانونية في رمضان؟', icon: '🌙' },
  { text: 'هل يحق لي الحصول على شهادة خبرة؟', icon: '📜' },
  { text: 'ما هي حقوقي عند تأخر صرف الراتب؟', icon: '💳' },
  { text: 'كيف أقدم بلاغ هروب أو تغيب؟', icon: '🚨' },
  { text: 'ما الفرق بين الاستقالة والفصل التعسفي؟', icon: '⚡' },
];

function isFallbackReply(reply: StructuredReply): boolean {
  const notes = reply.notes || '';
  return notes.includes('البحث المحلي') || notes.includes('نفاد رصيد') || notes.includes('قاعدة المعرفة');
}

function AnswerCard({ reply, onFollowUp }: { reply: StructuredReply; onFollowUp?: (q: string) => void }) {
  const isFallback = isFallbackReply(reply);

  if (reply.type === 'clarification') {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-[slideUp_0.3s_ease-out]">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
            <Compass className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-medium">سؤال توضيحي</span>
        </div>
        <p className="text-foreground leading-relaxed text-sm">{reply.question}</p>
      </div>
    );
  }

  if (reply.type === 'out_of_scope') {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-[slideUp_0.3s_ease-out]">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
            <AlertCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
          </div>
          <span className="font-medium">خارج النطاق</span>
        </div>
        <p className="text-foreground leading-relaxed text-sm">{reply.message}</p>
      </div>
    );
  }

  if (reply.type === 'not_found') {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 p-5 shadow-sm animate-[slideUp_0.3s_ease-out]">
        <div className="mb-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10">
            <AlertCircle className="h-3 w-3" />
          </div>
          <span className="font-medium">غير متوفر في المرجع</span>
        </div>
        <p className="text-foreground leading-relaxed text-sm">{reply.message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm animate-[slideUp_0.3s_ease-out]">
      {isFallback && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/5 border-b border-amber-200 dark:border-amber-500/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          <Database className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">وضع البحث المحلي</span>
          <span className="opacity-75">— الإجابة من قاعدة المعرفة المحلية</span>
        </div>
      )}
      <div className="divide-y divide-border">
        {/* Case Type */}
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <span className="text-sm">📌</span>
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">نوع الحالة</div>
            <div className="text-sm font-semibold text-foreground">{reply.case_type}</div>
          </div>
        </div>

        {/* Amicable Solution */}
        {reply.amicable_solution && (
          <div className="flex items-start gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-500/5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <span className="text-sm">🤝</span>
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mb-1">الحل الودي المقترح (الخطوة الأولى)</div>
              <div className="text-sm text-foreground leading-relaxed">{reply.amicable_solution}</div>
            </div>
          </div>
        )}

        {/* Ruling */}
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <span className="text-sm">⚖️</span>
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">الحكم القانوني</div>
            <div className="text-sm font-medium text-foreground">{reply.ruling}</div>
          </div>
        </div>

        {/* Article */}
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <span className="text-sm">📖</span>
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">المادة القانونية</div>
            <div className="text-sm text-foreground">{reply.article}</div>
          </div>
        </div>

        {/* Explanation */}
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <span className="text-sm">💡</span>
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">التفسير</div>
            <div className="text-sm text-foreground leading-relaxed">{reply.explanation}</div>
          </div>
        </div>

        {/* Action */}
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <span className="text-sm">🧭</span>
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">الإجراء المناسب</div>
            <div className="text-sm text-foreground leading-relaxed">{reply.action}</div>
          </div>
        </div>

        {/* Notes */}
        {reply.notes && (
          <div className="flex items-start gap-3 p-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <span className="text-sm">📝</span>
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-medium text-muted-foreground mb-1">ملاحظات</div>
              <div className="text-sm text-foreground leading-relaxed">{reply.notes}</div>
            </div>
          </div>
        )}
      </div>

      {/* Follow-up Questions */}
      {reply.follow_up_questions && reply.follow_up_questions.length > 0 && (
        <div className="border-t border-border px-4 py-3 bg-secondary/30">
          <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            أسئلة متابعة مقترحة
          </div>
          <div className="flex flex-wrap gap-2">
            {reply.follow_up_questions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => onFollowUp?.(q)}
                className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground bg-secondary/20">
        {reply.disclaimer || 'هذه الأداة للمساعدة وليست استشارة قانونية رسمية'}
      </div>
    </div>
  );
}

function generateSessionId() {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

const THINKING_STAGES = [
  { text: 'جاري تحليل سؤالك...', icon: '🔍', delay: 0 },
  { text: 'البحث في نظام العمل السعودي...', icon: '📖', delay: 2000 },
  { text: 'مطابقة المواد القانونية...', icon: '⚖️', delay: 5000 },
  { text: 'إعداد الإجابة القانونية...', icon: '✍️', delay: 8000 },
];

function ThinkingIndicator() {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < THINKING_STAGES.length; i++) {
      timers.push(setTimeout(() => setStageIdx(i), THINKING_STAGES[i].delay));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const stage = THINKING_STAGES[stageIdx];

  return (
    <div className="flex items-start gap-3 animate-[slideUp_0.3s_ease-out]">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl gradient-primary text-white shadow-sm">
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-2xl border border-border bg-card px-4 py-3 min-w-[240px] shadow-sm">
        <div className="flex items-center gap-2.5 text-sm text-foreground">
          <span className="text-base">{stage.icon}</span>
          <span className="font-medium">{stage.text}</span>
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          {/* Animated dots */}
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" />
          </div>
          {/* Progress bar */}
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-[2000ms] ease-linear"
              style={{ width: `${Math.min(((stageIdx + 1) / THINKING_STAGES.length) * 90, 90)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number; plan: string } | null>(null);
  const [sessionId, setSessionId] = useState(generateSessionId);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [showVoiceOnboarding, setShowVoiceOnboarding] = useState(false);
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const [showDialectPicker, setShowDialectPicker] = useState(false);

  // Randomly select 6 suggestions on mount
  const randomSuggestions = useMemo(() => {
    const shuffled = [...SUGGESTIONS_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const micTooltipRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(text?: string) => void>();

  // Professional voice input with continuous listening & auto silence detection
  const voice = useVoiceInput({
    onFinalTranscript: (text) => {
      setInput(text);
      sendRef.current?.(text);
    },
    onInterimTranscript: (text) => {
      setInput(text);
    },
    dialect: 'ar-SA',
    silenceTimeoutMs: 2500,
    autoSubmit: true,
  });

  const startNewChat = useCallback(() => {
    setMessages([]);
    setSessionId(generateSessionId());
    setFallbackMode(false);
  }, []);

  const checkAuth = async () => {
    setAuthChecked(false);
    setAuthError(false);
    try {
      const res = await withRetry(() => client.auth.me());
      setUser(res?.data || null);
      if (res?.data) {
        try {
          const q = await withRetry(() =>
            client.apiCall.invoke({
              url: '/api/v1/salmo/quota',
              method: 'GET',
              data: {},
            })
          );
          setQuota({
            used: (q as any).questions_used,
            limit: (q as any).questions_limit,
            plan: (q as any).plan,
          });
        } catch {
          // ignore quota error
        }
      }
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Show voice onboarding on first visit
  useEffect(() => {
    const seen = localStorage.getItem('salmo_chat_voice_onboarding_seen');
    if (!seen) {
      const timer = setTimeout(() => setShowVoiceOnboarding(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Close mic tooltip on outside click
  useEffect(() => {
    if (!showMicTooltip) return;
    const handleClick = (e: MouseEvent) => {
      if (micTooltipRef.current && !micTooltipRef.current.contains(e.target as Node)) {
        setShowMicTooltip(false);
        setShowDialectPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMicTooltip]);

  const dismissOnboarding = () => {
    setShowVoiceOnboarding(false);
    localStorage.setItem('salmo_chat_voice_onboarding_seen', '1');
  };

  const DIALECT_LABELS: Record<string, string> = {
    'ar-SA': '🇸🇦 السعودية',
    'ar-AE': '🇦🇪 الإمارات',
    'ar-EG': '🇪🇬 مصر',
    'ar-KW': '🇰🇼 الكويت',
    'ar-QA': '🇶🇦 قطر',
    'ar-BH': '🇧🇭 البحرين',
    'ar-OM': '🇴🇲 عُمان',
    'ar-JO': '🇯🇴 الأردن',
    'ar-LB': '🇱🇧 لبنان',
    'ar-IQ': '🇮🇶 العراق',
    'ar-MA': '🇲🇦 المغرب',
    'ar-DZ': '🇩🇿 الجزائر',
    'ar-TN': '🇹🇳 تونس',
    'ar-LY': '🇱🇾 ليبيا',
    'ar-SD': '🇸🇩 السودان',
    'ar-YE': '🇾🇪 اليمن',
  };

  const send = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    setMessages((m) => [...m, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const res = await withRetry(() =>
        client.apiCall.invoke({
          url: '/api/v1/salmo/ask',
          method: 'POST',
          data: { question, session_id: sessionId },
        })
      );
      const data = res as any;
      const reply = data.reply as StructuredReply;
      if (isFallbackReply(reply)) {
        setFallbackMode(true);
      } else {
        setFallbackMode(false);
      }
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      setQuota({
        used: data.questions_used,
        limit: data.questions_limit,
        plan: data.plan,
      });
    } catch (err: any) {
      const errMsg = err?.data?.detail || err?.response?.data?.detail || err?.message || '';
      const isDns =
        err?.message?.includes?.('dns') ||
        err?.message?.includes?.('balancer') ||
        err?.message?.includes?.('timeout');
      const detail = isDns
        ? 'تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى'
        : errMsg || 'حدث خطأ غير متوقع';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  // Keep sendRef in sync so the speech recognition callback always has the latest send
  sendRef.current = send;

  // Loading state
  if (!authChecked) {
    return (
      <div dir="rtl" className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Auth error state
  if (authError && !user) {
    return (
      <div dir="rtl" className="min-h-screen bg-background font-[Cairo,Inter,sans-serif]">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">تعذر الاتصال بالخادم</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            حدث خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.
          </p>
          <Button
            onClick={checkAuth}
            className="mt-6 gradient-primary text-white border-0 hover:opacity-90 rounded-xl h-11 px-6"
          >
            <RefreshCw className="ml-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div dir="rtl" className="min-h-screen bg-background font-[Cairo,Inter,sans-serif]">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-white shadow-md">
            <Scale className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">سجّل الدخول لاستخدام المساعد</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            للحصول على إجابات قانونية مخصصة ولحفظ محادثاتك، سجّل الدخول مجاناً.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="flex items-center gap-1.5 rounded-xl bg-teal-50 dark:bg-teal-500/10 px-3 py-1.5 text-xs text-teal-700 dark:text-teal-400 font-medium">
              <Sparkles className="h-3 w-3" />
              ذكاء اصطناعي
            </span>
            <span className="flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-400 font-medium">
              <Mic className="h-3 w-3" />
              إدخال صوتي
            </span>
            <span className="flex items-center gap-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-700 dark:text-cyan-400 font-medium">
              <BookOpen className="h-3 w-3" />
              مراجع قانونية
            </span>
          </div>
          <Button
            onClick={() => client.auth.toLogin()}
            className="mt-6 gradient-primary text-white border-0 hover:opacity-90 rounded-xl h-11 px-6"
          >
            <LogIn className="ml-2 h-4 w-4" />
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex h-screen flex-col bg-background font-[Cairo,Inter,sans-serif]">
      <Navbar />

      {/* Fallback mode banner */}
      {fallbackMode && (
        <div className="border-b border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-2.5">
            <div className="flex items-center gap-2 rounded-lg bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <Database className="h-3.5 w-3.5" />
              وضع البحث المحلي
            </div>
            <p className="flex-1 text-xs text-amber-700 dark:text-amber-400">
              الذكاء الاصطناعي غير متاح حالياً — الإجابات من قاعدة المعرفة المحلية فقط.
            </p>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg gradient-primary px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              <Zap className="h-3 w-3" />
              شحن الرصيد
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      )}

      {/* Quota strip */}
      {quota && (
        <div className="border-b border-border bg-secondary/30">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              {fallbackMode ? (
                <>
                  <Database className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-amber-700 dark:text-amber-400 font-medium">وضع البحث المحلي</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium">وضع الذكاء الاصطناعي</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">
                وصول غير محدود — اسأل بلا حدود
              </div>
              {messages.length > 0 && (
                <button
                  onClick={startNewChat}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:bg-primary/5"
                >
                  <Plus className="h-3 w-3" />
                  محادثة جديدة
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 text-center">
              {/* Logo / Branding */}
              <div className="relative mb-6 animate-fade-in">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl gradient-primary text-white shadow-lg">
                  <Scale className="h-9 w-9" />
                </div>
                <div className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold border-2 border-background shadow-md">
                  AI
                </div>
              </div>

              <h1 className="text-3xl font-bold text-foreground md:text-4xl animate-fade-in animate-delay-100">
                مرحبًا بك في <span className="gradient-text">SALMO AI</span> 👋
              </h1>
              <p className="mt-3 max-w-lg text-sm text-muted-foreground leading-relaxed animate-fade-in animate-delay-200">
                مساعدك الذكي المتخصص في الموارد البشرية ونظام العمل السعودي.
              </p>

              {/* Capabilities List */}
              <div className="mt-5 max-w-lg text-right animate-fade-in animate-delay-300">
                <p className="text-sm text-muted-foreground mb-2 font-medium">يمكنني مساعدتك في:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span>• الحقوق والمستحقات العمالية</span>
                  <span>• العقود الوظيفية</span>
                  <span>• الإجازات والرواتب</span>
                  <span>• إنهاء الخدمة والاستقالات</span>
                  <span>• المخالفات والإجراءات التأديبية</span>
                  <span>• السياسات الداخلية</span>
                  <span>• الامتثال والموارد البشرية</span>
                  <span>• تفسير مواد نظام العمل السعودي</span>
                </div>
              </div>

              <p className="mt-4 max-w-md text-xs text-muted-foreground/80 leading-relaxed animate-fade-in animate-delay-400">
                اكتب سؤالك بطريقتك الخاصة وسأقدم لك إجابة واضحة مدعومة بالمراجع ذات العلاقة.
                <br />
                يمكنك سؤالي عن أي موضوع متعلق بالموارد البشرية أو نظام العمل السعودي.
              </p>

              {/* Suggestion Chips */}
              <div className="mt-10 w-full max-w-2xl animate-fade-in animate-delay-500">
                <div className="mb-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  <span>أمثلة على الأسئلة التي يمكنني مساعدتك بها</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {randomSuggestions.map((q) => (
                    <button
                      key={q.text}
                      onClick={() => send(q.text)}
                      disabled={loading}
                      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-right text-sm text-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
                    >
                      <span className="text-lg shrink-0">{q.icon}</span>
                      <span className="leading-relaxed">{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feature badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2 animate-fade-in animate-delay-600">
                <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  تحليل ذكي
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[11px] text-muted-foreground">
                  <Mic className="h-3 w-3 text-primary" />
                  إدخال صوتي
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[11px] text-muted-foreground">
                  <BookOpen className="h-3 w-3 text-primary" />
                  مراجع موثقة
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="flex flex-col gap-6">
              {messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-2 animate-[slideUp_0.3s_ease-out]">
                  {m.role === 'user' ? (
                    /* User Message */
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="max-w-[85%]">
                        <div className="rounded-2xl rounded-tr-md gradient-primary px-4 py-3 text-sm text-white shadow-sm">
                          {m.content as string}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* AI Message */
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl gradient-primary text-white shadow-sm">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <AnswerCard reply={m.content as StructuredReply} onFollowUp={(q) => send(q)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && <ThinkingIndicator />}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4 md:px-6">
          <div className="glass-input flex items-end gap-2 rounded-2xl p-2 shadow-sm">
            <Textarea
              value={voice.isListening ? (voice.interimText ? voice.finalText + voice.interimText : input) : input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                voice.voiceState === 'listening' ? '🎤 جاري الاستماع... تحدث الآن'
                : voice.voiceState === 'speech_detected' ? '🎤 يتحدث الآن... سيتم الإرسال عند التوقف'
                : voice.voiceState === 'silence_detected' ? '⏳ تم اكتشاف صمت... جاري الإرسال'
                : 'اكتب أي سؤال متعلق بالموارد البشرية أو نظام العمل السعودي...'
              }
              className="min-h-[48px] max-h-40 flex-1 resize-none border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              disabled={loading}
            />

            {/* Voice input button */}
            <div className="relative" ref={micTooltipRef}>
              <button
                onClick={voice.isSupported ? voice.toggleListening : () => setShowMicTooltip(!showMicTooltip)}
                disabled={loading}
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                  voice.isListening
                    ? voice.voiceState === 'silence_detected'
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-rose-500 text-white shadow-md animate-pulse'
                    : 'bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary'
                } disabled:opacity-50`}
                title={voice.isSupported ? (voice.isListening ? 'إيقاف التسجيل' : 'إدخال صوتي') : 'الإدخال الصوتي — اضغط للمزيد'}
              >
                {voice.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {/* Silence countdown ring */}
                {voice.isListening && voice.silenceCountdown > 0 && (
                  <svg className="absolute inset-0 h-10 w-10 -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                    <circle
                      cx="20" cy="20" r="18" fill="none" stroke="white" strokeWidth="2"
                      strokeDasharray={`${(voice.silenceCountdown / 100) * 113.1} 113.1`}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>

              {/* Dialect selector badge */}
              {voice.isListening && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDialectPicker(!showDialectPicker); }}
                  className="absolute -top-1.5 -left-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full gradient-primary border-2 border-background px-1 text-[8px] font-bold text-white hover:opacity-90 transition-opacity"
                  title="تغيير اللهجة"
                >
                  {voice.currentDialect.split('-')[1]}
                </button>
              )}
              {!voice.isListening && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMicTooltip(!showMicTooltip); }}
                  className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  <Info className="h-2.5 w-2.5" />
                </button>
              )}

              {/* Tooltip / Dialect picker */}
              {showMicTooltip && !voice.isListening && (
                <div className="absolute bottom-full mb-2 right-0 z-50 w-64 rounded-xl border border-border bg-card p-3 shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg gradient-primary text-white">
                      <Mic className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-bold text-foreground">الإدخال الصوتي</span>
                    <button onClick={() => setShowMicTooltip(false)} className="mr-auto text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {!voice.isSupported ? (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-2.5 text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                      💡 الإدخال الصوتي يتطلب متصفح Chrome أو Edge.
                    </div>
                  ) : (
                    <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                      <li className="flex items-start gap-1.5">
                        <span className="mt-0.5 text-primary">●</span>
                        اضغط زر الميكروفون وابدأ التحدث بالعربية
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="mt-0.5 text-primary">●</span>
                        استمر بالتحدث — لن يتوقف التسجيل أثناء كلامك
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="mt-0.5 text-primary">●</span>
                        سيتم الإرسال تلقائياً بعد 2.5 ثانية من الصمت
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="mt-0.5 text-emerald-500">●</span>
                        يدعم جميع اللهجات العربية 🌍
                      </li>
                    </ul>
                  )}
                </div>
              )}

              {/* Dialect picker popup */}
              {showDialectPicker && voice.isListening && (
                <div className="absolute bottom-full mb-2 right-0 z-50 w-56 max-h-48 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg">
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <Globe className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-bold text-foreground">اختر اللهجة</span>
                    <button onClick={() => setShowDialectPicker(false)} className="mr-auto text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {ARABIC_DIALECTS.map((d) => (
                      <button
                        key={d}
                        onClick={() => { voice.setDialect(d); setShowDialectPicker(false); }}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] text-right transition-all ${
                          voice.currentDialect === d ? 'gradient-primary text-white' : 'text-foreground hover:bg-secondary'
                        }`}
                      >
                        <span>{DIALECT_LABELS[d] || d}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Send button */}
            <Button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl gradient-primary text-white border-0 hover:opacity-90 shadow-sm hover:shadow-md transition-all disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4 rotate-180" />
              )}
            </Button>
          </div>
          <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
            هذه الأداة للمساعدة وليست استشارة قانونية رسمية
            <span className="mx-1.5 text-border">•</span>
            <span className="text-muted-foreground/70">استخدم 🎤 الإدخال الصوتي للتحدث مباشرة</span>
          </p>
        </div>
      </div>

      {/* Voice Input Onboarding Popup */}
      {showVoiceOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={dismissOnboarding}>
          <div
            className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-[scaleIn_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary text-white shadow-md">
                  <Mic className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">الإدخال الصوتي</h2>
                  <p className="text-[11px] text-muted-foreground">تحدث بالعربية لطرح سؤالك القانوني</p>
                </div>
              </div>
              <button onClick={dismissOnboarding} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 space-y-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                كيف يعمل؟
              </h3>
              <div className="space-y-2.5">
                {[
                  { step: '١', text: 'اضغط على زر الميكروفون 🎤 بجانب حقل الإدخال' },
                  { step: '٢', text: 'تحدث بالعربية بوضوح — سترى الكلمات تظهر فوراً' },
                  { step: '٣', text: 'استمر بالتحدث — لن يتوقف التسجيل أثناء كلامك' },
                  { step: '٤', text: 'عند التوقف عن الكلام، سيتم الإرسال تلقائياً بعد ثانيتين' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3 rounded-xl bg-secondary border border-border p-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg gradient-primary text-[10px] font-bold text-white">
                      {item.step}
                    </div>
                    <p className="text-xs text-foreground leading-relaxed pt-0.5">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-5 space-y-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-primary" />
                نصائح لدقة أفضل
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: '🤫', tip: 'تحدث في بيئة هادئة' },
                  { icon: '🗣️', tip: 'انطق الكلمات بوضوح' },
                  { icon: '🌍', tip: 'يدعم جميع اللهجات العربية' },
                  { icon: '⏸️', tip: 'توقفات التفكير مقبولة' },
                  { icon: '📏', tip: 'استخدم عبارات كاملة' },
                  { icon: '🔄', tip: 'غيّر اللهجة أثناء التسجيل' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-secondary border border-border px-3 py-2">
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-[11px] text-foreground leading-tight">{item.tip}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {voice.isSupported ? (
                <Button
                  onClick={() => { dismissOnboarding(); voice.startListening(); }}
                  className="flex-1 gradient-primary text-white border-0 hover:opacity-90 rounded-xl h-10"
                >
                  <Mic className="ml-2 h-4 w-4" />
                  جرّب الآن
                </Button>
              ) : (
                <div className="flex-1 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400 text-center leading-relaxed">
                  💡 استخدم متصفح Chrome أو Edge لتفعيل الإدخال الصوتي
                </div>
              )}
              <Button
                onClick={dismissOnboarding}
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-secondary rounded-xl h-10"
              >
                لاحقاً
              </Button>
            </div>

            <label className="mt-3 flex items-center justify-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                onChange={(e) => {
                  if (!e.target.checked) {
                    localStorage.removeItem('salmo_chat_voice_onboarding_seen');
                  }
                }}
                className="h-3.5 w-3.5 rounded border-border accent-primary"
              />
              <span className="text-[11px] text-muted-foreground">عدم إظهار هذه النافذة مرة أخرى</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}