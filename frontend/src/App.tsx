import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import { MiniLoader } from './components/LoadingScreen';

// Lazy-loaded page components
const Index = lazy(() => import('./pages/Index'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Register = lazy(() => import('./pages/Register'));
const SelectPackage = lazy(() => import('./pages/SelectPackage'));
const Chat = lazy(() => import('./pages/Chat'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Checkout = lazy(() => import('./pages/Checkout'));
const CheckoutCallback = lazy(() => import('./pages/CheckoutCallback'));
const UserSubscription = lazy(() => import('./pages/UserSubscription'));
const ContractAnalysis = lazy(() => import('./pages/ContractAnalysis'));
const EosbCalculator = lazy(() => import('./pages/EosbCalculator'));
const ResumeAnalysis = lazy(() => import('./pages/ResumeAnalysis'));
const LawSearch = lazy(() => import('./pages/LawSearch'));
const CompanyPolicies = lazy(() => import('./pages/CompanyPolicies'));
const PaymentHistory = lazy(() => import('./pages/PaymentHistory'));
const Invoices = lazy(() => import('./pages/Invoices'));

// Lazy-loaded admin components
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const AdminCustomers = lazy(() => import('./admin/AdminCustomers'));
const AdminTickets = lazy(() => import('./admin/AdminTickets'));
const AdminProfile = lazy(() => import('./admin/AdminProfile'));
const AdminSubscriptions = lazy(() => import('./admin/AdminSubscriptions'));
const AdminNotifications = lazy(() => import('./admin/AdminNotifications'));
const AdminAnalytics = lazy(() => import('./admin/AdminAnalytics'));
const AdminPaymentHistory = lazy(() => import('./admin/AdminPaymentHistory'));
const AdminCoupons = lazy(() => import('./admin/AdminCoupons'));
const AdminEmailSettings = lazy(() => import('./admin/AdminEmailSettings'));
const AdminActivityLogs = lazy(() => import('./admin/AdminActivityLogs'));
const AdminPaymentGateways = lazy(() => import('./admin/AdminPaymentGateways'));
const AdminWebhooks = lazy(() => import('./admin/AdminWebhooks'));
const AdminGatewayAuditLogs = lazy(() => import('./admin/AdminGatewayAuditLogs'));
const AdminPaymentLogos = lazy(() => import('./admin/AdminPaymentLogos'));
const AdminCouponAnalytics = lazy(() => import('./admin/AdminCouponAnalytics'));

// React Query client with optimized caching defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 600000, // 10 minutes
      gcTime: 1800000, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

const AppRoutes = () => (
  <Suspense fallback={<MiniLoader />}>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pricing" element={<Pricing />} />

      {/* Protected user routes */}
      <Route path="/select-package" element={<ProtectedRoute><SelectPackage /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/contract-analysis" element={<ProtectedRoute><ContractAnalysis /></ProtectedRoute>} />
      <Route path="/eosb-calculator" element={<ProtectedRoute><EosbCalculator /></ProtectedRoute>} />
      <Route path="/resume-analysis" element={<ProtectedRoute><ResumeAnalysis /></ProtectedRoute>} />
      <Route path="/law-search" element={<ProtectedRoute><LawSearch /></ProtectedRoute>} />
      <Route path="/company-policies" element={<ProtectedRoute><CompanyPolicies /></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/checkout/callback" element={<ProtectedRoute><CheckoutCallback /></ProtectedRoute>} />
      <Route path="/my-subscription" element={<ProtectedRoute><UserSubscription /></ProtectedRoute>} />
      <Route path="/payment-history" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="tickets" element={<AdminTickets />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="payments" element={<AdminPaymentHistory />} />
        <Route path="payment-gateways" element={<AdminPaymentGateways />} />
        <Route path="webhooks" element={<AdminWebhooks />} />
        <Route path="gateway-logs" element={<AdminGatewayAuditLogs />} />
        <Route path="payment-logos" element={<AdminPaymentLogos />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="coupon-analytics" element={<AdminCouponAnalytics />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="email-settings" element={<AdminEmailSettings />} />
        <Route path="activity-logs" element={<AdminActivityLogs />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>
    </Routes>
  </Suspense>
);

const App = () => {
  // Prefetch critical routes after initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      import('./pages/Chat');
      import('./pages/LawSearch');
      import('./pages/ContractAnalysis');
      import('./pages/EosbCalculator');
      import('./pages/Pricing');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
export { AppRoutes };