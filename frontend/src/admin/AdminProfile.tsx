import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  User, Mail, Phone, Shield, Monitor, Clock, CreditCard, Bell,
  Trash2, LogOut, Lock, Globe, AlertCircle, Camera, Eye, EyeOff
} from 'lucide-react';

const loginHistory = [
  { device: 'Chrome - Windows', ip: '192.168.1.1', time: '2025-05-06 10:30', location: 'الرياض' },
  { device: 'Safari - iPhone', ip: '192.168.1.2', time: '2025-05-05 14:20', location: 'جدة' },
  { device: 'Chrome - MacOS', ip: '192.168.1.3', time: '2025-05-04 09:15', location: 'الرياض' },
];

const activityLog = [
  { action: 'تسجيل دخول', time: '2025-05-06 10:30', details: 'Chrome - Windows' },
  { action: 'تحليل سيرة ذاتية', time: '2025-05-06 10:45', details: '3 ملفات' },
  { action: 'بحث في النظام', time: '2025-05-06 11:00', details: 'المادة 77' },
  { action: 'تحليل عقد', time: '2025-05-05 14:30', details: 'عقد عمل محدد المدة' },
  { action: 'تغيير كلمة المرور', time: '2025-05-04 09:20', details: '' },
];

const AdminProfile: React.FC = () => {
  const { language, toggleLanguage } = useTheme();
  const { user } = useAuth();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  // Determine if user is admin
  const isAdmin = (user as any)?.role === 'admin';

  const [twoFA, setTwoFA] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);

  // Profile form state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState('+966501234567');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Preferences
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [timezone, setTimezone] = useState('Asia/Riyadh');
  const [dateFormat, setDateFormat] = useState('dd/mm/yyyy');

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
    }
  }, [user]);

  const handleSavePreferences = () => {
    if (selectedLanguage !== language) {
      toggleLanguage();
    }
    toast.success(t('تم حفظ التفضيلات بنجاح', 'Preferences saved successfully'));
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('يرجى ملء جميع الحقول', 'Please fill all fields'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('كلمة المرور الجديدة غير متطابقة', 'New passwords do not match'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'Password must be at least 8 characters'));
      return;
    }

    setChangingPassword(true);
    try {
      // Simulate password change (in real app, call backend API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(t('تم تغيير كلمة المرور بنجاح', 'Password changed successfully'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error(t('فشل تغيير كلمة المرور', 'Failed to change password'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveProfile = () => {
    if (isAdmin) {
      toast.success(t('تم حفظ التغييرات بنجاح', 'Changes saved successfully'));
    } else {
      toast.error(t('لا يمكنك تعديل هذه البيانات', 'You cannot edit this information'));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Header */}
      <Card className="border-0 shadow-sm dark:bg-slate-800">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
                </span>
              </div>
              <button className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="text-center sm:text-start">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name || 'Admin User'}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || 'admin@salmo.ai'}</p>
              <Badge className="mt-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {isAdmin ? t('مدير النظام', 'Administrator') : t('مستخدم', 'User')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="bg-gray-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="account">{t('الحساب', 'Account')}</TabsTrigger>
          <TabsTrigger value="password">{t('كلمة المرور', 'Password')}</TabsTrigger>
          <TabsTrigger value="preferences">{t('التفضيلات', 'Preferences')}</TabsTrigger>
          <TabsTrigger value="subscription">{t('الاشتراك', 'Subscription')}</TabsTrigger>
          <TabsTrigger value="security">{t('الأمان', 'Security')}</TabsTrigger>
          <TabsTrigger value="activity">{t('النشاط', 'Activity')}</TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account">
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-base">{t('إعدادات الحساب', 'Account Settings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Restriction notice for non-admin users */}
              {!isAdmin && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {t('البيانات الأساسية غير قابلة للتعديل', 'Basic information cannot be edited')}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {t(
                        'لا يمكن تعديل الاسم والبريد الإلكتروني ورقم الجوال. يرجى التواصل مع المسؤول لإجراء أي تغييرات.',
                        'Name, email, and phone number cannot be modified. Please contact the administrator for any changes.'
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-1.5">
                    <User className="h-4 w-4" />{t('الاسم الكامل', 'Full Name')}
                    {!isAdmin && <Lock className="h-3 w-3 text-gray-400" />}
                  </label>
                  <Input
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    disabled={!isAdmin}
                    className={!isAdmin ? 'bg-gray-100 dark:bg-slate-700 cursor-not-allowed' : ''}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-1.5">
                    <Mail className="h-4 w-4" />{t('البريد الإلكتروني', 'Email')}
                    {!isAdmin && <Lock className="h-3 w-3 text-gray-400" />}
                  </label>
                  <Input
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    disabled={!isAdmin}
                    className={!isAdmin ? 'bg-gray-100 dark:bg-slate-700 cursor-not-allowed' : ''}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-1.5">
                    <Phone className="h-4 w-4" />{t('رقم الجوال', 'Phone')}
                    {!isAdmin && <Lock className="h-3 w-3 text-gray-400" />}
                  </label>
                  <Input
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)}
                    disabled={!isAdmin}
                    className={!isAdmin ? 'bg-gray-100 dark:bg-slate-700 cursor-not-allowed' : ''}
                  />
                </div>
              </div>
              {isAdmin && (
                <div className="pt-4 border-t dark:border-slate-700">
                  <Button onClick={handleSaveProfile}>{t('حفظ التغييرات', 'Save Changes')}</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border-0 shadow-sm dark:bg-slate-800 mt-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />{t('الإشعارات', 'Notifications')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('إشعارات البريد', 'Email Notifications')}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('استلام إشعارات عبر البريد', 'Receive notifications via email')}</p>
                </div>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('إشعارات الدفع', 'Push Notifications')}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('إشعارات فورية في المتصفح', 'Instant browser notifications')}</p>
                </div>
                <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('إشعارات SMS', 'SMS Notifications')}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('رسائل نصية للتنبيهات المهمة', 'Text messages for important alerts')}</p>
                </div>
                <Switch checked={smsNotif} onCheckedChange={setSmsNotif} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Change */}
        <TabsContent value="password">
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />{t('تغيير كلمة المرور', 'Change Password')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('كلمة المرور الحالية', 'Current Password')}
                </label>
                <div className="relative">
                  <Input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder={t('أدخل كلمة المرور الحالية', 'Enter current password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 end-0 h-full"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                  >
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('كلمة المرور الجديدة', 'New Password')}
                </label>
                <div className="relative">
                  <Input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={t('أدخل كلمة المرور الجديدة', 'Enter new password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 end-0 h-full"
                    onClick={() => setShowNewPw(!showNewPw)}
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">{t('8 أحرف على الأقل', 'At least 8 characters')}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('تأكيد كلمة المرور', 'Confirm Password')}
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('أعد إدخال كلمة المرور الجديدة', 'Re-enter new password')}
                />
              </div>

              <div className="pt-4">
                <Button onClick={handleChangePassword} disabled={changingPassword}>
                  {changingPassword ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  {t('تغيير كلمة المرور', 'Change Password')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences">
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />{t('التفضيلات', 'Preferences')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 max-w-md">
              {/* Language */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('اللغة', 'Language')}
                </label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('المنطقة الزمنية', 'Timezone')}
                </label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Riyadh">{t('الرياض (GMT+3)', 'Riyadh (GMT+3)')}</SelectItem>
                    <SelectItem value="Asia/Dubai">{t('دبي (GMT+4)', 'Dubai (GMT+4)')}</SelectItem>
                    <SelectItem value="Africa/Cairo">{t('القاهرة (GMT+2)', 'Cairo (GMT+2)')}</SelectItem>
                    <SelectItem value="Europe/London">{t('لندن (GMT+0)', 'London (GMT+0)')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Format */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('تنسيق التاريخ', 'Date Format')}
                </label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t dark:border-slate-700">
                <Button onClick={handleSavePreferences}>
                  {t('حفظ التفضيلات', 'Save Preferences')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription */}
        <TabsContent value="subscription">
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />{t('تفاصيل الاشتراك', 'Subscription Details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-5 text-white">
                <p className="text-sm opacity-80">{t('الباقة الحالية', 'Current Plan')}</p>
                <h3 className="text-2xl font-bold mt-1">{t('الباقة المؤسسية', 'Enterprise Plan')}</h3>
                <p className="text-sm opacity-80 mt-2">{t('تنتهي في: 2025-12-31', 'Expires: 2025-12-31')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('المبلغ الشهري', 'Monthly Amount')}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">999 {t('ر.س', 'SAR')}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('حالة الدفع', 'Payment Status')}</p>
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 mt-1">
                    {t('مدفوع', 'Paid')}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline">{t('ترقية الباقة', 'Upgrade Plan')}</Button>
                <Button variant="outline">{t('عرض الفواتير', 'View Invoices')}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />{t('الأمان والخصوصية', 'Security & Privacy')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('المصادقة الثنائية', 'Two-Factor Auth')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('حماية إضافية لحسابك', 'Extra protection for your account')}</p>
                </div>
                <Switch checked={twoFA} onCheckedChange={setTwoFA} />
              </div>

              {/* Login History */}
              <div className="pt-4 border-t dark:border-slate-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Monitor className="h-4 w-4" />{t('سجل تسجيل الدخول', 'Login History')}
                </h4>
                <div className="space-y-2">
                  {loginHistory.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{entry.device}</p>
                        <p className="text-xs text-gray-400">{entry.ip} • {entry.location}</p>
                      </div>
                      <span className="text-xs text-gray-500">{entry.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t dark:border-slate-700">
                <h4 className="text-sm font-semibold text-red-600 mb-3">{t('منطقة الخطر', 'Danger Zone')}</h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                    <LogOut className="h-4 w-4 me-2" />{t('تسجيل خروج من كل الأجهزة', 'Logout All Devices')}
                  </Button>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                    <Trash2 className="h-4 w-4 me-2" />{t('حذف الحساب', 'Delete Account')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />{t('سجل النشاطات', 'Activity Log')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityLog.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{entry.action}</p>
                      {entry.details && <p className="text-xs text-gray-400">{entry.details}</p>}
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{entry.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminProfile;