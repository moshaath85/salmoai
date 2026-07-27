import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/contexts/ThemeContext';
import { Loader2, Receipt, Search, Filter, Download, CreditCard, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { fetchAllPaymentTransactions, type PaymentTransaction } from '@/lib/adminApi';

export default function AdminPaymentHistory() {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await fetchAllPaymentTransactions({ limit: 200 });
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = !searchTerm ||
      tx.plan_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.gateway_payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.user_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || tx.payment_method === methodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const totalRevenue = transactions
    .filter(tx => tx.status === 'success')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const failedCount = transactions.filter(tx => tx.status === 'failed').length;
  const refundedTotal = transactions
    .filter(tx => tx.status === 'refunded')
    .reduce((sum, tx) => sum + (tx.refund_amount || tx.amount || 0), 0);

  const statusConfig: Record<string, { label: string; labelEn: string; class: string }> = {
    success: { label: 'ناجحة', labelEn: 'Success', class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    pending: { label: 'معلقة', labelEn: 'Pending', class: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    failed: { label: 'فاشلة', labelEn: 'Failed', class: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    refunded: { label: 'مسترجعة', labelEn: 'Refunded', class: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToCSV = () => {
    const headers = ['ID', 'User ID', 'Plan', 'Amount', 'Status', 'Method', 'Invoice', 'Date'];
    const rows = filteredTransactions.map(tx => [
      tx.id, tx.user_id, tx.plan_name, tx.amount, tx.status, tx.payment_method, tx.invoice_number, tx.created_at
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('سجل المدفوعات', 'Payment History')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('جميع العمليات المالية لجميع العملاء', 'All financial transactions for all customers')}
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          {t('تصدير CSV', 'Export CSV')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('إجمالي الإيرادات', 'Total Revenue')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{totalRevenue.toFixed(2)} {t('ر.س', 'SAR')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('عدد العمليات', 'Transactions')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{transactions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('عمليات فاشلة', 'Failed')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{failedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Receipt className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('المبالغ المستردة', 'Refunded')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{refundedTotal.toFixed(2)} {t('ر.س', 'SAR')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('بحث بالمستخدم أو الفاتورة أو الباقة...', 'Search by user, invoice, or plan...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder={t('الحالة', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                <SelectItem value="success">{t('ناجحة', 'Success')}</SelectItem>
                <SelectItem value="pending">{t('معلقة', 'Pending')}</SelectItem>
                <SelectItem value="failed">{t('فاشلة', 'Failed')}</SelectItem>
                <SelectItem value="refunded">{t('مسترجعة', 'Refunded')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder={t('طريقة الدفع', 'Method')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                <SelectItem value="creditcard">{t('بطاقة ائتمان', 'Credit Card')}</SelectItem>
                <SelectItem value="mada">{t('مدى', 'Mada')}</SelectItem>
                <SelectItem value="applepay">Apple Pay</SelectItem>
                <SelectItem value="stcpay">STC Pay</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="p-12 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('لا توجد عمليات مالية', 'No transactions found')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">#</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('المستخدم', 'User')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('الباقة', 'Plan')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('المبلغ', 'Amount')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('الحالة', 'Status')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('طريقة الدفع', 'Method')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">{t('التاريخ', 'Date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-mono text-xs">
                      {tx.invoice_number || `#${tx.id}`}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs truncate max-w-[120px]">
                      {tx.user_id?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {tx.plan_name || '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {tx.amount?.toFixed(2)} {t('ر.س', 'SAR')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusConfig[tx.status]?.class || ''}>
                        {language === 'ar' ? statusConfig[tx.status]?.label : statusConfig[tx.status]?.labelEn || tx.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                      {tx.payment_method || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {formatDate(tx.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}