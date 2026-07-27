import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { getPaymentLogo } from '@/lib/paymentLogos';

interface PaymentLogoProps {
  logoId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: { width: 32, height: 20 },
  md: { width: 48, height: 30 },
  lg: { width: 64, height: 40 },
};

export default function PaymentLogo({ logoId, size = 'md', className = '' }: PaymentLogoProps) {
  const { theme } = useTheme();
  const [hasError, setHasError] = useState(false);
  const logo = getPaymentLogo(logoId);

  if (!logo) return null;

  const dimensions = sizeMap[size];
  const logoUrl = theme === 'dark' ? logo.darkLogoUrl : logo.logoUrl;
  const initials = logo.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (hasError) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-md font-bold text-white transition-transform duration-200 hover:scale-110 ${className}`}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: logo.fallbackColor,
          fontSize: size === 'sm' ? '8px' : size === 'md' ? '10px' : '12px',
        }}
        title={logo.name}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={logo.name}
      loading="lazy"
      width={dimensions.width}
      height={dimensions.height}
      className={`object-contain transition-transform duration-200 hover:scale-110 ${className}`}
      style={{ width: dimensions.width, height: dimensions.height }}
      onError={() => setHasError(true)}
      title={logo.name}
    />
  );
}