// src/services/CloudSyncService.ts
// Fixed with automatic ID migration before sync

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getCurrentUser } from './SupabaseHTTPClient';
import { Job } from '../screens/HomeScreen';
import { JobPhoto } from '../screens/CameraScreen';
import { TIER_LIMITS, generateUUID, isValidUUID } from '../utils/JobUtils';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

interface SyncResult {
  success: boolean;
  error?: string;
  synced?: number;
  failed?: number;
}

interface PhotoUploadResult {
  success: boolean;
  path?: string;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
}

class CloudSyncService {
  private syncInProgress = false;
  private lastSyncTime: string | null = null;
  
  // CRITICAL: File size limits to prevent abuse
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max per photo
  private readonly TARGET_COMPRESSED_SIZE = 50 * 1024; // Target 50KB after compression

  constructor() {
    this.loadLastSyncTime();
  }

  private async loadLastSyncTime() {
    try {
      this.lastSyncTime = await AsyncStorage.getItem('last_sync_time');
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
  }

  private async updateLastSyncTime() {
    const now = new Date().toISOString();
    this.lastSyncTime = now;
    try {
      await AsyncStorage.setItem('last_sync_time', now);
    } catch (error) {
      console.error('Error saving last sync time:', error);
    }
  }

  // CRITICAL: Migrate job and photo IDs before syncing (only for old timestamp IDs)
  private migrateJobForSync(job: Job): Job {
    let needsUpdate = false;
    const migratedJob = { ...job };

    // Only migrate if it's an old timestamp-based ID (not a UUID)
    if (!isValidUUID(job.id) && this.isTimestampId(job.id)) {
      console.log(`🔄 Migrating old timestamp job ID ${job.id} to UUID before sync`);
      migratedJob.id = generateUUID();
      needsUpdate = true;
    }

    // Migrate photo IDs if needed (only old timestamp IDs)
    if (job.photos && job.photos.length > 0) {
      migratedJob.photos = job.photos.map(photo => {
        if (!isValidUUID(photo.id) && this.isTimestampId(photo.id)) {
          console.log(`🔄 Migrating old timestamp photo ID ${photo.id} to UUID before sync`);
          return { ...photo, id: generateUUID() };
        }
        return photo;
      });
      
      // Check if any photo IDs were migrated
      const photoIdsMigrated = job.photos.some((photo, index) => 
        photo.id !== migratedJob.photos![index].id
      );
      
      if (photoIdsMigrated) {
        needsUpdate = true;
      }
    }

    // If we migrated IDs, save back to local storage immediately
    if (needsUpdate) {
      this.updateLocalJob(migratedJob).catch(error => {
        console.error('Failed to update local job after ID migration:', error);
      });
    }

    return migratedJob;
  }

  // Check if a string looks like a timestamp-based ID
  private isTimestampId(id: string): boolean {
    // Check if it's a numeric string that looks like a timestamp
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return false;
    
    // Timestamp IDs are usually 13 digits (milliseconds since epoch)
    // or 10 digits (seconds since epoch)
    const idStr = id.toString();
    return idStr.length >= 10 && idStr.length <= 13 && /^\d+$/.test(idStr);
  }

  // Update job in local storage
  private async updateLocalJob(updatedJob: Job): Promise<void> {
    try {
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      if (!savedJobs) return;

      const jobs: Job[] = JSON.parse(savedJobs);
      
      // Find job by current ID first
      const jobIndex = jobs.findIndex(j => j.id === updatedJob.id);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
        console.log(`✅ Updated local job ${updatedJob.id}`);
        return;
      }

      // If not found by ID, job ID might have changed during migration
      // Find by client name + creation time but avoid creating duplicates
      const matchingJobIndex = jobs.findIndex(j => 
        j.clientName === updatedJob.clientName && 
        j.createdAt === updatedJob.createdAt &&
        j.serviceType === updatedJob.serviceType
      );
      
      if (matchingJobIndex !== -1) {
        // Replace the old job with migrated version
        jobs[matchingJobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
        console.log(`✅ Updated local job after ID migration (matched by client + time + service)`);
      } else {
        console.log(`⚠️ Could not find matching job to update after migration`);
      }
    } catch (error) {
      console.error('Error updating local job:', error);
    }
  }

  // CRITICAL: Validate photo before processing
  private async validatePhoto(uri: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        return { valid: false, error: 'File does not exist' };
      }
      
      if ('size' in fileInfo && fileInfo.size > this.MAX_FILE_SIZE) {
        return { 
          valid: false, 
          error: `File too large (${Math.round(fileInfo.size / 1024 / 1024)}MB). Maximum size is 10MB.` 
        };
      }

      // Validate file type by reading header
      try {
        const base64Header = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
          length: 10
        });
        
        // Check for JPEG/PNG magic numbers
        const isJPEG = base64Header.startsWith('/9j/') || base64Header.startsWith('iVBOR');
        if (!isJPEG) {
          return { valid: false, error: 'Only JPEG and PNG images are allowed' };
        }
      } catch (error) {
        // If we can't read the header, continue but log warning
        console.warn('Could not validate file type:', error);
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating photo:', error);
      return { valid: false, error: 'Failed to validate file' };
    }
  }

  // Check if job already exists in cloud
  private async jobExistsInCloud(jobId: string, userId: string): Promise<boolean> {
    try {
      const result = await supabase.select('jobs', 'id', { id: jobId, user_id: userId });
      return !result.error && result.data && result.data.length > 0;
    } catch (error) {
      console.log('Error checking job existence:', error);
      return false;
    }
  }

  // Check if photo already exists in cloud
  private async photoExistsInCloud(photoId: string, userId: string): Promise<boolean> {
    try {
      const result = await supabase.select('job_photos', 'id', { id: photoId, user_id: userId });
      return !result.error && result.data && result.data.length > 0;
    } catch (error) {
      console.log('Error checking photo existence:', error);
      return false;
    }
  }

  // Compress image more aggressively to reduce storage costs
  private async compressImage(uri: string): Promise<PhotoUploadResult> {
    try {
      // Validate photo first
      const validation = await this.validatePhoto(uri);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Get original file size
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const originalSize = (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size : 0;

      // Aggressive compression - target 50KB
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // Reduced from 1200px
        {
          compress: 0.5, // Reduced from 0.7
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Check compressed size
      const compressedInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
      const compressedSize = (compressedInfo.exists && 'size' in compressedInfo) ? compressedInfo.size : 0;

      // If still too large, compress more aggressively
      if (compressedSize > this.TARGET_COMPRESSED_SIZE * 2) {
        console.log('File still large, applying additional compression');
        const secondPass = await ImageManipulator.manipulateAsync(
          manipulatedImage.uri,
          [{ resize: { width: 600 } }],
          {
            compress: 0.3,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        
        const finalInfo = await FileSystem.getInfoAsync(secondPass.uri);
        const finalSize = (finalInfo.exists && 'size' in finalInfo) ? finalInfo.size : compressedSize;
        
        console.log(`Image double-compressed: ${originalSize} -> ${compressedSize} -> ${finalSize} bytes`);
        
        return {
          success: true,
          path: secondPass.uri,
          originalSize,
          compressedSize: finalSize
        };
      }

      console.log(`Image compressed: ${originalSize} -> ${compressedSize} bytes (${Math.round((1 - compressedSize/originalSize) * 100)}% reduction)`);

      return {
        success: true,
        path: manipulatedImage.uri,
        originalSize,
        compressedSize
      };
    } catch (error) {
      console.error('Error compressing image:', error);
      return {
        success: false,
        error: 'Failed to compress image'
      };
    }
  }

  // Upload photo using HTTP client with duplicate detection
  private async uploadPhoto(photo: JobPhoto, jobId: string): Promise<PhotoUploadResult> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Check if photo already exists in cloud
      const photoExists = await this.photoExistsInCloud(photo.id, user.id);
      if (photoExists) {
        console.log(`Photo ${photo.id} already exists in cloud, skipping upload`);
        return {
          success: true,
          path: `users/${user.id}/photos/${jobId}/${photo.id}.jpg`,
          originalSize: 0,
          compressedSize: 0
        };
      }

      // Compress image first (includes validation)
      const compressionResult = await this.compressImage(photo.uri);
      if (!compressionResult.success) {
        return compressionResult;
      }

      // Read compressed file as base64
      const fileBase64 = await FileSystem.readAsStringAsync(compressionResult.path!, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create unique file path
      const fileName = `${jobId}/${photo.id}.jpg`;
      const filePath = `users/${user.id}/photos/${fileName}`;

      // Upload to Supabase Storage via HTTP
      const uploadResult = await supabase.uploadFile('job-photos', filePath, fileBase64);

      if (!uploadResult.success) {
        // If it's a "already exists" error, treat as success
        if (uploadResult.error?.includes('already exists') || uploadResult.error?.includes('The resource already exists')) {
          console.log(`Photo ${photo.id} already exists in storage, updating metadata only`);
        } else {
          return {
            success: false,
            error: uploadResult.error || 'Upload failed'
          };
        }
      }

      // Save photo metadata to database via HTTP
      const photoData = {
        id: photo.id,
        job_id: jobId,
        user_id: user.id,
        photo_type: photo.type,
        file_path: filePath,
        file_size: compressionResult.compressedSize || 0,
        compressed: true,
        created_at: photo.timestamp
      };

      const dbResult = await supabase.insert('job_photos', photoData);
      
      if (dbResult.error) {
        // If metadata already exists, try updating instead
        if (dbResult.error.includes('duplicate') || dbResult.error.includes('already exists')) {
          console.log(`Photo metadata ${photo.id} already exists, updating...`);
          const updateResult = await supabase.update('job_photos', photoData, { id: photo.id });
          if (updateResult.error) {
            console.warn('Photo uploaded but metadata update failed:', updateResult.error);
          }
        } else {
          console.warn('Photo uploaded but metadata save failed:', dbResult.error);
        }
      }

      return {
        success: true,
        path: filePath,
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize
      };
    } catch (error) {
      console.error('Error uploading photo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // Convert Job object to database format
  private jobToDbFormat(job: Job, userId: string) {
    return {
      id: job.id,
      user_id: userId,
      client_name: job.clientName,
      client_email: job.clientEmail,
      client_phone: job.clientPhone,
      service_type: job.serviceType,
      description: job.description,
      address: job.address,
      status: job.status,
      created_at: job.createdAt,
      updated_at: new Date().toISOString(),
      completed_at: job.completedAt,
      signature_data: job.signature,
      client_signed_name: job.clientSignedName,
      job_satisfaction: job.jobSatisfaction
    };
  }

  // Sync single job to cloud using HTTP client with ID migration
  async syncJob(job: Job): Promise<SyncResult> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // CRITICAL: Migrate IDs before syncing
      const migratedJob = this.migrateJobForSync(job);
      console.log(`🔄 Syncing job ${migratedJob.id} (was: ${job.id})`);

      // Check if job already exists in cloud
      const jobExists = await this.jobExistsInCloud(migratedJob.id, user.id);

      // Upload job data via HTTP
      const jobData = this.jobToDbFormat(migratedJob, user.id);
      
      if (jobExists) {
        // Update existing job
        const updateResult = await supabase.update('jobs', jobData, { id: migratedJob.id });
        if (updateResult.error) {
          throw new Error(updateResult.error);
        }
        console.log(`Job ${migratedJob.id} updated in cloud`);
      } else {
        // Insert new job
        const jobResult = await supabase.insert('jobs', jobData);
        if (jobResult.error) {
          // If job already exists, try updating instead
          if (jobResult.error.includes('duplicate') || jobResult.error.includes('already exists')) {
            const updateResult = await supabase.update('jobs', jobData, { id: migratedJob.id });
            if (updateResult.error) {
              throw new Error(updateResult.error);
            }
            console.log(`Job ${migratedJob.id} updated in cloud (was duplicate)`);
          } else {
            throw new Error(jobResult.error);
          }
        } else {
          console.log(`Job ${migratedJob.id} created in cloud`);
        }
      }

      // Upload photos with validation
      let photosSynced = 0;
      let photosFailed = 0;

      for (const photo of migratedJob.photos) {
        const uploadResult = await this.uploadPhoto(photo, migratedJob.id);
        if (uploadResult.success) {
          photosSynced++;
        } else {
          photosFailed++;
          console.error(`Failed to upload photo ${photo.id}:`, uploadResult.error);
          
          // Show user-friendly error for file validation failures
          if (uploadResult.error?.includes('too large') || uploadResult.error?.includes('file type')) {
            Alert.alert(
              'Photo Upload Failed',
              `${uploadResult.error}\n\nThis photo will be skipped but your job will still be saved.`
            );
          }
        }
      }

      console.log(`Job ${migratedJob.id} synced: ${photosSynced} photos uploaded, ${photosFailed} failed`);

      return {
        success: true,
        synced: 1,
        failed: photosFailed > 0 ? 1 : 0
      };
    } catch (error) {
      console.error('Error syncing job:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }

  // Sync all local jobs to cloud using HTTP client
  async syncAllJobs(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    let totalSynced = 0;
    let totalFailed = 0;

    try {
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Get local jobs
      const localJobsData = await AsyncStorage.getItem('proofly_jobs');
      if (!localJobsData) {
        return { success: true, synced: 0, failed: 0 };
      }

      const localJobs: Job[] = JSON.parse(localJobsData);
      console.log(`Starting sync of ${localJobs.length} jobs...`);

      // Sync each job
      for (const job of localJobs) {
        const result = await this.syncJob(job);
        if (result.success) {
          totalSynced += result.synced || 0;
        } else {
          totalFailed++;
          console.error(`Failed to sync job ${job.id}:`, result.error);
        }

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update user's job count via HTTP
      const updateResult = await supabase.update('profiles', 
        { jobs_count: localJobs.length }, 
        { id: user.id }
      );

      if (updateResult.error) {
        console.warn('Failed to update job count:', updateResult.error);
      }

      await this.updateLastSyncTime();

      return {
        success: true,
        synced: totalSynced,
        failed: totalFailed
      };
    } catch (error) {
      console.error('Error in syncAllJobs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Download jobs from cloud using HTTP client
  async downloadJobs(): Promise<SyncResult> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Get jobs from cloud via HTTP
      const jobsResult = await supabase.select('jobs', '*', { user_id: user.id });
      
      if (jobsResult.error) {
        throw new Error(jobsResult.error);
      }

      const cloudJobs = jobsResult.data || [];

      // Get photo metadata for each job
      const jobsWithPhotos: Job[] = [];
      
      for (const cloudJob of cloudJobs) {
        const photosResult = await supabase.select('job_photos', '*', { job_id: cloudJob.id });
        
        const photos = photosResult.data || [];

        // Convert to local format
        const localJob: Job = {
          id: cloudJob.id,
          clientName: cloudJob.client_name,
          clientEmail: cloudJob.client_email,
          clientPhone: cloudJob.client_phone,
          serviceType: cloudJob.service_type,
          description: cloudJob.description,
          address: cloudJob.address,
          status: cloudJob.status,
          createdAt: cloudJob.created_at,
          photos: photos.map((photo: any) => ({
            id: photo.id,
            uri: `cloud://${photo.file_path}`, // Special URI to indicate cloud storage
            type: photo.photo_type,
            timestamp: photo.created_at
          })),
          signature: cloudJob.signature_data,
          clientSignedName: cloudJob.client_signed_name,
          jobSatisfaction: cloudJob.job_satisfaction,
          completedAt: cloudJob.completed_at
        };

        jobsWithPhotos.push(localJob);
      }

      // Save to local storage
      await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobsWithPhotos));

      console.log(`Downloaded ${jobsWithPhotos.length} jobs from cloud`);

      return {
        success: true,
        synced: jobsWithPhotos.length,
        failed: 0
      };
    } catch (error) {
      console.error('Error downloading jobs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  // Get sync status
  getSyncStatus() {
    return {
      inProgress: this.syncInProgress,
      lastSync: this.lastSyncTime
    };
  }

  // Check if user can create more jobs (jobs_count never decreases)
  async canCreateJob(): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { allowed: false, reason: 'Please sign in to create jobs' };
      }

      // Get user profile via HTTP
      const profileResult = await supabase.select('profiles', '*', { id: user.id });
      
      if (profileResult.error) {
        throw new Error(profileResult.error);
      }

      const profile = profileResult.data?.[0];
      if (!profile) {
        return { allowed: false, reason: 'User profile not found' };
      }

      const tier = profile.subscription_tier;
      const maxJobs = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]?.maxJobs ?? TIER_LIMITS.free.maxJobs;
      
      if (maxJobs === null) {
        return { allowed: true };
      }

      // Note: jobs_count tracks total jobs ever created, not current jobs
      // This prevents users from deleting jobs to create more
      if (profile.jobs_count >= maxJobs) {
        return {
          allowed: false,
          reason: `You've created ${profile.jobs_count}/${maxJobs} jobs. Upgrade your plan to create more jobs.`
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking job limit:', error);
      return { allowed: false, reason: 'Error checking job limit' };
    }
  }

  // Auto-sync single job (called after job creation/update)
  async autoSyncJob(job: Job): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (user) {
        // Fire and forget - don't block the UI
        this.syncJob(job).then(result => {
          if (result.success) {
            console.log(`Job ${job.id} auto-synced to cloud`);
          } else {
            console.log(`Auto-sync failed for job ${job.id}:`, result.error);
          }
        });
      }
    } catch (error) {
      console.log('Auto-sync error:', error);
    }
  }
}

export const cloudSyncService = new CloudSyncService();