// src/utils/jobUtils.ts
import { Job } from '../screens/HomeScreen';

// Simple UUID generator - centralized
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Centralized job status calculation
export const calculateJobStatus = (job: Job): Job['status'] => {
  if (job.signature) return 'completed';
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

// Job status helpers
export const getStatusColor = (status: Job['status']): string => {
  switch (status) {
    case 'created': return '#FF9500';
    case 'in_progress': return '#007AFF';
    case 'completed': return '#34C759';
    default: return '#FF9500';
  }
};

export const getStatusText = (status: Job['status']): string => {
  switch (status) {
    case 'created': return 'Created';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    default: return 'Created';
  }
};

export const getStatusDescription = (job: Job): string => {
  if (job.signature) return 'Client signed off';
  if (job.photos && job.photos.length > 0) return `${job.photos.length} photos taken`;
  return 'Ready to start';
};

// Subscription tier helpers
export const TIER_LIMITS = {
  free: { maxJobs: 20, cloudBackup: true, teamSize: 1 },
  starter: { maxJobs: 200, cloudBackup: true, teamSize: 1 },
  professional: { maxJobs: null, cloudBackup: true, teamSize: 5 },
  business: { maxJobs: null, cloudBackup: true, teamSize: null }
} as const;

export const getTierDisplayName = (tier: string): string => {
  switch (tier) {
    case 'free': return 'Free Plan';
    case 'starter': return 'Starter Plan'; 
    case 'professional': return 'Professional Plan';
    case 'business': return 'Business Plan';
    default: return 'Free Plan';
  }
};

export const getTierColor = (tier: string): string => {
  switch (tier) {
    case 'free': return '#FF9500';
    case 'starter': return '#007AFF';
    case 'professional': return '#34C759';
    case 'business': return '#9500FF';
    default: return '#FF9500';
  }
};

export const getTierLimits = (tier: string): string => {
  switch (tier) {
    case 'free': return '20 jobs total';
    case 'starter': return '200 jobs total';
    case 'professional': return 'Unlimited jobs';
    case 'business': return 'Unlimited jobs + teams';
    default: return '20 jobs total';
  }
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