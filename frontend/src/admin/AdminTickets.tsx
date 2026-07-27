import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Clock, CheckCircle2, AlertCircle, Send, Paperclip, User, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { fetchTickets, updateTicket, fetchTicketMessages, createTicketMessage, type Ticket, type TicketMessage } from '@/lib/adminApi';

const AdminTickets: React.FC = () => {
  const { language } = useTheme();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTickets();
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadMessages = async (ticketId: number) => {
    setMessagesLoading(true);
    try {
      const data = await fetchTicketMessages(ticketId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    try {
      await createTicketMessage({
        ticket_id: selectedTicket.id,
        sender: 'الدعم الفني',
        content: replyText,
        is_admin: true,
      });
      if (selectedTicket.status === 'new') {
        await updateTicket(selectedTicket.id, { status: 'in_progress' });
        setSelectedTicket({ ...selectedTicket, status: 'in_progress' });
      }
      setReplyText('');
      await loadMessages(selectedTicket.id);
      await loadTickets();
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    try {
      await updateTicket(selectedTicket.id, { status: 'closed' });
      setSelectedTicket({ ...selectedTicket, status: 'closed' });
      await loadTickets();
    } catch (err) {
      console.error('Failed to close ticket:', err);
    }
  };

  const statusConfig = {
    new: { label: t('جديد', 'New'), icon: AlertCircle, class: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    in_progress: { label: t('جاري المعالجة', 'In Progress'), icon: Clock, class: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    closed: { label: t('مغلق', 'Closed'), icon: CheckCircle2, class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  };

  const priorityConfig = {
    high: { label: t('عالي', 'High'), class: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    medium: { label: t('متوسط', 'Medium'), class: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    low: { label: t('منخفض', 'Low'), class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  };

  const filtered = tickets.filter(tk => statusFilter === 'all' || tk.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => { setSelectedTicket(null); setMessages([]); }} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('العودة للقائمة', 'Back to list')}
          </Button>
          {selectedTicket.status !== 'closed' && (
            <Button variant="outline" size="sm" onClick={handleCloseTicket} className="ms-auto">
              <CheckCircle2 className="h-4 w-4 me-1" />
              {t('إغلاق التذكرة', 'Close Ticket')}
            </Button>
          )}
        </div>

        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader className="border-b dark:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedTicket.ticket_number} • {selectedTicket.customer_name} • {selectedTicket.customer_email}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge className={statusConfig[selectedTicket.status]?.class || ''}>
                  {statusConfig[selectedTicket.status]?.label || selectedTicket.status}
                </Badge>
                <Badge className={priorityConfig[selectedTicket.priority]?.class || ''}>
                  {priorityConfig[selectedTicket.priority]?.label || selectedTicket.priority}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {/* Messages */}
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('لا توجد رسائل', 'No messages')}</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-xl p-3 ${
                      msg.is_admin
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'
                        : 'bg-gray-100 dark:bg-slate-700'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3 w-3" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{msg.sender}</span>
                        <span className="text-xs text-gray-400">{msg.created_at ? new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply */}
            {selectedTicket.status !== 'closed' && (
              <div className="border-t dark:border-slate-700 pt-4">
                <Textarea
                  placeholder={t('اكتب ردك هنا...', 'Write your reply...')}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  className="min-h-[100px] mb-3"
                />
                <div className="flex justify-between items-center">
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4 me-1" />
                    {t('مرفق', 'Attach')}
                  </Button>
                  <Button size="sm" className="gap-2" onClick={handleSendReply} disabled={sending || !replyText.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {t('إرسال الرد', 'Send Reply')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t('تذاكر جديدة', 'New Tickets'), count: tickets.filter(tk => tk.status === 'new').length, icon: AlertCircle, color: 'text-blue-600' },
          { label: t('جاري المعالجة', 'In Progress'), count: tickets.filter(tk => tk.status === 'in_progress').length, icon: Clock, color: 'text-amber-600' },
          { label: t('مغلقة', 'Closed'), count: tickets.filter(tk => tk.status === 'closed').length, icon: CheckCircle2, color: 'text-gray-600' },
        ].map((stat, idx) => (
          <Card key={idx} className="border-0 shadow-sm dark:bg-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <Card className="border-0 shadow-sm dark:bg-slate-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t('فلترة حسب الحالة', 'Filter by status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                <SelectItem value="new">{t('جديد', 'New')}</SelectItem>
                <SelectItem value="in_progress">{t('جاري المعالجة', 'In Progress')}</SelectItem>
                <SelectItem value="closed">{t('مغلق', 'Closed')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadTickets}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardContent className="p-8 text-center text-gray-500">
              {t('لا توجد تذاكر', 'No tickets found')}
            </CardContent>
          </Card>
        ) : (
          filtered.map(ticket => (
            <Card
              key={ticket.id}
              className="border-0 shadow-sm dark:bg-slate-800 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSelectTicket(ticket)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{ticket.subject}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {ticket.ticket_number} • {ticket.customer_name} • {ticket.category} • {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('ar-SA') : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${priorityConfig[ticket.priority]?.class || ''}`}>
                      {priorityConfig[ticket.priority]?.label || ticket.priority}
                    </Badge>
                    <Badge className={`text-xs ${statusConfig[ticket.status]?.class || ''}`}>
                      {statusConfig[ticket.status]?.label || ticket.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminTickets;