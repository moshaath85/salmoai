import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, Download, ArrowRight, Receipt, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPaymentTransactions, type PaymentTransaction } from '@/lib/adminApi';

type FilterStatus = 'all' | 'success' | 'pending' | 'failed' | 'refunded';

function getStatusText(status: string): string {
  switch (status) {
    case 'success': return 'Paid';
    case 'pending': return 'Pending';
    case 'failed': return 'Failed';
    case 'refunded': return 'Refunded';
    default: return status;
  }
}

function getCycleText(cycle: string): string {
  switch (cycle) {
    case 'monthly': return 'Monthly';
    case 'yearly': return 'Yearly';
    case 'lifetime': return 'Lifetime';
    default: return cycle;
  }
}

function getPaymentMethodText(method: string): string {
  switch (method) {
    case 'creditcard': return 'Credit Card';
    case 'applepay': return 'Apple Pay';
    case 'stcpay': return 'STC Pay';
    default: return method || '-';
  }
}

function formatDateForPDF(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function generateInvoicePDF(tx: PaymentTransaction): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;

  // Salmo Brand Colors
  const brandDark: [number, number, number] = [15, 15, 15]; // #0F0F0F
  const brandIndigo: [number, number, number] = [99, 102, 241]; // #6366f1
  const darkText: [number, number, number] = [15, 23, 42]; // slate-900
  const grayText: [number, number, number] = [100, 116, 139]; // slate-500
  const lightBg: [number, number, number] = [248, 250, 252]; // slate-50
  const borderColor: [number, number, number] = [226, 232, 240]; // slate-200

  let y = 0;

  // ═══════════════════════════════════════════════
  // HEADER - Premium dark gradient-style bar
  // ═══════════════════════════════════════════════
  const headerHeight = 52;

  // Main dark header
  doc.setFillColor(...brandDark);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Accent indigo strip at bottom of header
  doc.setFillColor(...brandIndigo);
  doc.rect(0, headerHeight, pageWidth, 2, 'F');

  // SALMO brand name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('SALMO', margin, 22);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 200);
  doc.text('Salmo Assist | Digital HR & Legal Solutions', margin, 30);

  // INVOICE title on right
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - margin, 22, { align: 'right' });

  // Invoice number below title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...brandGold);
  doc.text(`#${tx.invoice_number || 'N/A'}`, pageWidth - margin, 30, { align: 'right' });

  y = headerHeight + 2 + 14;

  // ═══════════════════════════════════════════════
  // PAID STAMP (diagonal watermark for successful payments)
  // ═══════════════════════════════════════════════
  if (tx.status === 'success') {
    doc.saveGraphicsState();
    const stampX = pageWidth - 55;
    const stampY = 85;
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(48);
    doc.setFont('helvetica', 'bold');
    const gState = new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 0.12 });
    doc.setGState(gState as never);
    doc.text('PAID', stampX, stampY, { angle: -25, align: 'center' });
    doc.restoreGraphicsState();
  }

  // ═══════════════════════════════════════════════
  // INVOICE DETAILS - Clean 2-column card layout
  // ═══════════════════════════════════════════════
  // Light background card for details
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y - 4, contentWidth, 40, 3, 3, 'F');
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y - 4, contentWidth, 40, 3, 3, 'S');

  const detailLeftCol = margin + 8;
  const detailRightCol = margin + contentWidth / 2 + 8;

  // Row 1: Invoice Date & Status
  doc.setTextColor(...grayText);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DATE', detailLeftCol, y + 2);
  doc.text('PAYMENT STATUS', detailRightCol, y + 2);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkText);
  doc.text(formatDateForPDF(tx.created_at), detailLeftCol, y + 8);

  const statusText = getStatusText(tx.status);
  if (tx.status === 'success') {
    doc.setTextColor(22, 163, 74);
  } else if (tx.status === 'pending') {
    doc.setTextColor(217, 119, 6);
  } else if (tx.status === 'failed') {
    doc.setTextColor(220, 38, 38);
  } else {
    doc.setTextColor(...brandIndigo);
  }
  doc.text(statusText, detailRightCol, y + 8);

  // Row 2: Payment Method & Billing Cycle
  doc.setTextColor(...grayText);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT METHOD', detailLeftCol, y + 18);
  doc.text('BILLING CYCLE', detailRightCol, y + 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkText);
  doc.text(getPaymentMethodText(tx.payment_method), detailLeftCol, y + 24);
  doc.text(getCycleText(tx.billing_cycle), detailRightCol, y + 24);

  y += 48;

  // ═══════════════════════════════════════════════
  // ITEMS TABLE
  // ═══════════════════════════════════════════════
  // Table header with indigo background
  const tableHeaderH = 10;
  doc.setFillColor(...brandIndigo);
  doc.roundedRect(margin, y, contentWidth, tableHeaderH, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const col1X = margin + 6;
  const col2X = margin + contentWidth * 0.52;
  const col3X = margin + contentWidth * 0.65;
  const col4X = pageWidth - margin - 6;

  doc.text('DESCRIPTION', col1X, y + 6.5);
  doc.text('QTY', col2X, y + 6.5);
  doc.text('UNIT PRICE', col3X, y + 6.5);
  doc.text('AMOUNT', col4X, y + 6.5, { align: 'right' });

  y += tableHeaderH + 2;

  // Table row background
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 18, 'F');
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 18, pageWidth - margin, y + 18);

  // Item data
  const planName = tx.plan_name || 'Subscription Plan';
  const cycle = getCycleText(tx.billing_cycle);
  const amount = tx.amount || 0;
  const currency = tx.currency === 'SAR' ? 'SAR' : (tx.currency || 'SAR');
  const subtotal = Number((amount / 1.15).toFixed(2));
  const vat = Number((amount - subtotal).toFixed(2));

  doc.setTextColor(...darkText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${planName} - ${cycle}`, col1X, y + 7);

  // Sub-description
  doc.setTextColor(...grayText);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Salmo Platform Subscription - Invoice #${tx.invoice_number || 'N/A'}`, col1X, y + 13);

  doc.setTextColor(...darkText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('1', col2X, y + 7);
  doc.text(`${subtotal.toFixed(2)} ${currency}`, col3X, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(`${subtotal.toFixed(2)} ${currency}`, col4X, y + 7, { align: 'right' });

  y += 26;

  // ═══════════════════════════════════════════════
  // TOTALS SECTION - Right-aligned professional box
  // ═══════════════════════════════════════════════
  const totalsBoxW = 85;
  const totalsBoxX = pageWidth - margin - totalsBoxW;

  // Totals background card
  doc.setFillColor(...lightBg);
  doc.roundedRect(totalsBoxX, y, totalsBoxW, 42, 3, 3, 'F');
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalsBoxX, y, totalsBoxW, 42, 3, 3, 'S');

  const totalsLabelX = totalsBoxX + 8;
  const totalsValueX = totalsBoxX + totalsBoxW - 8;

  // Subtotal
  doc.setTextColor(...grayText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', totalsLabelX, y + 9);
  doc.setTextColor(...darkText);
  doc.text(`${subtotal.toFixed(2)} ${currency}`, totalsValueX, y + 9, { align: 'right' });

  // VAT
  doc.setTextColor(...grayText);
  doc.text('VAT (15%)', totalsLabelX, y + 18);
  doc.setTextColor(...darkText);
  doc.text(`${vat.toFixed(2)} ${currency}`, totalsValueX, y + 18, { align: 'right' });

  // Divider inside totals
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(totalsLabelX, y + 23, totalsValueX, y + 23);

  // Total with indigo background
  doc.setFillColor(...brandIndigo);
  doc.roundedRect(totalsBoxX + 3, y + 27, totalsBoxW - 6, 12, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', totalsLabelX + 2, y + 35);
  doc.text(`${amount.toFixed(2)} ${currency}`, totalsValueX - 2, y + 35, { align: 'right' });

  // ═══════════════════════════════════════════════
  // NOTES SECTION (left side, same row as totals)
  // ═══════════════════════════════════════════════
  doc.setTextColor(...grayText);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTES', margin, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('This invoice is generated electronically and is valid', margin, y + 12);
  doc.text('without a signature. VAT is calculated at 15% as per', margin, y + 17);
  doc.text('Saudi Arabia tax regulations.', margin, y + 22);

  // ═══════════════════════════════════════════════
  // FOOTER - Professional company info
  // ═══════════════════════════════════════════════
  const footerTopY = pageHeight - 38;

  // Footer accent line
  doc.setFillColor(...brandIndigo);
  doc.rect(margin, footerTopY - 2, contentWidth, 1, 'F');

  // Company info
  doc.setTextColor(...grayText);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Salmo Platform', margin, footerTopY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Digital HR & Legal Solutions', margin, footerTopY + 11);

  // Center: Thank you
  doc.setTextColor(...brandIndigo);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for choosing Salmo!', pageWidth / 2, footerTopY + 6, { align: 'center' });

  doc.setTextColor(...grayText);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('support@salmo.sa | www.salmo.sa', pageWidth / 2, footerTopY + 11, { align: 'center' });

  // Right: Generation date
  doc.setTextColor(...grayText);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const genDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Generated: ${genDate}`, pageWidth - margin, footerTopY + 6, { align: 'right' });

  // Bottom bar
  doc.setFillColor(...brandDark);
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
  doc.setTextColor(120, 120, 140);
  doc.setFontSize(6);
  doc.text('Salmo Assist | All Rights Reserved', pageWidth / 2, pageHeight - 3, { align: 'center' });

  // Save
  const filename = `Salmo_Invoice_${tx.invoice_number || tx.id || 'unknown'}.pdf`;
  doc.save(filename);
}

function downloadAllInvoices(transactions: PaymentTransaction[]): void {
  const successTx = transactions.filter((tx) => tx.status === 'success');
  if (successTx.length === 0) return;

  successTx.forEach((tx, index) => {
    setTimeout(() => {
      generateInvoicePDF(tx);
    }, index * 500);
  });
}

export default function Invoices() {
  const navigate = useNavigate();
  const { user, loading: authLoading, login } = useAuth();

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPaymentTransactions({ limit: 100 });
      setTransactions(data as PaymentTransaction[]);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      loadTransactions();
    }
  }, [authLoading, user, loadTransactions]);

  const filteredTransactions = transactions.filter((tx) => {
    if (filterStatus === 'all') return true;
    return tx.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">مدفوعة</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">معلقة</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">فاشلة</Badge>;
      case 'refunded':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">مستردة</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return 'شهري';
      case 'yearly': return 'سنوي';
      case 'lifetime': return 'مدى الحياة';
      default: return cycle;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toLocaleString('ar-SA')} ${currency === 'SAR' ? 'ر.س' : currency}`;
  };

  const totalPaid = transactions
    .filter((tx) => tx.status === 'success')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const successCount = transactions.filter((t) => t.status === 'success').length;

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-slate-900 font-[Tajawal,Cairo,sans-serif]">
        <Navbar />
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">تسجيل الدخول مطلوب</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                يرجى تسجيل الدخول لعرض الفواتير الخاصة بك.
              </p>
              <Button onClick={login} className="bg-blue-600 text-white hover:bg-blue-700">
                تسجيل الدخول
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-slate-900 font-[Tajawal,Cairo,sans-serif]">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الفواتير</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">سجل المدفوعات والفواتير الخاصة بك</p>
            </div>
          </div>

          {/* Download All Button */}
          {successCount > 0 && (
            <Button
              onClick={() => downloadAllInvoices(transactions)}
              variant="outline"
              className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              <Download className="h-4 w-4" />
              تحميل الكل ({successCount})
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">إجمالي المدفوعات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(totalPaid, 'SAR')}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">عدد العمليات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{transactions.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">العمليات الناجحة</p>
              <p className="text-2xl font-bold text-emerald-600">{successCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-4">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <SelectValue placeholder="تصفية حسب الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع العمليات</SelectItem>
              <SelectItem value="success">مدفوعة</SelectItem>
              <SelectItem value="pending">معلقة</SelectItem>
              <SelectItem value="failed">فاشلة</SelectItem>
              <SelectItem value="refunded">مستردة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transactions Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {loading || authLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-1">لا توجد فواتير</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  {filterStatus !== 'all' ? 'لا توجد عمليات بهذه الحالة' : 'ستظهر فواتيرك هنا بعد إتمام أول عملية دفع'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-slate-800/50">
                      <TableHead className="text-right font-semibold">رقم الفاتورة</TableHead>
                      <TableHead className="text-right font-semibold">الباقة</TableHead>
                      <TableHead className="text-right font-semibold">الدورة</TableHead>
                      <TableHead className="text-right font-semibold">المبلغ</TableHead>
                      <TableHead className="text-right font-semibold">الحالة</TableHead>
                      <TableHead className="text-right font-semibold">طريقة الدفع</TableHead>
                      <TableHead className="text-right font-semibold">التاريخ</TableHead>
                      <TableHead className="text-center font-semibold w-[60px]">تحميل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                        <TableCell className="font-mono text-sm text-gray-700 dark:text-gray-300">
                          {tx.invoice_number || '-'}
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-white font-medium">
                          {tx.plan_name || '-'}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {getCycleLabel(tx.billing_cycle)}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900 dark:text-white">
                          {formatAmount(tx.amount, tx.currency)}
                        </TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400 text-sm">
                          {tx.payment_method === 'creditcard' ? 'بطاقة ائتمان' :
                           tx.payment_method === 'applepay' ? 'Apple Pay' :
                           tx.payment_method === 'stcpay' ? 'STC Pay' :
                           tx.payment_method || '-'}
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                          {formatDate(tx.created_at)}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => generateInvoicePDF(tx)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                            title="تحميل الفاتورة PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back to subscription */}
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => navigate('/my-subscription')}
            className="gap-2"
          >
            <Receipt className="h-4 w-4" />
            عرض اشتراكي
          </Button>
        </div>
      </div>
    </div>
  );
}