// src/services/MVPStorageService.ts
// Bulletproof storage limits with automation abuse prevention

import { getCurrentUser, supabaseHTTP } from './SupabaseHTTPClient';

interface StorageCheck {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
}

interface UsageStats {
  tier: string;
  photosPerJobLimit: number | null;
  upgradeNeeded: boolean;
  dailyUploads?: number;
  dailyLimit?: number;
}

class MVPStorageService {
  // Simple photo limits per job
  private readonly PHOTO_LIMITS = {
    free: 25, // 25 photos per job max
    starter: null, // Unlimited photos
    professional: null,
    business: null
  };

  // CRITICAL: Rate limiting to prevent automation abuse
  private readonly RATE_LIMITS = {
    free: {
      photosPerMinute: 5, // Max 5 photos per minute
      photosPerHour: 50, // Max 50 photos per hour
      photosPerDay: 200, // Max 200 photos per day
    },
    starter: {
      photosPerMinute: 10,
      photosPerHour: 200,
      photosPerDay: 1000,
    },
    professional: {
      photosPerMinute: 20,
      photosPerHour: 500,
      photosPerDay: 2000,
    },
    business: {
      photosPerMinute: null, // No limits
      photosPerHour: null,
      photosPerDay: null,
    }
  };

  // Track upload timestamps per user (in-memory for MVP)
  private userUploads: Map<string, number[]> = new Map();

  private checkRateLimit(userId: string, tier: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const limits = this.RATE_LIMITS[tier as keyof typeof this.RATE_LIMITS];
    
    if (!limits) return { allowed: true };
    
    // Get user's upload history
    const uploads = this.userUploads.get(userId) || [];
    
    // Clean old uploads (older than 24 hours)
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const recentUploads = uploads.filter(timestamp => timestamp > dayAgo);
    
    // Check daily limit
    if (limits.photosPerDay !== null && recentUploads.length >= limits.photosPerDay) {
      return {
        allowed: false,
        reason: `Daily photo limit reached (${limits.photosPerDay}). Please wait until tomorrow or upgrade your plan.`
      };
    }
    
    // Check hourly limit
    const hourAgo = now - (60 * 60 * 1000);
    const hourlyUploads = recentUploads.filter(timestamp => timestamp > hourAgo);
    if (limits.photosPerHour !== null && hourlyUploads.length >= limits.photosPerHour) {
      return {
        allowed: false,
        reason: `Hourly photo limit reached (${limits.photosPerHour}). Please wait before taking more photos.`
      };
    }
    
    // Check per-minute limit (most important for automation prevention)
    const minuteAgo = now - (60 * 1000);
    const minuteUploads = recentUploads.filter(timestamp => timestamp > minuteAgo);
    if (limits.photosPerMinute !== null && minuteUploads.length >= limits.photosPerMinute) {
      return {
        allowed: false,
        reason: `Taking photos too quickly. Please wait a moment before taking another photo.`
      };
    }
    
    return { allowed: true };
  }

  private recordUpload(userId: string): void {
    const uploads = this.userUploads.get(userId) || [];
    uploads.push(Date.now());
    this.userUploads.set(userId, uploads);
  }

  private getDailyUploadCount(userId: string): number {
    const uploads = this.userUploads.get(userId) || [];
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return uploads.filter(timestamp => timestamp > dayAgo).length;
  }

  async canAddPhoto(currentPhotosInJob: number): Promise<StorageCheck> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { allowed: false, reason: 'Please sign in to add photos' };
      }

      // Get user tier from profile
      const profileResult = await supabaseHTTP.select('profiles', 'subscription_tier', { id: user.id });
      if (profileResult.error) {
        // If we can't check, allow it (fail open for MVP)
        console.warn('Could not check subscription tier, allowing photo');
        return { allowed: true };
      }

      const profile = profileResult.data?.[0];
      const tier = (profile?.subscription_tier || 'free') as keyof typeof this.PHOTO_LIMITS;
      
      // CRITICAL: Check rate limits first (prevents automation abuse)
      const rateLimitCheck = this.checkRateLimit(user.id, tier);
      if (!rateLimitCheck.allowed) {
        return rateLimitCheck;
      }

      // Check photo per job limit
      const limit = this.PHOTO_LIMITS[tier];
      if (limit !== null && currentPhotosInJob >= limit) {
        return {
          allowed: false,
          reason: `Maximum ${limit} photos per job on ${tier} plan. Upgrade for unlimited photos.`,
          currentCount: currentPhotosInJob,
          limit
        };
      }

      // Record this upload attempt for rate limiting
      this.recordUpload(user.id);

      return { allowed: true };
    } catch (error) {
      console.error('Error checking photo limits:', error);
      // Fail open for MVP - don't block users if service is down
      return { allowed: true };
    }
  }

  // Enhanced usage stats with rate limit info
  async getUsageStats(userId: string): Promise<UsageStats> {
    try {
      const profileResult = await supabaseHTTP.select('profiles', 'subscription_tier', { id: userId });
      const tier = profileResult.data?.[0]?.subscription_tier || 'free';
      const limit = this.PHOTO_LIMITS[tier as keyof typeof this.PHOTO_LIMITS];
      const rateLimits = this.RATE_LIMITS[tier as keyof typeof this.RATE_LIMITS];
      
      return {
        tier,
        photosPerJobLimit: limit,
        upgradeNeeded: tier === 'free',
        dailyUploads: this.getDailyUploadCount(userId),
        dailyLimit: rateLimits?.photosPerDay || null
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        tier: 'free',
        photosPerJobLimit: 25,
        upgradeNeeded: true,
        dailyUploads: 0,
        dailyLimit: 200
      };
    }
  }

  // Get remaining daily uploads
  getRemainingDailyUploads(userId: string, tier: string): number | null {
    const rateLimits = this.RATE_LIMITS[tier as keyof typeof this.RATE_LIMITS];
    if (!rateLimits?.photosPerDay) return null;
    
    const used = this.getDailyUploadCount(userId);
    return Math.max(0, rateLimits.photosPerDay - used);
  }

  // Reset user upload history (for testing or admin purposes)
  resetUserLimits(userId: string): void {
    this.userUploads.delete(userId);
  }

  // Get current rate limit status for debugging
  getRateLimitStatus(userId: string, tier: string): {
    minute: { used: number; limit: number | null };
    hour: { used: number; limit: number | null };
    day: { used: number; limit: number | null };
  } {
    const uploads = this.userUploads.get(userId) || [];
    const now = Date.now();
    const limits = this.RATE_LIMITS[tier as keyof typeof this.RATE_LIMITS];
    
    const minuteAgo = now - (60 * 1000);
    const hourAgo = now - (60 * 60 * 1000);
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    return {
      minute: {
        used: uploads.filter(t => t > minuteAgo).length,
        limit: limits?.photosPerMinute || null
      },
      hour: {
        used: uploads.filter(t => t > hourAgo).length,
        limit: limits?.photosPerHour || null
      },
      day: {
        used: uploads.filter(t => t > dayAgo).length,
        limit: limits?.photosPerDay || null
      }
    };
  }
}

export const mvpStorageService = new MVPStorageService();