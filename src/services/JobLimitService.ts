// src/services/JobLimitService.ts
// Centralized job limit enforcement with upgrade prompts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { revenueCatService } from './RevenueCatService';
import { getCurrentUser } from './SupabaseHTTPClient';

interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentCount: number;
  limit: number | null;
  upgradePrompt?: {
    title: string;
    message: string;
    urgency: 'low' | 'medium' | 'high';
  };
}

interface UsageStats {
  jobCount: number;
  photosToday: number;
  lastJobCreated?: string;
  tierInfo: {
    name: string;
    maxJobs: number | null;
    photosPerJob: number | null;
  };
}

class JobLimitService {
  private static instance: JobLimitService;
  
  static getInstance(): JobLimitService {
    if (!JobLimitService.instance) {
      JobLimitService.instance = new JobLimitService();
    }
    return JobLimitService.instance;
  }

  // Get current user's usage statistics
  async getUserUsageStats(): Promise<UsageStats> {
    try {
      // Get subscription tier
      const customerInfo = await revenueCatService.getCustomerInfo();
      const tierInfo = revenueCatService.getTierInfo(customerInfo.tier);
      
      // Get local job count
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs = savedJobs ? JSON.parse(savedJobs) : [];
      
      // Count photos taken today (for rate limiting)
      const today = new Date().toDateString();
      const photosToday = jobs.reduce((count: number, job: any) => {
        return count + (job.photos?.filter((photo: any) => 
          new Date(photo.timestamp).toDateString() === today
        ).length || 0);
      }, 0);

      const lastJob = jobs.length > 0 ? jobs[jobs.length - 1] : null;

      return {
        jobCount: jobs.length,
        photosToday,
        lastJobCreated: lastJob?.createdAt,
        tierInfo: {
          name: tierInfo.name,
          maxJobs: tierInfo.limits.maxJobs,
          photosPerJob: tierInfo.limits.photosPerJob,
        }
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      // Return safe defaults
      return {
        jobCount: 0,
        photosToday: 0,
        tierInfo: {
          name: 'Free',
          maxJobs: 20,
          photosPerJob: 25,
        }
      };
    }
  }

  // Check if user can create a new job
  async canCreateJob(): Promise<LimitCheckResult> {
    const stats = await getUserUsageStats();
    
    // Pro users can create unlimited jobs
    if (stats.tierInfo.maxJobs === null) {
      return {
        allowed: true,
        currentCount: stats.jobCount,
        limit: null,
      };
    }

    const isAtLimit = stats.jobCount >= stats.tierInfo.maxJobs;
    const isNearLimit = stats.jobCount >= (stats.tierInfo.maxJobs * 0.8); // 80% of limit

    if (isAtLimit) {
      return {
        allowed: false,
        reason: `You've reached your limit of ${stats.tierInfo.maxJobs} jobs`,
        currentCount: stats.jobCount,
        limit: stats.tierInfo.maxJobs,
        upgradePrompt: {
          title: '🚨 Job Limit Reached!',
          message: `You've created ${stats.jobCount}/${stats.tierInfo.maxJobs} jobs on the free plan.\n\nUpgrade to Pro for unlimited jobs, professional PDFs, and client portal access.\n\nJust $19/month - less than one small job!`,
          urgency: 'high'
        }
      };
    }

    if (isNearLimit) {
      return {
        allowed: true,
        currentCount: stats.jobCount,
        limit: stats.tierInfo.maxJobs,
        upgradePrompt: {
          title: '⚠️ Almost at Your Limit!',
          message: `You've used ${stats.jobCount}/${stats.tierInfo.maxJobs} jobs.\n\nUpgrade now to avoid interruptions to your business.\n\nPro users get unlimited jobs + professional features.`,
          urgency: 'medium'
        }
      };
    }

    return {
      allowed: true,
      currentCount: stats.jobCount,
      limit: stats.tierInfo.maxJobs,
    };
  }

  // Check if user can add photos to a job
  async canAddPhotosToJob(currentPhotosInJob: number): Promise<LimitCheckResult> {
    const stats = await getUserUsageStats();
    
    // Pro users can add unlimited photos
    if (stats.tierInfo.photosPerJob === null) {
      return {
        allowed: true,
        currentCount: currentPhotosInJob,
        limit: null,
      };
    }

    const isAtLimit = currentPhotosInJob >= stats.tierInfo.photosPerJob;
    const isNearLimit = currentPhotosInJob >= (stats.tierInfo.photosPerJob * 0.8);

    if (isAtLimit) {
      return {
        allowed: false,
        reason: `Maximum ${stats.tierInfo.photosPerJob} photos per job on ${stats.tierInfo.name} plan`,
        currentCount: currentPhotosInJob,
        limit: stats.tierInfo.photosPerJob,
        upgradePrompt: {
          title: '📸 Photo Limit Reached!',
          message: `You've reached the ${stats.tierInfo.photosPerJob} photo limit for this job.\n\nUpgrade to Pro for unlimited photos per job and professional documentation features.\n\nShow more detailed work to impress clients!`,
          urgency: 'high'
        }
      };
    }

    if (isNearLimit) {
      return {
        allowed: true,
        currentCount: currentPhotosInJob,
        limit: stats.tierInfo.photosPerJob,
        upgradePrompt: {
          title: '📷 Almost at Photo Limit',
          message: `You've used ${currentPhotosInJob}/${stats.tierInfo.photosPerJob} photos for this job.\n\nUpgrade to Pro for unlimited photos and better client documentation.`,
          urgency: 'low'
        }
      };
    }

    return {
      allowed: true,
      currentCount: currentPhotosInJob,
      limit: stats.tierInfo.photosPerJob,
    };
  }

  // Show upgrade prompt with customized messaging
  showUpgradePrompt(
    promptData: NonNullable<LimitCheckResult['upgradePrompt']>,
    onUpgrade: () => void,
    onDismiss?: () => void
  ): void {
    const buttons = [
      {
        text: 'Maybe Later',
        style: 'cancel' as const,
        onPress: onDismiss
      },
      {
        text: promptData.urgency === 'high' ? 'Upgrade Now!' : 'Learn More',
        onPress: onUpgrade
      }
    ];

    Alert.alert(
      promptData.title,
      promptData.message,
      buttons
    );
  }

  // Show blocking limit alert (when action is not allowed)
  showLimitReachedAlert(
    limitResult: LimitCheckResult,
    onUpgrade: () => void
  ): void {
    if (!limitResult.upgradePrompt) return;

    Alert.alert(
      limitResult.upgradePrompt.title,
      limitResult.upgradePrompt.message,
      [
        {
          text: 'OK',
          style: 'cancel'
        },
        {
          text: 'Upgrade to Pro',
          onPress: onUpgrade
        }
      ]
    );
  }

  // Get usage summary for UI displays
  async getUsageSummary(): Promise<{
    jobsUsed: string;
    photosToday: number;
    canCreateJobs: boolean;
    upgradeRecommended: boolean;
    upgradeUrgent: boolean;
  }> {
    const stats = await getUserUsageStats();
    const jobCheck = await this.canCreateJob();

    return {
      jobsUsed: stats.tierInfo.maxJobs === null 
        ? `${stats.jobCount} jobs` 
        : `${stats.jobCount}/${stats.tierInfo.maxJobs} jobs`,
      photosToday: stats.photosToday,
      canCreateJobs: jobCheck.allowed,
      upgradeRecommended: !!jobCheck.upgradePrompt && jobCheck.upgradePrompt.urgency !== 'low',
      upgradeUrgent: !!jobCheck.upgradePrompt && jobCheck.upgradePrompt.urgency === 'high',
    };
  }

  // Strategic upgrade moments - when to show non-blocking prompts
  async getStrategicUpgradeMoments(): Promise<Array<{
    trigger: string;
    title: string;
    message: string;
    timing: 'immediate' | 'after_action' | 'next_session';
  }>> {
    const stats = await getUserUsageStats();
    const moments = [];

    // First job completion - user sees value
    if (stats.jobCount === 1) {
      moments.push({
        trigger: 'first_job_completed',
        title: '🎉 First Job Completed!',
        message: 'Loved documenting your work? Upgrade to Pro for unlimited jobs and professional PDFs that wow your clients.',
        timing: 'after_action' as const
      });
    }

    // Multiple repeat clients (indicates growth)
    if (stats.jobCount >= 10) {
      moments.push({
        trigger: 'business_growing',
        title: '📈 Your Business is Growing!',
        message: `${stats.jobCount} jobs documented! Upgrade to Pro for unlimited capacity and features that scale with your success.`,
        timing: 'next_session' as const
      });
    }

    // Heavy photo usage (engaged user)
    if (stats.photosToday >= 20) {
      moments.push({
        trigger: 'power_user_detected',
        title: '📸 You\'re a Photo Pro!',
        message: 'Taking lots of photos shows you care about quality work. Upgrade for unlimited photos and professional presentation.',
        timing: 'immediate' as const
      });
    }

    return moments;
  }

  // Check if it's a good time to show upgrade prompt
  async shouldShowStrategicPrompt(): Promise<boolean> {
    try {
      const lastPromptShown = await AsyncStorage.getItem('last_upgrade_prompt');
      const lastShown = lastPromptShown ? new Date(lastPromptShown) : null;
      const now = new Date();
      
      // Don't show more than once per 24 hours
      if (lastShown && (now.getTime() - lastShown.getTime()) < 24 * 60 * 60 * 1000) {
        return false;
      }

      // Don't show to Pro users
      const customerInfo = await revenueCatService.getCustomerInfo();
      if (customerInfo.isPro) {
        return false;
      }

      return true;
    } catch {
      return true;
    }
  }

  // Mark that we showed an upgrade prompt
  async markUpgradePromptShown(): Promise<void> {
    try {
      await AsyncStorage.setItem('last_upgrade_prompt', new Date().toISOString());
    } catch (error) {
      console.error('Error marking upgrade prompt shown:', error);
    }
  }
}

// Export singleton instance and helper functions
export const jobLimitService = JobLimitService.getInstance();

// Convenience functions for common use cases
export const checkCanCreateJob = () => jobLimitService.canCreateJob();
export const checkCanAddPhoto = (currentPhotos: number) => jobLimitService.canAddPhotosToJob(currentPhotos);
export const getUserUsageStats = () => jobLimitService.getUserUsageStats();
export const showUpgradePrompt = (promptData: any, onUpgrade: () => void, onDismiss?: () => void) => 
  jobLimitService.showUpgradePrompt(promptData, onUpgrade, onDismiss);
export const showLimitAlert = (limitResult: any, onUpgrade: () => void) => 
  jobLimitService.showLimitReachedAlert(limitResult, onUpgrade);