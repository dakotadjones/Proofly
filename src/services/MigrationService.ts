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

  // Single migration function for all ID fixes
  async migrateAllIds(): Promise<void> {
    try {
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      if (!savedJobs) return;
      
      const jobs: Job[] = JSON.parse(savedJobs);
      let needsUpdate = false;
      
      const migratedJobs = jobs.map(job => {
        const migratedJob = { ...job };
        
        // Migrate job ID
        if (!isValidUUID(job.id)) {
          console.log(`Migrating job ID: ${job.id} → UUID`);
          migratedJob.id = generateUUID();
          needsUpdate = true;
        }
        
        // Migrate photo IDs
        if (job.photos?.length > 0) {
          migratedJob.photos = job.photos.map(photo => {
            if (!isValidUUID(photo.id)) {
              console.log(`Migrating photo ID: ${photo.id} → UUID`);
              needsUpdate = true;
              return { ...photo, id: generateUUID() };
            }
            return photo;
          });
        }
        
        // Update job status based on current logic
        const newStatus = calculateJobStatus(migratedJob);
        if (migratedJob.status !== newStatus) {
          migratedJob.status = newStatus;
          needsUpdate = true;
        }
        
        return migratedJob;
      });
      
      if (needsUpdate) {
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(migratedJobs));
        console.log('✅ Migration completed successfully');
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  }

  // Check if migration is needed
  async needsMigration(): Promise<boolean> {
    try {
      const migrationFlag = await AsyncStorage.getItem('migration_v1_complete');
      return migrationFlag !== 'true';
    } catch {
      return true;
    }
  }

  // Mark migration as complete
  async markMigrationComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem('migration_v1_complete', 'true');
    } catch (error) {
      console.error('Failed to mark migration complete:', error);
    }
  }

  // Run migration if needed
  async runMigrationIfNeeded(): Promise<void> {
    if (await this.needsMigration()) {
      await this.migrateAllIds();
      await this.markMigrationComplete();
    }
  }
}

export const migrationService = MigrationService.getInstance();