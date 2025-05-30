// src/services/MigrationService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job } from '../screens/HomeScreen';
import { generateUUID, isValidUUID, calculateJobStatus } from '../utils/JobUtils';

class MigrationService {
  private static instance: MigrationService;
  
  static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
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

  // Enhanced migration function with better logging
  async migrateAllIds(): Promise<{ migrated: number; total: number }> {
    try {
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      if (!savedJobs) {
        console.log('✅ No jobs found - migration not needed');
        return { migrated: 0, total: 0 };
      }
      
      const jobs: Job[] = JSON.parse(savedJobs);
      let needsUpdate = false;
      let migratedCount = 0;
      
      console.log(`🔍 Checking ${jobs.length} jobs for migration...`);
      
      const migratedJobs = jobs.map((job, index) => {
        const migratedJob = { ...job };
        let jobMigrated = false;
        
        // Migrate job ID if needed
        if (!isValidUUID(job.id) || this.isTimestampId(job.id)) {
          const oldId = job.id;
          migratedJob.id = generateUUID();
          console.log(`📝 Job ${index + 1}: Migrating ID ${oldId} → ${migratedJob.id}`);
          needsUpdate = true;
          jobMigrated = true;
        }
        
        // Migrate photo IDs
        if (job.photos?.length > 0) {
          let photosMigrated = false;
          migratedJob.photos = job.photos.map((photo, photoIndex) => {
            if (!isValidUUID(photo.id) || this.isTimestampId(photo.id)) {
              const oldPhotoId = photo.id;
              const newPhotoId = generateUUID();
              console.log(`📸 Job ${index + 1}, Photo ${photoIndex + 1}: Migrating ${oldPhotoId} → ${newPhotoId}`);
              needsUpdate = true;
              photosMigrated = true;
              return { ...photo, id: newPhotoId };
            }
            return photo;
          });
          
          if (photosMigrated) {
            jobMigrated = true;
          }
        }
        
        // Update job status based on current logic
        const newStatus = calculateJobStatus(migratedJob);
        if (migratedJob.status !== newStatus) {
          console.log(`🔄 Job ${index + 1}: Status ${migratedJob.status} → ${newStatus}`);
          migratedJob.status = newStatus;
          needsUpdate = true;
          jobMigrated = true;
        }
        
        if (jobMigrated) {
          migratedCount++;
        }
        
        return migratedJob;
      });
      
      if (needsUpdate) {
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(migratedJobs));
        console.log(`✅ Migration completed: ${migratedCount}/${jobs.length} jobs migrated`);
      } else {
        console.log('✅ No migration needed - all jobs already have valid UUIDs');
      }
      
      return { migrated: migratedCount, total: jobs.length };
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  // Force migration (for testing or troubleshooting)
  async forceMigration(): Promise<{ migrated: number; total: number }> {
    try {
      // Reset migration flag to force re-migration
      await AsyncStorage.removeItem('migration_v1_complete');
      
      // Run migration
      const result = await this.migrateAllIds();
      
      // Mark as complete
      await this.markMigrationComplete();
      
      return result;
    } catch (error) {
      console.error('❌ Force migration failed:', error);
      throw error;
    }
  }

  // Check if migration is needed
  async needsMigration(): Promise<boolean> {
    try {
      const migrationFlag = await AsyncStorage.getItem('migration_v1_complete');
      if (migrationFlag === 'true') {
        // Double-check by looking at actual data
        const savedJobs = await AsyncStorage.getItem('proofly_jobs');
        if (savedJobs) {
          const jobs: Job[] = JSON.parse(savedJobs);
          const hasOldIds = jobs.some(job => 
            !isValidUUID(job.id) || 
            this.isTimestampId(job.id) ||
            (job.photos && job.photos.some(photo => !isValidUUID(photo.id) || this.isTimestampId(photo.id)))
          );
          
          if (hasOldIds) {
            console.log('🔍 Found jobs with old IDs despite migration flag - forcing migration');
            return true;
          }
        }
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  // Mark migration as complete
  async markMigrationComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem('migration_v1_complete', 'true');
      console.log('✅ Migration marked as complete');
    } catch (error) {
      console.error('Failed to mark migration complete:', error);
    }
  }

  // Run migration if needed
  async runMigrationIfNeeded(): Promise<{ migrated: number; total: number } | null> {
    if (await this.needsMigration()) {
      console.log('🚀 Starting migration...');
      const result = await this.migrateAllIds();
      await this.markMigrationComplete();
      return result;
    } else {
      console.log('✅ Migration not needed - all IDs are valid UUIDs');
      return null;
    }
  }

  // Get migration status for debugging
  async getMigrationStatus(): Promise<{
    migrationComplete: boolean;
    totalJobs: number;
    jobsWithOldIds: number;
    photosWithOldIds: number;
  }> {
    try {
      const migrationFlag = await AsyncStorage.getItem('migration_v1_complete');
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      
      if (!savedJobs) {
        return {
          migrationComplete: migrationFlag === 'true',
          totalJobs: 0,
          jobsWithOldIds: 0,
          photosWithOldIds: 0
        };
      }
      
      const jobs: Job[] = JSON.parse(savedJobs);
      let jobsWithOldIds = 0;
      let photosWithOldIds = 0;
      
      jobs.forEach(job => {
        if (!isValidUUID(job.id) || this.isTimestampId(job.id)) {
          jobsWithOldIds++;
        }
        
        if (job.photos) {
          job.photos.forEach(photo => {
            if (!isValidUUID(photo.id) || this.isTimestampId(photo.id)) {
              photosWithOldIds++;
            }
          });
        }
      });
      
      return {
        migrationComplete: migrationFlag === 'true',
        totalJobs: jobs.length,
        jobsWithOldIds,
        photosWithOldIds
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      return {
        migrationComplete: false,
        totalJobs: 0,
        jobsWithOldIds: 0,
        photosWithOldIds: 0
      };
    }
  }
}

export const migrationService = MigrationService.getInstance();