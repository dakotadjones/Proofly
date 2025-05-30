// src/utils/JobUtils.ts - Complete JobUtils with RevenueCat integration

import { Job } from '../screens/HomeScreen';
import { revenueCatService } from '../services/RevenueCatService';

// Simple UUID generator - centralized
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Centralized job status calculation with remote signing support
export const calculateJobStatus = (job: Job): Job['status'] => {
  if (job.signature) return 'completed';
  if (job.remoteSigningData) return 'pending_remote_signature';
  if (job.photos && job.photos.length > 0) return 'in_progress';
  return 'created';
};

// UUID validation
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Migrate IDs to UUID format
export const migrateToUUID = (id: string): string => {
  return isValidUUID(id) ? id : generateUUID();
};

// Enhanced job status helpers with remote signing
export const getStatusColor = (status: Job['status']): string => {
  switch (status) {
    case 'created': return '#FF9500';
    case 'in_progress': return '#007AFF';
    case 'pending_remote_signature': return '#9500FF';
    case 'completed': return '#34C759';
    default: return '#FF9500';
  }
};

export const getStatusText = (status: Job['status']): string => {
  switch (status) {
    case 'created': return 'Created';
    case 'in_progress': return 'In Progress';
    case 'pending_remote_signature': return 'Awaiting Approval';
    case 'completed': return 'Completed';
    default: return 'Created';
  }
};

export const getStatusDescription = (job: Job): string => {
  if (job.signature) return 'Client signed off';
  if (job.remoteSigningData) {
    const method = job.remoteSigningData.sentVia === 'email' ? 'email' : 'text';
    return `Review ${method} sent to client`;
  }
  if (job.photos && job.photos.length > 0) return `${job.photos.length} photos taken`;
  return 'Ready to start';
};

// Helper for remote signing status
export const getRemoteSigningStatus = (job: Job): {
  isPending: boolean;
  method?: 'email' | 'sms';
  sentTo?: string;
  sentAt?: Date;
  timeElapsed?: string;
} => {
  if (!job.remoteSigningData) {
    return { isPending: false };
  }

  const sentAt = new Date(job.remoteSigningData.sentAt);
  const now = new Date();
  const hoursElapsed = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60));
  
  let timeElapsed = '';
  if (hoursElapsed < 1) {
    const minutesElapsed = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60));
    timeElapsed = `${minutesElapsed} minutes ago`;
  } else if (hoursElapsed < 24) {
    timeElapsed = `${hoursElapsed} hours ago`;
  } else {
    const daysElapsed = Math.floor(hoursElapsed / 24);
    timeElapsed = `${daysElapsed} days ago`;
  }

  return {
    isPending: true,
    method: job.remoteSigningData.sentVia,
    sentTo: job.remoteSigningData.sentTo,
    sentAt,
    timeElapsed
  };
};

// Check if remote signing has expired (48 hours)
export const isRemoteSigningExpired = (job: Job): boolean => {
  if (!job.remoteSigningData) return false;
  
  const sentAt = new Date(job.remoteSigningData.sentAt);
  const now = new Date();
  const hoursElapsed = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);
  
  return hoursElapsed > 48;
};

// NEW: RevenueCat-integrated limit checking
export const canCreateJob = (userTier: string, currentJobCount: number): {
  allowed: boolean;
  reason?: string;
  upgradePrompt?: string;
} => {
  return revenueCatService.canPerformAction(userTier, 'create_job', { jobCount: currentJobCount });
};

export const canAddPhoto = (userTier: string, currentPhotosInJob: number): {
  allowed: boolean;
  reason?: string;
  upgradePrompt?: string;
} => {
  return revenueCatService.canPerformAction(userTier, 'add_photo', { photosInJob: currentPhotosInJob });
};

export const canGenerateProfessionalPDF = (userTier: string): {
  allowed: boolean;
  reason?: string;
  upgradePrompt?: string;
} => {
  return revenueCatService.canPerformAction(userTier, 'generate_professional_pdf');
};

export const canAccessClientPortal = (userTier: string): {
  allowed: boolean;
  reason?: string;
  upgradePrompt?: string;
} => {
  return revenueCatService.canPerformAction(userTier, 'access_client_portal');
};

// Get user's tier info and limits
export const getUserTierInfo = (userTier: string) => {
  return revenueCatService.getTierInfo(userTier);
};

// Get upgrade prompt based on context
export const getUpgradePrompt = (action: string) => {
  return revenueCatService.getUpgradePrompt(action);
};

// Legacy tier helpers (maintained for compatibility)
export const TIER_LIMITS = {
  free: { maxJobs: 20, cloudBackup: true, teamSize: 1 },
  pro: { maxJobs: null, cloudBackup: true, teamSize: 5 },
} as const;

export const getTierDisplayName = (tier: string): string => {
  switch (tier) {
    case 'free': return 'Free Plan';
    case 'pro': return 'Pro Plan';
    default: return 'Free Plan';
  }
};

export const getTierColor = (tier: string): string => {
  switch (tier) {
    case 'free': return '#FF9500';
    case 'pro': return '#34C759';
    default: return '#FF9500';
  }
};

export const getTierLimits = (tier: string): string => {
  const tierInfo = revenueCatService.getTierInfo(tier);
  if (tierInfo.limits.maxJobs === null) {
    return 'Unlimited jobs + Professional features';
  }
  return `${tierInfo.limits.maxJobs} jobs total`;
};

// Job validation
export const validateJobData = (jobData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!jobData.clientName?.trim()) errors.push('Client name is required');
  if (!jobData.clientPhone?.trim()) errors.push('Phone number is required');
  if (!jobData.serviceType?.trim()) errors.push('Service type is required');
  if (!jobData.address?.trim()) errors.push('Address is required');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper to show upgrade prompts in UI
export const shouldShowUpgradePrompt = (userTier: string, action: string, usage?: any): boolean => {
  if (userTier === 'pro') return false; // Pro users don't need upgrade prompts
  
  const check = revenueCatService.canPerformAction(userTier, action, usage);
  return !check.allowed;
};

// Get strategic upgrade moments
export const getUpgradeMoments = (userTier: string, userStats: {
  jobCount: number;
  photosToday: number;
  pdfGenerated: boolean;
}): Array<{
  trigger: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
}> => {
  if (userTier === 'pro') return [];

  const moments: Array<{
    trigger: string;
    reason: string;
    urgency: 'low' | 'medium' | 'high';
  }> = [];

  // Job limit approaching
  if (userStats.jobCount >= 15) {
    moments.push({
      trigger: 'job_limit_warning',
      reason: `You've used ${userStats.jobCount}/20 jobs. Upgrade before you hit the limit!`,
      urgency: userStats.jobCount >= 19 ? 'high' : 'medium'
    });
  }

  // First PDF generation - perfect upgrade moment
  if (userStats.pdfGenerated) {
    moments.push({
      trigger: 'pdf_branding_opportunity',
      reason: 'Add your logo to PDFs and impress clients even more!',
      urgency: 'medium'
    });
  }

  // Heavy photo usage - user is engaged
  if (userStats.photosToday >= 10) {
    moments.push({
      trigger: 'power_user_detected',
      reason: 'You\'re using Proofly heavily! Upgrade for unlimited everything.',
      urgency: 'low'
    });
  }

  return moments;
};

// Quick helper functions for common checks
export const isFreeTier = (tier: string): boolean => {
  return tier === 'free';
};

export const isProTier = (tier: string): boolean => {
  return tier === 'pro';
};

export const getJobsRemaining = (tier: string, currentJobs: number): number | null => {
  const tierInfo = getUserTierInfo(tier);
  if (tierInfo.limits.maxJobs === null) return null; // Unlimited
  return Math.max(0, tierInfo.limits.maxJobs - currentJobs);
};

export const getPhotosRemainingForJob = (tier: string, currentPhotos: number): number | null => {
  const tierInfo = getUserTierInfo(tier);
  if (tierInfo.limits.photosPerJob === null) return null; // Unlimited
  return Math.max(0, tierInfo.limits.photosPerJob - currentPhotos);
};

// Format helpers
export const formatTierLimits = (tier: string): {
  jobs: string;
  photos: string;
  features: string[];
} => {
  const tierInfo = getUserTierInfo(tier);
  
  return {
    jobs: tierInfo.limits.maxJobs === null ? 'Unlimited' : `${tierInfo.limits.maxJobs} total`,
    photos: tierInfo.limits.photosPerJob === null ? 'Unlimited per job' : `${tierInfo.limits.photosPerJob} per job`,
    features: tierInfo.features
  };
};