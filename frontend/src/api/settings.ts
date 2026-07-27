import { client } from '../lib/sdk';

export interface EnvVariable {
  key: string;
  value: string;
  description: string;
}

export interface EnvConfig {
  backend_vars: Record<string, EnvVariable>;
  frontend_vars: Record<string, EnvVariable>;
}

export interface EnvVariableUpdate {
  value: string;
}

export const settingsApi = {
  // Fetch all configurations
  async getConfig(): Promise<EnvConfig> {
    // client.apiCall.invoke returns parsed JSON directly (no .data wrapper)
    const result = await client.apiCall.invoke<EnvConfig>({
      url: '/api/v1/admin/settings/',
      method: 'GET',
      data: {},
    });
    return result;
  },

  // Update backend configuration
  async updateBackendConfig(
    key: string,
    value: string
  ): Promise<{ message: string }> {
    const result = await client.apiCall.invoke<{ message: string }>({
      url: `/api/v1/admin/settings/backend/${key}`,
      method: 'PUT',
      data: { value },
    });
    return result;
  },

  // Update frontend configuration
  async updateFrontendConfig(
    key: string,
    value: string
  ): Promise<{ message: string }> {
    const result = await client.apiCall.invoke<{ message: string }>({
      url: `/api/v1/admin/settings/frontend/${key}`,
      method: 'PUT',
      data: { value },
    });
    return result;
  },

  // Add backend configuration
  async addBackendConfig(
    key: string,
    value: string
  ): Promise<{ message: string }> {
    const result = await client.apiCall.invoke<{ message: string }>({
      url: `/api/v1/admin/settings/backend/${key}`,
      method: 'POST',
      data: { value },
    });
    return result;
  },

  // Add frontend configuration
  async addFrontendConfig(
    key: string,
    value: string
  ): Promise<{ message: string }> {
    const result = await client.apiCall.invoke<{ message: string }>({
      url: `/api/v1/admin/settings/frontend/${key}`,
      method: 'POST',
      data: { value },
    });
    return result;
  },

  // Delete backend configuration
  async deleteBackendConfig(key: string): Promise<{ message: string }> {
    const result = await client.apiCall.invoke<{ message: string }>({
      url: `/api/v1/admin/settings/backend/${key}`,
      method: 'DELETE',
      data: {},
    });
    return result;
  },

  // Delete frontend configuration
  async deleteFrontendConfig(key: string): Promise<{ message: string }> {
    const result = await client.apiCall.invoke<{ message: string }>({
      url: `/api/v1/admin/settings/frontend/${key}`,
      method: 'DELETE',
      data: {},
    });
    return result;
  },
};