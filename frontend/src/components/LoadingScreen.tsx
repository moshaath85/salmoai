import { useEffect, useState, useCallback } from 'react';
import SaudiCharacters from './SaudiCharacters';

interface LoadingScreenProps {
  isLoading: boolean;
  onComplete: () => void;
}

const PHRASES = [
  'جاري تجهيز تجربة ذكية لك...',
  'يتم تحليل البيانات بسرعة...',
  'مساعد الموارد البشرية جاهز لخدمتك...',
  'حلول ذكية لإدارة الموظفين...',
  'تجربة تقنية متطورة للموارد البشرية...',
  'يتم تجهيز نظام الذكاء الاصطناعي...',
  'جاري تحميل البيانات بأمان...',
];

const PARTICLE_COUNT = 18;

const MINI_PHRASES = [
  'جاري التحميل...',
  'لحظة من فضلك...',
  'يتم تجهيز الصفحة...',
  'جاري تحضير المحتوى...',
];

/* ─── Voice Wave Bars ─── */
const VoiceWaveBars = ({ mini = false }: { mini?: boolean }) => {
  const barCount = mini ? 3 : 4;
  const barHeight = mini ? 12 : 18;
  return (
    <div className="flex items-center gap-[3px]" style={{ height: barHeight }}>
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className="voice-wave-bar rounded-full bg-cyan-400/70"
          style={{
            width: mini ? 2 : 3,
            height: '60%',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
};

/* ─── Floating Geometric Shape ─── */
const FloatingShape = ({ index }: { index: number }) => {
  const shapes = ['hexagon', 'circle', 'diamond'] as const;
  const shape = shapes[index % 3];
  const size = 10 + (index % 4) * 6;
  const left = `${(index * 13.7 + 8) % 95}%`;
  const top = `${(index * 17.3 + 12) % 90}%`;
  const delay = `${(index * 0.7) % 6}s`;
  const duration = `${8 + (index % 5) * 2}s`;

  const shapeStyle: React.CSSProperties = {
    position: 'absolute',
    left,
    top,
    width: size,
    height: size,
    animationDelay: delay,
    animationDuration: duration,
    opacity: 0.08 + (index % 4) * 0.03,
  };

  if (shape === 'circle') {
    return (
      <div
        className="geo-float-shape rounded-full border border-indigo-400/30"
        style={shapeStyle}
      />
    );
  }
  if (shape === 'diamond') {
    return (
      <div
        className="geo-float-shape border border-violet-400/30"
        style={{ ...shapeStyle, transform: 'rotate(45deg)' }}
      />
    );
  }
  // hexagon approximation
  return (
    <div
      className="geo-float-shape"
      style={shapeStyle}
    >
      <svg viewBox="0 0 24 24" fill="none" width="100%" height="100%">
        <polygon
          points="12,2 22,8 22,16 12,22 2,16 2,8"
          stroke="rgba(99,102,241,0.3)"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </div>
  );
};

/* ═══════════════════════════════════════════
   Full Loading Screen (initial app load)
   ═══════════════════════════════════════════ */
const LoadingScreen = ({ isLoading, onComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [fadeOut, setFadeOut] = useState(false);

  // Progress bar animation
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const increment = prev < 30 ? 2.5 : prev < 70 ? 1.2 : prev < 90 ? 2 : 0.8;
        return Math.min(prev + increment, 100);
      });
    }, 60);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Phrase rotation
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Typing effect
  useEffect(() => {
    const targetText = PHRASES[phraseIndex];
    setDisplayedText('');
    let charIndex = 0;
    const typeInterval = setInterval(() => {
      if (charIndex <= targetText.length) {
        setDisplayedText(targetText.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 40);
    return () => clearInterval(typeInterval);
  }, [phraseIndex]);

  // Handle completion
  const handleComplete = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => {
      onComplete();
    }, 600);
  }, [onComplete]);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(handleComplete, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, handleComplete]);

  // Generate particles with deterministic positions
  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    left: `${(i * 5.5 + 3) % 100}%`,
    top: `${(i * 7.3 + 5) % 100}%`,
    size: 2 + (i % 4),
    delay: `${(i * 0.4) % 5}s`,
    duration: `${4 + (i % 5)}s`,
    opacity: 0.2 + (i % 5) * 0.1,
  }));

  return (
    <div
      className={`loading-screen fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity duration-600 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      dir="rtl"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a]" />

      {/* Animated gradient overlay */}
      <div className="loading-gradient-overlay absolute inset-0 opacity-30" />

      {/* Floating Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="loading-particle absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: p.delay,
            animationDuration: p.duration,
            opacity: p.opacity,
          }}
        />
      ))}

      {/* Floating Geometric Shapes */}
      {Array.from({ length: 8 }, (_, i) => (
        <FloatingShape key={`geo-${i}`} index={i} />
      ))}

      {/* Main Content Card */}
      <div className="relative z-10 mx-4 flex w-full max-w-lg flex-col items-center">
        {/* Glassmorphism Card */}
        <div className="loading-glass-card loading-card-glow w-full rounded-3xl p-8 sm:p-10">
          {/* Logo */}
          <div className="mb-6 text-center">
            <div className="loading-logo-glow relative inline-block">
              <h1 className="bg-gradient-to-l from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-5xl font-bold tracking-wide text-transparent sm:text-6xl">
                SALMO
              </h1>
              <div className="loading-ai-badge mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
                <span className="loading-ai-dot inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
                مدعوم بالذكاء الاصطناعي
              </div>
            </div>
          </div>

          {/* Speech Bubble with Voice Wave */}
          <div className="loading-speech-bubble relative mx-auto mb-6 max-w-xs rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <VoiceWaveBars />
              <p className="min-h-[1.5rem] flex-1 text-center text-sm text-indigo-200/90">
                {displayedText}
                <span className="loading-cursor mr-0.5 inline-block h-4 w-0.5 bg-cyan-400" />
              </p>
            </div>
            {/* Bubble tail */}
            <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-white/5" />
          </div>

          {/* Characters */}
          <div className="mb-6">
            <SaudiCharacters />
          </div>

          {/* Tagline */}
          <p className="mb-6 text-center text-sm font-medium text-indigo-200/70 sm:text-base">
            مساعدك الذكي بالذكاء الاصطناعي للموارد البشرية
          </p>

          {/* Progress Section */}
          <div className="relative">
            {/* AI Pulse ring around progress */}
            <div className="loading-progress-pulse absolute -inset-2 rounded-xl opacity-40" />

            <div className="relative overflow-hidden rounded-full bg-white/5 p-0.5">
              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-800/50">
                <div
                  className="loading-progress-bar h-full rounded-full bg-gradient-to-l from-cyan-400 via-indigo-500 to-violet-500 transition-all duration-200 ease-out"
                  style={{ width: `${progress}%` }}
                />
                {/* Shimmer effect on progress bar */}
                <div
                  className="loading-shimmer absolute inset-0 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Percentage */}
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-indigo-300/60">جاري التحميل</span>
              <span className="font-mono text-cyan-400">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>

        {/* Bottom branding */}
        <p className="mt-6 text-center text-xs text-indigo-300/30">
          © {new Date().getFullYear()} Salmo — حلول ذكية للموارد البشرية
        </p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   Mini Loader (lazy-loaded page transitions)
   ═══════════════════════════════════════════ */
const MiniLoader = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay before showing to avoid flash on fast loads
    const showTimer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % MINI_PHRASES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="mini-loader-enter fixed inset-0 z-[9998] flex items-center justify-center"
      dir="rtl"
    >
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-sm" />

      {/* Compact card */}
      <div className="relative z-10 mx-4 w-full max-w-sm">
        <div className="loading-glass-card loading-card-glow rounded-2xl px-6 py-8">
          {/* Mini speech bubble */}
          <div className="mb-4 flex items-center justify-center gap-2">
            <VoiceWaveBars mini />
            <p className="text-sm text-indigo-200/80">
              {MINI_PHRASES[phraseIndex]}
            </p>
          </div>

          {/* Characters (scaled down) */}
          <div className="mb-4">
            <SaudiCharacters mini />
          </div>

          {/* Spinner */}
          <div className="flex justify-center">
            <div className="mini-loader-spinner h-6 w-6 rounded-full border-2 border-indigo-500/30 border-t-cyan-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
export { MiniLoader };