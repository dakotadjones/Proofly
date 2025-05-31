// src/services/AuthStorageService.ts
// Secure token storage with remember me functionality

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StoredAuthData {
  email: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  rememberMe: boolean;
}

class AuthStorageService {
  private static instance: AuthStorageService;
  
  // Storage keys
  private readonly AUTH_TOKEN_KEY = 'proofly_auth_token';
  private readonly REFRESH_TOKEN_KEY = 'proofly_refresh_token';
  private readonly USER_EMAIL_KEY = 'proofly_user_email';
  private readonly REMEMBER_ME_KEY = 'proofly_remember_me';
  private readonly TOKEN_EXPIRY_KEY = 'proofly_token_expiry';
  
  static getInstance(): AuthStorageService {
    if (!AuthStorageService.instance) {
      AuthStorageService.instance = new AuthStorageService();
    }
    return AuthStorageService.instance;
  }

  // Check if SecureStore is available (not available in Expo Go)
  private async isSecureStoreAvailable(): Promise<boolean> {
    try {
      await SecureStore.isAvailableAsync();
      return true;
    } catch {
      return false;
    }
  }

  // Store auth data securely
  async storeAuthData(data: {
    email: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number; // seconds
    rememberMe: boolean;
  }): Promise<void> {
    try {
      const expiresAt = data.expiresIn 
        ? new Date(Date.now() + data.expiresIn * 1000).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default 24 hours

      const authData: StoredAuthData = {
        email: data.email,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt,
        rememberMe: data.rememberMe,
      };

      console.log(`🔐 Storing auth data (remember me: ${data.rememberMe})`);

      if (data.rememberMe) {
        // Store securely for long-term persistence
        const isSecureStoreAvailable = await this.isSecureStoreAvailable();
        
        if (isSecureStoreAvailable) {
          // Use SecureStore for production
          await SecureStore.setItemAsync(this.AUTH_TOKEN_KEY, data.accessToken);
          if (data.refreshToken) {
            await SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, data.refreshToken);
          }
          await SecureStore.setItemAsync(this.USER_EMAIL_KEY, data.email);
          await SecureStore.setItemAsync(this.TOKEN_EXPIRY_KEY, expiresAt);
          await SecureStore.setItemAsync(this.REMEMBER_ME_KEY, 'true');
        } else {
          // Fallback to AsyncStorage for Expo Go development
          console.warn('🔐 SecureStore not available, using AsyncStorage (dev only)');
          await AsyncStorage.setItem(this.AUTH_TOKEN_KEY, data.accessToken);
          if (data.refreshToken) {
            await AsyncStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
          }
          await AsyncStorage.setItem(this.USER_EMAIL_KEY, data.email);
          await AsyncStorage.setItem(this.TOKEN_EXPIRY_KEY, expiresAt);
          await AsyncStorage.setItem(this.REMEMBER_ME_KEY, 'true');
        }
      } else {
        // Session-only storage (will be cleared when app is terminated)
        await AsyncStorage.setItem(this.AUTH_TOKEN_KEY, data.accessToken);
        if (data.refreshToken) {
          await AsyncStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
        }
        await AsyncStorage.setItem(this.USER_EMAIL_KEY, data.email);
        await AsyncStorage.setItem(this.TOKEN_EXPIRY_KEY, expiresAt);
        await AsyncStorage.setItem(this.REMEMBER_ME_KEY, 'false');
      }

      console.log('✅ Auth data stored successfully');
    } catch (error) {
      console.error('❌ Error storing auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  // Retrieve stored auth data
  async getStoredAuthData(): Promise<StoredAuthData | null> {
    try {
      const isSecureStoreAvailable = await this.isSecureStoreAvailable();
      
      // Check if remember me was enabled
      const rememberMe = await AsyncStorage.getItem(this.REMEMBER_ME_KEY);
      const shouldUseSecureStore = rememberMe === 'true' && isSecureStoreAvailable;

      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      let email: string | null = null;
      let expiresAt: string | null = null;

      if (shouldUseSecureStore) {
        // Get from SecureStore
        accessToken = await SecureStore.getItemAsync(this.AUTH_TOKEN_KEY);
        refreshToken = await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
        email = await SecureStore.getItemAsync(this.USER_EMAIL_KEY);
        expiresAt = await SecureStore.getItemAsync(this.TOKEN_EXPIRY_KEY);
      } else {
        // Get from AsyncStorage
        accessToken = await AsyncStorage.getItem(this.AUTH_TOKEN_KEY);
        refreshToken = await AsyncStorage.getItem(this.REFRESH_TOKEN_KEY);
        email = await AsyncStorage.getItem(this.USER_EMAIL_KEY);
        expiresAt = await AsyncStorage.getItem(this.TOKEN_EXPIRY_KEY);
      }

      if (!accessToken || !email || !expiresAt) {
        console.log('🔐 No complete auth data found');
        return null;
      }

      // Check if token is expired
      if (new Date(expiresAt) <= new Date()) {
        console.log('🔐 Stored token is expired');
        await this.clearAuthData();
        return null;
      }

      console.log('✅ Retrieved stored auth data');
      return {
        email,
        accessToken,
        refreshToken: refreshToken || undefined, // Convert null to undefined for interface
        expiresAt,
        rememberMe: rememberMe === 'true',
      };
    } catch (error) {
      console.error('❌ Error retrieving auth data:', error);
      return null;
    }
  }

  // Get just the access token (for API calls)
  async getAccessToken(): Promise<string | null> {
    try {
      const authData = await this.getStoredAuthData();
      return authData?.accessToken || null;
    } catch (error) {
      console.error('❌ Error getting access token:', error);
      return null;
    }
  }

  // Get stored email (for "remember email" functionality)
  async getStoredEmail(): Promise<string | null> {
    try {
      const isSecureStoreAvailable = await this.isSecureStoreAvailable();
      const rememberMe = await AsyncStorage.getItem(this.REMEMBER_ME_KEY);
      
      if (rememberMe === 'true' && isSecureStoreAvailable) {
        return await SecureStore.getItemAsync(this.USER_EMAIL_KEY);
      } else {
        return await AsyncStorage.getItem(this.USER_EMAIL_KEY);
      }
    } catch (error) {
      console.error('❌ Error getting stored email:', error);
      return null;
    }
  }

  // Update access token (after refresh)
  async updateAccessToken(newAccessToken: string, expiresIn?: number): Promise<void> {
    try {
      const rememberMe = await AsyncStorage.getItem(this.REMEMBER_ME_KEY);
      const isSecureStoreAvailable = await this.isSecureStoreAvailable();
      const shouldUseSecureStore = rememberMe === 'true' && isSecureStoreAvailable;

      const expiresAt = expiresIn 
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      if (shouldUseSecureStore) {
        await SecureStore.setItemAsync(this.AUTH_TOKEN_KEY, newAccessToken);
        await SecureStore.setItemAsync(this.TOKEN_EXPIRY_KEY, expiresAt);
      } else {
        await AsyncStorage.setItem(this.AUTH_TOKEN_KEY, newAccessToken);
        await AsyncStorage.setItem(this.TOKEN_EXPIRY_KEY, expiresAt);
      }

      console.log('✅ Access token updated');
    } catch (error) {
      console.error('❌ Error updating access token:', error);
      throw new Error('Failed to update access token');
    }
  }

  // Clear all auth data (logout)
  async clearAuthData(): Promise<void> {
    try {
      const isSecureStoreAvailable = await this.isSecureStoreAvailable();
      
      // Clear from both storages to be safe
      const keys = [
        this.AUTH_TOKEN_KEY,
        this.REFRESH_TOKEN_KEY,
        this.USER_EMAIL_KEY,
        this.TOKEN_EXPIRY_KEY,
        this.REMEMBER_ME_KEY,
      ];

      // Clear from AsyncStorage
      await AsyncStorage.multiRemove(keys);

      // Clear from SecureStore if available
      if (isSecureStoreAvailable) {
        for (const key of keys) {
          try {
            await SecureStore.deleteItemAsync(key);
          } catch (error) {
            // Key might not exist, ignore error
          }
        }
      }

      console.log('✅ All auth data cleared');
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
      throw new Error('Failed to clear authentication data');
    }
  }

  // Check if user should be remembered
  async shouldRememberUser(): Promise<boolean> {
    try {
      const rememberMe = await AsyncStorage.getItem(this.REMEMBER_ME_KEY);
      return rememberMe === 'true';
    } catch (error) {
      console.error('❌ Error checking remember me status:', error);
      return false;
    }
  }

  // Check if we have valid stored credentials
  async hasValidStoredAuth(): Promise<boolean> {
    const authData = await this.getStoredAuthData();
    return authData !== null;
  }

  // For debugging - get auth status
  async getAuthStatus(): Promise<{
    hasToken: boolean;
    isExpired: boolean;
    rememberMe: boolean;
    email: string | null;
    expiresAt: string | null;
  }> {
    try {
      const authData = await this.getStoredAuthData();
      const rememberMe = await this.shouldRememberUser();
      
      return {
        hasToken: !!authData?.accessToken,
        isExpired: authData ? new Date(authData.expiresAt) <= new Date() : true,
        rememberMe,
        email: authData?.email || null,
        expiresAt: authData?.expiresAt || null,
      };
    } catch (error) {
      return {
        hasToken: false,
        isExpired: true,
        rememberMe: false,
        email: null,
        expiresAt: null,
      };
    }
  }
}

export const authStorageService = AuthStorageService.getInstance();