import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { client } from '@/lib/sdk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  CreditCard, Shield, Wifi, WifiOff, AlertTriangle, Settings2,
  TestTube, Eye, EyeOff, Save, RotateCcw, Zap, Globe, Clock,
  CheckCircle2, XCircle, ArrowUpDown, Smartphone
} from 'lucide-react';
import PaymentLogo from '@/components/PaymentLogo';

interface GatewaySettings {
  id: number;
  gateway_name: string;
  display_name: string;
  api_key_encrypted: string;
  secret_key_encrypted: string;
  public_key_encrypted: string;
  webhook_secret_encrypted: string;
  merchant_id: string;
  environment: string;
  is_active: boolean;
  is_default: boolean;
  supported_currencies: string;
  supported_countries: string;
  payment_methods: string;
  sort_order: number;
  last_test_at: string;
  last_test_status: string;
  last_successful_payment_at: string;
  connection_status: string;
  settings_json: string;
  created_at?: string;
  updated_at?: string;
}

interface GatewayFormData {
  api_key: string;
  secret_key: string;
  public_key: string;
  webhook_secret: string;
  merchant_id: string;
  environment: string;
}

const GATEWAY_ICONS: Record<string, React.ReactNode> = {
  moyasar: <PaymentLogo logoId="moyasar" size="sm" />,
  tabby: <PaymentLogo logoId="tabby" size="sm" />,
  tamara: <PaymentLogo logoId="tamara" size="sm" />,
};

const GATEWAY_COLORS: Record<string, string> = {
  moyasar: 'from-blue-500 to-blue-700',
  tabby: 'from-emerald-500 to-emerald-700',
  tamara: 'from-purple-500 to-purple-700',
};

const AdminPaymentGateways: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [gateways, setGateways] = useState<GatewaySettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGateway, setSelectedGateway] = useState<GatewaySettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showVisibility, setShowVisibility] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<GatewayFormData>({
    api_key: '', secret_key: '', public_key: '', webhook_secret: '', merchant_id: '', environment: 'sandbox'
  });
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      setLoading(true);
      const response = await client.entities.payment_gateway_settings.query({
        query: {},
        limit: 50,
        sort: 'sort_order',
      });
      setGateways(response.data?.items || []);
    } catch (error) {
      toast.error(t('فشل تحميل البيانات', 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (gateway: GatewaySettings) => {
    try {
      await client.entities.payment_gateway_settings.update({
        id: String(gateway.id),
        data: { is_active: !gateway.is_active }
      });
      setGateways(prev => prev.map(g =>
        g.id === gateway.id ? { ...g, is_active: !g.is_active } : g
      ));
      toast.success(t(
        `تم ${!gateway.is_active ? 'تفعيل' : 'تعطيل'} ${gateway.display_name}`,
        `${gateway.display_name} ${!gateway.is_active ? 'enabled' : 'disabled'}`
      ));

      // Non-blocking audit log
      try {
        await client.entities.gateway_audit_logs.create({
          data: {
            gateway_name: gateway.gateway_name,
            action: !gateway.is_active ? 'activate' : 'deactivate',
            details: JSON.stringify({ is_active: !gateway.is_active }),
            connection_status_before: gateway.connection_status || 'disconnected',
            connection_status_after: gateway.connection_status || 'disconnected',
          }
        });
      } catch {
        // Audit log failure is non-blocking
      }
    } catch (error) {
      toast.error(t('فشل التحديث', 'Update failed'));
    }
  };

  const handleSetDefault = async (gateway: GatewaySettings) => {
    try {
      // Remove default from all
      for (const g of gateways) {
        if (g.is_default && g.id !== gateway.id) {
          await client.entities.payment_gateway_settings.update({
            id: String(g.id),
            data: { is_default: false }
          });
        }
      }
      await client.entities.payment_gateway_settings.update({
        id: String(gateway.id),
        data: { is_default: true, is_active: true }
      });
      setGateways(prev => prev.map(g => ({
        ...g,
        is_default: g.id === gateway.id,
        is_active: g.id === gateway.id ? true : g.is_active
      })));
      toast.success(t(`تم تعيين ${gateway.display_name} كافتراضي`, `${gateway.display_name} set as default`));

      // Non-blocking audit log
      try {
        await client.entities.gateway_audit_logs.create({
          data: {
            gateway_name: gateway.gateway_name,
            action: 'set_default',
            details: JSON.stringify({ is_default: true }),
            connection_status_before: gateway.connection_status || 'disconnected',
            connection_status_after: gateway.connection_status || 'disconnected',
          }
        });
      } catch {
        // Audit log failure is non-blocking
      }
    } catch (error) {
      toast.error(t('فشل التحديث', 'Update failed'));
    }
  };

  const openSettings = (gateway: GatewaySettings) => {
    setSelectedGateway(gateway);
    setFormData({
      api_key: '',
      secret_key: '',
      public_key: '',
      webhook_secret: '',
      merchant_id: gateway.merchant_id || '',
      environment: gateway.environment || 'sandbox',
    });
    setShowSettings(true);
  };

  const handleSaveSettings = async () => {
    if (!selectedGateway) return;
    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        environment: formData.environment,
        merchant_id: formData.merchant_id,
      };
      if (formData.api_key) updateData.api_key_encrypted = formData.api_key;
      if (formData.secret_key) updateData.secret_key_encrypted = formData.secret_key;
      if (formData.public_key) updateData.public_key_encrypted = formData.public_key;
      if (formData.webhook_secret) updateData.webhook_secret_encrypted = formData.webhook_secret;

      await client.entities.payment_gateway_settings.update({
        id: String(selectedGateway.id),
        data: updateData,
      });

      // Settings saved successfully - show success immediately
      toast.success(t('تم حفظ الإعدادات بنجاح', 'Settings saved successfully'));
      setShowSettings(false);
      loadGateways();

      // Non-blocking audit log - failure here does not affect the save
      try {
        await client.entities.gateway_audit_logs.create({
          data: {
            gateway_name: selectedGateway.gateway_name,
            action: 'update_keys',
            details: JSON.stringify({ fields_updated: Object.keys(updateData), environment: formData.environment }),
            connection_status_before: selectedGateway.connection_status || 'disconnected',
            connection_status_after: selectedGateway.connection_status || 'disconnected',
          }
        });
      } catch {
        // Audit log failure is non-blocking - settings were already saved
      }
    } catch (error) {
      toast.error(t('فشل حفظ الإعدادات', 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (gateway: GatewaySettings) => {
    setTesting(gateway.gateway_name);
    try {
      // Call the real backend test connection endpoint
      const response = await client.apiCall.invoke<{
        success: boolean;
        gateway_name: string;
        status: string;
        message: string;
        response_time_ms: number;
        tested_at: string;
        warning?: string;
      }>({
        url: '/api/v1/gateway-test/test-connection',
        method: 'POST',
        data: {
          gateway_id: gateway.id,
          api_key: '', // Use stored key
        },
      });

      // Handle both direct response and AxiosResponse wrapper
      const result = (response as any)?.data ?? response;

      setGateways(prev => prev.map(g =>
        g.id === gateway.id ? {
          ...g,
          connection_status: result.status,
          last_test_at: result.tested_at,
          last_test_status: result.success ? 'success' : 'failed'
        } : g
      ));

      if (result.success) {
        toast.success(t('الاتصال ناجح', 'Connection successful') + ` (${result.response_time_ms}ms)`);
        if (result.warning) {
          toast.warning(result.warning, { duration: 8000 });
        }
      } else {
        toast.error(result.message || t('فشل الاتصال - تحقق من المفاتيح', 'Connection failed - check API keys'));
      }

      // Non-blocking audit log
      try {
        await client.entities.gateway_audit_logs.create({
          data: {
            gateway_name: gateway.gateway_name,
            action: 'test_connection',
            details: JSON.stringify({
              result: result.success ? 'success' : 'failed',
              message: result.message,
              response_time_ms: result.response_time_ms,
            }),
            connection_status_before: gateway.connection_status || 'disconnected',
            connection_status_after: result.status,
          }
        });
      } catch {
        // Audit log failure is non-blocking
      }
    } catch (error: any) {
      toast.error(error?.message || t('فشل اختبار الاتصال', 'Connection test failed'));
    } finally {
      setTesting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />{t('متصل', 'Connected')}</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0"><XCircle className="h-3 w-3 mr-1" />{t('خطأ', 'Error')}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-0"><WifiOff className="h-3 w-3 mr-1" />{t('غير متصل', 'Disconnected')}</Badge>;
    }
  };

  const getEnvBadge = (env: string) => {
    if (env === 'production') {
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0"><Globe className="h-3 w-3 mr-1" />Live</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0"><TestTube className="h-3 w-3 mr-1" />Sandbox</Badge>;
  };

  const toggleFieldVisibility = (field: string) => {
    setShowVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('إعدادات بوابات الدفع', 'Payment Gateway Settings')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('إدارة وتكوين بوابات الدفع المتاحة', 'Manage and configure available payment gateways')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadGateways}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('تحديث', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Gateway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gateways.map(gateway => (
          <Card key={gateway.id} className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${gateway.is_active ? 'ring-2 ring-blue-200 dark:ring-blue-800' : 'opacity-75'}`}>
            {/* Gradient header */}
            <div className={`h-2 bg-gradient-to-r ${GATEWAY_COLORS[gateway.gateway_name] || 'from-gray-400 to-gray-600'}`} />

            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${GATEWAY_COLORS[gateway.gateway_name] || 'from-gray-400 to-gray-600'} flex items-center justify-center text-white`}>
                    {GATEWAY_ICONS[gateway.gateway_name] || <CreditCard className="h-5 w-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{gateway.display_name}</CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{gateway.gateway_name}</p>
                  </div>
                </div>
                <Switch
                  checked={gateway.is_active}
                  onCheckedChange={() => handleToggleActive(gateway)}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(gateway.connection_status)}
                {getEnvBadge(gateway.environment)}
                {gateway.is_default && (
                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                    {t('افتراضي', 'Default')}
                  </Badge>
                )}
              </div>

              {/* Payment methods */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('طرق الدفع', 'Payment Methods')}</p>
                <div className="flex flex-wrap gap-1">
                  {JSON.parse(gateway.payment_methods || '[]').map((method: string) => (
                    <Badge key={method} variant="outline" className="text-xs capitalize">
                      {method.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Last test info */}
              {gateway.last_test_at && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>{t('آخر اختبار:', 'Last test:')} {new Date(gateway.last_test_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openSettings(gateway)}>
                  <Settings2 className="h-3.5 w-3.5 mr-1" />
                  {t('إعدادات', 'Settings')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleTestConnection(gateway)}
                  disabled={testing === gateway.gateway_name}
                >
                  {testing === gateway.gateway_name ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current mr-1" />
                  ) : (
                    <Wifi className="h-3.5 w-3.5 mr-1" />
                  )}
                  {t('اختبار', 'Test')}
                </Button>
                {!gateway.is_default && (
                  <Button size="sm" variant="ghost" onClick={() => handleSetDefault(gateway)} title={t('تعيين كافتراضي', 'Set as default')}>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Checkout Payment Methods Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('إدارة طرق الدفع في Checkout', 'Checkout Payment Methods')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('ترتيب وإدارة طرق الدفع المعروضة للعملاء حسب الأولوية', 'Manage and prioritize payment methods shown to customers')}
            </p>
            <div className="space-y-2">
              {gateways.filter(g => g.is_active).map((gateway, index) => (
                <div key={gateway.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                    <div className={`w-8 h-8 rounded bg-gradient-to-br ${GATEWAY_COLORS[gateway.gateway_name] || 'from-gray-400 to-gray-600'} flex items-center justify-center text-white`}>
                      {GATEWAY_ICONS[gateway.gateway_name] || <CreditCard className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{gateway.display_name}</p>
                      <p className="text-xs text-gray-500">{JSON.parse(gateway.payment_methods || '[]').join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {gateway.is_default && <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 text-xs">{t('افتراضي', 'Default')}</Badge>}
                    {getStatusBadge(gateway.connection_status)}
                  </div>
                </div>
              ))}
              {gateways.filter(g => g.is_active).length === 0 && (
                <p className="text-center text-gray-500 py-4">{t('لا توجد بوابات مفعلة', 'No active gateways')}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t(`إعدادات ${selectedGateway?.display_name}`, `${selectedGateway?.display_name} Settings`)}
            </DialogTitle>
          </DialogHeader>

          {selectedGateway && (
            <Tabs defaultValue="keys" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="keys">{t('مفاتيح API', 'API Keys')}</TabsTrigger>
                <TabsTrigger value="config">{t('الإعدادات', 'Configuration')}</TabsTrigger>
              </TabsList>

              <TabsContent value="keys" className="space-y-4 mt-4">
                {/* API Key */}
                <div className="space-y-2">
                  <Label>{t('مفتاح API (Secret Key)', 'API Key (Secret Key)')}</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('المفتاح السري (Secret Key) - يستخدم للعمليات الخلفية', 'Secret Key - used for backend operations')}
                  </p>
                  <div className="relative">
                    <Input
                      type={showVisibility['api_key'] ? 'text' : 'password'}
                      placeholder={selectedGateway.api_key_encrypted ? '••••••••••••' : t('أدخل مفتاح API', 'Enter API Key')}
                      value={formData.api_key}
                      onChange={e => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-0 end-0 h-full"
                      onClick={() => toggleFieldVisibility('api_key')}
                    >
                      {showVisibility['api_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {selectedGateway.api_key_encrypted && (
                    <p className="text-xs text-green-600 dark:text-green-400">✓ {t('مفتاح محفوظ ومشفر', 'Key saved and encrypted')}</p>
                  )}
                </div>

                {/* Secret Key */}
                <div className="space-y-2">
                  <Label>{t('المفتاح السري', 'Secret Key')}</Label>
                  <div className="relative">
                    <Input
                      type={showVisibility['secret_key'] ? 'text' : 'password'}
                      placeholder={selectedGateway.secret_key_encrypted ? '••••••••••••' : t('أدخل المفتاح السري', 'Enter Secret Key')}
                      value={formData.secret_key}
                      onChange={e => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-0 end-0 h-full"
                      onClick={() => toggleFieldVisibility('secret_key')}
                    >
                      {showVisibility['secret_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Public Key */}
                <div className="space-y-2 p-3 rounded-lg border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/20">
                  <Label className="flex items-center gap-2">
                    {t('المفتاح العام (Publishable Key)', 'Public Key (Publishable Key)')}
                  </Label>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {t('المفتاح العام (Publishable Key) - مطلوب لنموذج الدفع في الواجهة', 'Publishable Key - required for frontend payment form')}
                  </p>
                  <div className="relative">
                    <Input
                      type={showVisibility['public_key'] ? 'text' : 'password'}
                      placeholder={selectedGateway.public_key_encrypted ? '••••••••••••' : t('أدخل المفتاح العام', 'Enter Public Key')}
                      value={formData.public_key}
                      onChange={e => setFormData(prev => ({ ...prev, public_key: e.target.value }))}
                      className="border-amber-200 dark:border-amber-700"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-0 end-0 h-full"
                      onClick={() => toggleFieldVisibility('public_key')}
                    >
                      {showVisibility['public_key'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {!selectedGateway.public_key_encrypted && !formData.public_key && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      ⚠️ {t('مطلوب لعمل صفحة الدفع', 'Required for checkout page to work')}
                    </p>
                  )}
                </div>

                {/* Webhook Secret */}
                <div className="space-y-2">
                  <Label>{t('مفتاح Webhook', 'Webhook Secret')}</Label>
                  <div className="relative">
                    <Input
                      type={showVisibility['webhook_secret'] ? 'text' : 'password'}
                      placeholder={selectedGateway.webhook_secret_encrypted ? '••••••••••••' : t('أدخل مفتاح Webhook', 'Enter Webhook Secret')}
                      value={formData.webhook_secret}
                      onChange={e => setFormData(prev => ({ ...prev, webhook_secret: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-0 end-0 h-full"
                      onClick={() => toggleFieldVisibility('webhook_secret')}
                    >
                      {showVisibility['webhook_secret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Merchant ID */}
                <div className="space-y-2">
                  <Label>{t('معرف التاجر', 'Merchant ID')}</Label>
                  <Input
                    placeholder={t('أدخل معرف التاجر', 'Enter Merchant ID')}
                    value={formData.merchant_id}
                    onChange={e => setFormData(prev => ({ ...prev, merchant_id: e.target.value }))}
                  />
                </div>
              </TabsContent>

              <TabsContent value="config" className="space-y-4 mt-4">
                {/* Environment */}
                <div className="space-y-2">
                  <Label>{t('البيئة', 'Environment')}</Label>
                  <Select value={formData.environment} onValueChange={v => setFormData(prev => ({ ...prev, environment: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">
                        <span className="flex items-center gap-2">
                          <TestTube className="h-4 w-4 text-yellow-500" /> Sandbox
                        </span>
                      </SelectItem>
                      <SelectItem value="production">
                        <span className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-500" /> Production
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {formData.environment === 'sandbox'
                      ? t('وضع الاختبار - لا يتم خصم أموال حقيقية', 'Test mode - no real charges')
                      : t('وضع الإنتاج - يتم خصم أموال حقيقية', 'Production mode - real charges apply')}
                  </p>
                </div>

                {/* Supported currencies */}
                <div className="space-y-2">
                  <Label>{t('العملات المدعومة', 'Supported Currencies')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(selectedGateway.supported_currencies || '[]').map((currency: string) => (
                      <Badge key={currency} variant="outline">{currency}</Badge>
                    ))}
                  </div>
                </div>

                {/* Supported countries */}
                <div className="space-y-2">
                  <Label>{t('الدول المدعومة', 'Supported Countries')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(selectedGateway.supported_countries || '[]').map((country: string) => (
                      <Badge key={country} variant="outline">{country}</Badge>
                    ))}
                  </div>
                </div>

                {/* Payment methods */}
                <div className="space-y-2">
                  <Label>{t('طرق الدفع', 'Payment Methods')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(selectedGateway.payment_methods || '[]').map((method: string) => (
                      <Badge key={method} variant="secondary" className="capitalize">{method.replace('_', ' ')}</Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              {t('إلغاء', 'Cancel')}
            </Button>
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {t('حفظ الإعدادات', 'Save Settings')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentGateways;