import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Image, Upload, RotateCcw, Search, Eye, EyeOff, Filter } from 'lucide-react';
import { getAllPaymentLogos, type PaymentLogoConfig } from '@/lib/paymentLogos';
import PaymentLogo from '@/components/PaymentLogo';

type CategoryFilter = 'all' | 'gateway' | 'method' | 'bnpl';

const AdminPaymentLogos: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    getAllPaymentLogos().forEach(logo => {
      initial[logo.id] = true;
    });
    return initial;
  });

  const allLogos = getAllPaymentLogos();

  const filteredLogos = allLogos.filter(logo => {
    const matchesSearch =
      logo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      logo.nameAr.includes(searchQuery);
    const matchesCategory = categoryFilter === 'all' || logo.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleVisibility = (id: string) => {
    setVisibility(prev => ({ ...prev, [id]: !prev[id] }));
    const logo = allLogos.find(l => l.id === id);
    if (logo) {
      const isNowVisible = !visibility[id];
      toast.success(
        t(
          `تم ${isNowVisible ? 'إظهار' : 'إخفاء'} ${logo.nameAr}`,
          `${logo.name} ${isNowVisible ? 'shown' : 'hidden'}`
        )
      );
    }
  };

  const handleResetToOfficial = (logo: PaymentLogoConfig) => {
    toast.success(t(`تم إعادة تعيين شعار ${logo.nameAr} إلى الرسمي`, `${logo.name} logo reset to official`));
  };

  const handleUploadCustom = (logo: PaymentLogoConfig) => {
    toast.info(t(`رفع شعار مخصص لـ ${logo.nameAr} - قريباً`, `Custom upload for ${logo.name} - coming soon`));
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'gateway':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">{t('بوابة', 'Gateway')}</Badge>;
      case 'method':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">{t('طريقة دفع', 'Method')}</Badge>;
      case 'bnpl':
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">{t('تقسيط', 'BNPL')}</Badge>;
      default:
        return null;
    }
  };

  const categories: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: t('الكل', 'All') },
    { value: 'gateway', label: t('البوابات', 'Gateways') },
    { value: 'method', label: t('طرق الدفع', 'Methods') },
    { value: 'bnpl', label: t('التقسيط', 'BNPL') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Image className="h-6 w-6" />
            {t('إدارة شعارات الدفع', 'Payment Logos Management')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('إدارة وتخصيص شعارات بوابات وطرق الدفع', 'Manage and customize payment gateway and method logos')}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {filteredLogos.length} {t('شعار', 'logos')}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('بحث عن شعار...', 'Search logos...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          {categories.map(cat => (
            <Button
              key={cat.value}
              size="sm"
              variant={categoryFilter === cat.value ? 'default' : 'outline'}
              onClick={() => setCategoryFilter(cat.value)}
              className="text-xs"
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Logo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredLogos.map(logo => (
          <Card
            key={logo.id}
            className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
              !visibility[logo.id] ? 'opacity-50' : ''
            }`}
          >
            <CardContent className="p-4 space-y-4">
              {/* Logo Preview */}
              <div className="flex items-center justify-center h-20 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                <PaymentLogo logoId={logo.id} size="lg" />
              </div>

              {/* Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {language === 'ar' ? logo.nameAr : logo.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {language === 'ar' ? logo.name : logo.nameAr}
                    </p>
                  </div>
                  {getCategoryBadge(logo.category)}
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {visibility[logo.id] ? (
                      <Eye className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span>{visibility[logo.id] ? t('ظاهر', 'Visible') : t('مخفي', 'Hidden')}</span>
                  </div>
                  <Switch
                    checked={visibility[logo.id]}
                    onCheckedChange={() => toggleVisibility(logo.id)}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => handleResetToOfficial(logo)}
                  >
                    <RotateCcw className="h-3 w-3 me-1" />
                    {t('إعادة تعيين', 'Reset')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => handleUploadCustom(logo)}
                  >
                    <Upload className="h-3 w-3 me-1" />
                    {t('رفع', 'Upload')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLogos.length === 0 && (
        <div className="text-center py-12">
          <Image className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {t('لا توجد شعارات مطابقة للبحث', 'No logos match your search')}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentLogos;