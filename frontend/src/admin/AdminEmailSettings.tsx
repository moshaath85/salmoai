import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchEmailSettings, saveEmailSettings, EmailSettings } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mail, Server, Shield, Save, TestTube, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { invokeWithRetry } from '@/lib/sdk';

const AdminEmailSettings: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_name: '',
    from_email: '',
    is_active: false,
    use_tls: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchEmailSettings();
      if (data) {
        setForm({
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || '',
          smtp_password: data.smtp_password || '',
          from_name: data.from_name || '',
          from_email: data.from_email || '',
          is_active: data.is_active || false,
          use_tls: data.use_tls !== false,
        });
      }
    } catch (err) {
      // No settings yet, use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.smtp_host || !form.smtp_user || !form.from_email) {
      toast.error(t('يرجى ملء الحقول المطلوبة', 'Please fill required fields'));
      return;
    }
    try {
      setSaving(true);
      await saveEmailSettings(form);
      toast.success(t('تم حفظ إعدادات البريد', 'Email settings saved'));
    } catch (err) {
      toast.error(t('فشل حفظ الإعدادات', 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!form.smtp_host || !form.smtp_user || !form.from_email) {
      toast.error(t('يرجى ملء إعدادات SMTP أولاً', 'Please fill SMTP settings first'));
      return;
    }
    try {
      setTesting(true);
      toast.info(t('جاري اختبار اتصال SMTP...', 'Testing SMTP connection...'));
      const response = await invokeWithRetry<{ success: boolean; message?: string }>({
        url: '/api/v1/email/test',
        method: 'POST',
        data: {
          smtp_host: form.smtp_host,
          smtp_port: form.smtp_port,
          smtp_user: form.smtp_user,
          smtp_password: form.smtp_password,
          from_email: form.from_email,
          from_name: form.from_name,
          use_tls: form.use_tls,
        },
      }, 1);
      if (response?.success) {
        toast.success(t('اتصال SMTP ناجح! تم إرسال بريد تجريبي.', 'SMTP connection successful! Test email sent.'));
      } else {
        toast.error(response?.message || t('فشل اختبار SMTP', 'SMTP test failed'));
      }
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || '';
      toast.error(t(`فشل اختبار SMTP: ${message}`, `SMTP test failed: ${message}`));
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('إعدادات البريد الإلكتروني', 'Email Settings')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('تكوين خادم SMTP لإرسال الإشعارات والتنبيهات', 'Configure SMTP server for sending notifications and alerts')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMTP Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-600" />
              {t('إعدادات SMTP', 'SMTP Configuration')}
            </CardTitle>
            <CardDescription>
              {t('إعدادات خادم البريد الصادر', 'Outgoing mail server settings')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t('خادم SMTP', 'SMTP Host')} *</Label>
              <Input
                value={form.smtp_host}
                onChange={e => setForm(prev => ({ ...prev, smtp_host: e.target.value }))}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <Label>{t('المنفذ', 'Port')} *</Label>
              <Input
                type="number"
                value={form.smtp_port}
                onChange={e => setForm(prev => ({ ...prev, smtp_port: parseInt(e.target.value) || 587 }))}
                placeholder="587"
              />
            </div>
            <div>
              <Label>{t('اسم المستخدم', 'Username')} *</Label>
              <Input
                value={form.smtp_user}
                onChange={e => setForm(prev => ({ ...prev, smtp_user: e.target.value }))}
                placeholder="your-email@gmail.com"
              />
            </div>
            <div>
              <Label>{t('كلمة المرور', 'Password')}</Label>
              <Input
                type="password"
                value={form.smtp_password}
                onChange={e => setForm(prev => ({ ...prev, smtp_password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sender Info & Security */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                {t('معلومات المرسل', 'Sender Information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('اسم المرسل', 'From Name')}</Label>
                <Input
                  value={form.from_name}
                  onChange={e => setForm(prev => ({ ...prev, from_name: e.target.value }))}
                  placeholder="Salmo HR"
                />
              </div>
              <div>
                <Label>{t('بريد المرسل', 'From Email')} *</Label>
                <Input
                  type="email"
                  value={form.from_email}
                  onChange={e => setForm(prev => ({ ...prev, from_email: e.target.value }))}
                  placeholder="noreply@salmo.ai"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                {t('الأمان والحالة', 'Security & Status')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('استخدام TLS', 'Use TLS')}</Label>
                  <p className="text-xs text-gray-500">{t('تشفير الاتصال', 'Encrypt connection')}</p>
                </div>
                <Switch
                  checked={form.use_tls}
                  onCheckedChange={v => setForm(prev => ({ ...prev, use_tls: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('تفعيل الإرسال', 'Enable Sending')}</Label>
                  <p className="text-xs text-gray-500">{t('تفعيل إرسال البريد', 'Enable email sending')}</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={v => setForm(prev => ({ ...prev, is_active: v }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          <Save className="h-4 w-4 mr-2" />
          {saving ? t('جاري الحفظ...', 'Saving...') : t('حفظ الإعدادات', 'Save Settings')}
        </Button>
        <Button variant="outline" onClick={handleTestEmail} disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
          {testing ? t('جاري الاختبار...', 'Testing...') : t('إرسال بريد تجريبي', 'Send Test Email')}
        </Button>
      </div>
    </div>
  );
};

export default AdminEmailSettings;