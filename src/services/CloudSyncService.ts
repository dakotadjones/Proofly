// services/CloudSyncService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getCurrentUser, getUserProfile } from '../lib/supabase';
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

  // Upload photo to Supabase Storage
  private async uploadPhoto(photo: JobPhoto, jobId: string): Promise<PhotoUploadResult> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Compress image first
      const compressionResult = await this.compressImage(photo.uri);
      if (!compressionResult.success) {
        return compressionResult;
      }

      // Read compressed file
      const fileBase64 = await FileSystem.readAsStringAsync(compressionResult.path!, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create unique file path
      const fileName = `${jobId}/${photo.id}.jpg`;
      const filePath = `users/${user.id}/photos/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('job-photos')
        .upload(filePath, decode(fileBase64), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      // Save photo metadata to database
      await supabase.from('job_photos').upsert({
        id: photo.id,
        job_id: jobId,
        user_id: user.id,
        photo_type: photo.type as 'before' | 'during' | 'after',
        file_path: filePath,
        file_size: compressionResult.compressedSize || 0,
        compressed: true,
        created_at: photo.timestamp // Use the timestamp from JobPhoto
      });

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

  // Sync single job to cloud
  async syncJob(job: Job): Promise<SyncResult> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Upload job data
      const jobData = this.jobToDbFormat(job, user.id);
      const { error: jobError } = await supabase
        .from('jobs')
        .upsert(jobData);

      if (jobError) throw jobError;

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

  // Sync all local jobs to cloud
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

      // Update user's job count
      await supabase
        .from('profiles')
        .update({ jobs_count: localJobs.length })
        .eq('id', user.id);

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

  // Download jobs from cloud (for new device setup)
  async downloadJobs(): Promise<SyncResult> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Get jobs from cloud
      const { data: cloudJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Get photo metadata for each job
      const jobsWithPhotos: Job[] = [];
      
      for (const cloudJob of cloudJobs || []) {
        const { data: photos, error: photosError } = await supabase
          .from('job_photos')
          .select('*')
          .eq('job_id', cloudJob.id);

        if (photosError) {
          console.error('Error fetching photos for job:', photosError);
        }

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
          photos: (photos || []).map(photo => ({
            id: photo.id,
            uri: `cloud://${photo.file_path}`, // Special URI to indicate cloud storage
            type: photo.photo_type,
            timestamp: photo.created_at // Add the required timestamp property
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

      const profile = await getUserProfile(user.id);
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
}

// Helper function to decode base64
function decode(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = new Uint8Array(Math.floor(base64.length * 3 / 4));
  let bufferLength = 0;
  
  for (let i = 0; i < base64.length; i += 4) {
    const a = chars.indexOf(base64.charAt(i));
    const b = chars.indexOf(base64.charAt(i + 1));
    const c = chars.indexOf(base64.charAt(i + 2));
    const d = chars.indexOf(base64.charAt(i + 3));
    
    result[bufferLength++] = (a << 2) | (b >> 4);
    if (c !== 64) result[bufferLength++] = ((b & 15) << 4) | (c >> 2);
    if (d !== 64) result[bufferLength++] = ((c & 3) << 6) | d;
  }
  
  return result.slice(0, bufferLength);
}

export const cloudSyncService = new CloudSyncService();