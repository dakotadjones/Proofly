// src/screens/CreateJobScreen.tsx - Updated with proper limit enforcement
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Job } from './HomeScreen';
import { validateJobData } from '../utils/JobUtils';
import { checkCanCreateJob, showLimitAlert, getUserUsageStats } from '../services/JobLimitService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Sizes } from '../theme';
import { Input, Button, Wrapper, KeyboardAvoidingWrapper, Badge } from '../components/ui';

const jobSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  clientPhone: z.string().min(10, 'Valid phone number required'),
  serviceType: z.string().min(1, 'Service type is required'),
  description: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
});

export type JobFormData = z.infer<typeof jobSchema>;

interface CreateJobScreenProps {
  onJobCreated?: (data: JobFormData) => void;
  onUpgrade?: () => void;
  editJob?: Job;
}

export default function CreateJobScreen({ onJobCreated, onUpgrade, editJob }: CreateJobScreenProps) {
  const [usageStats, setUsageStats] = useState<any>(null);
  const [limitCheck, setLimitCheck] = useState<any>(null);
  const [isCheckingLimits, setIsCheckingLimits] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    mode: 'onChange',
    defaultValues: editJob ? {
      clientName: editJob.clientName,
      clientEmail: editJob.clientEmail || '',
      clientPhone: editJob.clientPhone,
      serviceType: editJob.serviceType,
      description: editJob.description || '',
      address: editJob.address,
    } : undefined,
  });

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      const [stats, canCreate] = await Promise.all([
        getUserUsageStats(),
        checkCanCreateJob()
      ]);
      
      setUsageStats(stats);
      setLimitCheck(canCreate);
    } catch (error) {
      console.error('Error loading usage data:', error);
    }
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      Alert.alert(
        'Upgrade Coming Soon!', 
        'RevenueCat integration is being finalized. Contact support@proofly.com for early Pro access!\n\n🎉 Early users get 50% off first 3 months!'
      );
    }
  };

  const onSubmit = async (data: JobFormData) => {
    // Validate form data
    const validation = validateJobData(data);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    // CRITICAL: Check job limits for new jobs
    if (!editJob) {
      setIsCheckingLimits(true);
      
      try {
        const limitCheck = await checkCanCreateJob();
        
        if (!limitCheck.allowed) {
          setIsCheckingLimits(false);
          
          // Show blocking alert with upgrade option
          showLimitAlert(limitCheck, handleUpgrade);
          return;
        }
        
        // If near limit, show warning but allow creation
        if (limitCheck.upgradePrompt && limitCheck.upgradePrompt.urgency !== 'low') {
          Alert.alert(
            limitCheck.upgradePrompt.title,
            limitCheck.upgradePrompt.message + '\n\nContinue creating this job?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setIsCheckingLimits(false) },
              { text: 'Upgrade Now', onPress: handleUpgrade },
              { text: 'Create Job', onPress: () => proceedWithJobCreation(data) }
            ]
          );
          return;
        }
        
        setIsCheckingLimits(false);
      } catch (error) {
        console.error('Error checking limits:', error);
        setIsCheckingLimits(false);
        // Continue anyway - don't block users due to service errors
      }
    }

    proceedWithJobCreation(data);
  };

  const proceedWithJobCreation = async (data: JobFormData) => {
    try {
      const newJob: Job = {
        id: editJob?.id || Date.now().toString(),
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        serviceType: data.serviceType,
        description: data.description,
        address: data.address,
        status: 'created',
        createdAt: editJob?.createdAt || new Date().toISOString(),
        photos: editJob?.photos || [],
        signature: editJob?.signature,
        clientSignedName: editJob?.clientSignedName,
        jobSatisfaction: editJob?.jobSatisfaction,
        completedAt: editJob?.completedAt,
      };

      // Save to local storage
      const existingJobsData = await AsyncStorage.getItem('proofly_jobs');
      const existingJobs: Job[] = existingJobsData ? JSON.parse(existingJobsData) : [];
      
      if (editJob) {
        const jobIndex = existingJobs.findIndex(job => job.id === editJob.id);
        if (jobIndex !== -1) {
          existingJobs[jobIndex] = newJob;
        }
      } else {
        existingJobs.push(newJob);
      }
      
      await AsyncStorage.setItem('proofly_jobs', JSON.stringify(existingJobs));

      // Refresh usage stats
      await loadUsageData();

      // Success! Call the callback
      if (onJobCreated) {
        onJobCreated(data);
      } else {
        Alert.alert(
          editJob ? 'Job Updated!' : 'Job Created!',
          `Job for ${data.clientName} has been ${editJob ? 'updated' : 'created'}.`,
          [
            {
              text: 'Create Another',
              onPress: () => reset(),
            },
            {
              text: 'Start Job',
              onPress: () => console.log('Navigate to job details'),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', `Failed to save job: ${error}`);
    }
  };

  // Get appropriate UI state based on limits
  const getUIState = () => {
    if (!usageStats || !limitCheck) {
      return { showWarning: false, isBlocked: false, warningType: 'none' };
    }

    if (!limitCheck.allowed) {
      return { showWarning: true, isBlocked: true, warningType: 'blocked' };
    }

    if (limitCheck.upgradePrompt) {
      return { 
        showWarning: true, 
        isBlocked: false, 
        warningType: limitCheck.upgradePrompt.urgency 
      };
    }

    return { showWarning: false, isBlocked: false, warningType: 'none' };
  };

  const uiState = getUIState();

  return (
    <KeyboardAvoidingWrapper contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{editJob ? 'Edit Job' : 'New Job'}</Text>
        <Text style={styles.subtitle}>
          {editJob ? 'Update job information' : 'Create a new service job'}
        </Text>
        
        {/* Usage indicator for all users */}
        {usageStats && (
          <View style={styles.usageIndicator}>
            <Badge 
              variant={uiState.isBlocked ? 'error' : uiState.showWarning ? 'warning' : 'primary'}
              style={styles.usageBadge}
            >
              {usageStats.jobsUsed} {usageStats.tierInfo.name} Plan
            </Badge>
          </View>
        )}
      </View>

      {/* Limit Warning/Blocking */}
      {uiState.showWarning && !editJob && (
        <View style={styles.warningContainer}>
          <Wrapper 
            variant="elevated" 
            style={[
              styles.warningWrapper,
              uiState.isBlocked ? styles.blockedWarning : styles.cautionWarning
            ]}
          >
            {uiState.isBlocked ? (
              <>
                <Text style={styles.blockedTitle}>🚨 Job Limit Reached!</Text>
                <Text style={styles.blockedText}>
                  You've created {limitCheck?.currentCount}/{limitCheck?.limit} jobs on the free plan.
                  {'\n\n'}Upgrade to Pro for unlimited jobs and professional features!
                </Text>
                <View style={styles.warningButtons}>
                  <Button 
                    variant="primary" 
                    onPress={handleUpgrade}
                    style={styles.upgradeButton}
                  >
                    🚀 Upgrade to Pro - $19/mo
                  </Button>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.warningTitle}>
                  {uiState.warningType === 'high' ? '⚠️ Almost at Limit!' : '💡 Consider Upgrading'}
                </Text>
                <Text style={styles.warningText}>
                  You've used {limitCheck?.currentCount}/{limitCheck?.limit} jobs. 
                  {uiState.warningType === 'high' 
                    ? ' Upgrade now to avoid hitting your limit!'
                    : ' Upgrade for unlimited jobs and professional features.'
                  }
                </Text>
                <View style={styles.warningButtons}>
                  <Button 
                    variant={uiState.warningType === 'high' ? 'primary' : 'success'} 
                    onPress={handleUpgrade}
                    style={styles.upgradeButton}
                    size="small"
                  >
                    {uiState.warningType === 'high' ? '⬆️ Upgrade Now' : '🚀 Upgrade to Pro'}
                  </Button>
                </View>
              </>
            )}
          </Wrapper>
        </View>
      )}

      {/* Form */}
      <Wrapper variant="default" style={styles.formContainer}>
        {/* Client Name */}
        <Controller
          control={control}
          name="clientName"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Client Name"
              placeholder="Enter client name"
              value={value}
              onChangeText={onChange}
              autoCapitalize="words"
              error={errors.clientName?.message}
              required
            />
          )}
        />

        {/* Client Phone */}
        <Controller
          control={control}
          name="clientPhone"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Phone Number"
              placeholder="(555) 123-4567"
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
              error={errors.clientPhone?.message}
              required
            />
          )}
        />

        {/* Client Email */}
        <Controller
          control={control}
          name="clientEmail"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Email (Optional)"
              placeholder="client@email.com"
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.clientEmail?.message}
            />
          )}
        />

        {/* Service Type */}
        <Controller
          control={control}
          name="serviceType"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Service Type"
              placeholder="House cleaning, lawn care, etc."
              value={value}
              onChangeText={onChange}
              autoCapitalize="words"
              error={errors.serviceType?.message}
              required
            />
          )}
        />

        {/* Address */}
        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Service Address"
              placeholder="123 Main St, City, State"
              value={value}
              onChangeText={onChange}
              autoCapitalize="words"
              multiline
              error={errors.address?.message}
              required
              inputStyle={styles.textArea}
            />
          )}
        />

        {/* Description */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Description (Optional)"
              placeholder="Additional notes about the job..."
              value={value}
              onChangeText={onChange}
              multiline
              inputStyle={styles.textAreaLarge}
            />
          )}
        />

        {/* Submit Button */}
        <Button
          variant={isValid && !uiState.isBlocked ? "primary" : "outline"}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || uiState.isBlocked || isCheckingLimits}
          loading={isCheckingLimits}
          style={styles.submitButton}
        >
          {isCheckingLimits ? 'Checking Limits...' : 
           uiState.isBlocked ? 'Upgrade Required' :
           editJob ? 'Update Job' : 'Create Job'}
        </Button>

        {/* Pro benefits hint for free users */}
        {usageStats?.tierInfo.name === 'Free' && !uiState.isBlocked && (
          <View style={styles.proHint}>
            <Text style={styles.proHintText}>
              💼 Pro users get unlimited jobs, professional PDFs, and client portal access
            </Text>
            <Button 
              variant="ghost" 
              size="small"
              onPress={handleUpgrade}
              style={styles.proHintButton}
            >
              Learn More About Pro
            </Button>
          </View>
        )}
      </Wrapper>
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.statusBarOffset + Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.screenPadding,
  },
  title: {
    ...Typography.display,
    color: Colors.textInverse,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textInverse,
    opacity: 0.8,
  },
  usageIndicator: {
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
  },
  usageBadge: {
    // Badge component handles styling
  },
  warningContainer: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: -Spacing.lg,
    marginBottom: Spacing.md,
  },
  warningWrapper: {
    // Base wrapper styling
  },
  blockedWarning: {
    backgroundColor: Colors.error + '15',
    borderColor: Colors.error + '40',
    borderWidth: 2,
  },
  cautionWarning: {
    backgroundColor: Colors.warning + '15',
    borderColor: Colors.warning + '40',
    borderWidth: 2,
  },
  blockedTitle: {
    ...Typography.h4,
    color: Colors.error,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  blockedText: {
    ...Typography.body,
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  warningTitle: {
    ...Typography.h4,
    color: Colors.warning,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  warningText: {
    ...Typography.body,
    color: Colors.warning,
    marginBottom: Spacing.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  warningButtons: {
    // Container for warning buttons
  },
  upgradeButton: {
    // Button component handles styling
  },
  formContainer: {
    margin: Spacing.screenPadding,
    marginTop: -Spacing.lg,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
  proHint: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  proHintText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  proHintButton: {
    // Button component handles styling
  },
});