import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5F5F5] hover:bg-[#EDEDED] dark:bg-[#2A2A2A] dark:hover:bg-[#3A3A3A] transition-colors ${className}`}
      aria-label={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
      title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4.5 w-4.5 text-yellow-400" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-[#666]" />
      )}
    </button>
  );
}