import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { client } from '@/lib/sdk';
import { toast } from 'sonner';
import {
  Search,
  Loader2,
  LogIn,
  RefreshCw,
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Shield,
  X,
  FileText,
  Mic,
  MicOff,
  Info,
  Sparkles,
  Volume2,
  Hash,
  Brain,
  List,
  Database,
  Link2,
  Globe,
  Filter,
  Building2,
} from 'lucide-react';
import { useVoiceInput, ARABIC_DIALECTS } from '@/hooks/useVoiceInput';

/* ─── Retry helper ─── */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const msg = (err as any)?.message ?? '';
      const isDns = msg.includes('dns') || msg.includes('balancer') || msg.includes('timeout');
      if (!isDns || i === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

/* ─── Types ─── */
type SimilarArticle = {
  system_name: string;
  article_number: string;
  snippet: string;
  chapter?: string;
  section?: string;
};

type SearchResult = {
  system_name: string;
  article_number: string;
  article_text: string;
  source: string;
  similar_articles: SimilarArticle[];
  snippet?: string;
  highlighted_snippet?: string;
  score: number;
  match_count: number;
  chapter?: string;
  section?: string;
  cancelled?: boolean;
  topic?: string;
};

type SearchResponse = {
  query: string;
  search_mode: string;
  article_number: string;
  system_name: string;
  topic_keyword: string;
  detected_category?: string;
  detected_subtopic?: string;
  total_matches: number;
  results: SearchResult[];
  not_found_message?: string;
};

type TopicSubTopic = {
  name: string;
  article_count: number;
};

type TopicCategory = {
  name: string;
  article_count: number;
  sub_topics: TopicSubTopic[];
};

type TopicsResponse = {
  total_categories: number;
  total_articles: number;
  categories: TopicCategory[];
};

/* ─── Constants ─── */
const POLICY_SYSTEM_KEYWORD = 'لائحة تنظيم العمل الداخلية';

const SEARCH_MODES: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  article_number: { label: 'بحث برقم المادة', icon: Hash, description: 'عرض المواد المطابقة من اللائحة الداخلية' },
  semantic: { label: 'بحث نصي', icon: Brain, description: 'أفضل النتائج حسب نسبة التطابق' },
  topic: { label: 'بحث موضوعي', icon: List, description: 'جميع المواد المتعلقة بموضوع محدد' },
};

const QUICK_SEARCHES = [
  'لائحة تنظيم العمل',
  'المخالفات والجزاءات',
  'المزايا والبدلات',
  'واجبات العمال',
  'واجبات المنشأة',
  'التظلم',
  'تقارير الأداء',
  'الرعاية الطبية',
];

const POLICY_TOPIC_NAMES = ['السياسات الداخلية', 'المزايا والتعويضات', 'إدارة الأداء'];

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

/* ─── Helper: filter results to company policies only ─── */
function filterPolicyResults(results: SearchResult[]): SearchResult[] {
  return results.filter((r) => r.system_name.includes(POLICY_SYSTEM_KEYWORD));
}

/* ─── Component ─── */
export default function CompanyPolicies() {
  /* Auth state */
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(false);

  /* Search state */
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [searchMode, setSearchMode] = useState('');
  const [notFoundMessage, setNotFoundMessage] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [detectedCategory, setDetectedCategory] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  /* Filter state */
  const [activeChapterFilter, setActiveChapterFilter] = useState<string | null>(null);
  const [activeTopicFilter, setActiveTopicFilter] = useState<string | null>(null);

  /* Voice & UI state */
  const [showVoiceOnboarding, setShowVoiceOnboarding] = useState(false);
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const [showDialectPicker, setShowDialectPicker] = useState(false);

  /* Topics state */
  const [topics, setTopics] = useState<TopicCategory[]>([]);
  const [showTopicBrowser, setShowTopicBrowser] = useState(false);
  const [expandedCategoryName, setExpandedCategoryName] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const micTooltipRef = useRef<HTMLDivElement>(null);

  /* ─── Voice input ─── */
  const voice = useVoiceInput({
    onFinalTranscript: (text) => {
      setQuery(text);
      doSearch(text);
    },
    onInterimTranscript: (text) => {
      setQuery(text);
    },
    dialect: 'ar-SA',
    silenceTimeoutMs: 2500,
    autoSubmit: true,
  });

  /* ─── Filtered results (policy only + active filters) ─── */
  const policyResults = useMemo(() => {
    let filtered = filterPolicyResults(allResults);
    if (activeChapterFilter) {
      filtered = filtered.filter((r) => r.chapter === activeChapterFilter);
    }
    if (activeTopicFilter) {
      filtered = filtered.filter((r) => r.topic === activeTopicFilter);
    }
    return filtered;
  }, [allResults, activeChapterFilter, activeTopicFilter]);

  /* ─── Dynamic filter options extracted from policy results ─── */
  const availableChapters = useMemo(() => {
    const base = filterPolicyResults(allResults);
    const chapters = new Set<string>();
    base.forEach((r) => { if (r.chapter) chapters.add(r.chapter); });
    return Array.from(chapters);
  }, [allResults]);

  const availableTopics = useMemo(() => {
    const base = filterPolicyResults(allResults);
    const topicSet = new Set<string>();
    base.forEach((r) => { if (r.topic) topicSet.add(r.topic); });
    return Array.from(topicSet);
  }, [allResults]);

  /* ─── Voice onboarding ─── */
  useEffect(() => {
    const seen = localStorage.getItem('salmo_policy_voice_onboarding_seen');
    if (!seen) {
      const timer = setTimeout(() => setShowVoiceOnboarding(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  /* Close mic tooltip on outside click */
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
    localStorage.setItem('salmo_policy_voice_onboarding_seen', '1');
  };

  /* ─── Auth ─── */
  const checkAuth = async () => {
    setAuthChecked(false);
    setAuthError(false);
    try {
      const res = await withRetry(() => client.auth.me());
      setUser(res?.data || null);
    } catch {
      setUser(null);
      setAuthError(true);
    } finally {
      setAuthChecked(true);
    }
  };

  /* ─── Fetch topics ─── */
  const fetchTopics = useCallback(async () => {
    try {
      const res = await withRetry(() =>
        client.apiCall.invoke({ url: '/api/v1/salmo/topics', method: 'GET' })
      );
      const data = res.data as TopicsResponse;
      const policyTopics = (data.categories || []).filter((c) =>
        POLICY_TOPIC_NAMES.includes(c.name)
      );
      setTopics(policyTopics);
    } catch {
      /* silently fail — topics are optional */
    }
  }, []);

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (user && topics.length === 0) fetchTopics();
  }, [user, fetchTopics, topics.length]);

  /* ─── Search ─── */
  const doSearch = useCallback(
    async (searchQuery?: string) => {
      const q = (searchQuery ?? query).trim();
      if (!q || loading) return;

      setQuery(q);
      setLoading(true);
      setExpandedIdx(null);
      setNotFoundMessage('');
      setActiveChapterFilter(null);
      setActiveTopicFilter(null);
      setHasSearched(true);

      try {
        const res = await withRetry(() =>
          client.apiCall.invoke({
            url: '/api/v1/salmo/search-kb',
            method: 'POST',
            data: { query: q, max_results: 50 },
          })
        );
        const data = res.data as SearchResponse;
        const rawResults = data.results || [];
        setAllResults(rawResults);

        const policyOnly = filterPolicyResults(rawResults);
        setTotalMatches(policyOnly.length);
        setSearchMode(data.search_mode || 'semantic');
        setDetectedCategory(data.detected_category || '');

        if (policyOnly.length === 0) {
          setNotFoundMessage(
            `لم يتم العثور على نتائج من اللائحة الداخلية لـ «${q}». جرب كلمات مختلفة.`
          );
        }

        setSearchHistory((prev) => {
          const updated = [q, ...prev.filter((h) => h !== q)].slice(0, 8);
          return updated;
        });
      } catch (err: unknown) {
        const errMsg =
          (err as any)?.data?.detail ||
          (err as any)?.response?.data?.detail ||
          (err as any)?.message ||
          '';
        toast.error(errMsg || 'حدث خطأ أثناء البحث');
      } finally {
        setLoading(false);
      }
    },
    [query, loading]
  );

  const getModeInfo = (mode: string) => {
    return SEARCH_MODES[mode] || SEARCH_MODES.semantic;
  };

  /* ─── Auth screens ─── */
  if (!authChecked) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0F0F0F]">
        <Loader2 className="h-6 w-6 animate-spin text-[#666] dark:text-[#999]" />
      </div>
    );
  }

  if (authError && !user) {
    return (
      <div dir="rtl" className="min-h-screen bg-white font-[Tajawal,Cairo,sans-serif] dark:bg-[#0F0F0F]">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F0F0F] dark:text-[#EDEDED]">تعذر الاتصال بالخادم</h1>
          <p className="mt-3 text-sm text-[#666] dark:text-[#999]">
            حدث خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.
          </p>
          <Button onClick={checkAuth} className="mt-6 bg-[#0F0F0F] text-white hover:bg-[#1A1A1A] dark:bg-white dark:text-[#0F0F0F] dark:hover:bg-[#EDEDED]">
            <RefreshCw className="ml-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div dir="rtl" className="min-h-screen bg-white font-[Tajawal,Cairo,sans-serif] dark:bg-[#0F0F0F]">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F0F0F] text-white dark:bg-white dark:text-[#0F0F0F]">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F0F0F] dark:text-[#EDEDED]">سجّل الدخول للبحث في السياسات الداخلية</h1>
          <p className="mt-3 text-sm text-[#666] dark:text-[#999]">
            للبحث في لائحة تنظيم العمل الداخلية، سجّل الدخول مجاناً.
          </p>
          <Button onClick={() => client.auth.toLogin()} className="mt-6 bg-[#0F0F0F] text-white hover:bg-[#1A1A1A] dark:bg-white dark:text-[#0F0F0F] dark:hover:bg-[#EDEDED]">
            <LogIn className="ml-2 h-4 w-4" />
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  /* ─── Main page ─── */
  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-[#FAFAFA] font-[Tajawal,Cairo,sans-serif] dark:bg-[#0A0A0A]">
      <Navbar />

      {/* ════════════ Hero search section ════════════ */}
      <div className="border-b border-[#EDEDED] bg-white dark:border-[#222] dark:bg-[#0F0F0F]">
        <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
          {/* Title */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F0F0F] text-white dark:bg-white dark:text-[#0F0F0F]">
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F0F0F] md:text-3xl dark:text-[#EDEDED]">
              محرك البحث في السياسات الداخلية
            </h1>
          </div>
          <p className="mb-8 text-center text-sm text-[#666] dark:text-[#999]">
            ابحث في لائحة تنظيم العمل الداخلية — المخالفات، المزايا، الواجبات، التظلم والمزيد
            <span className="text-[#999] dark:text-[#666]"> • أو استخدم 🎤 البحث الصوتي</span>
          </p>

          {/* ─── Search input ─── */}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl border border-[#EDEDED] bg-white p-2 shadow-sm transition-colors focus-within:border-[#0F0F0F]/40 dark:border-[#333] dark:bg-[#1A1A1A] dark:focus-within:border-white/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F0F0F] text-white dark:bg-white dark:text-[#0F0F0F]">
                <Search className="h-4 w-4" />
              </div>
              <Input
                ref={inputRef}
                value={voice.isListening ? (voice.interimText ? voice.finalText + voice.interimText : query) : query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
                placeholder={
                  voice.voiceState === 'listening'
                    ? '🎤 جاري الاستماع... تحدث الآن'
                    : voice.voiceState === 'speech_detected'
                      ? '🎤 يتحدث الآن... سيتم البحث عند التوقف'
                      : voice.voiceState === 'silence_detected'
                        ? '⏳ تم اكتشاف صمت... جاري البحث'
                        : 'ابحث... مثال: المخالفات والجزاءات، واجبات العمال، الرعاية الطبية'
                }
                className="h-10 flex-1 border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-[#EDEDED] dark:placeholder:text-[#666]"
                disabled={loading}
              />
              {query && !voice.isListening && (
                <button
                  onClick={() => {
                    setQuery('');
                    setAllResults([]);
                    setTotalMatches(0);
                    setSearchMode('');
                    setNotFoundMessage('');
                    setHasSearched(false);
                    setActiveChapterFilter(null);
                    setActiveTopicFilter(null);
                    inputRef.current?.focus();
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-[#F5F5F5] hover:text-[#0F0F0F] dark:hover:bg-[#333] dark:hover:text-[#EDEDED]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Voice input button with silence countdown ring */}
              <div className="relative" ref={micTooltipRef}>
                <button
                  onClick={voice.isSupported ? voice.toggleListening : () => setShowMicTooltip(!showMicTooltip)}
                  disabled={loading}
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                    voice.isListening
                      ? voice.voiceState === 'silence_detected'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/40'
                        : 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse dark:shadow-red-900/40'
                      : voice.isSupported
                        ? 'bg-[#F5F5F5] text-[#666] hover:bg-[#EDEDED] hover:text-[#0F0F0F] dark:bg-[#333] dark:text-[#999] dark:hover:bg-[#444] dark:hover:text-[#EDEDED]'
                        : 'bg-[#F5F5F5] text-[#CCC] cursor-help dark:bg-[#333] dark:text-[#555]'
                  } disabled:opacity-50`}
                  title={voice.isSupported ? (voice.isListening ? 'إيقاف التسجيل' : 'بحث صوتي') : 'البحث الصوتي غير مدعوم في هذا المتصفح'}
                >
                  {voice.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {voice.isListening && voice.silenceCountdown > 0 && (
                    <svg className="absolute inset-0 h-10 w-10 -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
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
                    className="absolute -left-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-[#0F0F0F] px-1 text-[8px] font-bold text-white transition-colors hover:bg-[#333]"
                    title="تغيير اللهجة"
                  >
                    {voice.currentDialect.split('-')[1]}
                  </button>
                )}
                {!voice.isListening && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMicTooltip(!showMicTooltip); }}
                    className="absolute -left-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#EDEDED] bg-white text-[#999] transition-colors hover:border-[#0F0F0F]/30 hover:text-[#0F0F0F] dark:border-[#444] dark:bg-[#333] dark:text-[#666] dark:hover:text-[#EDEDED]"
                  >
                    <Info className="h-2.5 w-2.5" />
                  </button>
                )}
                {/* Tooltip */}
                {showMicTooltip && !voice.isListening && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[#EDEDED] bg-white p-3 shadow-lg dark:border-[#333] dark:bg-[#1A1A1A]">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0F0F0F] text-white dark:bg-white dark:text-[#0F0F0F]">
                        <Mic className="h-3 w-3" />
                      </div>
                      <span className="text-xs font-bold text-[#0F0F0F] dark:text-[#EDEDED]">البحث الصوتي</span>
                      <button onClick={() => setShowMicTooltip(false)} className="mr-auto text-[#999] hover:text-[#0F0F0F] dark:hover:text-[#EDEDED]">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {!voice.isSupported ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                        💡 البحث الصوتي يتطلب متصفح Chrome أو Edge.
                      </div>
                    ) : (
                      <ul className="space-y-1.5 text-[11px] leading-relaxed text-[#666] dark:text-[#999]">
                        <li className="flex items-start gap-1.5">
                          <span className="mt-0.5 text-amber-500">●</span>
                          اضغط زر الميكروفون وابدأ التحدث بالعربية
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="mt-0.5 text-amber-500">●</span>
                          استمر بالتحدث — لن يتوقف التسجيل أثناء كلامك
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="mt-0.5 text-amber-500">●</span>
                          سيتم البحث تلقائياً بعد 2.5 ثانية من الصمت
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="mt-0.5 text-amber-500">●</span>
                          يدعم جميع اللهجات العربية 🌍
                        </li>
                      </ul>
                    )}
                  </div>
                )}
                {/* Dialect picker popup */}
                {showDialectPicker && voice.isListening && (
                  <div className="absolute right-0 top-full z-50 mt-2 max-h-48 w-56 overflow-y-auto rounded-xl border border-[#EDEDED] bg-white p-2 shadow-lg dark:border-[#333] dark:bg-[#1A1A1A]">
                    <div className="mb-2 flex items-center gap-2 px-2">
                      <Globe className="h-3.5 w-3.5 text-[#0F0F0F] dark:text-[#EDEDED]" />
                      <span className="text-[11px] font-bold text-[#0F0F0F] dark:text-[#EDEDED]">اختر اللهجة</span>
                      <button onClick={() => setShowDialectPicker(false)} className="mr-auto text-[#999] hover:text-[#0F0F0F] dark:hover:text-[#EDEDED]">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {ARABIC_DIALECTS.map((d) => (
                        <button
                          key={d}
                          onClick={() => { voice.setDialect(d); setShowDialectPicker(false); }}
                          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] text-right transition-colors ${
                            voice.currentDialect === d
                              ? 'bg-[#0F0F0F] text-white dark:bg-white dark:text-[#0F0F0F]'
                              : 'text-[#0F0F0F] hover:bg-[#F5F5F5] dark:text-[#EDEDED] dark:hover:bg-[#333]'
                          }`}
                        >
                          <span>{DIALECT_LABELS[d] || d}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={() => doSearch()}
                disabled={loading || !query.trim()}
                className="h-10 shrink-0 rounded-xl bg-[#0F0F0F] px-5 text-white hover:bg-[#1A1A1A] dark:bg-white dark:text-[#0F0F0F] dark:hover:bg-[#EDEDED]"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'بحث'}
              </Button>
            </div>
          </div>

          {/* ─── Quick search tags ─── */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-[#999] dark:text-[#666]">بحث سريع:</span>
            {QUICK_SEARCHES.map((tag) => (
              <button
                key={tag}
                onClick={() => doSearch(tag)}
                disabled={loading}
                className="rounded-lg border border-[#EDEDED] bg-white px-3 py-1.5 text-xs text-[#0F0F0F] transition-all hover:border-[#0F0F0F]/30 hover:shadow-sm disabled:opacity-50 dark:border-[#333] dark:bg-[#1A1A1A] dark:text-[#EDEDED] dark:hover:border-white/30"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* ─── Search mode cards ─── */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {Object.entries(SEARCH_MODES).map(([mode, info]) => {
              const Icon = info.icon;
              return (
                <div key={mode} className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-2.5 text-center dark:border-[#333] dark:bg-[#1A1A1A]">
                  <Icon className="mx-auto mb-1 h-4 w-4 text-[#666] dark:text-[#999]" />
                  <p className="text-[10px] font-medium text-[#0F0F0F] dark:text-[#EDEDED]">{info.label}</p>
                  <p className="mt-0.5 text-[9px] leading-tight text-[#999] dark:text-[#666]">{info.description}</p>
                </div>
              );
            })}
          </div>

          {/* ─── Topic Browser (company policy categories only) ─── */}
          {topics.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowTopicBrowser(!showTopicBrowser)}
                className="flex w-full items-center justify-between rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3 text-right transition-colors hover:bg-[#F0F0F0] dark:border-[#333] dark:bg-[#1A1A1A] dark:hover:bg-[#222]"
              >
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-[#0F0F0F] dark:text-[#EDEDED]" />
                  <span className="text-xs font-bold text-[#0F0F0F] dark:text-[#EDEDED]">تصفح مواضيع السياسات الداخلية</span>
                  <span className="rounded-full bg-[#0F0F0F] px-2 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-[#0F0F0F]">
                    {topics.length} تصنيف
                  </span>
                </div>
                {showTopicBrowser ? (
                  <ChevronUp className="h-4 w-4 text-[#999]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#999]" />
                )}
              </button>

              {showTopicBrowser && (
                <div className="mt-2 overflow-hidden rounded-xl border border-[#EDEDED] bg-white dark:border-[#333] dark:bg-[#1A1A1A]">
                  {topics.map((category) => (
                    <div key={category.name} className="border-b border-[#EDEDED] last:border-b-0 dark:border-[#333]">
                      <button
                        onClick={() => setExpandedCategoryName(expandedCategoryName === category.name ? null : category.name)}
                        className="flex w-full items-center justify-between px-4 py-3 text-right transition-colors hover:bg-[#FAFAFA] dark:hover:bg-[#222]"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0F0F0F] text-white dark:bg-white dark:text-[#0F0F0F]">
                            <span className="text-[10px] font-bold">{category.article_count}</span>
                          </div>
                          <span className="text-xs font-bold text-[#0F0F0F] dark:text-[#EDEDED]">{category.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#999] dark:text-[#666]">{category.sub_topics.length} موضوع فرعي</span>
                          {expandedCategoryName === category.name ? (
                            <ChevronUp className="h-3.5 w-3.5 text-[#999]" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-[#999]" />
                          )}
                        </div>
                      </button>

                      {expandedCategoryName === category.name && (
                        <div className="border-t border-[#EDEDED] bg-[#FAFAFA] px-4 py-2 dark:border-[#333] dark:bg-[#111]">
                          <button
                            onClick={() => { doSearch(category.name); setShowTopicBrowser(false); }}
                            className="mb-2 flex w-full items-center gap-2 rounded-lg bg-[#0F0F0F] px-3 py-2 text-white transition-colors hover:bg-[#1A1A1A] dark:bg-white dark:text-[#0F0F0F] dark:hover:bg-[#EDEDED]"
                          >
                            <Search className="h-3 w-3" />
                            <span className="text-[11px] font-medium">عرض جميع مواد «{category.name}»</span>
                          </button>
                          <div className="flex flex-wrap gap-1.5">
                            {category.sub_topics.map((sub) => (
                              <button
                                key={sub.name}
                                onClick={() => { doSearch(sub.name); setShowTopicBrowser(false); }}
                                className="rounded-lg border border-[#EDEDED] bg-white px-2.5 py-1.5 text-[11px] text-[#0F0F0F] transition-all hover:border-[#0F0F0F]/30 hover:shadow-sm dark:border-[#333] dark:bg-[#1A1A1A] dark:text-[#EDEDED] dark:hover:border-white/30"
                              >
                                {sub.name}
                                <span className="mr-1 text-[9px] text-[#999] dark:text-[#666]">({sub.article_count})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════════════ Results section ════════════ */}
      <div className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
          {/* Search mode indicator */}
          {searchMode && policyResults.length > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#EDEDED] bg-white p-3 dark:border-[#333] dark:bg-[#1A1A1A]">
              {(() => {
                const modeInfo = getModeInfo(searchMode);
                const ModeIcon = modeInfo.icon;
                return (
                  <>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F0F0F] text-white dark:bg-white dark:text-[#0F0F0F]">
                      <ModeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#0F0F0F] dark:text-[#EDEDED]">وضع البحث: {modeInfo.label}</span>
                        <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] text-[#666] dark:bg-[#333] dark:text-[#999]">
                          {policyResults.length} نتيجة
                        </span>
                        {detectedCategory && (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                            📂 {detectedCategory}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#999] dark:text-[#666]">{modeInfo.description}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Results header + history */}
          {policyResults.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-[#666] dark:text-[#999]">
                <Search className="h-3.5 w-3.5" />
                <span>
                  تم العثور على <strong className="text-[#0F0F0F] dark:text-[#EDEDED]">{policyResults.length}</strong> نتيجة لـ «{query}»
                </span>
              </div>
              {searchHistory.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-[#999] dark:text-[#666]">
                  <span>بحث سابق:</span>
                  {searchHistory.slice(1, 4).map((h) => (
                    <button
                      key={h}
                      onClick={() => doSearch(h)}
                      className="rounded border border-[#EDEDED] px-2 py-0.5 text-[#666] transition-colors hover:border-[#0F0F0F]/30 hover:text-[#0F0F0F] dark:border-[#333] dark:text-[#999] dark:hover:border-white/30 dark:hover:text-[#EDEDED]"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Filter chips bar ─── */}
          {policyResults.length > 0 && (availableChapters.length > 0 || availableTopics.length > 0) && (
            <div className="mb-4 rounded-xl border border-[#EDEDED] bg-white p-3 dark:border-[#333] dark:bg-[#1A1A1A]">
              <div className="mb-2 flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-[#666] dark:text-[#999]" />
                <span className="text-[11px] font-bold text-[#0F0F0F] dark:text-[#EDEDED]">تصفية النتائج</span>
                {(activeChapterFilter || activeTopicFilter) && (
                  <button
                    onClick={() => { setActiveChapterFilter(null); setActiveTopicFilter(null); }}
                    className="mr-auto flex items-center gap-1 rounded-lg bg-red-50 px-2 py-0.5 text-[10px] text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <X className="h-2.5 w-2.5" />
                    مسح الفلاتر
                  </button>
                )}
              </div>

              {/* Chapter filters */}
              {availableChapters.length > 0 && (
                <div className="mb-2">
                  <span className="mb-1 block text-[10px] text-[#999] dark:text-[#666]">الباب / الفصل:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableChapters.map((ch) => (
                      <button
                        key={ch}
                        onClick={() => setActiveChapterFilter(activeChapterFilter === ch ? null : ch)}
                        className={`rounded-lg border px-2.5 py-1 text-[10px] transition-all ${
                          activeChapterFilter === ch
                            ? 'border-[#0F0F0F] bg-[#0F0F0F] text-white dark:border-white dark:bg-white dark:text-[#0F0F0F]'
                            : 'border-[#EDEDED] bg-[#FAFAFA] text-[#666] hover:border-[#0F0F0F]/30 dark:border-[#333] dark:bg-[#222] dark:text-[#999] dark:hover:border-white/30'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Topic filters */}
              {availableTopics.length > 0 && (
                <div>
                  <span className="mb-1 block text-[10px] text-[#999] dark:text-[#666]">التصنيف الموضوعي:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTopics.map((t) => (
                      <button
                        key={t}
                        onClick={() => setActiveTopicFilter(activeTopicFilter === t ? null : t)}
                        className={`rounded-lg border px-2.5 py-1 text-[10px] transition-all ${
                          activeTopicFilter === t
                            ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-500'
                            : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:border-blue-600'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0F0F0F] dark:text-[#EDEDED]" />
              <p className="mt-4 text-sm text-[#666] dark:text-[#999]">جاري البحث في السياسات الداخلية...</p>
            </div>
          )}

          {/* Empty state — no search yet */}
          {!loading && !hasSearched && policyResults.length === 0 && !notFoundMessage && (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5F5F5] dark:bg-[#1A1A1A]">
                <BookOpen className="h-7 w-7 text-[#666] dark:text-[#999]" />
              </div>
              <h2 className="text-lg font-semibold text-[#0F0F0F] dark:text-[#EDEDED]">البحث في لائحة تنظيم العمل الداخلية</h2>
              <p className="mt-2 max-w-sm text-sm text-[#666] dark:text-[#999]">
                ابحث برقم المادة أو بكلمات من نص المادة. جميع النتائج من لائحة تنظيم العمل الداخلية حصرياً.
              </p>
              <div className="mt-6 grid max-w-md grid-cols-1 gap-3">
                <div className="rounded-xl border border-[#EDEDED] bg-white p-3 text-right dark:border-[#333] dark:bg-[#1A1A1A]">
                  <div className="mb-1 flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-[#0F0F0F] dark:text-[#EDEDED]" />
                    <span className="text-xs font-bold text-[#0F0F0F] dark:text-[#EDEDED]">بحث برقم المادة</span>
                  </div>
                  <p className="text-[11px] text-[#666] dark:text-[#999]">مثال: «المادة 5» — يعرض المادة المطابقة من اللائحة الداخلية</p>
                </div>
                <div className="rounded-xl border border-[#EDEDED] bg-white p-3 text-right dark:border-[#333] dark:bg-[#1A1A1A]">
                  <div className="mb-1 flex items-center gap-2">
                    <Brain className="h-3.5 w-3.5 text-[#0F0F0F] dark:text-[#EDEDED]" />
                    <span className="text-xs font-bold text-[#0F0F0F] dark:text-[#EDEDED]">بحث نصي</span>
                  </div>
                  <p className="text-[11px] text-[#666] dark:text-[#999]">مثال: «المخالفات والجزاءات» — أفضل النتائج حسب نسبة التطابق</p>
                </div>
                <div className="rounded-xl border border-[#EDEDED] bg-white p-3 text-right dark:border-[#333] dark:bg-[#1A1A1A]">
                  <div className="mb-1 flex items-center gap-2">
                    <List className="h-3.5 w-3.5 text-[#0F0F0F] dark:text-[#EDEDED]" />
                    <span className="text-xs font-bold text-[#0F0F0F] dark:text-[#EDEDED]">بحث موضوعي</span>
                  </div>
                  <p className="text-[11px] text-[#666] dark:text-[#999]">مثال: «واجبات العمال» — جميع المواد المتعلقة بالموضوع</p>
                </div>
              </div>
            </div>
          )}

          {/* No results */}
          {!loading && hasSearched && policyResults.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20">
                <AlertCircle className="h-7 w-7 text-amber-500 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-[#0F0F0F] dark:text-[#EDEDED]">لا توجد مادة مطابقة</h2>
              <p className="mt-2 max-w-sm text-sm text-[#666] dark:text-[#999]">
                {notFoundMessage || `لم يتم العثور على «${query}» في لائحة تنظيم العمل الداخلية. جرب كلمات مختلفة.`}
              </p>
            </div>
          )}

          {/* ─── Results list ─── */}
          {!loading && policyResults.length > 0 && (
            <div className="flex flex-col gap-3">
              {policyResults.map((result, idx) => (
                <div
                  key={`${result.article_number}-${idx}`}
                  className="overflow-hidden rounded-2xl border border-[#EDEDED] bg-white transition-all hover:shadow-sm dark:border-[#333] dark:bg-[#1A1A1A]"
                >
                  {/* Result header */}
                  <button
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    className="flex w-full items-center gap-3 p-4 text-right transition-colors hover:bg-[#FAFAFA] dark:hover:bg-[#222]"
                  >
                    {/* Article badge */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0F0F0F] text-white dark:bg-white dark:text-[#0F0F0F]">
                      <span className="text-sm font-bold">{result.article_number}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#0F0F0F] dark:text-[#EDEDED]">
                          المادة {result.article_number}
                        </span>
                        {result.cancelled && (
                          <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                            ملغاة
                          </span>
                        )}
                        <span className="rounded-md bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-medium text-[#666] dark:bg-[#333] dark:text-[#999]">
                          {result.system_name}
                        </span>
                        {result.topic && (
                          <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                            {result.topic}
                          </span>
                        )}
                        <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                          <Database className="h-2.5 w-2.5" />
                          {result.source}
                        </span>
                      </div>
                      {/* Chapter & Section info */}
                      {(result.chapter || result.section) && (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {result.chapter && (
                            <span className="text-[10px] text-[#999] dark:text-[#666]">{result.chapter}</span>
                          )}
                          {result.chapter && result.section && (
                            <span className="text-[10px] text-[#CCC] dark:text-[#444]">•</span>
                          )}
                          {result.section && (
                            <span className="text-[10px] text-[#999] dark:text-[#666]">{result.section}</span>
                          )}
                        </div>
                      )}
                      {/* Article text preview */}
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#666] dark:text-[#999]">
                        {result.article_text.substring(0, 150)}{result.article_text.length > 150 ? '...' : ''}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-center gap-1">
                      {result.similar_articles.length > 0 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                          <Link2 className="ml-0.5 inline h-2.5 w-2.5" />
                          {result.similar_articles.length} مشابهة
                        </span>
                      )}
                      {expandedIdx === idx ? (
                        <ChevronUp className="h-4 w-4 text-[#999]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#999]" />
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {expandedIdx === idx && (
                    <div className="border-t border-[#EDEDED] bg-[#FAFAFA] dark:border-[#333] dark:bg-[#111]">
                      {/* Full article text */}
                      <div className="p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs text-[#666] dark:text-[#999]">
                          <FileText className="h-3 w-3" />
                          <span>نص المادة كاملاً:</span>
                        </div>
                        <div className="rounded-xl border border-[#EDEDED] bg-white p-4 text-sm leading-[2] text-[#0F0F0F] dark:border-[#333] dark:bg-[#1A1A1A] dark:text-[#EDEDED]" dir="rtl">
                          {result.article_text}
                        </div>
                      </div>

                      {/* Structured metadata */}
                      <div className="px-4 pb-3">
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          <div className="rounded-lg border border-[#EDEDED] bg-white p-2.5 text-center dark:border-[#333] dark:bg-[#1A1A1A]">
                            <p className="mb-0.5 text-[10px] text-[#999] dark:text-[#666]">اسم النظام</p>
                            <p className="text-xs font-medium text-[#0F0F0F] dark:text-[#EDEDED]">{result.system_name}</p>
                          </div>
                          <div className="rounded-lg border border-[#EDEDED] bg-white p-2.5 text-center dark:border-[#333] dark:bg-[#1A1A1A]">
                            <p className="mb-0.5 text-[10px] text-[#999] dark:text-[#666]">رقم المادة</p>
                            <p className="text-xs font-medium text-[#0F0F0F] dark:text-[#EDEDED]">{result.article_number}</p>
                          </div>
                          <div className="rounded-lg border border-[#EDEDED] bg-white p-2.5 text-center dark:border-[#333] dark:bg-[#1A1A1A]">
                            <p className="mb-0.5 text-[10px] text-[#999] dark:text-[#666]">الحالة</p>
                            <p className={`text-xs font-medium ${result.cancelled ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {result.cancelled ? 'ملغاة' : 'سارية'}
                            </p>
                          </div>
                          <div className="rounded-lg border border-[#EDEDED] bg-white p-2.5 text-center dark:border-[#333] dark:bg-[#1A1A1A]">
                            <p className="mb-0.5 text-[10px] text-[#999] dark:text-[#666]">مصدر البيانات</p>
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{result.source}</p>
                          </div>
                        </div>
                        {(result.topic || result.chapter || result.section) && (
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                            {result.topic && (
                              <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-center dark:border-blue-800 dark:bg-blue-900/20">
                                <p className="mb-0.5 text-[10px] text-blue-500 dark:text-blue-400">التصنيف الموضوعي</p>
                                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{result.topic}</p>
                              </div>
                            )}
                            {result.chapter && (
                              <div className="rounded-lg border border-[#EDEDED] bg-white p-2.5 text-center dark:border-[#333] dark:bg-[#1A1A1A]">
                                <p className="mb-0.5 text-[10px] text-[#999] dark:text-[#666]">الباب</p>
                                <p className="text-xs font-medium text-[#0F0F0F] dark:text-[#EDEDED]">{result.chapter}</p>
                              </div>
                            )}
                            {result.section && (
                              <div className="rounded-lg border border-[#EDEDED] bg-white p-2.5 text-center dark:border-[#333] dark:bg-[#1A1A1A]">
                                <p className="mb-0.5 text-[10px] text-[#999] dark:text-[#666]">الفصل</p>
                                <p className="text-xs font-medium text-[#0F0F0F] dark:text-[#EDEDED]">{result.section}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Similar articles */}
                      {result.similar_articles.length > 0 && (
                        <div className="px-4 pb-4">
                          <div className="mb-2 flex items-center gap-2 text-xs text-[#666] dark:text-[#999]">
                            <Link2 className="h-3 w-3" />
                            <span>مواد مشابهة:</span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {result.similar_articles.map((similar, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => doSearch(`المادة ${similar.article_number}`)}
                                className="flex items-center gap-3 rounded-xl border border-[#EDEDED] bg-white p-3 text-right transition-all hover:border-[#0F0F0F]/30 hover:shadow-sm dark:border-[#333] dark:bg-[#1A1A1A] dark:hover:border-white/30"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#0F0F0F] dark:bg-[#333] dark:text-[#EDEDED]">
                                  <span className="text-[10px] font-bold">{similar.article_number}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-medium text-[#0F0F0F] dark:text-[#EDEDED]">المادة {similar.article_number}</span>
                                    <span className="text-[10px] text-[#999] dark:text-[#666]">— {similar.system_name}</span>
                                  </div>
                                  <p className="mt-0.5 line-clamp-1 text-[11px] text-[#666] dark:text-[#999]">
                                    {similar.snippet}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════ Voice Search Onboarding Popup ════════════ */}
      {showVoiceOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={dismissOnboarding}>
          <div
            className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1A1A1A]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F0F0F] to-[#333] text-white dark:from-white dark:to-[#EDEDED] dark:text-[#0F0F0F]">
                  <Mic className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F0F0F] dark:text-[#EDEDED]">البحث الصوتي</h2>
                  <p className="text-[11px] text-[#999] dark:text-[#666]">تحدث بالعربية للبحث في السياسات الداخلية</p>
                </div>
              </div>
              <button onClick={dismissOnboarding} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#999] transition-colors hover:bg-[#F5F5F5] hover:text-[#0F0F0F] dark:hover:bg-[#333] dark:hover:text-[#EDEDED]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 space-y-3">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#0F0F0F] dark:text-[#EDEDED]">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                كيف يعمل؟
              </h3>
              <div className="space-y-2.5">
                {[
                  { step: '١', text: 'اضغط على زر الميكروفون 🎤 بجانب حقل البحث' },
                  { step: '٢', text: 'تحدث بالعربية بوضوح — سترى الكلمات تظهر فوراً' },
                  { step: '٣', text: 'استمر بالتحدث — لن يتوقف التسجيل أثناء كلامك' },
                  { step: '٤', text: 'عند التوقف عن الكلام، سيتم البحث تلقائياً بعد ثانيتين' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3 dark:border-[#333] dark:bg-[#111]">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0F0F0F] text-[10px] font-bold text-white dark:bg-white dark:text-[#0F0F0F]">
                      {item.step}
                    </div>
                    <p className="pt-0.5 text-xs leading-relaxed text-[#0F0F0F] dark:text-[#EDEDED]">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-5 space-y-3">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#0F0F0F] dark:text-[#EDEDED]">
                <Volume2 className="h-3.5 w-3.5 text-amber-500" />
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
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 dark:border-[#333] dark:bg-[#111]">
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-[11px] leading-tight text-[#0F0F0F] dark:text-[#EDEDED]">{item.tip}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {voice.isSupported ? (
                <Button
                  onClick={() => { dismissOnboarding(); voice.startListening(); }}
                  className="h-10 flex-1 rounded-xl bg-[#0F0F0F] text-white hover:bg-[#1A1A1A] dark:bg-white dark:text-[#0F0F0F] dark:hover:bg-[#EDEDED]"
                >
                  <Mic className="ml-2 h-4 w-4" />
                  جرّب الآن
                </Button>
              ) : (
                <div className="flex-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs leading-relaxed text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  💡 استخدم متصفح Chrome أو Edge لتفعيل البحث الصوتي
                </div>
              )}
              <Button
                onClick={dismissOnboarding}
                variant="outline"
                className="h-10 flex-1 rounded-xl border-[#EDEDED] text-[#0F0F0F] hover:bg-[#F5F5F5] dark:border-[#333] dark:text-[#EDEDED] dark:hover:bg-[#333]"
              >
                لاحقاً
              </Button>
            </div>

            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2">
              <input
                type="checkbox"
                defaultChecked
                onChange={(e) => {
                  if (!e.target.checked) {
                    localStorage.removeItem('salmo_policy_voice_onboarding_seen');
                  }
                }}
                className="h-3.5 w-3.5 rounded border-[#EDEDED] accent-[#0F0F0F] dark:border-[#333]"
              />
              <span className="text-[11px] text-[#999] dark:text-[#666]">عدم إظهار هذه النافذة مرة أخرى</span>
            </label>
          </div>
        </div>
      )}

      {/* ════════════ Footer ════════════ */}
      <div className="border-t border-[#EDEDED] bg-white py-4 dark:border-[#222] dark:bg-[#0F0F0F]">
        <p className="text-center text-[11px] text-[#666] dark:text-[#999]">
          هذه الأداة للمساعدة وليست استشارة قانونية رسمية — مصدر البيانات: لائحة تنظيم العمل الداخلية - سالمو
        </p>
      </div>
    </div>
  );
}