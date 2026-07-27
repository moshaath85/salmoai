import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Receipt, Search, Filter, ArrowLeft, Download, CreditCard, Calendar, DollarSign } from 'lucide-react';
import { fetchPaymentTransactions, type PaymentTransaction } from '@/lib/adminApi';

export default function PaymentHistory() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await fetchPaymentTransactions({ limit: 100 });
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = !searchTerm ||
      t.plan_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.gateway_payment_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusConfig: Record<string, { label: string; class: string }> = {
    success: { label: 'ناجحة', class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    pending: { label: 'معلقة', class: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    failed: { label: 'فاشلة', class: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    refunded: { label: 'مسترجعة', class: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  };

  const paymentMethodLabels: Record<string, string> = {
    creditcard: 'بطاقة ائتمان',
    mada: 'مدى',
    applepay: 'Apple Pay',
    stcpay: 'STC Pay',
  };

  const totalPaid = transactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-slate-900 font-[Tajawal,Cairo,sans-serif]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/my-subscription')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">سجل المدفوعات</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">جميع العمليات المالية الخاصة بك</p>
            </div>
          </div>
          <Receipt className="h-8 w-8 text-blue-600" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المدفوعات</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{totalPaid.toFixed(2)} ر.س</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">عدد العمليات</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{transactions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">آخر عملية</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {transactions.length > 0 ? formatDate(transactions[0].created_at) : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white dark:bg-slate-800 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="بحث بالفاتورة أو الباقة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="success">ناجحة</SelectItem>
                  <SelectItem value="pending">معلقة</SelectItem>
                  <SelectItem value="failed">فاشلة</SelectItem>
                  <SelectItem value="refunded">مسترجعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">لا توجد عمليات مالية</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map(transaction => (
              <Card key={transaction.id} className="bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        transaction.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                        transaction.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30' :
                        transaction.status === 'refunded' ? 'bg-purple-100 dark:bg-purple-900/30' :
                        'bg-amber-100 dark:bg-amber-900/30'
                      }`}>
                        <CreditCard className={`h-5 w-5 ${
                          transaction.status === 'success' ? 'text-emerald-600' :
                          transaction.status === 'failed' ? 'text-red-600' :
                          transaction.status === 'refunded' ? 'text-purple-600' :
                          'text-amber-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {transaction.plan_name || transaction.description || 'عملية دفع'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>{formatDate(transaction.created_at)}</span>
                          {transaction.payment_method && (
                            <>
                              <span>•</span>
                              <span>{paymentMethodLabels[transaction.payment_method] || transaction.payment_method}</span>
                            </>
                          )}
                          {transaction.invoice_number && (
                            <>
                              <span>•</span>
                              <span>#{transaction.invoice_number}</span>
                            </>
                          )}
                        </div>
                        {transaction.failure_reason && (
                          <p className="text-xs text-red-500 mt-1">{transaction.failure_reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {transaction.amount?.toFixed(2)} ر.س
                      </p>
                      <Badge className={statusConfig[transaction.status]?.class || ''}>
                        {statusConfig[transaction.status]?.label || transaction.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}