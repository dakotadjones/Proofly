// src/services/RevenueCatService.ts
// Mock RevenueCat service that works in Expo Go

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock types that match RevenueCat's interface
interface MockCustomerInfo {
  entitlements: {
    active: Record<string, any>;
  };
  originalPurchaseDate: string;
}

interface SubscriptionTier {
  id: 'free' | 'pro';
  name: string;
  price: number;
  features: string[];
  limits: {
    maxJobs: number | null;
    photosPerJob: number | null;
    cloudStorage: boolean;
    professionalPDFs: boolean;
    clientPortal: boolean;
  };
}

class RevenueCatService {
  private isConfigured = false;
  
  // Our subscription tiers
  public readonly TIERS: Record<string, SubscriptionTier> = {
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      features: [
        '20 jobs total',
        '25 photos per job',
        'Basic PDF reports',
        'Local storage'
      ],
      limits: {
        maxJobs: 20,
        photosPerJob: 25,
        cloudStorage: false,
        professionalPDFs: false,
        clientPortal: false,
      }
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 19,
      features: [
        'Unlimited jobs',
        'Unlimited photos',
        'Professional branded PDFs',
        'Client portal access',
        'Cloud backup & sync',
        'Priority support'
      ],
      limits: {
        maxJobs: null,
        photosPerJob: null,
        cloudStorage: true,
        professionalPDFs: true,
        clientPortal: true,
      }
    }
  };

  // Initialize Mock RevenueCat (works in Expo Go)
  async initialize(): Promise<boolean> {
    try {
      console.log('🎭 Mock RevenueCat initialized (Expo Go compatible)');
      this.isConfigured = true;
      return true;
    } catch (error) {
      console.error('❌ Mock RevenueCat initialization failed:', error);
      this.isConfigured = false;
      return false;
    }
  }

  // Check if user can perform action based on their tier
  canPerformAction(userTier: string, action: string, currentUsage?: any): { 
    allowed: boolean; 
    reason?: string;
    upgradePrompt?: string;
  } {
    const tier = this.TIERS[userTier] || this.TIERS.free;

    switch (action) {
      case 'create_job':
        if (tier.limits.maxJobs === null) {
          return { allowed: true };
        }
        if (currentUsage?.jobCount >= tier.limits.maxJobs) {
          return {
            allowed: false,
            reason: `You've reached your limit of ${tier.limits.maxJobs} jobs`,
            upgradePrompt: 'Upgrade to Pro for unlimited jobs!'
          };
        }
        return { allowed: true };

      case 'add_photo':
        if (tier.limits.photosPerJob === null) {
          return { allowed: true };
        }
        if (currentUsage?.photosInJob >= tier.limits.photosPerJob) {
          return {
            allowed: false,
            reason: `Maximum ${tier.limits.photosPerJob} photos per job on ${tier.name} plan`,
            upgradePrompt: 'Upgrade to Pro for unlimited photos per job!'
          };
        }
        return { allowed: true };

      case 'generate_professional_pdf':
        if (!tier.limits.professionalPDFs) {
          return {
            allowed: false,
            reason: 'Professional PDF templates require Pro plan',
            upgradePrompt: 'Upgrade to Pro for branded, professional PDFs!'
          };
        }
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }

  // Mock get offerings (simulates RevenueCat packages)
  async getOfferings(): Promise<any[]> {
    try {
      if (!this.isConfigured) {
        throw new Error('Mock RevenueCat not configured');
      }

      // Simulate RevenueCat offerings
      const mockOfferings = [
        {
          identifier: 'pro_monthly',
          serverDescription: 'Proofly Pro Monthly',
          price: 19.99,
          priceString: '$19.99',
          currencyCode: 'USD',
          billingPeriod: 'P1M'
        }
      ];
      
      console.log('📦 Mock offerings loaded');
      return mockOfferings;
      
    } catch (error) {
      console.error('Error getting mock offerings:', error);
      return [];
    }
  }

  // Mock purchase subscription
  async purchaseSubscription(packageToPurchase?: any): Promise<{
    success: boolean;
    customerInfo?: MockCustomerInfo;
    error?: string;
  }> {
    try {
      if (!this.isConfigured) {
        throw new Error('Mock RevenueCat not configured');
      }

      // Show mock purchase dialog
      return new Promise((resolve) => {
        Alert.alert(
          '🎭 Mock Purchase',
          'This is a demo purchase in Expo Go. In the real app with development build, this would process actual payment through RevenueCat.',
          [
            { 
              text: 'Cancel', 
              style: 'cancel',
              onPress: () => resolve({ success: false, error: 'User cancelled' })
            },
            { 
              text: 'Simulate Success', 
              onPress: async () => {
                // Save mock subscription status
                await this.saveMockSubscription('pro');
                
                resolve({
                  success: true,
                  customerInfo: {
                    entitlements: { active: { 'pro': {} } },
                    originalPurchaseDate: new Date().toISOString()
                  }
                });
              }
            }
          ]
        );
      });
      
    } catch (error) {
      console.error('Mock purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  // Save mock subscription to local storage
  private async saveMockSubscription(tier: string): Promise<void> {
    try {
      await AsyncStorage.setItem('mock_subscription_tier', tier);
      await AsyncStorage.setItem('mock_subscription_date', new Date().toISOString());
    } catch (error) {
      console.error('Error saving mock subscription:', error);
    }
  }

  // Get customer info (current subscription status)
  async getCustomerInfo(): Promise<{
    isPro: boolean;
    tier: string;
    expirationDate?: Date;
  }> {
    try {
      if (!this.isConfigured) {
        return { isPro: false, tier: 'free' };
      }

      // Check for mock subscription
      const mockTier = await AsyncStorage.getItem('mock_subscription_tier');
      const isPro = mockTier === 'pro';
      
      return {
        isPro,
        tier: mockTier || 'free'
      };
      
    } catch (error) {
      console.error('Error getting mock customer info:', error);
      return { isPro: false, tier: 'free' };
    }
  }

  // Mock restore purchases
  async restorePurchases(): Promise<{
    success: boolean;
    customerInfo?: MockCustomerInfo;
    error?: string;
  }> {
    try {
      if (!this.isConfigured) {
        throw new Error('Mock RevenueCat not configured');
      }

      // Simulate restore
      const mockTier = await AsyncStorage.getItem('mock_subscription_tier');
      
      Alert.alert(
        '🎭 Mock Restore',
        mockTier === 'pro' 
          ? 'Found Pro subscription in local storage!' 
          : 'No subscription found to restore.',
        [{ text: 'OK' }]
      );

      return {
        success: true,
        customerInfo: {
          entitlements: { active: mockTier === 'pro' ? { 'pro': {} } : {} },
          originalPurchaseDate: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Mock restore error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restore failed'
      };
    }
  }

  // Get upgrade prompt based on user action
  getUpgradePrompt(action: string): {
    title: string;
    message: string;
    benefits: string[];
  } {
    switch (action) {
      case 'job_limit_reached':
        return {
          title: '🚀 Ready to Grow Your Business?',
          message: 'You\'ve documented 20 jobs - time to go Pro!',
          benefits: [
            'Unlimited jobs forever',
            'Professional branded PDFs',
            'Client portal for reviews',
            'Cloud backup & sync'
          ]
        };

      case 'photo_limit_reached':
        return {
          title: '📸 Need More Photos?',
          message: 'Document your work without limits',
          benefits: [
            'Unlimited photos per job',
            'Better client documentation',
            'Professional presentation',
            'Higher customer satisfaction'
          ]
        };

      default:
        return {
          title: '⬆️ Upgrade to Pro',
          message: 'Unlock the full potential of your business',
          benefits: [
            'Unlimited jobs & photos',
            'Professional branding',
            'Client portal access',
            'Priority support'
          ]
        };
    }
  }

  // Get tier info
  getTierInfo(tierId: string): SubscriptionTier {
    return this.TIERS[tierId] || this.TIERS.free;
  }

  // Check if RevenueCat is ready
  isReady(): boolean {
    return this.isConfigured;
  }

  // Reset subscription (for testing)
  async resetMockSubscription(): Promise<void> {
    try {
      await AsyncStorage.removeItem('mock_subscription_tier');
      await AsyncStorage.removeItem('mock_subscription_date');
      console.log('🎭 Mock subscription reset');
    } catch (error) {
      console.error('Error resetting mock subscription:', error);
    }
  }
}

export const revenueCatService = new RevenueCatService();