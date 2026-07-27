import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, User, LogIn, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({
  children,
}) => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // If the user is not logged in, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Card className="w-full max-w-md mx-4 border-0 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <LogIn className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl text-gray-900 dark:text-white">
              تسجيل الدخول مطلوب
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              يرجى تسجيل الدخول للوصول إلى لوحة التحكم
            </p>
            <Button onClick={() => navigate('/login')} className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <LogIn className="h-4 w-4" />
              تسجيل الدخول
            </Button>
            <Link to="/">
              <Button variant="ghost" className="w-full gap-2 mt-2">
                <ArrowRight className="h-4 w-4" />
                العودة للرئيسية
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If the user is not an admin, show an insufficient-permissions page
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Card className="w-full max-w-md mx-4 border-0 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl text-gray-900 dark:text-white">
              صلاحيات غير كافية
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-gray-600 dark:text-gray-400">
              <p className="mb-3">
                الحساب الحالي ليس لديه صلاحيات المدير
              </p>
              <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {user.email}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  الدور: {user.role === 'user' ? 'مستخدم عادي' : user.role}
                </div>
              </div>
              <p className="text-sm">
                يرجى تسجيل الدخول بحساب لديه صلاحيات المدير
              </p>
            </div>

            <div className="space-y-3">
              <Button onClick={() => navigate('/login')} className="w-full gap-2" variant="outline">
                <LogIn className="h-4 w-4" />
                تبديل الحساب
              </Button>
              <Link to="/">
                <Button className="w-full gap-2 mt-2" variant="ghost">
                  <ArrowRight className="h-4 w-4" />
                  العودة للرئيسية
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If the user is an admin, render the child components
  return <>{children}</>;
};

export default ProtectedAdminRoute;