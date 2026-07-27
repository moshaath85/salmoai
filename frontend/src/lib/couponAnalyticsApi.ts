import { client } from './sdk';

// ============ COUPON ANALYTICS TYPES ============
export interface CouponExpiryAlert {
  coupon_id: number;
  code: string;
  expires_at: string;
  days_remaining: number;
  is_active: boolean;
  usage_count: number;
}

export interface AnalyticsSummary {
  total_coupons: number;
  active_coupons: number;
  total_redemptions: number;
  total_discount_given: number;
  total_revenue_with_coupons: number;
  avg_redemption_rate: number;
  expiring_soon: number;
}

export interface DailyUsageData {
  date: string;
  redemptions: number;
  discount_amount: number;
  revenue: number;
}

export interface CouponPerformance {
  coupon_id: number;
  code: string;
  discount_type: string;
  usage_count: number;
  total_discount: number;
  total_revenue: number;
  redemption_rate: number;
  avg_discount: number;
}

// ============ API FUNCTIONS ============
// Note: client.apiCall.invoke returns parsed JSON directly (no .data wrapper)

export async function fetchExpiringCoupons(days: number = 7): Promise<CouponExpiryAlert[]> {
  const result = await client.apiCall.invoke({
    url: `/api/v1/coupon-analytics/expiring-coupons?days=${days}`,
    method: 'GET',
  });
  return (result as CouponExpiryAlert[]) || [];
}

export async function checkAndNotifyExpiring(days: number = 7): Promise<{ expiring_count: number; notifications_created: number }> {
  const result = await client.apiCall.invoke({
    url: `/api/v1/coupon-analytics/check-and-notify?days=${days}`,
    method: 'POST',
  });
  return result as { expiring_count: number; notifications_created: number };
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const result = await client.apiCall.invoke({
    url: '/api/v1/coupon-analytics/summary',
    method: 'GET',
  });
  return result as AnalyticsSummary;
}

export async function fetchUsageOverTime(days: number = 30): Promise<DailyUsageData[]> {
  const result = await client.apiCall.invoke({
    url: `/api/v1/coupon-analytics/usage-over-time?days=${days}`,
    method: 'GET',
  });
  return (result as DailyUsageData[]) || [];
}

export async function fetchCouponPerformance(): Promise<CouponPerformance[]> {
  const result = await client.apiCall.invoke({
    url: '/api/v1/coupon-analytics/coupon-performance',
    method: 'GET',
  });
  return (result as CouponPerformance[]) || [];
}