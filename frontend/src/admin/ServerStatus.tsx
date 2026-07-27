import React, { useState, useEffect, useRef, useCallback } from 'react';
import { client } from '@/lib/sdk';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';
import { Wifi, WifiOff } from 'lucide-react';

interface ServerStatusState {
  isConnected: boolean;
  lastChecked: Date | null;
  checking: boolean;
}

const POLL_INTERVAL = 15000; // 15 seconds

const ServerStatus: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [status, setStatus] = useState<ServerStatusState>({
    isConnected: true,
    lastChecked: null,
    checking: true,
  });

  const prevConnected = useRef<boolean | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkHealth = useCallback(async () => {
    setStatus(prev => ({ ...prev, checking: true }));
    try {
      await client.apiCall.invoke({ url: '/health', method: 'GET' });
      const now = new Date();
      setStatus({ isConnected: true, lastChecked: now, checking: false });

      // Notify on recovery
      if (prevConnected.current === false) {
        toast.success(t('تم استعادة الاتصال بالخادم', 'Server connection restored'), {
          duration: 4000,
        });
      }
      prevConnected.current = true;
    } catch {
      setStatus(prev => ({ ...prev, isConnected: false, checking: false }));

      // Notify on disconnect
      if (prevConnected.current !== false) {
        toast.error(t('فقد الاتصال بالخادم', 'Server connection lost'), {
          duration: 5000,
        });
      }
      prevConnected.current = false;
    }
  }, [language]);

  useEffect(() => {
    checkHealth();
    intervalRef.current = setInterval(checkHealth, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkHealth]);

  const formatTime = (date: Date | null): string => {
    if (!date) return t('جاري الفحص...', 'Checking...');
    return date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-700/50 cursor-default select-none"
      title={
        status.isConnected
          ? t('الخادم متصل', 'Server connected')
          : t('الخادم غير متصل', 'Server disconnected')
      }
    >
      {/* Status indicator dot */}
      <div className="relative flex items-center">
        {status.isConnected ? (
          <Wifi className="h-4 w-4 text-emerald-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span
          className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${
            status.checking
              ? 'bg-yellow-400 animate-pulse'
              : status.isConnected
              ? 'bg-emerald-500'
              : 'bg-red-500 animate-pulse'
          }`}
        />
      </div>

      {/* Status text */}
      <div className="hidden md:flex flex-col items-start leading-none">
        <span
          className={`text-[11px] font-medium ${
            status.isConnected
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {status.isConnected ? t('متصل', 'Connected') : t('غير متصل', 'Disconnected')}
        </span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          {formatTime(status.lastChecked)}
        </span>
      </div>
    </div>
  );
};

export default ServerStatus;