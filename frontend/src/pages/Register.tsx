import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, UserPlus, Loader2, Building2, User, Mail, Phone, CheckCircle } from 'lucide-react';

const Register: React.FC = () => {
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    email: '',
    mobile: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = (): string | null => {
    if (!formData.full_name.trim()) return 'يرجى إدخال الاسم الكامل';
    if (!formData.company_name.trim()) return 'يرجى إدخال اسم الشركة';
    if (!formData.email.trim()) return 'يرجى إدخال البريد الإلكتروني';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'البريد الإلكتروني غير صالح';
    if (!formData.mobile.trim()) return 'يرجى إدخال رقم الجوال';
    if (!formData.password) return 'يرجى إدخال كلمة المرور';
    if (formData.password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    if (formData.password !== formData.confirm_password) return 'كلمات المرور غير متطابقة';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${BASE_URL}/api/v1/clients/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError('البريد الإلكتروني مسجل مسبقاً');
        } else if (response.status === 422) {
          const detail = data?.detail;
          if (Array.isArray(detail)) {
            const msg = detail[0]?.msg || 'خطأ في البيانات المدخلة';
            setError(msg);
          } else {
            setError(detail || 'خطأ في البيانات المدخلة');
          }
        } else {
          setError(data?.detail || 'حدث خطأ أثناء التسجيل');
        }
        return;
      }

      // Show success state, then redirect after 2 seconds
      if (data.token) {
        setSuccess(true);
        setTimeout(async () => {
          await setToken(data.token);
          navigate('/select-package', { replace: true });
        }, 2000);
      }
    } catch {
      setError('خطأ في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 py-8"
        dir="rtl"
      >
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-10 text-center space-y-5">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              تم إنشاء حسابك بنجاح!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              جاري تحويلك لاختيار الباقة المناسبة...
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 py-8"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/assets/salmo-logo.avif"
            alt="SALMO"
            className="h-14 mx-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            إنشاء حساب جديد
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            سجّل شركتك للاستفادة من خدمات سلمو القانونية
          </p>
        </div>

        {/* Registration Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                الاسم الكامل
              </label>
              <div className="relative">
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 outline-none pl-10"
                  placeholder="أدخل اسمك الكامل"
                  disabled={isLoading}
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                اسم الشركة
              </label>
              <div className="relative">
                <input
                  id="company_name"
                  name="company_name"
                  type="text"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 outline-none pl-10"
                  placeholder="أدخل اسم الشركة"
                  disabled={isLoading}
                />
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 outline-none pl-10"
                  placeholder="example@company.com"
                  autoComplete="email"
                  disabled={isLoading}
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Mobile */}
            <div>
              <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                رقم الجوال
              </label>
              <div className="relative">
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 outline-none pl-10"
                  placeholder="05xxxxxxxx"
                  disabled={isLoading}
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 outline-none pl-10"
                  placeholder="8 أحرف على الأقل"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirm ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 outline-none pl-10"
                  placeholder="أعد إدخال كلمة المرور"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>جاري التسجيل...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  <span>إنشاء الحساب</span>
                </>
              )}
            </button>

            {/* Login Link */}
            <div className="text-center pt-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                لديك حساب بالفعل؟{' '}
                <Link
                  to="/login"
                  className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
                >
                  تسجيل الدخول
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          © {new Date().getFullYear()} سلمو — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
};

export default Register;