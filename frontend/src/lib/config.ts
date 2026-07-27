// Runtime configuration - simplified to work with web-sdk
// The SDK handles base URL routing automatically, so we no longer need
// to fetch or maintain a separate API_BASE_URL.

// Keep loadRuntimeConfig for backward compatibility with main.tsx
// It's now a no-op since the SDK handles configuration internally.
export async function loadRuntimeConfig(): Promise<void> {
  // No-op: The web-sdk automatically handles API routing and base URL.
  // This function is kept for backward compatibility with main.tsx initialization.
  return;
}

// Get current configuration - returns empty API_BASE_URL since SDK handles routing
export function getConfig() {
  return {
    API_BASE_URL: '',
  };
}

// Returns empty string - SDK handles routing automatically
// Kept for backward compatibility with any remaining imports
export function getAPIBaseURL(): string {
  return '';
}

export const config = {
  get API_BASE_URL() {
    return getAPIBaseURL();
  },
};