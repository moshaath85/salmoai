import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Crown, Zap, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface Package {
  id: number;
  name: string;
  price: number;
  billing_cycle: string;
  max_users: number;
  features: string[];
  status: string | null;
}

const packageIcons: Record<number, React.ReactNode> = {
  1: <Zap className="h-8 w-8 text-teal-500" />,
  2: <Crown className="h-8 w-8 text-indigo-500" />,
  3: <Building2 className="h-8 w-8 text-amber-500" />,
};

const packageColors: Record<number, string> = {
  1: 'border-teal-200 dark:border-teal-800',
  2: 'border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-500/20',
  3: 'border-amber-200 dark:border-amber-800',
};

const SelectPackage: React.FC = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${BASE_URL}/api/v1/packages`);
      if (!response.ok) throw new Error('Failed to fetch packages');
      const data = await response.json();
      setPackages(data);
    } catch {
      setError('فشل في تحميل الباقات. يرجى المحاولة مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (pkg: Package) => {
    setSelecting(pkg.id);
    // For MVP, just show success and redirect
    setTimeout(() => {
      toast.success(`تم اختيار ${pkg.name} بنجاح`);
      navigate('/chat', { replace: true });
    }, 1000);
  };

  const getBillingLabel = (cycle: string) => {
    switch (cycle) {
      case 'monthly':
        return 'شهرياً';
      case 'yearly':
        return 'سنوياً';
      default:
        return cycle;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل الباقات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 px-4 py-12" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <img
            src="/assets/salmo-logo.avif"
            alt="SALMO"
            className="h-12 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            اختر الباقة المناسبة
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            اختر الباقة التي تناسب احتياجات شركتك
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center mb-8 max-w-md mx-auto">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={fetchPackages}
              className="mt-2 text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg, index) => (
            <div
              key={pkg.id}
              className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg border ${packageColors[index + 1] || 'border-gray-200 dark:border-slate-700'} p-6 flex flex-col relative overflow-hidden transition-transform hover:scale-[1.02]`}
            >
              {/* Popular badge for middle package */}
              {index === 1 && (
                <div className="absolute top-0 left-0 right-0 bg-indigo-500 text-white text-xs font-bold text-center py-1">
                  الأكثر شيوعاً
                </div>
              )}

              <div className={`${index === 1 ? 'mt-4' : ''}`}>
                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-4">
                  {packageIcons[index + 1] || <Zap className="h-8 w-8 text-gray-500" />}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {pkg.name}
                  </h3>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {pkg.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 mr-1">
                    ر.س / {getBillingLabel(pkg.billing_cycle)}
                  </span>
                </div>

                {/* Max Users */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  حتى {pkg.max_users} مستخدم
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-grow">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Select Button */}
              <button
                onClick={() => handleSelect(pkg)}
                disabled={selecting !== null}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-lg transition-colors duration-200 mt-auto ${
                  index === 1
                    ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white'
                    : 'bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white'
                }`}
              >
                {selecting === pkg.id ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>جاري الاختيار...</span>
                  </>
                ) : (
                  <span>اختيار الباقة</span>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Skip for now */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/chat', { replace: true })}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm underline"
          >
            تخطي واختيار لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectPackage;