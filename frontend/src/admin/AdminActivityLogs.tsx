import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchActivityLogs, ActivityLog } from '@/lib/adminApi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Search, User, Clock, Monitor, Globe } from 'lucide-react';

const AdminActivityLogs: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchActivityLogs({ limit: 100 });
      setLogs(data);
    } catch (err) {
      // No logs yet
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('login') || action.includes('دخول')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (action.includes('delete') || action.includes('حذف')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (action.includes('create') || action.includes('إنشاء')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (action.includes('update') || action.includes('تحديث')) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'auth': return <User className="h-4 w-4" />;
      case 'subscription': return <Activity className="h-4 w-4" />;
      case 'payment': return <Globe className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const modules = ['all', ...new Set(logs.map(l => l.module).filter(Boolean))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('سجل النشاطات', 'Activity Logs')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('تتبع جميع الأنشطة والعمليات في النظام', 'Track all system activities and operations')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('إجمالي السجلات', 'Total Logs')}</p>
              <p className="text-xl font-bold">{logs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('مستخدمون نشطون', 'Active Users')}</p>
              <p className="text-xl font-bold">{new Set(logs.map(l => l.user_id)).size}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('اليوم', 'Today')}</p>
              <p className="text-xl font-bold">
                {logs.filter(l => {
                  const d = new Date(l.created_at || '');
                  const today = new Date();
                  return d.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('بحث في السجلات...', 'Search logs...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('كل الأقسام', 'All Modules')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('كل الأقسام', 'All Modules')}</SelectItem>
            {modules.filter(m => m !== 'all').map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Activity className="h-12 w-12 mb-3 opacity-30" />
              <p>{t('لا توجد سجلات', 'No activity logs found')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredLogs.map(log => (
                <div key={log.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 bg-gray-100 dark:bg-slate-700 rounded">
                        {getModuleIcon(log.module)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                          {log.module && (
                            <Badge variant="outline" className="text-xs">{log.module}</Badge>
                          )}
                        </div>
                        {log.details && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{log.details}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.user_id?.substring(0, 8)}...
                          </span>
                          {log.ip_address && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {log.ip_address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(log.created_at)}
                    </span>
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

export default AdminActivityLogs;