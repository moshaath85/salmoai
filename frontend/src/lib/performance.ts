/**
 * Performance utilities for SALMO platform
 */

/**
 * Debounce function - prevents rapid-fire function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function - limits function calls to once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Measure and log performance of async operations
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    if (duration > 1000) {
      console.warn(`[PERF] ${label}: ${duration.toFixed(0)}ms (slow)`);
    }
    return result;
  } catch (err) {
    const duration = performance.now() - start;
    console.error(`[PERF] ${label}: failed after ${duration.toFixed(0)}ms`);
    throw err;
  }
}

/**
 * Simple in-memory cache with TTL for frontend API responses
 */
export class ResponseCache<T = any> {
  private cache = new Map<string, { data: T; expires: number }>();

  constructor(private ttlMs: number = 300000) {} // 5 min default

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, expires: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Shared search cache instance
export const searchCache = new ResponseCache(300000); // 5 minutes
export const chatCache = new ResponseCache(600000); // 10 minutes