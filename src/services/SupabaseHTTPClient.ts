// src/services/SupabaseHTTPClient.ts
// Complete secure HTTP client for Supabase with environment variables

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

interface AuthResponse {
  user: any;
  session: any;
  error?: string;
}

interface DatabaseResponse {
  data: any;
  error?: string;
}

interface FileUploadResponse {
  success: boolean;
  error?: string;
  path?: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  subscription_tier: 'free' | 'starter' | 'professional' | 'business';
  jobs_count: number;
  max_jobs: number;
  created_at: string;
  updated_at: string;
  storage_used_bytes?: number;
  last_photo_upload?: string;
}

class SupabaseHTTPClient {
  private config: SupabaseConfig;
  private authToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Get environment variables with validation
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    // Validate environment variables exist
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase environment variables. Please check your .env file.\n' +
        'Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY'
      );
    }

    // Validate URL format
    if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
      throw new Error('Invalid Supabase URL format. Expected: https://your-project.supabase.co');
    }

    // Validate key format (basic check)
    if (supabaseAnonKey.length < 100) {
      throw new Error('Invalid Supabase anon key format. Key appears too short.');
    }

    this.config = { url: supabaseUrl, anonKey: supabaseAnonKey };
    
    // Load stored tokens on initialization
    this.loadStoredTokens();
  }

  // Load tokens from AsyncStorage (React Native)
  private async loadStoredTokens(): Promise<void> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      this.authToken = await AsyncStorage.default.getItem('supabase_auth_token');
      this.refreshToken = await AsyncStorage.default.getItem('supabase_refresh_token');
    } catch (error) {
      console.warn('Could not load stored tokens:', error);
    }
  }

  // Save tokens to AsyncStorage (React Native)
  private async saveTokens(authToken: string, refreshToken?: string): Promise<void> {
    try {
      this.authToken = authToken;
      if (refreshToken) {
        this.refreshToken = refreshToken;
      }
      
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem('supabase_auth_token', authToken);
      if (refreshToken) {
        await AsyncStorage.default.setItem('supabase_refresh_token', refreshToken);
      }
    } catch (error) {
      console.warn('Could not save tokens:', error);
    }
  }

  // Clear stored tokens from AsyncStorage (React Native)
  private async clearTokens(): Promise<void> {
    try {
      this.authToken = null;
      this.refreshToken = null;
      
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.removeItem('supabase_auth_token');
      await AsyncStorage.default.removeItem('supabase_refresh_token');
    } catch (error) {
      console.warn('Could not clear tokens:', error);
    }
  }

  // Make HTTP request with error handling and retry logic
  private async makeRequest(
    endpoint: string, 
    options: RequestInit = {}, 
    useAuth = true
  ): Promise<Response> {
    const url = `${this.config.url}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': this.config.anonKey,
      ...options.headers as Record<string, string>,
    };

    if (useAuth && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, requestOptions);
      
      // Handle 401 - try to refresh token
      if (response.status === 401 && this.refreshToken && useAuth) {
        const refreshed = await this.refreshAuthToken();
        if (refreshed) {
          // Retry with new token
          headers['Authorization'] = `Bearer ${this.authToken}`;
          return fetch(url, { ...requestOptions, headers });
        }
      }

      return response;
    } catch (error) {
      console.error('Network request failed:', error);
      throw new Error(`Network request failed: ${error}`);
    }
  }

  // Refresh authentication token
  private async refreshAuthToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.config.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.anonKey,
        },
        body: JSON.stringify({
          refresh_token: this.refreshToken,
        }),
      });

      const result = await response.json();
      
      if (result.access_token) {
        await this.saveTokens(result.access_token, result.refresh_token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // =================
  // AUTHENTICATION
  // =================

  async signUp(email: string, password: string, userData?: any): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest('/auth/v1/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          data: userData,
        }),
      }, false);

      const result = await response.json();
      
      if (result.access_token) {
        await this.saveTokens(result.access_token, result.refresh_token);
      }

      return {
        user: result.user,
        session: result,
        error: result.error?.message,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: `Network error: ${error}`,
      };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      }, false);

      const result = await response.json();
      
      if (result.access_token) {
        await this.saveTokens(result.access_token, result.refresh_token);
      }

      return {
        user: result.user,
        session: result,
        error: result.error?.message,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: `Network error: ${error}`,
      };
    }
  }

  async signOut(): Promise<{ error?: string }> {
    try {
      await this.makeRequest('/auth/v1/logout', {
        method: 'POST',
      });

      await this.clearTokens();
      return {};
    } catch (error) {
      await this.clearTokens(); // Clear tokens even if request fails
      return { error: `Signout error: ${error}` };
    }
  }

  async getUser(): Promise<{ user: any; error?: string }> {
    if (!this.authToken) {
      return { user: null, error: 'No auth token' };
    }

    try {
      const response = await this.makeRequest('/auth/v1/user', {
        method: 'GET',
      });

      const result = await response.json();
      return {
        user: response.ok ? result : null,
        error: response.ok ? undefined : result.error?.message,
      };
    } catch (error) {
      return {
        user: null,
        error: `Network error: ${error}`,
      };
    }
  }

  async resetPasswordForEmail(email: string): Promise<{ error?: string }> {
    try {
      const response = await this.makeRequest('/auth/v1/recover', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }, false);

      const result = await response.json();
      return {
        error: response.ok ? undefined : result.error?.message,
      };
    } catch (error) {
      return { error: `Network error: ${error}` };
    }
  }

  // =================
  // DATABASE OPERATIONS
  // =================

  async select(
    table: string, 
    columns = '*', 
    filters?: Record<string, any>,
    options?: {
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
    }
  ): Promise<DatabaseResponse> {
    if (!this.authToken) {
      return { data: null, error: 'Not authenticated' };
    }

    try {
      let url = `/rest/v1/${table}?select=${columns}`;
      
      // Add filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          url += `&${key}=eq.${encodeURIComponent(value)}`;
        });
      }

      // Add ordering
      if (options?.orderBy) {
        const direction = options.orderBy.ascending === false ? 'desc' : 'asc';
        url += `&order=${options.orderBy.column}.${direction}`;
      }

      // Add pagination
      if (options?.limit) {
        url += `&limit=${options.limit}`;
      }
      if (options?.offset) {
        url += `&offset=${options.offset}`;
      }

      const response = await this.makeRequest(url, {
        method: 'GET',
      });

      const data = await response.json();
      return { 
        data: response.ok ? data : null, 
        error: response.ok ? undefined : data.message 
      };
    } catch (error) {
      return { data: null, error: `Network error: ${error}` };
    }
  }

  async insert(table: string, data: any): Promise<DatabaseResponse> {
    if (!this.authToken) {
      return { data: null, error: 'Not authenticated' };
    }

    try {
      const response = await this.makeRequest(`/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return { 
        data: response.ok ? result : null, 
        error: response.ok ? undefined : result.message 
      };
    } catch (error) {
      return { data: null, error: `Network error: ${error}` };
    }
  }

  async update(
    table: string, 
    data: any, 
    filters: Record<string, any>
  ): Promise<DatabaseResponse> {
    if (!this.authToken) {
      return { data: null, error: 'Not authenticated' };
    }

    try {
      let url = `/rest/v1/${table}?`;
      
      Object.entries(filters).forEach(([key, value], index) => {
        if (index > 0) url += '&';
        url += `${key}=eq.${encodeURIComponent(value)}`;
      });

      const response = await this.makeRequest(url, {
        method: 'PATCH',
        headers: {
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return { 
        data: response.ok ? result : null, 
        error: response.ok ? undefined : result.message 
      };
    } catch (error) {
      return { data: null, error: `Network error: ${error}` };
    }
  }

  async delete(table: string, filters: Record<string, any>): Promise<DatabaseResponse> {
    if (!this.authToken) {
      return { data: null, error: 'Not authenticated' };
    }

    try {
      let url = `/rest/v1/${table}?`;
      
      Object.entries(filters).forEach(([key, value], index) => {
        if (index > 0) url += '&';
        url += `${key}=eq.${encodeURIComponent(value)}`;
      });

      const response = await this.makeRequest(url, {
        method: 'DELETE',
      });

      return { 
        data: response.ok ? { success: true } : null, 
        error: response.ok ? undefined : 'Delete failed' 
      };
    } catch (error) {
      return { data: null, error: `Network error: ${error}` };
    }
  }

  // =================
  // FILE STORAGE
  // =================

  async uploadFile(
    bucket: string, 
    path: string, 
    fileData: string | Uint8Array,
    options?: {
      contentType?: string;
      upsert?: boolean;
    }
  ): Promise<FileUploadResponse> {
    if (!this.authToken) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.authToken}`,
        'apikey': this.config.anonKey,
      };

      if (options?.contentType) {
        headers['Content-Type'] = options.contentType;
      }

      if (options?.upsert) {
        headers['x-upsert'] = 'true';
      }

      let body: any;
      if (typeof fileData === 'string') {
        // Base64 data
        body = fileData;
        headers['Content-Type'] = 'application/octet-stream';
      } else {
        // Binary data
        body = fileData;
      }

      const response = await fetch(
        `${this.config.url}/storage/v1/object/${bucket}/${path}`,
        {
          method: 'POST',
          headers,
          body,
        }
      );

      const result = await response.json();
      return {
        success: response.ok,
        error: response.ok ? undefined : result.message,
        path: response.ok ? path : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: `Upload error: ${error}`,
      };
    }
  }

  async deleteFile(bucket: string, path: string): Promise<FileUploadResponse> {
    if (!this.authToken) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await this.makeRequest(`/storage/v1/object/${bucket}/${path}`, {
        method: 'DELETE',
      });

      return {
        success: response.ok,
        error: response.ok ? undefined : 'Delete failed',
      };
    } catch (error) {
      return {
        success: false,
        error: `Delete error: ${error}`,
      };
    }
  }

  async getPublicUrl(bucket: string, path: string): Promise<{ publicUrl: string | null; error?: string }> {
    try {
      const publicUrl = `${this.config.url}/storage/v1/object/public/${bucket}/${path}`;
      return { publicUrl };
    } catch (error) {
      return { publicUrl: null, error: `Error generating URL: ${error}` };
    }
  }

  // =================
  // UTILITY METHODS
  // =================

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.makeRequest('/rest/v1/', {
        method: 'GET',
      }, false);

      return {
        success: response.ok,
        error: response.ok ? undefined : 'Connection failed',
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error}`,
      };
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  // Get current config (for debugging)
  getConfig(): { hasUrl: boolean; hasKey: boolean; isAuthenticated: boolean } {
    return {
      hasUrl: !!this.config.url,
      hasKey: !!this.config.anonKey,
      isAuthenticated: this.isAuthenticated(),
    };
  }
}

// =================
// EXPORTS & HELPERS
// =================

// Export configured client instance
export const supabase = new SupabaseHTTPClient();

// Helper functions for compatibility with existing code
export const getCurrentUser = async () => {
  const { user } = await supabase.getUser();
  return user;
};

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const { data, error } = await supabase.select('profiles', '*', { id: userId });
  if (error) throw new Error(error);
  return data?.[0];
};

// Job limit checking with tier support
export const canCreateJob = async (userId: string): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) {
      return { allowed: false, reason: 'User profile not found' };
    }

    const limits = {
      free: 20,
      starter: 200,
      professional: null,
      business: null,
    };

    const maxJobs = limits[profile.subscription_tier as keyof typeof limits] ?? limits.free;
    
    if (maxJobs === null) {
      return { allowed: true };
    }

    if (profile.jobs_count >= maxJobs) {
      return {
        allowed: false,
        reason: `You've created ${profile.jobs_count}/${maxJobs} jobs. Upgrade to create more jobs.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking job limit:', error);
    return { allowed: false, reason: 'Error checking job limit' };
  }
};

// Auth state helpers
export const onAuthStateChange = (callback: (user: any) => void) => {
  // Simple polling implementation for auth state changes
  // In a real app, you might want to use WebSocket or Server-Sent Events
  let currentUser: any = null;
  
  const checkAuth = async () => {
    try {
      const { user } = await supabase.getUser();
      if (user !== currentUser) {
        currentUser = user;
        callback(user);
      }
    } catch (error) {
      console.error('Auth state check failed:', error);
    }
  };

  // Check immediately
  checkAuth();
  
  // Check every 30 seconds
  const interval = setInterval(checkAuth, 30000);
  
  // Return cleanup function
  return () => clearInterval(interval);
};

// Export the class for advanced usage
export { SupabaseHTTPClient };

// Export types
export type { AuthResponse, DatabaseResponse, FileUploadResponse, UserProfile };