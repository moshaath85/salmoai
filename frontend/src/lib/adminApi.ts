import { client } from './sdk';

// ============ CUSTOMERS (clients table) ============
export interface Customer {
  id: number;
  company_name: string;
  owner_name: string;
  email: string;
  mobile: string;
  status: 'active' | 'suspended' | 'trial' | 'expired' | 'pending_payment';
  created_at?: string;
  updated_at?: string;
}

export async function fetchCustomers(params?: { query?: Record<string, any>; limit?: number; skip?: number; sort?: string }) {
  const response = await client.entities.clients.queryAll({
    query: params?.query || {},
    limit: params?.limit || 50,
    skip: params?.skip || 0,
    sort: params?.sort || '-created_at',
  });
  return response.data?.items || [];
}

export async function createCustomer(data: Partial<Customer>) {
  const response = await client.entities.clients.create({ data });
  return response.data;
}

export async function updateCustomer(id: number, data: Partial<Customer>) {
  const response = await client.entities.clients.update({ id: String(id), data });
  return response.data;
}

export async function deleteCustomer(id: number) {
  await client.entities.clients.delete({ id: String(id) });
}

export async function toggleClientStatus(id: number, status: string) {
  const result = await client.apiCall.invoke({
    url: `/api/v1/entities/clients/${id}/toggle-status`,
    method: 'PUT',
    data: { status },
  });
  return result;
}

// ============ TICKETS ============
export interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  customer_name: string;
  customer_email: string;
  category: string;
  status: 'new' | 'in_progress' | 'closed';
  priority: 'high' | 'medium' | 'low';
  created_at?: string;
  updated_at?: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender: string;
  content: string;
  is_admin: boolean;
  created_at?: string;
}

export async function fetchTickets(params?: { query?: Record<string, any>; limit?: number; skip?: number }) {
  const response = await client.entities.tickets.query({
    query: params?.query || {},
    limit: params?.limit || 50,
    skip: params?.skip || 0,
    sort: '-created_at',
  });
  return response.data?.items || [];
}

export async function updateTicket(id: number, data: Partial<Ticket>) {
  const response = await client.entities.tickets.update({ id: String(id), data });
  return response.data;
}

export async function fetchTicketMessages(ticketId: number) {
  const response = await client.entities.ticket_messages.query({
    query: { ticket_id: ticketId },
    sort: 'created_at',
    limit: 100,
  });
  return response.data?.items || [];
}

export async function createTicketMessage(data: { ticket_id: number; sender: string; content: string; is_admin: boolean }) {
  const response = await client.entities.ticket_messages.create({ data });
  return response.data;
}

// ============ NOTIFICATIONS ============
export interface Notification {
  id: number;
  type: 'new_customer' | 'payment' | 'ticket' | 'alert' | 'subscription';
  title: string;
  message: string;
  is_read: boolean;
  target_user_id?: string;
  created_at?: string;
}

export async function fetchNotifications(params?: { query?: Record<string, any>; limit?: number }) {
  const response = await client.entities.notifications.query({
    query: params?.query || {},
    limit: params?.limit || 50,
    sort: '-created_at',
  });
  return response.data?.items || [];
}

export async function updateNotification(id: number, data: Partial<Notification>) {
  const response = await client.entities.notifications.update({ id: String(id), data });
  return response.data;
}

export async function deleteNotification(id: number) {
  await client.entities.notifications.delete({ id: String(id) });
}

// ============ PLANS (NEW - Dynamic Subscription Plans) ============
export interface Plan {
  id: number;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  price_monthly: number;
  price_yearly: number;
  price_lifetime: number;
  billing_type: string;
  features: string; // JSON array string
  limits: string; // JSON object string
  trial_days: number;
  status: 'active' | 'hidden' | 'draft';
  is_recommended: boolean;
  sort_order: number;
  color: string;
  icon: string;
  created_at?: string;
  updated_at?: string;
}

export async function fetchPlans(params?: { query?: Record<string, any>; limit?: number; skip?: number }) {
  const response = await client.entities.plans.query({
    query: params?.query || {},
    limit: params?.limit || 50,
    skip: params?.skip || 0,
    sort: 'sort_order',
  });
  return response.data?.items || [];
}

export async function fetchActivePlans() {
  const response = await client.entities.plans.query({
    query: { status: 'active' },
    limit: 50,
    sort: 'sort_order',
  });
  return response.data?.items || [];
}

export async function createPlan(data: Partial<Plan>) {
  const response = await client.entities.plans.create({ data });
  return response.data;
}

export async function updatePlan(id: number, data: Partial<Plan>) {
  const response = await client.entities.plans.update({ id: String(id), data });
  return response.data;
}

export async function deletePlan(id: number) {
  await client.entities.plans.delete({ id: String(id) });
}

// ============ USER SUBSCRIPTIONS ============
export interface UserSubscription {
  id: number;
  user_id: string;
  plan_id: number;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  billing_cycle: string;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  payment_method: string;
  amount_paid: number;
  created_at?: string;
  updated_at?: string;
}

export async function fetchUserSubscription() {
  const response = await client.entities.user_subscriptions.query({
    query: {},
    limit: 1,
    sort: '-created_at',
  });
  const items = response.data?.items || [];
  return items.length > 0 ? items[0] : null;
}

export async function fetchAllUserSubscriptions(params?: { query?: Record<string, any>; limit?: number; skip?: number }) {
  const response = await client.entities.user_subscriptions.queryAll({
    query: params?.query || {},
    limit: params?.limit || 100,
    skip: params?.skip || 0,
    sort: '-created_at',
  });
  return response.data?.items || [];
}

export async function createUserSubscription(data: Partial<UserSubscription>) {
  const response = await client.entities.user_subscriptions.create({ data });
  return response.data;
}

export async function updateUserSubscription(id: number, data: Partial<UserSubscription>) {
  const response = await client.entities.user_subscriptions.update({ id: String(id), data });
  return response.data;
}

export async function cancelUserSubscription(id: number) {
  const response = await client.entities.user_subscriptions.update({
    id: String(id),
    data: { status: 'cancelled', auto_renew: false },
  });
  return response.data;
}

// ============ SUBSCRIPTIONS (Legacy - keep for backward compat) ============
export interface Subscription {
  id: number;
  plan_name: string;
  plan_name_en: string;
  price: number;
  features: string;
  color: string;
  subscribers_count: number;
  created_at?: string;
}

export async function fetchSubscriptions() {
  const response = await client.entities.subscriptions.query({
    query: {},
    limit: 50,
    sort: 'price',
  });
  return response.data?.items || [];
}

export async function updateSubscription(id: number, data: Partial<Subscription>) {
  const response = await client.entities.subscriptions.update({ id: String(id), data });
  return response.data;
}

// ============ INVOICES ============
export interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  plan: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
  created_at?: string;
}

export async function fetchInvoices(params?: { query?: Record<string, any>; limit?: number; skip?: number }) {
  const response = await client.entities.invoices.query({
    query: params?.query || {},
    limit: params?.limit || 50,
    skip: params?.skip || 0,
    sort: '-date',
  });
  return response.data?.items || [];
}

export async function createInvoice(data: Partial<Invoice>) {
  const response = await client.entities.invoices.create({ data });
  return response.data;
}

export async function updateInvoice(id: number, data: Partial<Invoice>) {
  const response = await client.entities.invoices.update({ id: String(id), data });
  return response.data;
}

// ============ COUPONS ============
export interface Coupon {
  id: number;
  code: string;
  discount: string;
  discount_type: string; // percentage, fixed, free_trial, upgrade, time_limited
  coupon_type: string; // general, first_purchase, renewal, referral, affiliate, seasonal
  applicable_plans: string | null; // JSON array of plan IDs
  applicable_cycles: string | null; // JSON array: ["monthly","yearly","lifetime"]
  usage_count: number;
  max_uses: number | null;
  max_uses_per_user: number;
  min_amount: number | null;
  max_discount_amount: number | null;
  trial_days: number | null;
  expires_at: string;
  starts_at: string | null;
  is_active: boolean;
  stackable: boolean;
  description_ar: string | null;
  description_en: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  error_en?: string;
  coupon_id?: number;
  code?: string;
  discount_type?: string;
  discount_value?: string;
  discount_amount?: number;
  original_amount?: number;
  final_amount?: number;
  description_ar?: string;
  description_en?: string;
  trial_days?: number | null;
}

export interface CouponUsage {
  id: number;
  coupon_id: number;
  coupon_code: string;
  user_id: string;
  plan_id: number | null;
  billing_cycle: string | null;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  applied_at: string | null;
  created_at: string | null;
}

export interface CouponStats {
  total_uses: number;
  total_discount: number;
  total_revenue: number;
  unique_users: number;
}

export async function fetchCoupons() {
  const response = await client.entities.coupons.query({
    query: {},
    limit: 50,
    sort: '-created_at',
  });
  return response.data?.items || [];
}

export async function createCoupon(data: Partial<Coupon>) {
  const response = await client.entities.coupons.create({ data });
  return response.data;
}

export async function updateCoupon(id: number, data: Partial<Coupon>) {
  const response = await client.entities.coupons.update({ id: String(id), data });
  return response.data;
}

export async function deleteCoupon(id: number) {
  await client.entities.coupons.delete({ id: String(id) });
}

export async function validateCoupon(data: {
  code: string;
  plan_id: number;
  billing_cycle: string;
  amount: number;
  user_id?: string;
}): Promise<CouponValidationResult> {
  // client.apiCall.invoke returns parsed JSON directly (no .data wrapper)
  const result = await client.apiCall.invoke({
    url: '/api/v1/entities/coupons/validate',
    method: 'POST',
    data,
  });
  return result as CouponValidationResult;
}

export async function applyCoupon(data: {
  code: string;
  plan_id: number;
  billing_cycle: string;
  amount: number;
  user_id: string;
}): Promise<CouponValidationResult> {
  const result = await client.apiCall.invoke({
    url: '/api/v1/entities/coupons/apply',
    method: 'POST',
    data,
  });
  return result as CouponValidationResult;
}

export async function fetchCouponStats(couponId: number): Promise<CouponStats> {
  const result = await client.apiCall.invoke({
    url: `/api/v1/entities/coupons/stats/${couponId}`,
    method: 'GET',
    data: {},
  });
  return result as CouponStats;
}

export async function fetchCouponUsages(couponId?: number, skip = 0, limit = 50): Promise<{ items: CouponUsage[]; total: number }> {
  const queryData: Record<string, any> = { skip, limit };
  if (couponId) queryData.coupon_id = couponId;
  const result = await client.apiCall.invoke({
    url: '/api/v1/entities/coupons/usages',
    method: 'GET',
    data: queryData,
  });
  return result as { items: CouponUsage[]; total: number };
}

// ============ PAYMENT TRANSACTIONS ============
export interface PaymentTransaction {
  id: number;
  user_id: string;
  plan_id: number;
  plan_name: string;
  amount: number;
  currency: string;
  status: 'success' | 'pending' | 'failed' | 'refunded';
  payment_method: string;
  payment_gateway: string;
  gateway_payment_id: string;
  billing_cycle: string;
  invoice_number: string;
  description: string;
  failure_reason: string;
  refund_amount: number;
  is_renewal: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function fetchPaymentTransactions(params?: { query?: Record<string, any>; limit?: number; skip?: number }) {
  const response = await client.entities.payment_transactions.query({
    query: params?.query || {},
    limit: params?.limit || 50,
    skip: params?.skip || 0,
    sort: '-created_at',
  });
  return response.data?.items || [];
}

export async function fetchAllPaymentTransactions(params?: { query?: Record<string, any>; limit?: number; skip?: number }) {
  const response = await client.entities.payment_transactions.queryAll({
    query: params?.query || {},
    limit: params?.limit || 100,
    skip: params?.skip || 0,
    sort: '-created_at',
  });
  return response.data?.items || [];
}

export async function createPaymentTransaction(data: Partial<PaymentTransaction>) {
  const response = await client.entities.payment_transactions.create({ data });
  return response.data;
}

export async function updatePaymentTransaction(id: number, data: Partial<PaymentTransaction>) {
  const response = await client.entities.payment_transactions.update({ id: String(id), data });
  return response.data;
}

// ============ NOTIFICATION HELPERS ============
export async function fetchUserNotifications(params?: { limit?: number; skip?: number }) {
  const response = await client.entities.notifications.query({
    query: {},
    limit: params?.limit || 20,
    skip: params?.skip || 0,
    sort: '-created_at',
  });
  return response.data?.items || [];
}

export async function fetchUnreadNotificationCount() {
  const response = await client.entities.notifications.query({
    query: { is_read: false },
    limit: 100,
  });
  return response.data?.items?.length || 0;
}

export async function markNotificationRead(id: number) {
  const response = await client.entities.notifications.update({
    id: String(id),
    data: { is_read: true },
  });
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await client.entities.notifications.query({
    query: { is_read: false },
    limit: 100,
  });
  const items = response.data?.items || [];
  await Promise.all(items.map((n: Notification) =>
    client.entities.notifications.update({ id: String(n.id), data: { is_read: true } })
  ));
}

export async function createNotification(data: Partial<Notification>) {
  const response = await client.entities.notifications.create({ data });
  return response.data;
}

// ============ ACTIVITY LOGS ============
export interface ActivityLog {
  id: number;
  user_id: string;
  action: string;
  details: string;
  ip_address: string;
  user_agent: string;
  module: string;
  created_at?: string;
}

export async function fetchActivityLogs(params?: { query?: Record<string, any>; limit?: number; skip?: number }) {
  const response = await client.entities.activity_logs.query({
    query: params?.query || {},
    limit: params?.limit || 50,
    skip: params?.skip || 0,
    sort: '-created_at',
  });
  return response.data?.items || [];
}

export async function createActivityLog(data: Partial<ActivityLog>) {
  const response = await client.entities.activity_logs.create({ data });
  return response.data;
}

export async function deleteActivityLog(id: number) {
  await client.entities.activity_logs.delete({ id: String(id) });
}

// ============ EMAIL SETTINGS ============
export interface EmailSettings {
  id: number;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_name: string;
  from_email: string;
  is_active: boolean;
  use_tls: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function fetchEmailSettings() {
  const response = await client.entities.email_settings.query({
    query: {},
    limit: 1,
    sort: '-created_at',
  });
  const items = response.data?.items || [];
  return items.length > 0 ? items[0] : null;
}

export async function saveEmailSettings(data: Partial<EmailSettings>) {
  // Try to get existing settings first
  const existing = await fetchEmailSettings();
  if (existing) {
    const response = await client.entities.email_settings.update({ id: String(existing.id), data });
    return response.data;
  } else {
    const response = await client.entities.email_settings.create({ data });
    return response.data;
  }
}

// ============ DASHBOARD STATS ============
export async function fetchDashboardStats() {
  const [customers, tickets, invoices, notifications] = await Promise.all([
    client.entities.clients.queryAll({ query: {}, limit: 1000 }),
    client.entities.tickets.query({ query: {}, limit: 1000 }),
    client.entities.invoices.query({ query: {}, limit: 1000 }),
    client.entities.notifications.query({ query: { is_read: false }, limit: 100 }),
  ]);

  const customerList = customers.data?.items || [];
  const ticketList = tickets.data?.items || [];
  const invoiceList = invoices.data?.items || [];
  const notificationList = notifications.data?.items || [];

  const totalRevenue = invoiceList
    .filter((inv: Invoice) => inv.status === 'paid')
    .reduce((sum: number, inv: Invoice) => sum + (inv.amount || 0), 0);

  const activeCustomers = customerList.filter((c: Customer) => c.status === 'active').length;
  const openTickets = ticketList.filter((t: Ticket) => t.status !== 'closed').length;
  const unreadNotifications = notificationList.length;

  return {
    totalCustomers: customerList.length,
    activeCustomers,
    totalRevenue,
    openTickets,
    unreadNotifications,
    recentCustomers: customerList.slice(0, 5),
    recentTickets: ticketList.slice(0, 5),
  };
}