// src/services/BackgroundSyncService.ts
// Silent background sync service for professional field workers

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { cloudSyncService } from './CloudSyncService';
import { getCurrentUser } from './SupabaseHTTPClient';
import { Job } from '../screens/HomeScreen';

interface SyncQueueItem {
  id: string;
  job: Job;
  action: 'create' | 'update' | 'complete';
  timestamp: number;
  retryCount: number;
}

interface SyncStatus {
  lastSuccessfulSync?: string;
  hasPendingChanges: boolean;
  failureCount: number;
  isOnline: boolean;
}

class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private syncQueue: SyncQueueItem[] = [];
  private isActivelysyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private netInfoSubscription: any = null;
  private status: SyncStatus = {
    hasPendingChanges: false,
    failureCount: 0,
    isOnline: true
  };
  
  // Callbacks for minimal UI updates
  private onSyncStatusChange?: (status: SyncStatus) => void;

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  // Initialize background sync with app lifecycle listeners
  async initialize(onStatusChange?: (status: SyncStatus) => void): Promise<void> {
    this.onSyncStatusChange = onStatusChange;
    
    // Load any pending sync queue
    await this.loadSyncQueue();
    
    // Set up app state listener
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    // Set up network listener
    this.netInfoSubscription = NetInfo.addEventListener(this.handleNetworkChange);
    
    // Start periodic sync (every 5 minutes when active)
    this.startPeriodicSync();
    
    // Initial sync attempt
    this.attemptSync();
    
    console.log('🔄 Background sync service initialized');
  }

  // Clean up listeners
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    if (this.netInfoSubscription) {
      this.netInfoSubscription();
    }
  }

  // Queue a job for background sync
  async queueJobSync(job: Job, action: 'create' | 'update' | 'complete'): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: `${job.id}-${action}-${Date.now()}`,
      job,
      action,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.syncQueue.push(queueItem);
    await this.saveSyncQueue();
    
    this.status.hasPendingChanges = true;
    this.notifyStatusChange();
    
    // Attempt immediate sync if online
    if (this.status.isOnline) {
      this.attemptSync();
    }
  }

  // Main sync orchestrator - runs silently
  private async attemptSync(): Promise<void> {
    if (this.isActivelysyncing || this.syncQueue.length === 0) {
      return;
    }

    try {
      // Check authentication silently
      const user = await getCurrentUser();
      if (!user) {
        // User not authenticated - clear queue and wait
        this.syncQueue = [];
        await this.saveSyncQueue();
        return;
      }

      this.isActivelysyncing = true;
      
      // Process sync queue
      await this.processSyncQueue();
      
      // Attempt full sync
      await this.performFullSync();
      
      // Success - reset failure count
      this.status.failureCount = 0;
      this.status.lastSuccessfulSync = new Date().toISOString();
      this.status.hasPendingChanges = this.syncQueue.length > 0;
      
    } catch (error) {
      console.log('🔄 Background sync failed (silent):', error);
      this.status.failureCount++;
      
      // Only show failure indicator after multiple failures
      if (this.status.failureCount >= 3) {
        this.notifyStatusChange();
      }
    } finally {
      this.isActivelysyncing = false;
    }
  }

  // Process individual jobs in sync queue
  private async processSyncQueue(): Promise<void> {
    const itemsToRemove: string[] = [];
    
    for (const item of this.syncQueue) {
      try {
        const result = await cloudSyncService.syncJob(item.job);
        
        if (result.success) {
          itemsToRemove.push(item.id);
        } else {
          // Increment retry count
          item.retryCount++;
          
          // Remove from queue after 5 failed attempts
          if (item.retryCount >= 5) {
            console.log(`🔄 Dropping sync item after 5 failures: ${item.id}`);
            itemsToRemove.push(item.id);
          }
        }
      } catch (error) {
        item.retryCount++;
        if (item.retryCount >= 5) {
          itemsToRemove.push(item.id);
        }
      }
    }

    // Remove processed/failed items
    this.syncQueue = this.syncQueue.filter(item => !itemsToRemove.includes(item.id));
    await this.saveSyncQueue();
  }

  // Full background sync
  private async performFullSync(): Promise<void> {
    try {
      await cloudSyncService.syncAllJobs();
    } catch (error) {
      // Silent failure - will retry later
      throw error;
    }
  }

  // App lifecycle handlers
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      // App came to foreground - attempt sync
      this.attemptSync();
    } else if (nextAppState === 'background') {
      // App going to background - final sync attempt
      this.attemptSync();
    }
  };

  private handleNetworkChange = (state: any): void => {
    const wasOnline = this.status.isOnline;
    this.status.isOnline = state.isConnected;
    
    // Just came back online - attempt sync
    if (!wasOnline && this.status.isOnline) {
      this.attemptSync();
    }
    
    this.notifyStatusChange();
  };

  // Periodic sync (every 5 minutes when active)
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (AppState.currentState === 'active' && this.status.isOnline) {
        this.attemptSync();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Persistence
  private async loadSyncQueue(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('background_sync_queue');
      if (saved) {
        this.syncQueue = JSON.parse(saved);
        this.status.hasPendingChanges = this.syncQueue.length > 0;
      }
    } catch (error) {
      console.log('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('background_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.log('Failed to save sync queue:', error);
    }
  }

  // Status management
  private notifyStatusChange(): void {
    if (this.onSyncStatusChange) {
      this.onSyncStatusChange({ ...this.status });
    }
  }

  // Public API for UI
  getSyncStatus(): SyncStatus {
    return { ...this.status };
  }

  // Force sync (for manual refresh)
  async forceSync(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.attemptSync();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }

  // Clear all pending syncs (for sign out)
  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
    this.status.hasPendingChanges = false;
    this.status.failureCount = 0;
    this.notifyStatusChange();
  }

  // Check if there are pending changes (for UI indicators)
  hasPendingChanges(): boolean {
    return this.status.hasPendingChanges;
  }

  // Check if sync is failing (for subtle error indicators)
  isSyncFailing(): boolean {
    return this.status.failureCount >= 3;
  }

  // Get last successful sync time (for debugging/support)
  getLastSyncTime(): string | undefined {
    return this.status.lastSuccessfulSync;
  }
}

export const backgroundSyncService = BackgroundSyncService.getInstance();