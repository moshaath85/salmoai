import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, ArrowRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MiniLoader } from '@/components/LoadingScreen';
import Navbar from '@/components/Navbar';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const REDIRECT_KEY = 'salmo_redirect_after_login';

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return <MiniLoader />;
  }

  if (!user) {
    // Save current path so we can redirect back after login
    sessionStorage.setItem(REDIRECT_KEY, location.pathname + location.search);

    const handleLogin = () => {
      navigate('/login');
    };

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900" dir="rtl">
        <Navbar />
        <div className="flex flex-1 items-center justify-center px-4 py-20">
          <Card className="w-full max-w-md border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl text-gray-900 dark:text-white">
                يرجى تسجيل الدخول للمتابعة
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                هذه الصفحة تتطلب تسجيل الدخول. يرجى تسجيل الدخول للوصول إلى هذه الخدمة.
              </p>
              <Button
                onClick={handleLogin}
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
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
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
export { REDIRECT_KEY };