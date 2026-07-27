import { useEffect } from 'react';
import { client } from '../lib/api';
import { REDIRECT_KEY } from '@/components/ProtectedRoute';

export default function AuthCallback() {
  useEffect(() => {
    // Complete the auth login flow
    const completeLogin = async () => {
      try {
        await client.auth.login();

        // Check if there's a saved redirect path
        const redirectPath = sessionStorage.getItem(REDIRECT_KEY);
        if (redirectPath) {
          sessionStorage.removeItem(REDIRECT_KEY);
          window.location.href = redirectPath;
        } else {
          window.location.href = '/';
        }
      } catch {
        // If login fails, redirect to home
        window.location.href = '/';
      }
    };

    completeLogin();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">جاري معالجة تسجيل الدخول...</p>
      </div>
    </div>
  );
}