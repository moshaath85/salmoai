import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Professional voice input hook with continuous listening and automatic silence detection.
 *
 * Features:
 * - Continuous listening without short time limits
 * - Keeps recording as long as there's speech (even slow or intermittent)
 * - Auto-stops after 2-3 seconds of silence
 * - Supports multiple Arabic dialects
 * - Handles natural thinking pauses
 * - Captures complete sentences before stopping
 * - Ignores light background noise
 */

const ARABIC_DIALECTS = ['ar-SA', 'ar-AE', 'ar-EG', 'ar-KW', 'ar-QA', 'ar-BH', 'ar-OM', 'ar-JO', 'ar-LB', 'ar-IQ', 'ar-MA', 'ar-DZ', 'ar-TN', 'ar-LY', 'ar-SD', 'ar-YE'];

const SILENCE_TIMEOUT_MS = 2500; // 2.5 seconds of silence before auto-stop
const MIN_SPEECH_LENGTH_MS = 500; // Minimum speech duration before allowing silence stop

type VoiceState = 'idle' | 'listening' | 'speech_detected' | 'silence_detected';

type UseVoiceInputOptions = {
  onFinalTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  dialect?: string;
  silenceTimeoutMs?: number;
  autoSubmit?: boolean;
};

type UseVoiceInputReturn = {
  isSupported: boolean;
  voiceState: VoiceState;
  isListening: boolean;
  interimText: string;
  finalText: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  currentDialect: string;
  availableDialects: string[];
  setDialect: (dialect: string) => void;
  silenceCountdown: number;
};

export function useVoiceInput(options: UseVoiceInputOptions): UseVoiceInputReturn {
  const {
    onFinalTranscript,
    onInterimTranscript,
    dialect = 'ar-SA',
    silenceTimeoutMs = SILENCE_TIMEOUT_MS,
    autoSubmit = true,
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [currentDialect, setCurrentDialect] = useState(dialect);
  const [silenceCountdown, setSilenceCountdown] = useState(0);

  // Use refs for everything that the recognition callbacks need
  // This avoids re-creating the recognition object when state changes
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechStartTimeRef = useRef<number>(0);
  const accumulatedTranscriptRef = useRef<string>('');
  const isStoppingRef = useRef<boolean>(false);
  const autoSubmitRef = useRef(autoSubmit);
  const silenceTimeoutRef = useRef(silenceTimeoutMs);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  const voiceStateRef = useRef<VoiceState>('idle');

  // Keep refs in sync with props
  useEffect(() => { autoSubmitRef.current = autoSubmit; }, [autoSubmit]);
  useEffect(() => { silenceTimeoutRef.current = silenceTimeoutMs; }, [silenceTimeoutMs]);
  useEffect(() => { onFinalTranscriptRef.current = onFinalTranscript; }, [onFinalTranscript]);
  useEffect(() => { onInterimTranscriptRef.current = onInterimTranscript; }, [onInterimTranscript]);

  // Sync voiceState ref
  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (silenceCountdownRef.current) {
      clearInterval(silenceCountdownRef.current);
      silenceCountdownRef.current = null;
    }
    setSilenceCountdown(0);
  }, []);

  // Start silence detection countdown (uses refs, no state deps)
  const startSilenceTimer = useCallback(() => {
    // Clear any existing timer first
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (silenceCountdownRef.current) {
      clearInterval(silenceCountdownRef.current);
      silenceCountdownRef.current = null;
    }
    setSilenceCountdown(0);
    setVoiceState('silence_detected');

    const startTime = Date.now();
    silenceCountdownRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / silenceTimeoutRef.current) * 100);
      setSilenceCountdown(pct);
    }, 50);

    silenceTimerRef.current = setTimeout(() => {
      if (silenceCountdownRef.current) {
        clearInterval(silenceCountdownRef.current);
        silenceCountdownRef.current = null;
      }
      setSilenceCountdown(0);

      // Only auto-submit if we've had enough speech
      const speechDuration = Date.now() - speechStartTimeRef.current;
      if (accumulatedTranscriptRef.current.trim() && speechDuration >= MIN_SPEECH_LENGTH_MS) {
        const finalResult = accumulatedTranscriptRef.current.trim();
        setFinalText(finalResult);
        setInterimText('');
        setVoiceState('idle');
        isStoppingRef.current = true;

        try { recognitionRef.current?.stop(); } catch { /* ignore */ }

        if (autoSubmitRef.current && finalResult) {
          onFinalTranscriptRef.current(finalResult);
        }
      } else {
        // Not enough speech yet, go back to listening
        setVoiceState('listening');
      }
    }, silenceTimeoutRef.current);
  }, []); // No dependencies — uses refs internally

  // Reset silence timer on speech activity (uses refs, no state deps)
  const resetSilenceTimer = useCallback(() => {
    // Clear existing timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (silenceCountdownRef.current) {
      clearInterval(silenceCountdownRef.current);
      silenceCountdownRef.current = null;
    }
    setSilenceCountdown(0);
    setVoiceState('speech_detected');
  }, []); // No dependencies — uses refs internally

  // Initialize Web Speech API — ONLY depends on currentDialect
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.lang = currentDialect;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isStoppingRef.current = false;
      speechStartTimeRef.current = Date.now();
      accumulatedTranscriptRef.current = '';
      setVoiceState('listening');
      setInterimText('');
      setFinalText('');
    };

    recognition.onresult = (event: any) => {
      if (isStoppingRef.current) return;

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Accumulate final results
      if (finalTranscript) {
        accumulatedTranscriptRef.current += finalTranscript;
        setFinalText(accumulatedTranscriptRef.current);
        setInterimText('');
      }

      // Show interim results
      if (interimTranscript) {
        setInterimText(interimTranscript);
        onInterimTranscriptRef.current?.(accumulatedTranscriptRef.current + interimTranscript);
      }

      // Speech detected — reset silence timer, then start a new one
      resetSilenceTimer();
      startSilenceTimer();
    };

    recognition.onerror = (event: any) => {
      // Ignore "no-speech" and "aborted" — normal silence / intentional stop
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      clearSilenceTimer();
      setVoiceState('idle');
      setInterimText('');
      toast.error('حدث خطأ في التعرف على الصوت');
    };

    recognition.onend = () => {
      clearSilenceTimer();

      // If we're not intentionally stopping and have text, restart to keep listening
      if (!isStoppingRef.current && accumulatedTranscriptRef.current.trim() && voiceStateRef.current !== 'idle') {
        try {
          recognition.start();
        } catch {
          setVoiceState('idle');
        }
        return;
      }

      setVoiceState('idle');
      setInterimText('');
    };

    recognitionRef.current = recognition;

    return () => {
      isStoppingRef.current = true;
      clearSilenceTimer();
      recognition.abort();
    };
  }, [currentDialect]); // ONLY re-create when dialect changes

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (voiceStateRef.current !== 'idle') return;

    try {
      isStoppingRef.current = false;
      accumulatedTranscriptRef.current = '';
      recognitionRef.current.lang = currentDialect;
      recognitionRef.current.start();
      toast.info('🎤 تحدث الآن... سيتم الإرسال تلقائياً عند التوقف');
    } catch {
      toast.error('تعذر تشغيل التعرف على الصوت');
    }
  }, [currentDialect]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    isStoppingRef.current = true;
    clearSilenceTimer();

    // If we have accumulated text, submit it
    if (accumulatedTranscriptRef.current.trim()) {
      const finalResult = accumulatedTranscriptRef.current.trim();
      setFinalText(finalResult);
      if (autoSubmitRef.current && finalResult) {
        onFinalTranscriptRef.current(finalResult);
      }
    }

    try { recognitionRef.current.stop(); } catch { /* ignore */ }

    setVoiceState('idle');
    setInterimText('');
  }, [clearSilenceTimer]);

  const toggleListening = useCallback(() => {
    if (voiceStateRef.current !== 'idle') {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  const setDialect = useCallback((newDialect: string) => {
    setCurrentDialect(newDialect);
    // If currently listening, restart with new dialect
    if (voiceStateRef.current !== 'idle' && recognitionRef.current) {
      isStoppingRef.current = true;
      clearSilenceTimer();
      try { recognitionRef.current.stop(); } catch { /* ignore */ }

      // Restart after a brief delay with new dialect
      setTimeout(() => {
        isStoppingRef.current = false;
        accumulatedTranscriptRef.current = '';
        if (recognitionRef.current) {
          recognitionRef.current.lang = newDialect;
          try {
            recognitionRef.current.start();
          } catch {
            setVoiceState('idle');
          }
        }
      }, 300);
    }
  }, [clearSilenceTimer]);

  return {
    isSupported,
    voiceState,
    isListening: voiceState !== 'idle',
    interimText,
    finalText,
    startListening,
    stopListening,
    toggleListening,
    currentDialect,
    availableDialects: ARABIC_DIALECTS,
    setDialect,
    silenceCountdown,
  };
}

export { ARABIC_DIALECTS };
export type { VoiceState, UseVoiceInputOptions };