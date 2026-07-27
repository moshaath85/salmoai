import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setIsLoading(true);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.detail || 'حدث خطأ. يرجى المحاولة مرة أخرى');
        return;
      }

      setSuccess(true);
      if (data.reset_token) {
        setResetToken(data.reset_token);
      }
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
            استعادة كلمة المرور
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-8">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-teal-500 mx-auto" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                تم معالجة طلبك
              </h2>
              {resetToken ? (
                <>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-300 mb-1 font-medium">
                      ⚠️ وضع التجربة
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      نظراً لأن النظام في وضع التجربة، يمكنك استخدام الرابط أدناه مباشرة لإعادة تعيين كلمة المرور
                    </p>
                  </div>
                  <Link
                    to={`/reset-password?token=${resetToken}`}
                    className="block w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors duration-200 text-center text-base"
                  >
                    إعادة تعيين كلمة المرور الآن
                  </Link>
                </>
              ) : (
                <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    إذا كان البريد الإلكتروني مسجلاً لدينا، ستظهر لك رابط إعادة التعيين. تأكد من إدخال البريد الصحيح
                  </p>
                </div>
              )}
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium mt-4"
              >
                <ArrowRight className="h-4 w-4" />
                العودة لتسجيل الدخول
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

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 outline-none pl-12"
                    placeholder="أدخل بريدك الإلكتروني"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <span>إرسال رابط إعادة التعيين</span>
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

export default ForgotPassword;