import { client } from './sdk';

class RPApi {
  async getCurrentUser() {
    try {
      const response = await client.auth.me();
      return response?.data || null;
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.status === 401) {
        return null;
      }
      throw new Error(
        error?.response?.data?.detail || error?.message || 'Failed to get user info'
      );
    }
  }

  async login() {
    try {
      client.auth.toLogin();
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.detail || error?.message || 'Failed to initiate login'
      );
    }
  }

  async logout() {
    try {
      await client.auth.logout();
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.detail || error?.message || 'Failed to logout'
      );
    }
  }
}

export const authApi = new RPApi();