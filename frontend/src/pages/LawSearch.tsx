import { useState, useCallback, useRef, useEffect } from 'react';
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
  Scale,
  X,
  FileText,
  Mic,
  MicOff,
  Info,
  Sparkles,
  Volume2,
  Hash,
  Layers,
  Brain,
  List,
  Database,
  Link2,
  Globe,
  Zap,
  ArrowLeft,
} from 'lucide-react';
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

const SEARCH_MODES: Record<string, { label: string; icon: any; description: string }> = {
  article_number: { label: 'بحث برقم المادة', icon: Hash, description: 'عرض جميع المواد المطابقة من الأنظمة المختلفة' },
  system_article: { label: 'بحث دقيق', icon: Layers, description: 'مطابقة 100% — نظام + رقم مادة' },
  semantic: { label: 'بحث نصي', icon: Brain, description: 'أفضل 3 نتائج حسب نسبة التطابق' },
  topic: { label: 'بحث موضوعي', icon: List, description: 'جميع المواد المتعلقة بموضوع محدد' },
};

const QUICK_SEARCHES = [
  'المادة 77',
  'المادة 77 نظام العمل',
  'فصل تعسفي',
  'مكافأة نهاية الخدمة',
  'إجازة سنوية',
  'جميع المواد المتعلقة بـ الإجازات',
  'ساعات العمل',
  'فترة التجربة',
  'لائحة تنظيم العمل',
  'المخالفات والجزاءات',
];

export default function LawSearch() {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [searchMode, setSearchMode] = useState('');
  const [notFoundMessage, setNotFoundMessage] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showVoiceOnboarding, setShowVoiceOnboarding] = useState(false);
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const [showDialectPicker, setShowDialectPicker] = useState(false);
  const [topics, setTopics] = useState<TopicCategory[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [showTopicBrowser, setShowTopicBrowser] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [detectedCategory, setDetectedCategory] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const micTooltipRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const seen = localStorage.getItem('salmo_voice_onboarding_seen');
    if (!seen) {
      const timer = setTimeout(() => setShowVoiceOnboarding(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

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
    localStorage.setItem('salmo_voice_onboarding_seen', '1');
  };

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

  const fetchTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const res = await withRetry(() =>
        client.apiCall.invoke({
          url: '/api/v1/salmo/topics',
          method: 'GET',
        })
      );
      const data = res.data as TopicsResponse;
      setTopics(data.categories || []);
    } catch {
      // silently fail — topics are optional
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && topics.length === 0) {
      fetchTopics();
    }
  }, [user]);

  const doSearch = useCallback(async (searchQuery?: string) => {
    const q = (searchQuery ?? query).trim();
    if (!q || loading) return;

    setQuery(q);
    setLoading(true);
    setExpandedIdx(null);
    setNotFoundMessage('');

    try {
      const res = await withRetry(() =>
        client.apiCall.invoke({
          url: '/api/v1/salmo/search-kb',
          method: 'POST',
          data: { query: q, max_results: 20 },
        })
      );
      const data = res.data as SearchResponse;
      setResults(data.results || []);
      setTotalMatches(data.total_matches || 0);
      setSearchMode(data.search_mode || 'semantic');
      setNotFoundMessage(data.not_found_message || '');
      setDetectedCategory(data.detected_category || '');

      setSearchHistory((prev) => {
        const updated = [q, ...prev.filter((h) => h !== q)].slice(0, 8);
        return updated;
      });
    } catch (err: any) {
      const errMsg = err?.data?.detail || err?.response?.data?.detail || err?.message || '';
      toast.error(errMsg || 'حدث خطأ أثناء البحث');
    } finally {
      setLoading(false);
    }
  }, [query, loading]);

  const getModeInfo = (mode: string) => {
    return SEARCH_MODES[mode] || SEARCH_MODES.semantic;
  };

  // Highlight search terms in text
  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    const words = searchQuery.trim().split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return text;
    const regex = new RegExp(`(${words.join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!authChecked) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center ai-pulse">
              <Search className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (authError && !user) {
    return (
      <div dir="rtl" className="min-h-screen bg-background font-[Cairo,Inter,sans-serif]">
        <Navbar />
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">تعذر الاتصال بالخادم</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            حدث خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.
          </p>
          <Button onClick={checkAuth} className="mt-6 gradient-primary text-white border-0 hover:opacity-90">
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
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-white ai-glow-sm">
            <Scale className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">سجّل الدخول للبحث في النظام</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            للبحث في نصوص نظام العمل السعودي، سجّل الدخول مجاناً.
          </p>
          <Button onClick={() => client.auth.toLogin()} className="mt-6 gradient-primary text-white border-0 hover:opacity-90">
            <LogIn className="ml-2 h-4 w-4" />
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-background font-[Cairo,Inter,sans-serif]">
      <Navbar />

      {/* Hero Search Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 gradient-mesh opacity-50 dark:opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        
        <div className="relative mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
          {/* Title */}
          <div className="mb-2 flex items-center justify-center gap-3" style={{ animation: 'slideUp 0.6s ease-out' }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary text-white ai-glow-sm">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <h1 className="mb-3 text-center text-3xl font-bold md:text-4xl" style={{ animation: 'slideUp 0.6s ease-out 0.1s both' }}>
            <span className="gradient-text">محرك البحث القانوني</span>
          </h1>
          <p className="mb-8 text-center text-sm text-muted-foreground md:text-base" style={{ animation: 'slideUp 0.6s ease-out 0.2s both' }}>
            ابحث بالذكاء الاصطناعي في نصوص الأنظمة السعودية — برقم المادة أو بالموضوع أو بالكلمات
          </p>

          {/* Main Search Bar */}
          <div className="mx-auto max-w-2xl" style={{ animation: 'slideUp 0.6s ease-out 0.3s both' }}>
            <div className="glass-card rounded-2xl p-2 transition-all duration-300 hover:shadow-lg focus-within:ai-glow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary text-white">
                  <Search className="h-4.5 w-4.5" />
                </div>
                <Input
                  ref={inputRef}
                  value={voice.isListening ? (voice.interimText ? voice.finalText + voice.interimText : query) : query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      doSearch();
                    }
                  }}
                  placeholder={
                    voice.voiceState === 'listening' ? '🎤 جاري الاستماع... تحدث الآن'
                    : voice.voiceState === 'speech_detected' ? '🎤 يتحدث الآن... سيتم البحث عند التوقف'
                    : voice.voiceState === 'silence_detected' ? '⏳ تم اكتشاف صمت... جاري البحث'
                    : 'ابحث... مثال: المادة 77، فصل تعسفي، الإجازات'
                  }
                  className="h-11 flex-1 border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                  disabled={loading}
                />
                {query && !voice.isListening && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                      setTotalMatches(0);
                      setSearchMode('');
                      setNotFoundMessage('');
                      inputRef.current?.focus();
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {/* Voice input button */}
                <div className="relative" ref={micTooltipRef}>
                  <button
                    onClick={voice.isSupported ? voice.toggleListening : () => setShowMicTooltip(!showMicTooltip)}
                    disabled={loading}
                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                      voice.isListening
                        ? voice.voiceState === 'silence_detected'
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30'
                          : 'bg-red-500 text-white shadow-lg shadow-red-200/50 dark:shadow-red-900/30 animate-pulse'
                        : voice.isSupported
                          ? 'bg-muted text-muted-foreground hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-violet-900/30 dark:hover:text-violet-400'
                          : 'bg-muted text-muted-foreground/40 cursor-help'
                    } disabled:opacity-50`}
                    title={voice.isSupported ? (voice.isListening ? 'إيقاف التسجيل' : 'بحث صوتي') : 'البحث الصوتي غير مدعوم في هذا المتصفح'}
                  >
                    {voice.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {voice.isListening && voice.silenceCountdown > 0 && (
                      <svg className="absolute inset-0 h-11 w-11 -rotate-90" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                        <circle
                          cx="22" cy="22" r="20" fill="none" stroke="white" strokeWidth="2"
                          strokeDasharray={`${(voice.silenceCountdown / 100) * 125.6} 125.6`}
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </button>
                  {/* Dialect selector badge */}
                  {voice.isListening && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowDialectPicker(!showDialectPicker); }}
                      className="absolute -top-1.5 -left-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full gradient-primary border-2 border-background px-1 text-[8px] font-bold text-white hover:opacity-80 transition-opacity"
                      title="تغيير اللهجة"
                    >
                      {voice.currentDialect.split('-')[1]}
                    </button>
                  )}
                  {!voice.isListening && voice.isSupported && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMicTooltip(!showMicTooltip); }}
                      className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                    >
                      <Info className="h-2.5 w-2.5" />
                    </button>
                  )}
                  {/* Tooltip */}
                  {showMicTooltip && !voice.isListening && (
                    <div className="absolute top-full mt-2 right-0 z-50 w-64 rounded-xl glass-card p-3 shadow-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg gradient-primary text-white">
                          <Mic className="h-3 w-3" />
                        </div>
                        <span className="text-xs font-bold text-foreground">البحث الصوتي</span>
                        <button onClick={() => setShowMicTooltip(false)} className="mr-auto text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {!voice.isSupported ? (
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2.5 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                          💡 البحث الصوتي يتطلب متصفح Chrome أو Edge.
                        </div>
                      ) : (
                        <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                          <li className="flex items-start gap-1.5">
                            <span className="mt-0.5 text-blue-500">●</span>
                            اضغط زر الميكروفون وابدأ التحدث بالعربية
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="mt-0.5 text-violet-500">●</span>
                            استمر بالتحدث — لن يتوقف التسجيل أثناء كلامك
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="mt-0.5 text-cyan-500">●</span>
                            سيتم البحث تلقائياً بعد 2.5 ثانية من الصمت
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
                    <div className="absolute top-full mt-2 right-0 z-50 w-56 max-h-48 overflow-y-auto rounded-xl glass-card p-2 shadow-xl">
                      <div className="flex items-center gap-2 mb-2 px-2">
                        <Globe className="h-3.5 w-3.5 text-foreground" />
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
                              voice.currentDialect === d ? 'gradient-primary text-white' : 'text-foreground hover:bg-muted'
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
                  className="h-11 shrink-0 rounded-xl gradient-primary text-white border-0 px-6 hover:opacity-90 transition-opacity"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'بحث'}
                </Button>
              </div>
            </div>
          </div>

          {/* Search Mode Pills */}
          <div className="mx-auto mt-5 max-w-2xl flex flex-wrap items-center justify-center gap-2" style={{ animation: 'slideUp 0.6s ease-out 0.4s both' }}>
            {Object.entries(SEARCH_MODES).map(([mode, info]) => {
              const Icon = info.icon;
              const isActive = searchMode === mode;
              return (
                <div
                  key={mode}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                    isActive
                      ? 'gradient-primary text-white shadow-md'
                      : 'glass-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{info.label}</span>
                </div>
              );
            })}
          </div>

          {/* AI Suggestion Chips */}
          <div className="mx-auto mt-5 max-w-3xl" style={{ animation: 'slideUp 0.6s ease-out 0.5s both' }}>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 text-violet-500" />
                اقتراحات:
              </span>
              {QUICK_SEARCHES.slice(0, 6).map((tag) => (
                <button
                  key={tag}
                  onClick={() => doSearch(tag)}
                  disabled={loading}
                  className="rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-xs text-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm disabled:opacity-50"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Topic Browser Toggle */}
          {topics.length > 0 && (
            <div className="mx-auto mt-5 max-w-2xl" style={{ animation: 'slideUp 0.6s ease-out 0.6s both' }}>
              <button
                onClick={() => setShowTopicBrowser(!showTopicBrowser)}
                className="flex w-full items-center justify-between rounded-xl glass-card px-4 py-3 text-right transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-accent text-white">
                    <List className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-foreground">تصفح المواضيع القانونية</span>
                  <span className="rounded-full gradient-primary px-2 py-0.5 text-[10px] font-medium text-white">
                    {topics.length} تصنيف
                  </span>
                </div>
                {showTopicBrowser ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showTopicBrowser && (
                <div className="mt-2 rounded-xl glass-card overflow-hidden" style={{ animation: 'scaleIn 0.3s ease-out' }}>
                  {topics.map((category) => (
                    <div key={category.name} className="border-b border-border/50 last:border-b-0">
                      <button
                        onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                        className="flex w-full items-center justify-between px-4 py-3 text-right transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary text-white">
                            <span className="text-[10px] font-bold">{category.article_count}</span>
                          </div>
                          <span className="text-xs font-bold text-foreground">{category.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{category.sub_topics.length} موضوع فرعي</span>
                          {expandedCategory === category.name ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {expandedCategory === category.name && (
                        <div className="border-t border-border/50 bg-muted/30 px-4 py-3" style={{ animation: 'slideUp 0.2s ease-out' }}>
                          <button
                            onClick={() => {
                              doSearch(category.name);
                              setShowTopicBrowser(false);
                            }}
                            className="mb-3 flex w-full items-center gap-2 rounded-xl gradient-primary px-3 py-2.5 text-white transition-opacity hover:opacity-90"
                          >
                            <Search className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">عرض جميع مواد «{category.name}»</span>
                          </button>
                          <div className="flex flex-wrap gap-2">
                            {category.sub_topics.map((sub) => (
                              <button
                                key={sub.name}
                                onClick={() => {
                                  doSearch(sub.name);
                                  setShowTopicBrowser(false);
                                }}
                                className="rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-[11px] text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
                              >
                                {sub.name}
                                <span className="mr-1 text-[9px] text-muted-foreground">({sub.article_count})</span>
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

      {/* Results Section */}
      <div className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
          {/* Search mode indicator */}
          {searchMode && results.length > 0 && (
            <div className="mb-5 flex items-center gap-3 rounded-xl glass-card p-4" style={{ animation: 'slideUp 0.4s ease-out' }}>
              {(() => {
                const modeInfo = getModeInfo(searchMode);
                const ModeIcon = modeInfo.icon;
                return (
                  <>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary text-white">
                      <ModeIcon className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">وضع البحث: {modeInfo.label}</span>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                          {totalMatches} نتيجة
                        </span>
                        {detectedCategory && (
                          <span className="rounded-full bg-violet-100 dark:bg-violet-900/30 px-2.5 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                            📂 {detectedCategory}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{modeInfo.description}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Results header with history */}
          {results.length > 0 && (
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2" style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span>
                  تم العثور على <strong className="text-foreground">{totalMatches}</strong> نتيجة لـ «<span className="text-primary">{query}</span>»
                </span>
              </div>
              {searchHistory.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>سابق:</span>
                  {searchHistory.slice(1, 4).map((h) => (
                    <button
                      key={h}
                      onClick={() => doSearch(h)}
                      className="rounded-full border border-border/60 px-2.5 py-0.5 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Loading state - skeleton cards */}
          {loading && (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl glass-card p-5 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 rounded-lg bg-muted" />
                      <div className="h-3 w-2/3 rounded-lg bg-muted" />
                      <div className="h-3 w-1/2 rounded-lg bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-center text-sm text-muted-foreground mt-2">
                <Sparkles className="inline h-4 w-4 text-primary ml-1 animate-pulse" />
                جاري البحث بالذكاء الاصطناعي...
              </p>
            </div>
          )}

          {/* Empty state - no search yet */}
          {!loading && results.length === 0 && !query && !notFoundMessage && (
            <div className="flex flex-col items-center py-16 text-center" style={{ animation: 'fadeIn 0.6s ease-out' }}>
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-3xl gradient-primary flex items-center justify-center ai-glow opacity-90">
                  <BookOpen className="h-9 w-9 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full gradient-accent flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground">ابحث في الأنظمة السعودية</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
                محرك بحث ذكي يفهم استفساراتك ويعرض النتائج من قاعدة بيانات Salmo Assist حصرياً
              </p>
              
              {/* Search mode cards */}
              <div className="mt-8 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2 w-full">
                {Object.entries(SEARCH_MODES).map(([mode, info], idx) => {
                  const Icon = info.icon;
                  return (
                    <div
                      key={mode}
                      className="glass-card rounded-xl p-4 text-right hover-lift cursor-default"
                      style={{ animation: `slideUp 0.5s ease-out ${0.1 * idx}s both` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-white">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-foreground">{info.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{info.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No results */}
          {!loading && results.length === 0 && query && (
            <div className="flex flex-col items-center py-16 text-center" style={{ animation: 'scaleIn 0.4s ease-out' }}>
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="h-7 w-7 text-amber-500" />
              </div>
              <h2 className="text-lg font-bold text-foreground">لا توجد مادة مطابقة</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {notFoundMessage || `لم يتم العثور على «${query}» في قاعدة بيانات Salmo Assist. جرب كلمات مختلفة.`}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {QUICK_SEARCHES.slice(0, 4).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => doSearch(tag)}
                    className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs text-foreground transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results list */}
          {!loading && results.length > 0 && (
            <div className="flex flex-col gap-4">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="glass-card rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg"
                  style={{ animation: `slideUp 0.4s ease-out ${idx * 0.05}s both` }}
                >
                  {/* Result header */}
                  <button
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    className="w-full flex items-center gap-4 p-4 md:p-5 text-right transition-colors hover:bg-muted/30"
                  >
                    {/* Article badge */}
                    <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl gradient-primary text-white shadow-md">
                      <span className="text-sm font-bold">{result.article_number}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">
                          المادة {result.article_number}
                        </span>
                        {result.cancelled && (
                          <span className="rounded-md bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                            ملغاة
                          </span>
                        )}
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {result.system_name}
                        </span>
                        {result.topic && (
                          <span className="rounded-md bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                            {result.topic}
                          </span>
                        )}
                        <span className="flex items-center gap-1 rounded-md bg-cyan-50 dark:bg-cyan-900/20 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:text-cyan-300">
                          <Database className="h-2.5 w-2.5" />
                          {result.source}
                        </span>
                      </div>
                      {/* Chapter & Section info */}
                      {(result.chapter || result.section) && (
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {result.chapter && (
                            <span className="text-[10px] text-muted-foreground">{result.chapter}</span>
                          )}
                          {result.chapter && result.section && (
                            <span className="text-[10px] text-muted-foreground/50">•</span>
                          )}
                          {result.section && (
                            <span className="text-[10px] text-muted-foreground">{result.section}</span>
                          )}
                        </div>
                      )}
                      {/* Article text preview with highlighting */}
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {highlightText(
                          result.article_text.substring(0, 180) + (result.article_text.length > 180 ? '...' : ''),
                          query
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      {result.similar_articles.length > 0 && (
                        <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                          <Link2 className="inline h-2.5 w-2.5 ml-0.5" />
                          {result.similar_articles.length} مشابهة
                        </span>
                      )}
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300 ${expandedIdx === idx ? 'bg-primary/10 text-primary rotate-180' : 'text-muted-foreground'}`}>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {expandedIdx === idx && (
                    <div className="border-t border-border/50 bg-muted/20" style={{ animation: 'slideUp 0.3s ease-out' }}>
                      {/* Full article text */}
                      <div className="p-4 md:p-5">
                        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium">نص المادة كاملاً:</span>
                        </div>
                        <div className="rounded-xl bg-background border border-border p-4 md:p-5 text-sm leading-[2.2] text-foreground" dir="rtl">
                          {highlightText(result.article_text, query)}
                        </div>
                      </div>

                      {/* Structured metadata */}
                      <div className="px-4 md:px-5 pb-4">
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          <div className="rounded-xl bg-background border border-border p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-1">اسم النظام</p>
                            <p className="text-xs font-medium text-foreground">{result.system_name}</p>
                          </div>
                          <div className="rounded-xl bg-background border border-border p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-1">رقم المادة</p>
                            <p className="text-xs font-medium text-foreground">{result.article_number}</p>
                          </div>
                          <div className="rounded-xl bg-background border border-border p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-1">الحالة</p>
                            <p className={`text-xs font-medium ${result.cancelled ? 'text-red-500' : 'text-emerald-500'}`}>
                              {result.cancelled ? 'ملغاة' : 'سارية'}
                            </p>
                          </div>
                          <div className="rounded-xl bg-background border border-border p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-1">مصدر البيانات</p>
                            <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">{result.source}</p>
                          </div>
                        </div>
                        {(result.topic || result.chapter || result.section) && (
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                            {result.topic && (
                              <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 p-3 text-center">
                                <p className="text-[10px] text-violet-500 mb-1">التصنيف الموضوعي</p>
                                <p className="text-xs font-medium text-violet-700 dark:text-violet-300">{result.topic}</p>
                              </div>
                            )}
                            {result.chapter && (
                              <div className="rounded-xl bg-background border border-border p-3 text-center">
                                <p className="text-[10px] text-muted-foreground mb-1">الباب</p>
                                <p className="text-xs font-medium text-foreground">{result.chapter}</p>
                              </div>
                            )}
                            {result.section && (
                              <div className="rounded-xl bg-background border border-border p-3 text-center">
                                <p className="text-[10px] text-muted-foreground mb-1">الفصل</p>
                                <p className="text-xs font-medium text-foreground">{result.section}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Similar articles */}
                      {result.similar_articles.length > 0 && (
                        <div className="px-4 md:px-5 pb-5">
                          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Link2 className="h-3.5 w-3.5 text-blue-500" />
                            <span className="font-medium">مواد مشابهة:</span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {result.similar_articles.map((similar, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => doSearch(`المادة ${similar.article_number}`)}
                                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-right transition-all duration-200 hover:border-primary/40 hover:shadow-sm group"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:gradient-primary group-hover:text-white transition-all">
                                  <span className="text-[10px] font-bold">{similar.article_number}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-medium text-foreground">المادة {similar.article_number}</span>
                                    <span className="text-[10px] text-muted-foreground">— {similar.system_name}</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                    {similar.snippet}
                                  </p>
                                </div>
                                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
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

      {/* Voice Search Onboarding Popup */}
      {showVoiceOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={dismissOnboarding}>
          <div
            className="mx-4 w-full max-w-md rounded-2xl glass-card p-6 shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'scaleIn 0.3s ease-out' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary text-white ai-glow-sm">
                  <Mic className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">البحث الصوتي</h2>
                  <p className="text-[11px] text-muted-foreground">تحدث بالعربية للبحث في النظام</p>
                </div>
              </div>
              <button onClick={dismissOnboarding} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 space-y-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                كيف يعمل؟
              </h3>
              <div className="space-y-2.5">
                {[
                  { step: '١', text: 'اضغط على زر الميكروفون 🎤 بجانب حقل البحث' },
                  { step: '٢', text: 'تحدث بالعربية بوضوح — سترى الكلمات تظهر فوراً' },
                  { step: '٣', text: 'استمر بالتحدث — لن يتوقف التسجيل أثناء كلامك' },
                  { step: '٤', text: 'عند التوقف عن الكلام، سيتم البحث تلقائياً بعد ثانيتين' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3 rounded-xl bg-muted/50 border border-border p-3">
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
                <Volume2 className="h-3.5 w-3.5 text-cyan-500" />
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
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2">
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
                <div className="flex-1 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200 text-center leading-relaxed">
                  💡 استخدم متصفح Chrome أو Edge لتفعيل البحث الصوتي
                </div>
              )}
              <Button
                onClick={dismissOnboarding}
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-muted rounded-xl h-10"
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
                    localStorage.removeItem('salmo_voice_onboarding_seen');
                  }
                }}
                className="h-3.5 w-3.5 rounded border-border accent-primary"
              />
              <span className="text-[11px] text-muted-foreground">عدم إظهار هذه النافذة مرة أخرى</span>
            </label>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border bg-background/80 backdrop-blur-sm py-4">
        <p className="text-center text-[11px] text-muted-foreground">
          هذه الأداة للمساعدة وليست استشارة قانونية رسمية — مصدر البيانات: Salmo Assist
        </p>
      </div>
    </div>
  );
}