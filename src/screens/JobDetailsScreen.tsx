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
import { Colors, Typography, Spacing, Sizes } from '../theme';
import { Wrapper, Button, JobStatusBadge, Badge } from '../components/ui';

interface JobDetailsScreenProps {
  job: Job;
  onEditJob: (job: Job) => void;
  onTakePhotos: (job: Job) => void;
  onGetSignature: (job: Job) => void;
  onGeneratePDF: (job: Job) => void;
  onJobUpdate?: (job: Job) => void; // Optional callback for updates
}

export default function JobDetailsScreen({
  job: initialJob,
  onEditJob,
  onTakePhotos,
  onGetSignature,
  onGeneratePDF,
  onJobUpdate,
}: JobDetailsScreenProps) {
  const [job, setJob] = useState<Job>(initialJob);

  // Refresh job data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const loadJobFromStorage = async () => {
        try {
          console.log(`🔍 JobDetails refreshing job ${job.id}`);
          
          const savedJobs = await AsyncStorage.getItem('proofly_jobs');
          if (savedJobs) {
            const jobs: Job[] = JSON.parse(savedJobs);
            const updatedJob = jobs.find(j => j.id === job.id);
            
            if (updatedJob) {
              console.log(`✅ Found updated job with ${updatedJob.photos.length} photos`);
              
              // Calculate new status
              const newStatus = calculateJobStatus(updatedJob);
              
              // Only update if status actually changed
              if (updatedJob.status !== newStatus) {
                console.log(`🔄 Status changed from ${updatedJob.status} to ${newStatus}`);
                
                const jobWithUpdatedStatus = {
                  ...updatedJob,
                  status: newStatus
                };
                
                // Update local state
                setJob(jobWithUpdatedStatus);
                
                // Update storage WITHOUT creating duplicates
                const updatedJobs = jobs.map(j => 
                  j.id === job.id ? jobWithUpdatedStatus : j
                );
                
                await AsyncStorage.setItem('proofly_jobs', JSON.stringify(updatedJobs));
                console.log(`✅ Updated job status in storage (no duplicates)`);
                
                // Notify parent if callback provided
                if (onJobUpdate) {
                  onJobUpdate(jobWithUpdatedStatus);
                }
              } else {
                // Just update local state, no storage changes needed
                setJob(updatedJob);
                console.log(`✅ Job loaded, no status change needed`);
              }
            } else {
              console.log(`⚠️ Job ${job.id} not found in storage`);
            }
          }
        } catch (error) {
          console.error('Error loading job from storage:', error);
        }
      };

      loadJobFromStorage();
    }, [job.id]) // Only depend on job.id, not the whole job object
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
        <Text style={styles.previewTitle}>Photos ({job.photos.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
          {job.photos.map((photo) => (
            <View key={photo.id} style={styles.photoItem}>
              <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
              <Badge variant="primary" size="small" style={styles.photoBadge}>
                {photo.type}
              </Badge>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <ScrollView style={styles.Wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{job.clientName}</Text>
          <Text style={styles.headerSubtitle}>{job.serviceType}</Text>
        </View>
        <JobStatusBadge status={job.status} size="medium" />
      </View>

      {/* Status Overview */}
      <Wrapper variant="elevated" style={styles.statusWrapper}>
        <Text style={styles.statusTitle}>Job Status</Text>
        <Text style={styles.statusDescription}>{getStatusDescription(job)}</Text>
        <Text style={styles.nextStep}>{getNextStep()}</Text>
      </Wrapper>

      {/* Job Information */}
      <Wrapper variant="default" style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Job Information</Text>
          <Button 
            variant="outline" 
            size="small" 
            onPress={() => onEditJob(job)}
          >
            Edit
          </Button>
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
      </Wrapper>

      {/* Remote Approval Status */}
      {job.remoteSigningData && (
        <Wrapper variant="default" style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Remote Approval Status</Text>
          
          <View style={styles.remoteStatusWrapper}>
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
                    <Button 
                      variant="primary"
                      size="small"
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
                      style={styles.remoteActionButton}
                    >
                      🔄 Resend Request
                    </Button>
                    
                    <Button 
                      variant="outline"
                      size="small"
                      onPress={() => onGetSignature(job)}
                      style={styles.remoteActionButton}
                    >
                      ✍️ Get In-Person Signature
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="secondary"
                    size="small"
                    onPress={() => {
                      Alert.alert(
                        'Reminder Sent',
                        'A reminder has been sent to the client.',
                        [{ text: 'OK' }]
                      );
                    }}
                    style={styles.remoteActionButton}
                  >
                    📞 Send Reminder
                  </Button>
                )}
              </View>
            )}
          </View>
        </Wrapper>
      )}

      {/* Action Wrappers */}
      <View style={styles.actionsWrapper}>
        
        {/* Photos Wrapper */}
        <Wrapper variant="default" style={styles.actionWrapper}>
          <TouchableOpacity onPress={() => onTakePhotos(job)}>
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
                  <Text style={[styles.statusDot, { color: Colors.success }]}>✓</Text>
                ) : (
                  <Text style={[styles.statusDot, { color: Colors.warning }]}>○</Text>
                )}
              </View>
            </View>
            {showPhotosPreview()}
          </TouchableOpacity>
        </Wrapper>

        {/* PDF Generation Wrapper */}
        <Wrapper variant={canGeneratePDF() ? "default" : "flat"} style={[styles.actionWrapper, !canGeneratePDF() && styles.disabledWrapper]}>
          <TouchableOpacity 
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
                <Text style={[styles.statusDot, { color: canGeneratePDF() ? Colors.primary : Colors.gray400 }]}>
                  {canGeneratePDF() ? '→' : '○'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </Wrapper>

        {/* Signature Wrapper */}
        <Wrapper variant="default" style={styles.actionWrapper}>
          <TouchableOpacity onPress={() => onGetSignature(job)}>
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
                  <Text style={[styles.statusDot, { color: Colors.success }]}>✓</Text>
                ) : (
                  <Text style={[styles.statusDot, { color: Colors.warning }]}>○</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Wrapper>
      </View>

      {/* Progress Summary */}
      <Wrapper variant="default" style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Summary</Text>
        <View style={styles.progressItems}>
          <View style={styles.progressItem}>
            <Text style={[styles.progressDot, { color: Colors.success }]}>✓</Text>
            <Text style={styles.progressText}>Job created</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={[styles.progressDot, { color: job.photos.length > 0 ? Colors.success : Colors.gray400 }]}>
              {job.photos.length > 0 ? '✓' : '○'}
            </Text>
            <Text style={[styles.progressText, job.photos.length === 0 && styles.disabledText]}>
              Work documented with photos
            </Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={[styles.progressDot, { color: job.signature ? Colors.success : job.remoteSigningData ? Colors.signed : Colors.gray400 }]}>
              {job.signature ? '✓' : job.remoteSigningData ? '⏳' : '○'}
            </Text>
            <Text style={[styles.progressText, !job.signature && !job.remoteSigningData && styles.disabledText]}>
              Client signature obtained
            </Text>
          </View>
        </View>
      </Wrapper>
    </ScrollView>
  );
}

// Styles remain the same...
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
  headerContent: {
    flex: 1,
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
  statusWrapper: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: -Spacing.lg,
    marginBottom: Spacing.md,
  },
  statusTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  statusDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  nextStep: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontStyle: 'italic',
  },
  section: {
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  infoGrid: {
    gap: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
    width: 80,
  },
  infoValue: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  remoteStatusWrapper: {
    backgroundColor: Colors.gray50,
    borderRadius: Sizes.radiusMedium,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  remoteStatusHeader: {
    marginBottom: Spacing.md,
  },
  remoteStatusTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  remoteStatusSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  remoteStatusDetails: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  remoteStatusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remoteStatusLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  remoteStatusValue: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  remoteStatusActions: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  remoteActionButton: {},
  actionsWrapper: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.md,
  },
  actionWrapper: {},
  disabledWrapper: {
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
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  actionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  actionStatus: {
    marginLeft: Spacing.sm,
  },
  statusDot: {
    ...Typography.h3,
    fontWeight: 'bold',
  },
  disabledText: {
    color: Colors.gray400,
  },
  photosPreview: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  previewTitle: {
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  photoScroll: {
    marginHorizontal: -Spacing.xs,
  },
  photoItem: {
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: Sizes.radiusSmall,
    marginBottom: Spacing.xs,
  },
  photoBadge: {},
  progressItems: {
    gap: Spacing.md,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    ...Typography.h4,
    fontWeight: 'bold',
    width: 30,
  },
  progressText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
});