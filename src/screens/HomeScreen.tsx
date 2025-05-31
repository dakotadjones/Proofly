// src/screens/HomeScreen.tsx - Updated with pull-to-refresh sync
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  Pressable,
  Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateJobStatus, getStatusColor, getStatusText, getStatusDescription } from '../utils/JobUtils';
import { backgroundSyncService } from '../services/BackgroundSyncService';
import { Colors, Typography, Spacing, Sizes, Theme } from '../theme';
import { Wrapper, Button, JobStatusBadge, EmptyState } from '../components/ui';

export interface Job {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  serviceType: string;
  description?: string;
  address: string;
  status: 'created' | 'in_progress' | 'pending_remote_signature' | 'completed';
  createdAt: string;
  photos: Array<{ id: string; uri: string; type: 'before' | 'during' | 'after'; timestamp: string }>;
  signature?: string;
  clientSignedName?: string;
  jobSatisfaction?: string;
  completedAt?: string;
  remoteSigningData?: {
    sentTo: string;
    sentVia: 'email' | 'sms';
    sentAt: string;
    requestId?: string;
  };
}

interface HomeScreenProps {
  onNewJob: () => void;
  onJobSelect: (job: Job) => void;
}

export default function HomeScreen({ onNewJob, onJobSelect }: HomeScreenProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      if (savedJobs) {
        const parsedJobs: Job[] = JSON.parse(savedJobs);
        
        // Update all job statuses using centralized logic
        const updatedJobs = parsedJobs.map(job => ({
          ...job,
          status: calculateJobStatus(job)
        }));
        
        // Sort by most recent first
        updatedJobs.sort((a: Job, b: Job) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setJobs(updatedJobs);
        
        // Save back the updated statuses
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(updatedJobs));
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Force a background sync on pull-to-refresh
      await backgroundSyncService.forceSync();
      
      // Reload local jobs (they may have been updated from cloud)
      await loadJobs();
    } catch (error) {
      console.log('Refresh sync failed, loading local jobs only');
      await loadJobs();
    } finally {
      setRefreshing(false);
    }
  };

  const deleteJob = async (jobId: string, jobTitle: string) => {
    Vibration.vibrate(50);
    
    Alert.alert(
      'Delete Job',
      `Are you sure you want to delete "${jobTitle}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedJobs = jobs.filter(job => job.id !== jobId);
              await AsyncStorage.setItem('proofly_jobs', JSON.stringify(updatedJobs));
              setJobs(updatedJobs);
              
              // Note: We don't sync deletions to cloud in this simple implementation
              // In a more complex app, you'd queue deletion for sync
            } catch (error) {
              Alert.alert('Error', 'Failed to delete job');
            }
          },
        },
      ]
    );
  };

  const renderJobItem = ({ item }: { item: Job }) => (
    <Wrapper variant="elevated" style={styles.jobWrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.jobWrapperContent,
          pressed && styles.jobWrapperPressed
        ]}
        onPress={() => onJobSelect(item)}
      >
        <View style={styles.jobHeader}>
          <View style={styles.jobInfo}>
            <Text style={styles.clientName}>{item.clientName}</Text>
            <Text style={styles.serviceType}>{item.serviceType}</Text>
            <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
          </View>
          <View style={styles.jobMeta}>
            <JobStatusBadge status={item.status} size="small" />
            <Text style={styles.statusDescription}>{getStatusDescription(item)}</Text>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.jobStats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{item.photos.length}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: item.signature ? Colors.success : Colors.gray400 }]}>
              {item.signature ? '✓' : '○'}
            </Text>
            <Text style={styles.statLabel}>Signature</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[
              styles.statNumber, 
              { color: item.status === 'completed' ? Colors.success : 
                       item.status === 'pending_remote_signature' ? Colors.signed : Colors.gray400 }
            ]}>
              {item.status === 'completed' ? '✓' : 
               item.status === 'pending_remote_signature' ? '⏳' : '○'}
            </Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              deleteJob(item.id, item.clientName);
            }}
          >
            <Text style={styles.deleteX}>×</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Wrapper>
  );

  const EmptyStateComponent = () => (
    <EmptyState
      icon="💼"
      title="No Jobs Yet"
      description="Create your first job to get started with Proofly"
      actionText="Create First Job"
      onAction={onNewJob}
      style={styles.emptyState}
    />
  );

  return (
    <View style={styles.Wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Proofly</Text>
          <Text style={styles.headerSubtitle}>Service Documentation</Text>
        </View>
        <Button 
          variant="ghost" 
          size="small" 
          onPress={onNewJob}
          style={styles.newJobButton}
          textStyle={styles.newJobButtonText}
        >
          + New Job
        </Button>
      </View>

      {/* Job Stats */}
      {jobs.length > 0 && (
        <View style={styles.statsWrapper}>
          <Wrapper variant="flat" style={styles.statWrapper}>
            <Text style={styles.statWrapperNumber}>{jobs.length}</Text>
            <Text style={styles.statWrapperLabel}>Total Jobs</Text>
          </Wrapper>
          <Wrapper variant="flat" style={styles.statWrapper}>
            <Text style={styles.statWrapperNumber}>
              {jobs.filter(job => job.status === 'completed').length}
            </Text>
            <Text style={styles.statWrapperLabel}>Completed</Text>
          </Wrapper>
          <Wrapper variant="flat" style={styles.statWrapper}>
            <Text style={styles.statWrapperNumber}>
              {jobs.filter(job => job.status === 'in_progress').length}
            </Text>
            <Text style={styles.statWrapperLabel}>In Progress</Text>
          </Wrapper>
          <Wrapper variant="flat" style={styles.statWrapper}>
            <Text style={styles.statWrapperNumber}>
              {jobs.filter(job => job.status === 'pending_remote_signature').length}
            </Text>
            <Text style={styles.statWrapperLabel}>Awaiting Approval</Text>
          </Wrapper>
        </View>
      )}

      {/* Job List */}
      <FlatList
        data={jobs}
        renderItem={renderJobItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={jobs.length === 0 ? styles.emptyWrapper : styles.listWrapper}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            title="Syncing jobs..."
            titleColor={Colors.textSecondary}
          />
        }
        ListEmptyComponent={EmptyStateComponent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  Wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.statusBarOffset + Spacing.md,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.screenPadding,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...Typography.display,
    color: Colors.textInverse,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textInverse,
    opacity: 0.8,
    marginTop: Spacing.xs,
  },
  newJobButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  newJobButtonText: {
    color: Colors.textInverse,
  },
  statsWrapper: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  statWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  statWrapperNumber: {
    ...Typography.h2,
    color: Colors.primary,
  },
  statWrapperLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  listWrapper: {
    padding: Spacing.md,
  },
  emptyWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.md,
  },
  emptyState: {
    paddingVertical: Spacing.xxl,
  },
  jobWrapper: {
    marginBottom: Spacing.md,
  },
  jobWrapperContent: {
    // Wrapper component handles padding
  },
  jobWrapperPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  jobInfo: {
    flex: 1,
  },
  clientName: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  serviceType: {
    ...Typography.body,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  address: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  jobMeta: {
    alignItems: 'flex-end',
  },
  statusDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginVertical: Spacing.xs,
    textAlign: 'right',
  },
  date: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  jobStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: Spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  deleteX: {
    ...Typography.h3,
    color: Colors.error,
    fontWeight: '300',
  },
});