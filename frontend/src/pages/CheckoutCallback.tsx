import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { verifyMoyasarPayment } from '@/lib/moyasarApi';
import {
  createUserSubscription,
  fetchActivePlans,
  createPaymentTransaction,
  createNotification,
  createInvoice,
  type Plan,
} from '@/lib/adminApi';
import { useAuth } from '@/contexts/AuthContext';
import { client } from '@/lib/sdk';

type CallbackStatus = 'verifying' | 'success' | 'failed' | 'error';

export default function CheckoutCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] = useState<CallbackStatus>('verifying');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const paymentId = searchParams.get('id');
  const paymentStatus = searchParams.get('status');
  const planId = searchParams.get('plan');
  const cycle = searchParams.get('cycle') || 'monthly';

  useEffect(() => {
    handleCallback();
  }, []);

  /** Non-blocking email notification — fire-and-forget */
  const sendEmailNotification = (params: {
    type: 'payment_success' | 'payment_failure';
    planName: string;
    amount: number;
    invoiceNumber?: string;
  }) => {
    const toEmail = user?.email;
    if (!toEmail) return;
    client.apiCall
      .invoke({
        url: '/api/v1/email/send-notification',
        method: 'POST',
        data: {
          type: params.type,
          to_email: toEmail,
          customer_name: user?.name || toEmail,
          plan_name: params.planName,
          amount: params.amount,
          invoice_number: params.invoiceNumber || '',
        },
      })
      .catch((e: unknown) => {
        console.log('Email notification failed (non-blocking):', e);
      });
  };

  const handleCallback = async () => {
    try {
      let loadedPlan: Plan | null = null;
      // Load plan info
      if (planId) {
        const plans = await fetchActivePlans();
        const found = plans.find((p: Plan) => p.id === parseInt(planId));
        if (found) {
          setPlan(found);
          loadedPlan = found;
        }
      }

      // If Moyasar returned a payment ID, verify it
      if (paymentId) {
        const verification = await verifyMoyasarPayment(paymentId);

        const price = loadedPlan ? (
          cycle === 'yearly' ? loadedPlan.price_yearly :
          cycle === 'lifetime' ? loadedPlan.price_lifetime :
          loadedPlan.price_monthly
        ) : 0;

        if (verification.is_paid) {
          // Record successful payment transaction
          await recordTransaction({
            plan: loadedPlan,
            price,
            status: 'success',
            paymentId,
            sourceType: verification.source_type || 'creditcard',
          });

          // Create success notification
          await createNotification({
            type: 'payment',
            title: 'تم الدفع بنجاح',
            message: `تم دفع ${price} ر.س لباقة ${loadedPlan?.name_ar || 'الاشتراك'} بنجاح`,
            is_read: false,
            target_user_id: user?.id || undefined,
          });

          // Payment successful - create subscription
          await activateSubscription(loadedPlan);

          // Non-blocking email notification for success
          sendEmailNotification({
            type: 'payment_success',
            planName: loadedPlan?.name_ar || 'الاشتراك',
            amount: price,
            invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
          });

          setStatus('success');
        } else if (verification.status === 'failed') {
          // Record failed payment
          await recordTransaction({
            plan: loadedPlan,
            price,
            status: 'failed',
            paymentId,
            sourceType: verification.source_type || 'creditcard',
            failureReason: 'تم رفض عملية الدفع',
          });

          // Create failure notification
          await createNotification({
            type: 'payment',
            title: 'فشل عملية الدفع',
            message: `فشلت عملية دفع ${price} ر.س لباقة ${loadedPlan?.name_ar || 'الاشتراك'}`,
            is_read: false,
            target_user_id: user?.id || undefined,
          });

          // Non-blocking email notification for failure
          sendEmailNotification({
            type: 'payment_failure',
            planName: loadedPlan?.name_ar || 'الاشتراك',
            amount: price,
          });

          setStatus('failed');
          setErrorMessage('تم رفض عملية الدفع. يرجى التحقق من بيانات البطاقة والمحاولة مرة أخرى.');
        } else {
          // Payment still pending or other status
          await recordTransaction({
            plan: loadedPlan,
            price,
            status: 'pending',
            paymentId,
            sourceType: verification.source_type || 'creditcard',
          });

          setStatus('failed');
          setErrorMessage(`حالة الدفع: ${verification.status}. يرجى المحاولة مرة أخرى.`);
        }
      } else if (paymentStatus === 'paid') {
        const price = loadedPlan ? (
          cycle === 'yearly' ? loadedPlan.price_yearly :
          cycle === 'lifetime' ? loadedPlan.price_lifetime :
          loadedPlan.price_monthly
        ) : 0;

        await recordTransaction({
          plan: loadedPlan,
          price,
          status: 'success',
          paymentId: 'direct',
          sourceType: 'creditcard',
        });

        await createNotification({
          type: 'payment',
          title: 'تم الدفع بنجاح',
          message: `تم دفع ${price} ر.س لباقة ${loadedPlan?.name_ar || 'الاشتراك'} بنجاح`,
          is_read: false,
          target_user_id: user?.id || undefined,
        });

        await activateSubscription(loadedPlan);

        // Non-blocking email notification for direct success
        sendEmailNotification({
          type: 'payment_success',
          planName: loadedPlan?.name_ar || 'الاشتراك',
          amount: price,
          invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
        });

        setStatus('success');
      } else {
        setStatus('failed');
        setErrorMessage('لم يتم العثور على معلومات الدفع.');
      }
    } catch (err) {
      console.error('Callback verification error:', err);
      setStatus('error');
      setErrorMessage('حدث خطأ أثناء التحقق من عملية الدفع.');
    }
  };

  const recordTransaction = async ({
    plan: txPlan,
    price,
    status: txStatus,
    paymentId: gatewayId,
    sourceType,
    failureReason,
  }: {
    plan: Plan | null;
    price: number;
    status: string;
    paymentId: string;
    sourceType: string;
    failureReason?: string;
  }) => {
    try {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      await createPaymentTransaction({
        plan_id: txPlan?.id || parseInt(planId || '0'),
        plan_name: txPlan?.name_ar || 'غير محدد',
        amount: price,
        currency: 'SAR',
        status: txStatus as 'success' | 'pending' | 'failed' | 'refunded',
        payment_method: sourceType,
        payment_gateway: 'moyasar',
        gateway_payment_id: gatewayId || '',
        billing_cycle: cycle,
        invoice_number: invoiceNumber,
        description: `اشتراك ${txPlan?.name_ar || ''} - ${cycle === 'yearly' ? 'سنوي' : cycle === 'lifetime' ? 'مدى الحياة' : 'شهري'}`,
        failure_reason: failureReason || '',
        refund_amount: 0,
        is_renewal: false,
      });

      // Create invoice record for successful payments
      if (txStatus === 'success') {
        try {
          await createInvoice({
            invoice_number: invoiceNumber,
            customer_name: user?.name || user?.email || 'مستخدم',
            plan: txPlan?.name_ar || 'غير محدد',
            amount: price,
            date: new Date().toISOString().split('T')[0],
            status: 'paid',
          });
        } catch (invoiceErr) {
          console.error('Failed to create invoice:', invoiceErr);
        }
      }
    } catch (err) {
      console.error('Failed to record transaction:', err);
    }
  };

  const activateSubscription = async (loadedPlan: Plan | null) => {
    if (!planId) return;

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    if (cycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (cycle === 'lifetime') {
      endDate.setFullYear(endDate.getFullYear() + 99);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const price = loadedPlan ? (
      cycle === 'yearly' ? loadedPlan.price_yearly :
      cycle === 'lifetime' ? loadedPlan.price_lifetime :
      loadedPlan.price_monthly
    ) : 0;

    await createUserSubscription({
      plan_id: parseInt(planId),
      status: 'active',
      billing_cycle: cycle,
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      auto_renew: cycle !== 'lifetime',
      payment_method: 'moyasar',
      amount_paid: price,
    });

    // Subscription activation notification
    await createNotification({
      type: 'subscription',
      title: 'تم تفعيل الاشتراك',
      message: `تم تفعيل باقة ${loadedPlan?.name_ar || 'الاشتراك'} بنجاح حتى ${endDate.toISOString().split('T')[0]}`,
      is_read: false,
      target_user_id: user?.id || undefined,
    });

    // Sync client status to active
    try {
      const clientEmail = user?.email;
      if (clientEmail) {
        const clientsResp = await client.apiCall.invoke<{ items: Array<{ id: number }> }>({
          url: '/api/v1/entities/clients?query=' + encodeURIComponent(JSON.stringify({ email: clientEmail })),
          method: 'GET',
        });
        if (clientsResp?.items?.length > 0) {
          const clientRecord = clientsResp.items[0];
          await client.apiCall.invoke({
            url: `/api/v1/entities/clients/${clientRecord.id}`,
            method: 'PUT',
            data: { status: 'active' },
          });
        }
      }
    } catch (syncErr) {
      console.error('Failed to sync client status:', syncErr);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-slate-900 font-[Tajawal,Cairo,sans-serif]">
      <Navbar />

      <div className="mx-auto max-w-lg px-6 py-16">
        {status === 'verifying' && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">جاري التحقق من الدفع...</h1>
              <p className="text-gray-500 dark:text-gray-400">
                يرجى الانتظار بينما نتحقق من عملية الدفع الخاصة بك.
              </p>
            </CardContent>
          </Card>
        )}

        {status === 'success' && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">تم الدفع بنجاح! 🎉</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {plan ? `تم تفعيل ${plan.name_ar} بنجاح.` : 'تم تفعيل اشتراكك بنجاح.'}
              </p>
              <p className="text-sm text-gray-400 mb-8">
                يمكنك الآن الاستمتاع بجميع مميزات الخطة.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/chat')} className="bg-blue-600 text-white hover:bg-blue-700">
                  ابدأ الاستخدام
                </Button>
                <Button variant="outline" onClick={() => navigate('/my-subscription')}>
                  عرض اشتراكي
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'failed' && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-10 w-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">لم تتم عملية الدفع</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {errorMessage}
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => navigate(`/checkout?plan=${planId}&cycle=${cycle}`)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  إعادة المحاولة
                </Button>
                <Button variant="outline" onClick={() => navigate('/pricing')}>
                  العودة للأسعار
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'error' && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">حدث خطأ</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {errorMessage || 'حدث خطأ غير متوقع. يرجى التواصل مع الدعم الفني.'}
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => navigate(`/checkout?plan=${planId}&cycle=${cycle}`)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  إعادة المحاولة
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  الصفحة الرئيسية
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}