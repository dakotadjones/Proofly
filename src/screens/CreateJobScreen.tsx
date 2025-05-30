// src/screens/CreateJobScreen.tsx - Updated with RevenueCat integration
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Job } from './HomeScreen';
import { validateJobData } from '../utils/JobUtils';
import { revenueCatService } from '../services/RevenueCatService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Sizes } from '../theme';
import { Input, Button, Wrapper } from '../components/ui';

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
  onUpgrade?: () => void;  // Added this prop
  editJob?: Job;
}

export default function CreateJobScreen({ onJobCreated, onUpgrade, editJob }: CreateJobScreenProps) {
  const [userTier, setUserTier] = useState<string>('free');
  const [currentJobCount, setCurrentJobCount] = useState<number>(0);
  const [showUpgradeWarning, setShowUpgradeWarning] = useState<boolean>(false);
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
    loadUserTierAndJobCount();
  }, []);

  const loadUserTierAndJobCount = async () => {
    try {
      // Get current subscription status
      const customerInfo = await revenueCatService.getCustomerInfo();
      setUserTier(customerInfo.tier);

      // Get current job count
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobCount = savedJobs ? JSON.parse(savedJobs).length : 0;
      setCurrentJobCount(jobCount);

      // Check if we should show upgrade warning for new jobs
      if (!editJob) {
        const limitCheck = revenueCatService.canPerformAction(customerInfo.tier, 'create_job', { jobCount });
        if (!limitCheck.allowed) {
          setShowUpgradeWarning(true);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Default to free tier if there's an error
      setUserTier('free');
    }
  };

  const onSubmit = async (data: JobFormData) => {
    // Validate form data
    const validation = validateJobData(data);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    // Check job limits for new jobs
    if (!editJob) {
      setIsCheckingLimits(true);
      
      const limitCheck = revenueCatService.canPerformAction(userTier, 'create_job', { jobCount: currentJobCount });
      
      if (!limitCheck.allowed) {
        setIsCheckingLimits(false);
        
        Alert.alert(
          'Upgrade Required',
          limitCheck.reason || 'You have reached your job creation limit.',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { 
              text: 'Upgrade Now', 
              onPress: () => {
                if (onUpgrade) {
                  onUpgrade();
                } else {
                  Alert.alert('Upgrade', 'Upgrade functionality coming soon!');
                }
              }
            }
          ]
        );
        return;
      }
      
      setIsCheckingLimits(false);
    }

    // Create/update the job
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

    try {
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

  const handleUpgradePrompt = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      Alert.alert('Upgrade', 'Upgrade functionality coming soon!');
    }
  };

  const tierInfo = revenueCatService.getTierInfo(userTier);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{editJob ? 'Edit Job' : 'New Job'}</Text>
        <Text style={styles.subtitle}>
          {editJob ? 'Update job information' : 'Create a new service job'}
        </Text>
        
        {/* Job limit indicator for free users */}
        {userTier === 'free' && !editJob && (
          <View style={styles.limitIndicator}>
            <Text style={styles.limitText}>
              Jobs: {currentJobCount}/{tierInfo.limits.maxJobs} (Free Plan)
            </Text>
          </View>
        )}
      </View>

      {/* Upgrade Warning */}
      {showUpgradeWarning && !editJob && (
        <View style={styles.upgradeWarningContainer}>
          <Wrapper variant="elevated" style={styles.upgradeWarning}>
            <Text style={styles.warningTitle}>🚀 Job Limit Reached!</Text>
            <Text style={styles.warningText}>
              You've created {currentJobCount}/20 jobs on the free plan. Upgrade to Pro for unlimited jobs!
            </Text>
            <View style={styles.warningButtons}>
              <Button 
                variant="success" 
                onPress={handleUpgradePrompt}
                style={styles.upgradeButton}
              >
                Upgrade to Pro ($19/mo)
              </Button>
              <Button 
                variant="outline" 
                size="small"
                onPress={() => setShowUpgradeWarning(false)}
                style={styles.dismissButton}
              >
                Maybe Later
              </Button>
            </View>
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
          variant={isValid && !showUpgradeWarning ? "primary" : "outline"}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || showUpgradeWarning || isCheckingLimits}
          loading={isCheckingLimits}
          style={styles.submitButton}
        >
          {isCheckingLimits ? 'Checking Limits...' : 
           showUpgradeWarning ? 'Upgrade Required' :
           editJob ? 'Update Job' : 'Create Job'}
        </Button>

        {/* Upgrade hint for free users */}
        {userTier === 'free' && !showUpgradeWarning && !editJob && (
          <View style={styles.upgradeHint}>
            <Text style={styles.upgradeHintText}>
              💡 Upgrade to Pro for unlimited jobs, professional PDFs, and client portal
            </Text>
            <Button 
              variant="ghost" 
              size="small"
              onPress={handleUpgradePrompt}
              style={styles.upgradeHintButton}
            >
              Learn More
            </Button>
          </View>
        )}
      </Wrapper>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  limitIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Sizes.radiusSmall,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  limitText: {
    ...Typography.caption,
    color: Colors.textInverse,
    fontWeight: 'bold',
  },
  upgradeWarningContainer: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: -Spacing.lg,
    marginBottom: Spacing.md,
  },
  upgradeWarning: {
    backgroundColor: Colors.warning + '15',
    borderColor: Colors.warning + '40',
    borderWidth: 2,
  },
  warningTitle: {
    ...Typography.h4,
    color: Colors.warning,
    marginBottom: Spacing.sm,
  },
  warningText: {
    ...Typography.body,
    color: Colors.warning,
    marginBottom: Spacing.md,
  },
  warningButtons: {
    gap: Spacing.sm,
  },
  upgradeButton: {
    // Button component handles styling
  },
  dismissButton: {
    alignSelf: 'center',
  },
  formContainer: {
    margin: Spacing.screenPadding,
    marginTop: -Spacing.lg, // Fixed: removed showUpgradeWarning reference
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
  upgradeHint: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  upgradeHintText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  upgradeHintButton: {
    // Button component handles styling
  },
});