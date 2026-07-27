import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { client } from '@/lib/sdk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Webhook, RotateCcw, CheckCircle2, XCircle, Clock, AlertTriangle,
  Eye, RefreshCw, Filter, Search, Activity
} from 'lucide-react';

interface WebhookEvent {
  id: number;
  gateway_name: string;
  event_type: string;
  payload: string;
  status: string;
  retry_count: number;
  max_retries: number;
  error_message: string;
  signature_valid: boolean;
  processed_at: string;
  created_at?: string;
}

const AdminWebhooks: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [filterGateway, setFilterGateway] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await client.entities.webhook_events.query({
        query: {},
        limit: 100,
        sort: '-created_at',
      });
      setEvents(response.data?.items || []);
    } catch (error) {
      toast.error(t('فشل تحميل الأحداث', 'Failed to load events'));
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (event: WebhookEvent) => {
    try {
      await client.entities.webhook_events.update({
        id: String(event.id),
        data: {
          status: 'processing',
          retry_count: (event.retry_count || 0) + 1,
          error_message: '',
        }
      });
      toast.success(t('تم إعادة الإرسال', 'Retry initiated'));
      loadEvents();
    } catch (error) {
      toast.error(t('فشل إعادة الإرسال', 'Retry failed'));
    }
  };

  const filteredEvents = events.filter(event => {
    if (filterGateway !== 'all' && event.gateway_name !== filterGateway) return false;
    if (filterStatus !== 'all' && event.status !== filterStatus) return false;
    if (searchQuery && !event.event_type.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">{t('ناجح', 'Success')}</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">{t('فاشل', 'Failed')}</Badge>;
      case 'processing': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">{t('جاري', 'Processing')}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: events.length,
    success: events.filter(e => e.status === 'success').length,
    failed: events.filter(e => e.status === 'failed').length,
    processing: events.filter(e => e.status === 'processing').length,
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
            {t('إدارة Webhooks', 'Webhook Management')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('مراقبة وإدارة أحداث الدفع', 'Monitor and manage payment events')}
          </p>
        </div>
        <Button variant="outline" onClick={loadEvents}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('تحديث', 'Refresh')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500">{t('إجمالي', 'Total')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.success}</p>
              <p className="text-xs text-gray-500">{t('ناجح', 'Success')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.failed}</p>
              <p className="text-xs text-gray-500">{t('فاشل', 'Failed')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.processing}</p>
              <p className="text-xs text-gray-500">{t('جاري', 'Processing')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="ps-9"
                placeholder={t('بحث بنوع الحدث...', 'Search by event type...')}
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('الحالة', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                <SelectItem value="success">{t('ناجح', 'Success')}</SelectItem>
                <SelectItem value="failed">{t('فاشل', 'Failed')}</SelectItem>
                <SelectItem value="processing">{t('جاري', 'Processing')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            {t('سجل الأحداث', 'Event Log')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Webhook className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t('لا توجد أحداث', 'No events found')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(event.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{event.event_type}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs capitalize">{event.gateway_name}</Badge>
                        {event.signature_valid !== null && (
                          <span className={`text-xs ${event.signature_valid ? 'text-green-600' : 'text-red-600'}`}>
                            {event.signature_valid ? '✓ Signature' : '✗ Signature'}
                          </span>
                        )}
                        {event.retry_count > 0 && (
                          <span className="text-xs text-gray-500">
                            {t('محاولة', 'Retry')} {event.retry_count}/{event.max_retries || 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(event.status)}
                    <span className="text-xs text-gray-500 hidden sm:block">
                      {event.created_at ? new Date(event.created_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US') : ''}
                    </span>
                    <Button size="icon" variant="ghost" onClick={() => setSelectedEvent(event)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {event.status === 'failed' && (
                      <Button size="icon" variant="ghost" onClick={() => handleRetry(event)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('تفاصيل الحدث', 'Event Details')}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">{t('البوابة', 'Gateway')}</p>
                  <p className="font-medium capitalize">{selectedEvent.gateway_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('نوع الحدث', 'Event Type')}</p>
                  <p className="font-medium">{selectedEvent.event_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('الحالة', 'Status')}</p>
                  {getStatusBadge(selectedEvent.status)}
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('التوقيع', 'Signature')}</p>
                  <p className={`font-medium ${selectedEvent.signature_valid ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedEvent.signature_valid ? t('صالح', 'Valid') : t('غير صالح', 'Invalid')}
                  </p>
                </div>
              </div>
              {selectedEvent.error_message && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">{t('رسالة الخطأ', 'Error Message')}</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{selectedEvent.error_message}</p>
                </div>
              )}
              {selectedEvent.payload && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('البيانات', 'Payload')}</p>
                  <pre className="p-3 rounded-lg bg-gray-100 dark:bg-slate-800 text-xs overflow-x-auto max-h-60">
                    {(() => {
                      try { return JSON.stringify(JSON.parse(selectedEvent.payload), null, 2); }
                      catch { return selectedEvent.payload; }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWebhooks;