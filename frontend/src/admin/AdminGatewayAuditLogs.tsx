import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { client } from '@/lib/sdk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  FileText, RotateCcw, Search, Shield, Key, TestTube, ToggleLeft, Globe, User, Clock
} from 'lucide-react';

interface AuditLog {
  id: number;
  user_id: string;
  gateway_name: string;
  action: string;
  details: string;
  ip_address: string;
  connection_status_before: string;
  connection_status_after: string;
  created_at?: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  update_keys: <Key className="h-4 w-4 text-blue-500" />,
  test_connection: <TestTube className="h-4 w-4 text-yellow-500" />,
  toggle_active: <ToggleLeft className="h-4 w-4 text-green-500" />,
  change_environment: <Globe className="h-4 w-4 text-purple-500" />,
};

const ACTION_LABELS: Record<string, { ar: string; en: string }> = {
  update_keys: { ar: 'تحديث المفاتيح', en: 'Update Keys' },
  test_connection: { ar: 'اختبار الاتصال', en: 'Test Connection' },
  toggle_active: { ar: 'تغيير التفعيل', en: 'Toggle Active' },
  change_environment: { ar: 'تغيير البيئة', en: 'Change Environment' },
};

const AdminGatewayAuditLogs: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGateway, setFilterGateway] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await client.entities.gateway_audit_logs.query({
        query: {},
        limit: 100,
        sort: '-created_at',
      });
      setLogs(response.data?.items || []);
    } catch (error) {
      toast.error(t('فشل تحميل السجلات', 'Failed to load logs'));
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterGateway !== 'all' && log.gateway_name !== filterGateway) return false;
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (searchQuery && !log.details?.toLowerCase().includes(searchQuery.toLowerCase()) && !log.user_id?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusChange = (before: string, after: string) => {
    if (!before && !after) return null;
    return (
      <div className="flex items-center gap-1 text-xs">
        <Badge variant="outline" className="text-xs">{before || 'N/A'}</Badge>
        <span className="text-gray-400">→</span>
        <Badge variant="outline" className="text-xs">{after || 'N/A'}</Badge>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('سجل تغييرات APIs', 'API Changes Audit Log')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('تتبع جميع التغييرات على إعدادات بوابات الدفع', 'Track all changes to payment gateway settings')}
          </p>
        </div>
        <Button variant="outline" onClick={loadLogs}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('تحديث', 'Refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="ps-9"
                placeholder={t('بحث...', 'Search...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterGateway} onValueChange={setFilterGateway}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('البوابة', 'Gateway')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                <SelectItem value="moyasar">Moyasar</SelectItem>
                <SelectItem value="tabby">Tabby</SelectItem>
                <SelectItem value="tamara">Tamara</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('الإجراء', 'Action')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                <SelectItem value="update_keys">{t('تحديث المفاتيح', 'Update Keys')}</SelectItem>
                <SelectItem value="test_connection">{t('اختبار الاتصال', 'Test Connection')}</SelectItem>
                <SelectItem value="toggle_active">{t('تغيير التفعيل', 'Toggle Active')}</SelectItem>
                <SelectItem value="change_environment">{t('تغيير البيئة', 'Change Environment')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('سجل التغييرات', 'Change Log')}
            <Badge variant="secondary" className="ml-2">{filteredLogs.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t('لا توجد سجلات', 'No logs found')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {ACTION_ICONS[log.action] || <FileText className="h-4 w-4 text-gray-500" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {ACTION_LABELS[log.action]?.[language === 'ar' ? 'ar' : 'en'] || log.action}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">{log.gateway_name}</Badge>
                        </div>
                        {log.details && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(() => {
                              try {
                                const parsed = JSON.parse(log.details);
                                if (parsed.fields_updated) return `${t('الحقول المحدثة:', 'Fields updated:')} ${parsed.fields_updated.join(', ')}`;
                                if (parsed.result) return `${t('النتيجة:', 'Result:')} ${parsed.result}`;
                                return log.details;
                              } catch { return log.details; }
                            })()}
                          </p>
                        )}
                        {getStatusChange(log.connection_status_before, log.connection_status_after)}
                      </div>
                    </div>
                    <div className="text-end space-y-1">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {log.created_at ? new Date(log.created_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US') : ''}
                      </div>
                      {log.user_id && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{log.user_id.slice(0, 8)}...</span>
                        </div>
                      )}
                      {log.ip_address && (
                        <p className="text-xs text-gray-400">{log.ip_address}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGatewayAuditLogs;