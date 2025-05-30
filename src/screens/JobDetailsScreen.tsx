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
import { calculateJobStatus, getStatusColor, getStatusText, getStatusDescription, getRemoteSigningStatus, isRemoteSigningExpired } from '../utils/JobUtils';
import { remoteSigningService } from '../services/RemoteSigningService';

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
              
              // Update status using centralized logic
              const jobWithUpdatedStatus = {
                ...updatedJob,
                status: calculateJobStatus(updatedJob)
              };
              
              setJob(jobWithUpdatedStatus);
              
              // Save back the updated status
              const jobsWithUpdatedStatus = jobs.map(j => 
                j.id === job.id ? jobWithUpdatedStatus : j
              );
              await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobsWithUpdatedStatus));
            }
          }
        } catch (error) {
          console.error('Error loading job from storage:', error);
        }
      };

      loadJobFromStorage();
    }, [job.id])
  );

  const getNextStep = () => {
    if (job.signature) {
      return 'Job complete! Generate final PDF report.';
    }
    
    if (job.remoteSigningData) {
      const remoteStatus = getRemoteSigningStatus(job);
      const isExpired = isRemoteSigningExpired(job);
      
      if (isExpired) {
        return 'Remote approval expired. You can complete the job manually or resend approval request.';
      }
      
      return `Waiting for client approval via ${remoteStatus.method}. Sent ${remoteStatus.timeElapsed}.`;
    }
    
    if (job.photos.length > 0) {
      return 'Photos documented. Get client signature or send remote approval request.';
    }
    
    return 'Start by taking photos to document your work.';
  };

  const canGeneratePDF = () => {
    return job.photos.length > 0;
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

      {/* Status Overview */}
      <View style={styles.statusOverview}>
        <Text style={styles.statusOverviewTitle}>Job Status</Text>
        <Text style={styles.statusOverviewText}>{getStatusDescription(job)}</Text>
        <Text style={styles.nextStepText}>{getNextStep()}</Text>
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

      {/* Remote Approval Status */}
      {job.remoteSigningData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Remote Approval Status</Text>
          
          <View style={styles.remoteStatusCard}>
            <View style={styles.remoteStatusHeader}>
              <Text style={styles.remoteStatusTitle}>
                {job.signature ? '✅ Approved' : '⏳ Waiting for Client'}
              </Text>
              <Text style={styles.remoteStatusSubtitle}>
                {(() => {
                  const remoteStatus = getRemoteSigningStatus(job);
                  const isExpired = isRemoteSigningExpired(job);
                  
                  if (job.signature) {
                    return `Approved by ${job.clientSignedName}`;
                  } else if (isExpired) {
                    return 'Link expired (48 hours)';
                  } else {
                    return `Sent ${remoteStatus.timeElapsed} via ${remoteStatus.method}`;
                  }
                })()}
              </Text>
            </View>
            
            <View style={styles.remoteStatusDetails}>
              <View style={styles.remoteStatusItem}>
                <Text style={styles.remoteStatusLabel}>Sent to:</Text>
                <Text style={styles.remoteStatusValue}>
                  {job.remoteSigningData.sentTo}
                </Text>
              </View>
              
              <View style={styles.remoteStatusItem}>
                <Text style={styles.remoteStatusLabel}>Method:</Text>
                <Text style={styles.remoteStatusValue}>
                  {job.remoteSigningData.sentVia === 'email' ? '📧 Email' : '💬 SMS'}
                </Text>
              </View>
              
              <View style={styles.remoteStatusItem}>
                <Text style={styles.remoteStatusLabel}>Expires:</Text>
                <Text style={styles.remoteStatusValue}>
                  {(() => {
                    const sentAt = new Date(job.remoteSigningData.sentAt);
                    const expiresAt = new Date(sentAt.getTime() + 48 * 60 * 60 * 1000);
                    return expiresAt.toLocaleDateString() + ' at ' + expiresAt.toLocaleTimeString();
                  })()}
                </Text>
              </View>
            </View>
            
            {!job.signature && (
              <View style={styles.remoteStatusActions}>
                {isRemoteSigningExpired(job) ? (
                  <>
                    <TouchableOpacity 
                      style={styles.remoteActionButton}
                      onPress={() => {
                        Alert.alert(
                          'Resend Approval Request',
                          'Would you like to send a new approval request to the client?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Resend', onPress: () => onGetSignature(job) }
                          ]
                        );
                      }}
                    >
                      <Text style={styles.remoteActionButtonText}>🔄 Resend Request</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.remoteActionButton, styles.remoteActionButtonSecondary]}
                      onPress={() => onGetSignature(job)}
                    >
                      <Text style={styles.remoteActionButtonTextSecondary}>✍️ Get In-Person Signature</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity 
                    style={styles.remoteActionButton}
                    onPress={() => {
                      Alert.alert(
                        'Reminder Sent',
                        'A reminder has been sent to the client.',
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Text style={styles.remoteActionButtonText}>📞 Send Reminder</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Action Cards */}
      <View style={styles.actionsContainer}>
        
        {/* Photos Card */}
        <TouchableOpacity style={styles.actionCard} onPress={() => onTakePhotos(job)}>
          <View style={styles.actionHeader}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📸</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Document with Photos</Text>
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

        {/* PDF Generation Card */}
        <TouchableOpacity 
          style={[styles.actionCard, !canGeneratePDF() && styles.disabledCard]} 
          onPress={() => canGeneratePDF() ? onGeneratePDF(job) : Alert.alert('Cannot Generate PDF', 'Please take photos first to document your work.')}
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
                {canGeneratePDF() ? 
                  (job.signature ? 'Generate final report' : 'Generate progress report') : 
                  'Need photos first'
                }
              </Text>
            </View>
            <View style={styles.actionStatus}>
              <Text style={[styles.statusDot, { color: canGeneratePDF() ? '#007AFF' : '#ccc' }]}>
                {canGeneratePDF() ? '→' : '○'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Signature Card */}
        <TouchableOpacity style={styles.actionCard} onPress={() => onGetSignature(job)}>
          <View style={styles.actionHeader}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>✍️</Text>
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Get Client Signature</Text>
              <Text style={styles.actionSubtitle}>
                {job.signature ? `Signed by ${job.clientSignedName}` : 'Complete the job'}
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
              Work documented with photos
            </Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={[styles.progressDot, { color: job.signature ? '#34C759' : job.remoteSigningData ? '#9500FF' : '#ccc' }]}>
              {job.signature ? '✓' : job.remoteSigningData ? '⏳' : '○'}
            </Text>
            <Text style={[styles.progressText, !job.signature && !job.remoteSigningData && styles.disabledText]}>
              Client signature obtained
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
  statusOverview: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statusOverviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusOverviewText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  nextStepText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    fontStyle: 'italic',
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
  // Remote Status Styles
  remoteStatusCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  remoteStatusHeader: {
    marginBottom: 16,
  },
  remoteStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  remoteStatusSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  remoteStatusDetails: {
    gap: 8,
    marginBottom: 16,
  },
  remoteStatusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remoteStatusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  remoteStatusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  remoteStatusActions: {
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  remoteActionButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  remoteActionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  remoteActionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  remoteActionButtonTextSecondary: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
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