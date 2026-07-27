import { client } from './sdk';

// ============ MOYASAR PAYMENT API ============

export interface MoyasarConfig {
  publishable_key: string;
}

export interface CreatePaymentParams {
  plan_id: number;
  billing_cycle: string;
  amount: number;
  source_type: string;
  success_url?: string;
  cancel_url?: string;
}

export interface CreatePaymentResponse {
  payment_id: string;
  status: string;
  amount: number;
  currency: string;
  transaction_url: string | null;
}

export interface VerifyPaymentResponse {
  payment_id: string;
  status: string;
  amount: number;
  currency: string;
  source_type: string | null;
  source_company: string | null;
  is_paid: boolean;
}

export interface MoyasarConfigError {
  detail?: string;
  error_code?: string;
}

/**
 * Get Moyasar publishable key for frontend form.
 * Throws an error with `error_code` if the gateway is misconfigured.
 */
export async function getMoyasarConfig(): Promise<MoyasarConfig> {
  try {
    // client.apiCall.invoke returns the parsed JSON directly (no .data wrapper)
    const result = await client.apiCall.invoke<MoyasarConfig>({
      url: '/api/v1/moyasar/config',
      method: 'GET',
      data: {},
    });
    
    // The result IS the data directly from the API response
    // Check if it's an error response that somehow got through
    const anyResult = result as Record<string, unknown>;
    if (anyResult?.error_code) {
      const err = new Error((anyResult.detail as string) || 'Payment gateway error') as Error & { error_code?: string; detail?: string };
      err.error_code = anyResult.error_code as string;
      err.detail = anyResult.detail as string;
      throw err;
    }
    
    // Return the result directly - it should be { publishable_key: "..." }
    return result;
  } catch (err: unknown) {
    // If it's already our enriched error, rethrow
    if (err && typeof err === 'object' && 'error_code' in err) {
      throw err;
    }
    // Try to extract error_code from response data (thrown by handleResponse on non-2xx)
    const anyErr = err as Record<string, unknown>;
    if (anyErr?.response && typeof anyErr.response === 'object') {
      const resp = anyErr.response as Record<string, unknown>;
      const data = (resp.data || resp) as Record<string, unknown>;
      if (data?.error_code) {
        const enriched = new Error((data.detail as string) || 'Payment gateway error') as Error & { error_code?: string; detail?: string };
        enriched.error_code = data.error_code as string;
        enriched.detail = data.detail as string;
        throw enriched;
      }
    }
    throw err;
  }
}

/**
 * Create a Moyasar payment via backend
 */
export async function createMoyasarPayment(params: CreatePaymentParams): Promise<CreatePaymentResponse> {
  // client.apiCall.invoke returns parsed JSON directly (no .data wrapper)
  const result = await client.apiCall.invoke<CreatePaymentResponse>({
    url: '/api/v1/moyasar/create_payment',
    method: 'POST',
    data: params,
  });
  return result;
}

/**
 * Verify a Moyasar payment status
 */
export async function verifyMoyasarPayment(paymentId: string): Promise<VerifyPaymentResponse> {
  // client.apiCall.invoke returns parsed JSON directly (no .data wrapper)
  const result = await client.apiCall.invoke<VerifyPaymentResponse>({
    url: '/api/v1/moyasar/verify_payment',
    method: 'POST',
    data: { payment_id: paymentId },
  });
  return result;
}