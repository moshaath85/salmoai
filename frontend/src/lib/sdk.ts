export const AUTH_TOKEN_KEY = 'salmo_token';

const BASE_URL = import.meta.env.VITE_API_URL || '';

/* eslint-disable @typescript-eslint/no-explicit-any */

function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getHeaders(hasBody = false): HeadersInit {
  const headers: HeadersInit = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: any = new Error(errorData?.detail || errorData?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.response = { status: response.status, data: errorData };
    throw error;
  }
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export const apiClient = {
  async get<T = any>(url: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<T>(response);
  },

  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: getHeaders(true),
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T = any>(url: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<T>(response);
  },

  async upload<T = any>(url: string, formData: FormData): Promise<T> {
    const headers: HeadersInit = {};
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse<T>(response);
  },
};

/**
 * Invoke an API call with retry logic and exponential backoff.
 * Retries on network errors (fetch failures, timeouts, DNS issues).
 */
export async function invokeWithRetry<T = any>(
  params: { url: string; method: string; data?: any },
  retries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const method = params.method.toUpperCase();
      let response: T;

      switch (method) {
        case 'GET':
          response = await apiClient.get<T>(params.url);
          break;
        case 'POST':
          response = await apiClient.post<T>(params.url, params.data);
          break;
        case 'PUT':
          response = await apiClient.put<T>(params.url, params.data);
          break;
        case 'DELETE':
          response = await apiClient.delete<T>(params.url);
          break;
        default:
          response = await apiClient.post<T>(params.url, params.data);
      }

      return response;
    } catch (err: any) {
      lastError = err;

      // Don't retry on client errors (4xx) - only retry on network/server errors
      const status = err?.response?.status || err?.status;
      if (status && status >= 400 && status < 500) {
        throw err;
      }

      // If this was the last attempt, throw
      if (attempt === retries) {
        throw err;
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Request deduplication - prevents duplicate concurrent API calls.
 * If a request with the same key is already in-flight, returns the existing promise.
 */
const _inflightRequests = new Map<string, Promise<any>>();

export async function invokeDeduped<T = any>(
  params: { url: string; method: string; data?: any },
  cacheKey?: string
): Promise<T> {
  const key = cacheKey || `${params.method}:${params.url}:${JSON.stringify(params.data || '')}`;

  const existing = _inflightRequests.get(key);
  if (existing) return existing as Promise<T>;

  const promise = invokeWithRetry<T>(params).finally(() => {
    _inflightRequests.delete(key);
  });

  _inflightRequests.set(key, promise);
  return promise;
}

/**
 * Backward-compatible `client` object that mimics the old @metagptx/web-sdk interface.
 * This allows existing code using client.apiCall.invoke, client.auth.*, client.entities.*, and client.ai.*
 * to work without modification.
 */

function createEntityProxy(entityName: string) {
  return {
    async query(params: { query?: any; limit?: number; sort?: string; offset?: number; skip?: number }) {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.set('limit', String(params.limit));
      if (params.sort) queryParams.set('sort', params.sort);
      if (params.offset) queryParams.set('offset', String(params.offset));
      if (params.skip) queryParams.set('offset', String(params.skip));
      if (params.query && Object.keys(params.query).length > 0) {
        queryParams.set('query', JSON.stringify(params.query));
      }
      const qs = queryParams.toString();
      const url = `/api/v1/entities/${entityName}${qs ? `?${qs}` : ''}`;
      const data = await apiClient.get<any>(url);
      return { data };
    },
    async queryAll(params: { query?: any; limit?: number; sort?: string; offset?: number; skip?: number }) {
      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.set('limit', String(params.limit));
      if (params.sort) queryParams.set('sort', params.sort);
      if (params.offset) queryParams.set('offset', String(params.offset));
      if (params.skip) queryParams.set('offset', String(params.skip));
      if (params.query && Object.keys(params.query).length > 0) {
        queryParams.set('query', JSON.stringify(params.query));
      }
      const qs = queryParams.toString();
      const url = `/api/v1/entities/${entityName}/all${qs ? `?${qs}` : ''}`;
      const data = await apiClient.get<any>(url);
      return { data };
    },
    async create(params: { data: any }) {
      const url = `/api/v1/entities/${entityName}`;
      const data = await apiClient.post<any>(url, params.data);
      return { data };
    },
    async update(params: { id: string; data: any }) {
      const url = `/api/v1/entities/${entityName}/${params.id}`;
      const data = await apiClient.put<any>(url, params.data);
      return { data };
    },
    async delete(params: { id: string }) {
      const url = `/api/v1/entities/${entityName}/${params.id}`;
      const data = await apiClient.delete<any>(url);
      return { data };
    },
  };
}

const entitiesProxy = new Proxy({} as Record<string, ReturnType<typeof createEntityProxy>>, {
  get(_target, prop: string) {
    return createEntityProxy(prop);
  },
});

export const client = {
  apiCall: {
    async invoke<T = any>(params: { url: string; method: string; data?: any }): Promise<T> {
      const method = (params.method || 'GET').toUpperCase();
      switch (method) {
        case 'GET':
          return apiClient.get<T>(params.url);
        case 'POST':
          return apiClient.post<T>(params.url, params.data);
        case 'PUT':
          return apiClient.put<T>(params.url, params.data);
        case 'DELETE':
          return apiClient.delete<T>(params.url);
        default:
          return apiClient.post<T>(params.url, params.data);
      }
    },
  },
  auth: {
    async me() {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        throw new Error('Not authenticated');
      }
      const userData = await apiClient.get<any>('/api/v1/auth/me');
      return { data: userData };
    },
    toLogin() {
      window.location.href = '/login';
    },
    async logout() {
      try {
        await apiClient.post('/api/v1/auth/logout');
      } catch {
        // Ignore logout errors
      }
      localStorage.removeItem(AUTH_TOKEN_KEY);
    },
  },
  entities: entitiesProxy,
  ai: {
    async gentxt(params: { messages: any[]; model?: string; stream?: boolean; [key: string]: any }) {
      const response = await apiClient.post<any>('/api/v1/ai/gentxt', params);
      return { data: response };
    },
  },
};