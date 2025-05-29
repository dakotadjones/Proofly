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

export interface Job {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  serviceType: string;
  description?: string;
  address: string;
  status: 'created' | 'in_progress' | 'photos_taken' | 'signed' | 'completed';
  createdAt: string;
  photos: Array<{ id: string; uri: string; type: string }>;
  signature?: string;
  clientSignedName?: string;
  jobSatisfaction?: string;
  completedAt?: string;
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
        const parsedJobs = JSON.parse(savedJobs);
        // Sort by most recent first
        parsedJobs.sort((a: Job, b: Job) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setJobs(parsedJobs);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const deleteJob = async (jobId: string, jobTitle: string) => {
    // Haptic feedback
    Vibration.vibrate(50);
    
    Alert.alert(
      'Delete Job',
      `Are you sure you want to delete "${jobTitle}"? This cannot be undone.`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedJobs = jobs.filter(job => job.id !== jobId);
              await AsyncStorage.setItem('proofly_jobs', JSON.stringify(updatedJobs));
              setJobs(updatedJobs);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete job');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'created': return '#FF9500';
      case 'in_progress': return '#007AFF';
      case 'photos_taken': return '#5856D6';
      case 'signed': return '#34C759';
      case 'completed': return '#8E8E93';
      default: return '#FF9500';
    }
  };

  const getStatusText = (status: Job['status']) => {
    switch (status) {
      case 'created': return 'Created';
      case 'in_progress': return 'In Progress';
      case 'photos_taken': return 'Photos Taken';
      case 'signed': return 'Signed';
      case 'completed': return 'Completed';
      default: return 'Created';
    }
  };

  const renderJobItem = ({ item }: { item: Job }) => (
    <Pressable
      style={({ pressed }) => [
        styles.jobCard,
        pressed && styles.jobCardPressed
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
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
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
          <Text style={styles.statNumber}>{item.signature ? '✓' : '○'}</Text>
          <Text style={styles.statLabel}>Signature</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{item.status === 'completed' ? '✓' : '○'}</Text>
          <Text style={styles.statLabel}>PDF</Text>
        </View>
        
        {/* Delete indicator */}
        <TouchableOpacity 
          style={styles.deleteIndicator}
          onPress={(e) => {
            e.stopPropagation();
            deleteJob(item.id, item.clientName);
          }}
        >
          <Text style={styles.deleteX}>×</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Jobs Yet</Text>
      <Text style={styles.emptyDescription}>
        Create your first job to get started with Proofly
      </Text>
      <TouchableOpacity style={styles.createFirstJobButton} onPress={onNewJob}>
        <Text style={styles.createFirstJobButtonText}>Create First Job</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Proofly</Text>
          <Text style={styles.headerSubtitle}>Service Documentation</Text>
        </View>
        <TouchableOpacity style={styles.newJobButton} onPress={onNewJob}>
          <Text style={styles.newJobButtonText}>+ New Job</Text>
        </TouchableOpacity>
      </View>

      {/* Job Stats */}
      {jobs.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statCardNumber}>{jobs.length}</Text>
            <Text style={styles.statCardLabel}>Total Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardNumber}>
              {jobs.filter(job => job.status === 'completed').length}
            </Text>
            <Text style={styles.statCardLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardNumber}>
              {jobs.filter(job => job.status !== 'completed' && job.status !== 'created').length}
            </Text>
            <Text style={styles.statCardLabel}>In Progress</Text>
          </View>
        </View>
      )}

      {/* Job List */}
      <FlatList
        data={jobs}
        renderItem={renderJobItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={jobs.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  newJobButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  newJobButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 15,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 15,
  },
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobCardPressed: {
    backgroundColor: '#f8f9fa',
    transform: [{ scale: 0.98 }],
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  serviceType: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
  },
  jobMeta: {
    alignItems: 'flex-end',
  },
  deleteButtonSmall: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    marginLeft: 10,
  },
  deleteButtonSmallText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  jobStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  deleteIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteX: {
    fontSize: 18,
    color: '#ff6b6b',
    fontWeight: '300',
  },
  jobActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    flex: 0.3,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  createFirstJobButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  createFirstJobButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});