import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MoreVertical, UserCheck, UserX, Trash2, Edit, Mail, KeyRound, Filter, Loader2, RefreshCw } from 'lucide-react';
import { fetchCustomers, updateCustomer, deleteCustomer, toggleClientStatus, type Customer } from '@/lib/adminApi';

const AdminCustomers: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ owner_name: '', email: '', mobile: '', company_name: '', status: '' });
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const statusConfig: Record<string, { label: string; class: string }> = {
    active: { label: t('مفعل', 'Active'), class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    suspended: { label: t('موقوف', 'Suspended'), class: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    trial: { label: t('تجريبي', 'Trial'), class: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    expired: { label: t('منتهي', 'Expired'), class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
    pending_payment: { label: t('بانتظار الدفع', 'Pending Payment'), class: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  };

  const filtered = customers.filter(c => {
    const matchSearch = (c.owner_name || '').includes(search) || (c.email || '').includes(search) || (c.mobile || '').includes(search) || (c.company_name || '').includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setEditForm({
      owner_name: customer.owner_name || '',
      email: customer.email || '',
      mobile: customer.mobile || '',
      company_name: customer.company_name || '',
      status: customer.status || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editCustomer) return;
    setSaving(true);
    try {
      await updateCustomer(editCustomer.id, editForm);
      await loadCustomers();
      setEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to update customer:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (customer: Customer) => {
    const newStatus = customer.status === 'active' ? 'suspended' : 'active';
    try {
      await toggleClientStatus(customer.id, newStatus);
      await loadCustomers();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(t('هل أنت متأكد من حذف هذا العميل؟', 'Are you sure you want to delete this customer?'))) return;
    try {
      await deleteCustomer(customer.id);
      await loadCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-0 shadow-sm dark:bg-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-2.5 start-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('بحث بالاسم أو البريد أو الجوال أو الشركة...', 'Search by name, email, phone, or company...')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="h-4 w-4 me-2" />
                <SelectValue placeholder={t('الحالة', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                <SelectItem value="active">{t('مفعل', 'Active')}</SelectItem>
                <SelectItem value="suspended">{t('موقوف', 'Suspended')}</SelectItem>
                <SelectItem value="pending_payment">{t('بانتظار الدفع', 'Pending Payment')}</SelectItem>
                <SelectItem value="trial">{t('تجريبي', 'Trial')}</SelectItem>
                <SelectItem value="expired">{t('منتهي', 'Expired')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadCustomers} title={t('تحديث', 'Refresh')}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm dark:bg-slate-800 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-slate-700/50">
                  <TableHead className="font-semibold">{t('العميل', 'Customer')}</TableHead>
                  <TableHead className="font-semibold">{t('الجوال', 'Phone')}</TableHead>
                  <TableHead className="font-semibold">{t('الشركة', 'Company')}</TableHead>
                  <TableHead className="font-semibold">{t('الحالة', 'Status')}</TableHead>
                  <TableHead className="font-semibold text-center">{t('إجراءات', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      {t('لا يوجد عملاء', 'No customers found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(customer => (
                    <TableRow key={customer.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{customer.owner_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{customer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-300 direction-ltr">{customer.mobile}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-300">{customer.company_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${statusConfig[customer.status]?.class || ''}`}>
                          {statusConfig[customer.status]?.label || customer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(customer)}>
                              <Edit className="h-4 w-4 me-2" />{t('تعديل', 'Edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(customer)}>
                              {customer.status === 'active' ? (
                                <><UserX className="h-4 w-4 me-2" />{t('إيقاف', 'Suspend')}</>
                              ) : (
                                <><UserCheck className="h-4 w-4 me-2" />{t('تفعيل', 'Activate')}</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <KeyRound className="h-4 w-4 me-2" />{t('إعادة كلمة المرور', 'Reset Password')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 me-2" />{t('إرسال بريد', 'Send Email')}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(customer)}>
                              <Trash2 className="h-4 w-4 me-2" />{t('حذف', 'Delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('تعديل بيانات العميل', 'Edit Customer')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('اسم المالك', 'Owner Name')}</label>
              <Input value={editForm.owner_name} onChange={e => setEditForm(f => ({ ...f, owner_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('البريد الإلكتروني', 'Email')}</label>
              <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('رقم الجوال', 'Phone')}</label>
              <Input value={editForm.mobile} onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('اسم الشركة', 'Company Name')}</label>
              <Input value={editForm.company_name} onChange={e => setEditForm(f => ({ ...f, company_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('الحالة', 'Status')}</label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('مفعل', 'Active')}</SelectItem>
                  <SelectItem value="suspended">{t('موقوف', 'Suspended')}</SelectItem>
                  <SelectItem value="pending_payment">{t('بانتظار الدفع', 'Pending Payment')}</SelectItem>
                  <SelectItem value="trial">{t('تجريبي', 'Trial')}</SelectItem>
                  <SelectItem value="expired">{t('منتهي', 'Expired')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('حفظ', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomers;