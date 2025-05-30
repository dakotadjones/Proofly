// src/services/RevenueCatService.ts
// Simple RevenueCat integration for Proofly

import Purchases, { LOG_LEVEL, PurchasesOffering, CustomerInfo } from 'react-native-purchases';
import { Platform, Alert } from 'react-native';

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

  // Initialize RevenueCat (call this once in your App.tsx)
  async initialize(): Promise<boolean> {
    try {
      // For demo mode, we'll use dummy keys
      // Replace these with real keys when you get them
      const demoApiKey = Platform.OS === 'ios' 
        ? 'demo_apple_key_123' 
        : 'demo_google_key_123';

      // Set up logging for development
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      // Configure RevenueCat
      await Purchases.configure({ apiKey: demoApiKey });
      
      this.isConfigured = true;
      console.log('✅ RevenueCat configured successfully');
      return true;
      
    } catch (error) {
      console.error('❌ RevenueCat configuration failed:', error);
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

  // Get available subscription packages (demo mode)
  async getOfferings(): Promise<PurchasesOffering[]> {
    try {
      if (!this.isConfigured) {
        throw new Error('RevenueCat not configured');
      }

      // In demo mode, this will return empty or demo offerings
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current) {
        return [offerings.current];
      }
      
      // If no offerings, we'll create a mock one for testing
      console.log('📦 No RevenueCat offerings found - using demo mode');
      return [];
      
    } catch (error) {
      console.error('Error getting offerings:', error);
      return [];
    }
  }

  // Purchase a subscription (demo mode)
  async purchaseSubscription(packageToPurchase?: any): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    try {
      if (!this.isConfigured) {
        throw new Error('RevenueCat not configured');
      }

      // In demo mode, we'll simulate a successful purchase
      Alert.alert(
        '🎉 Demo Purchase Successful!',
        'In demo mode, this simulates upgrading to Pro. In the real app, this would process the actual payment.',
        [{ text: 'OK' }]
      );

      // Return mock success
      return {
        success: true,
        customerInfo: {} as CustomerInfo // Mock customer info
      };
      
    } catch (error) {
      console.error('Purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
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

      // In demo mode, always return free tier
      // In real mode, this would check actual subscription status
      const customerInfo = await Purchases.getCustomerInfo();
      
      // For demo, assume user is free tier
      return {
        isPro: false,
        tier: 'free'
      };
      
    } catch (error) {
      console.error('Error getting customer info:', error);
      return { isPro: false, tier: 'free' };
    }
  }

  // Restore purchases (important for iOS App Store requirements)
  async restorePurchases(): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> {
    try {
      if (!this.isConfigured) {
        throw new Error('RevenueCat not configured');
      }

      const customerInfo = await Purchases.restorePurchases();
      
      return {
        success: true,
        customerInfo
      };
      
    } catch (error) {
      console.error('Restore error:', error);
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
}

export const revenueCatService = new RevenueCatService();