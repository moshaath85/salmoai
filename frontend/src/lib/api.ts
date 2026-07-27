// Re-export from sdk.ts to maintain backward compatibility
// AuthCallback.tsx imports { client } from '../lib/api'
export { client, invokeWithRetry } from './sdk';