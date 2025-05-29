import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job } from './HomeScreen';
import { useFocusEffect } from '@react-navigation/native';

interface JobDetailsScreenProps {
  job: Job;
  onEditJob: (job: Job) => void;
  onTakePhotos: (job: Job) => void;
  onGetSignature: (job: Job) => void;
  onGeneratePDF: (job: Job) => void;
}

export default function JobDetailsScreen({
  job: initialJob,
  onEditJob,
  onTakePhotos,
  onGetSignature,
  onGeneratePDF,
}: JobDetailsScreenProps) {
  const [job, setJob] = useState<Job>(initialJob);

  // Refresh job data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const loadJobFromStorage = async () => {
        try {
          const savedJobs = await AsyncStorage.getItem('proofly_jobs');
          if (savedJobs) {
            const jobs: Job[] = JSON.parse(savedJobs);
            const updatedJob = jobs.find(j => j.id === job.id);
            if (updatedJob) {
              console.log('Refreshed job with', updatedJob.photos.length, 'photos');
              setJob(updatedJob);
            }
          }
        } catch (error) {
          console.error('Error loading job from storage:', error);
        }
      };

      loadJobFromStorage();
    }, [job.id])
  );
  
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

  const canGeneratePDF = () => {
    return job.photos.length > 0 && job.signature;
  };

  const showPhotosPreview = () => {
    if (job.photos.length === 0) return null;

    return (
      <View style={styles.photosPreview}>
        <Text style={styles.sectionTitle}>Photos ({job.photos.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {job.photos.map((photo) => (
            <View key={photo.id} style={styles.photoItem}>
              <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
              <Text style={styles.photoType}>{photo.type}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{job.clientName}</Text>
          <Text style={styles.headerSubtitle}>{job.serviceType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.statusText}>{getStatusText(job.status)}</Text>
        </View>
      </View>

      {/* Job Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Job Information</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => onEditJob(job)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Client</Text>
            <Text style={styles.infoValue}>{job.clientName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{job.clientPhone}</Text>
          </View>
          {job.clientEmail && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{job.clientEmail}</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Service</Text>
            <Text style={styles.infoValue}>{job.serviceType}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{job.address}</Text>
          </View>
          {job.description && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Description</Text>
              <Text style={styles.infoValue}>{job.description}</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {new Date(job.createdAt).toLocaleDateString()} at {new Date(job.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Cards */}
      <View style={styles.actionsContainer}>
        
        {/* Photos Card */}
        <TouchableOpacity style={styles.actionCard} onPress={() => onTakePhotos(job)}>
          <View style={styles.actionHeader}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📸</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Photos</Text>
              <Text style={styles.actionSubtitle}>
                {job.photos.length > 0 ? `${job.photos.length} photos taken` : 'No photos yet'}
              </Text>
            </View>
            <View style={styles.actionStatus}>
              {job.photos.length > 0 ? (
                <Text style={[styles.statusDot, { color: '#34C759' }]}>✓</Text>
              ) : (
                <Text style={[styles.statusDot, { color: '#FF9500' }]}>○</Text>
              )}
            </View>
          </View>
          {showPhotosPreview()}
        </TouchableOpacity>

        {/* Signature Card */}
        <TouchableOpacity style={styles.actionCard} onPress={() => onGetSignature(job)}>
          <View style={styles.actionHeader}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>✍️</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Client Signature</Text>
              <Text style={styles.actionSubtitle}>
                {job.signature ? `Signed by ${job.clientSignedName}` : 'Not signed yet'}
              </Text>
            </View>
            <View style={styles.actionStatus}>
              {job.signature ? (
                <Text style={[styles.statusDot, { color: '#34C759' }]}>✓</Text>
              ) : (
                <Text style={[styles.statusDot, { color: '#FF9500' }]}>○</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* PDF Generation Card */}
        <TouchableOpacity 
          style={[styles.actionCard, !canGeneratePDF() && styles.disabledCard]} 
          onPress={() => canGeneratePDF() ? onGeneratePDF(job) : Alert.alert('Cannot Generate PDF', 'Please take photos and get client signature first.')}
        >
          <View style={styles.actionHeader}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📄</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, !canGeneratePDF() && styles.disabledText]}>
                Generate PDF Report
              </Text>
              <Text style={[styles.actionSubtitle, !canGeneratePDF() && styles.disabledText]}>
                {canGeneratePDF() ? 'Ready to generate report' : 'Need photos and signature'}
              </Text>
            </View>
            <View style={styles.actionStatus}>
              {job.status === 'completed' ? (
                <Text style={[styles.statusDot, { color: '#34C759' }]}>✓</Text>
              ) : (
                <Text style={[styles.statusDot, { color: canGeneratePDF() ? '#007AFF' : '#ccc' }]}>
                  {canGeneratePDF() ? '→' : '○'}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Progress Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Summary</Text>
        <View style={styles.progressItems}>
          <View style={styles.progressItem}>
            <Text style={[styles.progressDot, { color: '#34C759' }]}>✓</Text>
            <Text style={styles.progressText}>Job created</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={[styles.progressDot, { color: job.photos.length > 0 ? '#34C759' : '#ccc' }]}>
              {job.photos.length > 0 ? '✓' : '○'}
            </Text>
            <Text style={[styles.progressText, job.photos.length === 0 && styles.disabledText]}>
              Photos documented
            </Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={[styles.progressDot, { color: job.signature ? '#34C759' : '#ccc' }]}>
              {job.signature ? '✓' : '○'}
            </Text>
            <Text style={[styles.progressText, !job.signature && styles.disabledText]}>
              Client signature obtained
            </Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={[styles.progressDot, { color: job.status === 'completed' ? '#34C759' : '#ccc' }]}>
              {job.status === 'completed' ? '✓' : '○'}
            </Text>
            <Text style={[styles.progressText, job.status !== 'completed' && styles.disabledText]}>
              PDF report generated
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  actionsContainer: {
    paddingHorizontal: 15,
    gap: 12,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledCard: {
    opacity: 0.6,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  actionStatus: {
    marginLeft: 10,
  },
  statusDot: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#ccc',
  },
  photosPreview: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  photoItem: {
    marginRight: 10,
    alignItems: 'center',
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 4,
  },
  photoType: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
  },
  progressItems: {
    gap: 12,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    fontSize: 18,
    fontWeight: 'bold',
    width: 30,
  },
  progressText: {
    fontSize: 16,
    color: '#333',
  },
});