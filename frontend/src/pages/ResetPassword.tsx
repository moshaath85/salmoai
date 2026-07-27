import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Loader2, CheckCircle, ArrowRight } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('رمز إعادة التعيين غير صالح');
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }

    if (newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    setIsLoading(true);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.detail || 'حدث خطأ. يرجى المحاولة مرة أخرى');
        return;
      }

      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch {
      setError('خطأ في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/assets/salmo-logo.avif"
            alt="SALMO"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            إعادة تعيين كلمة المرور
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            أدخل كلمة المرور الجديدة
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-8">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-teal-500 mx-auto" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                تم إعادة تعيين كلمة المرور بنجاح
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                سيتم تحويلك لصفحة تسجيل الدخول خلال ثوانٍ...
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
              >
                <ArrowRight className="h-4 w-4" />
                تسجيل الدخول الآن
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                  <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {!token && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-center">
                  <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                    رمز إعادة التعيين غير موجود. يرجى استخدام الرابط المرسل إلى بريدك الإلكتروني.
                  </p>
                </div>
              )}

              {/* New Password Field */}
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 outline-none pl-12"
                    placeholder="أدخل كلمة المرور الجديدة (8 أحرف على الأقل)"
                    disabled={isLoading || !token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 outline-none pl-12"
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    disabled={isLoading || !token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>جاري إعادة التعيين...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    <span>إعادة تعيين كلمة المرور</span>
                  </>
                )}
              </button>

              {/* Back to Login */}
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-sm font-medium"
                >
                  <ArrowRight className="h-4 w-4" />
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          © {new Date().getFullYear()} سلمو — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;