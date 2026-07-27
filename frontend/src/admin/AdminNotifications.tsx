import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, UserPlus, CreditCard, TicketCheck, AlertTriangle, Check, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { fetchNotifications, updateNotification, deleteNotification as deleteNotif, type Notification } from '@/lib/adminApi';

const AdminNotifications: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const typeConfig = {
    new_customer: { icon: UserPlus, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
    payment: { icon: CreditCard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' },
    ticket: { icon: TicketCheck, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' },
    alert: { icon: AlertTriangle, color: 'text-red-500 bg-red-50 dark:bg-red-900/30' },
    subscription: { icon: Bell, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' },
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => updateNotification(n.id, { is_read: true })));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const markRead = async (id: number) => {
    try {
      await updateNotification(id, { is_read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNotif(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t('الآن', 'Just now');
    if (diffMins < 60) return t(`منذ ${diffMins} دقيقة`, `${diffMins} min ago`);
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t(`منذ ${diffHours} ساعة`, `${diffHours} hours ago`);
    const diffDays = Math.floor(diffHours / 24);
    return t(`منذ ${diffDays} يوم`, `${diffDays} days ago`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <Card className="border-0 shadow-sm dark:bg-slate-800">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{t('الإشعارات', 'Notifications')}</h2>
              <p className="text-sm text-gray-500">{unreadCount} {t('غير مقروءة', 'unread')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              {t('الكل', 'All')}
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              {t('غير مقروءة', 'Unread')}
              {unreadCount > 0 && (
                <Badge className="ms-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <Check className="h-4 w-4 me-1" />
              {t('قراءة الكل', 'Mark all read')}
            </Button>
            <Button variant="ghost" size="icon" onClick={loadNotifications}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t('لا توجد إشعارات', 'No notifications')}</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(notif => {
            const config = typeConfig[notif.type] || typeConfig.alert;
            const Icon = config.icon;
            return (
              <Card
                key={notif.id}
                className={`border-0 shadow-sm dark:bg-slate-800 transition-all hover:shadow-md cursor-pointer group ${!notif.is_read ? 'border-s-4 border-s-blue-500' : ''}`}
                onClick={() => !notif.is_read && markRead(notif.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!notif.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{notif.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{getTimeAgo(notif.created_at)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;