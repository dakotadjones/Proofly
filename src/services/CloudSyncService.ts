// services/CloudSyncService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseHTTP, getCurrentUser } from './SupabaseHTTPClient';
import { Job } from '../screens/HomeScreen';
import { JobPhoto } from '../screens/CameraScreen';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

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

  // Check if job already exists in cloud
  private async jobExistsInCloud(jobId: string, userId: string): Promise<boolean> {
    try {
      const result = await supabaseHTTP.select('jobs', 'id', { id: jobId, user_id: userId });
      return !result.error && result.data && result.data.length > 0;
    } catch (error) {
      console.log('Error checking job existence:', error);
      return false;
    }
  }

  // Check if photo already exists in cloud
  private async photoExistsInCloud(photoId: string, userId: string): Promise<boolean> {
    try {
      const result = await supabaseHTTP.select('job_photos', 'id', { id: photoId, user_id: userId });
      return !result.error && result.data && result.data.length > 0;
    } catch (error) {
      console.log('Error checking photo existence:', error);
      return false;
    }
  }

  // Compress image to reduce storage costs
  private async compressImage(uri: string): Promise<PhotoUploadResult> {
    try {
      // Get original file size
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const originalSize = (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size : 0;

      // Compress image - target ~200KB
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }], // Resize to max 1200px width
        {
          compress: 0.7, // 70% quality
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Check compressed size
      const compressedInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
      const compressedSize = (compressedInfo.exists && 'size' in compressedInfo) ? compressedInfo.size : 0;

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

      // Compress image first
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
      const uploadResult = await supabaseHTTP.uploadFile('job-photos', filePath, fileBase64);

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

      const dbResult = await supabaseHTTP.insert('job_photos', photoData);
      
      if (dbResult.error) {
        // If metadata already exists, try updating instead
        if (dbResult.error.includes('duplicate') || dbResult.error.includes('already exists')) {
          console.log(`Photo metadata ${photo.id} already exists, updating...`);
          const updateResult = await supabaseHTTP.update('job_photos', photoData, { id: photo.id });
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

  // Sync single job to cloud using HTTP client with duplicate detection
  async syncJob(job: Job): Promise<SyncResult> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Check if job already exists in cloud
      const jobExists = await this.jobExistsInCloud(job.id, user.id);

      // Upload job data via HTTP
      const jobData = this.jobToDbFormat(job, user.id);
      
      if (jobExists) {
        // Update existing job
        const updateResult = await supabaseHTTP.update('jobs', jobData, { id: job.id });
        if (updateResult.error) {
          throw new Error(updateResult.error);
        }
        console.log(`Job ${job.id} updated in cloud`);
      } else {
        // Insert new job
        const jobResult = await supabaseHTTP.insert('jobs', jobData);
        if (jobResult.error) {
          // If job already exists, try updating instead
          if (jobResult.error.includes('duplicate') || jobResult.error.includes('already exists')) {
            const updateResult = await supabaseHTTP.update('jobs', jobData, { id: job.id });
            if (updateResult.error) {
              throw new Error(updateResult.error);
            }
            console.log(`Job ${job.id} updated in cloud (was duplicate)`);
          } else {
            throw new Error(jobResult.error);
          }
        } else {
          console.log(`Job ${job.id} created in cloud`);
        }
      }

      // Upload photos
      let photosSynced = 0;
      let photosFailed = 0;

      for (const photo of job.photos) {
        const uploadResult = await this.uploadPhoto(photo, job.id);
        if (uploadResult.success) {
          photosSynced++;
        } else {
          photosFailed++;
          console.error(`Failed to upload photo ${photo.id}:`, uploadResult.error);
        }
      }

      console.log(`Job ${job.id} synced: ${photosSynced} photos uploaded, ${photosFailed} failed`);

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
      const updateResult = await supabaseHTTP.update('profiles', 
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
      const jobsResult = await supabaseHTTP.select('jobs', '*', { user_id: user.id });
      
      if (jobsResult.error) {
        throw new Error(jobsResult.error);
      }

      const cloudJobs = jobsResult.data || [];

      // Get photo metadata for each job
      const jobsWithPhotos: Job[] = [];
      
      for (const cloudJob of cloudJobs) {
        const photosResult = await supabaseHTTP.select('job_photos', '*', { job_id: cloudJob.id });
        
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
      const profileResult = await supabaseHTTP.select('profiles', '*', { id: user.id });
      
      if (profileResult.error) {
        throw new Error(profileResult.error);
      }

      const profile = profileResult.data?.[0];
      if (!profile) {
        return { allowed: false, reason: 'User profile not found' };
      }

      const limits: Record<string, number | null> = {
        free: 20,
        starter: 200,
        professional: null,
        business: null
      };

      const tier = profile.subscription_tier;
      const maxJobs = limits[tier] ?? limits.free; // Default to free tier if invalid
      
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