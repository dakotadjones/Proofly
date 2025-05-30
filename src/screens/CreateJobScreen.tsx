import React from 'react';
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
import { cloudSyncService } from '../services/CloudSyncService';
import { validateJobData } from '../utils/JobUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Sizes } from '../theme';
import { Input, Button, Wrapper } from '../components/ui';

// Simplified form validation using JobUtils
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
  editJob?: Job;
}

export default function CreateJobScreen({ onJobCreated, editJob }: CreateJobScreenProps) {
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

  const onSubmit = async (data: JobFormData) => {
    // Use centralized validation
    const validation = validateJobData(data);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    // Check job limits before creating (only for new jobs, not edits)
    if (!editJob) {
      try {
        const limitCheck = await cloudSyncService.canCreateJob();
        if (!limitCheck.allowed) {
          Alert.alert(
            'Upgrade Required',
            limitCheck.reason || 'You have reached your job creation limit.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Learn About Upgrading', onPress: () => {
                Alert.alert('Upgrade Info', 'Upgrade to Pro for unlimited jobs! Coming soon...');
              }}
            ]
          );
          return;
        }
      } catch (error) {
        // If limit check fails, show warning but allow job creation for offline use
        console.log('Limit check failed, allowing offline job creation:', error);
      }
    }

    // Create the job object
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
        // Update existing job
        const jobIndex = existingJobs.findIndex(job => job.id === editJob.id);
        if (jobIndex !== -1) {
          existingJobs[jobIndex] = newJob;
        }
      } else {
        // Add new job
        existingJobs.push(newJob);
      }
      
      await AsyncStorage.setItem('proofly_jobs', JSON.stringify(existingJobs));

      // Auto-sync to cloud (non-blocking)
      cloudSyncService.autoSyncJob(newJob);

      console.log('Job Data:', data);
      
      if (onJobCreated) {
        onJobCreated(data);
      } else {
        // Fallback for standalone testing
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
              onPress: () => {
                console.log('Navigate to job details');
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', `Failed to save job: ${error}`);
    }
  };

  return (
    <ScrollView style={styles.Wrapper} contentContainerStyle={styles.contentWrapper}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{editJob ? 'Edit Job' : 'New Job'}</Text>
        <Text style={styles.subtitle}>
          {editJob ? 'Update job information' : 'Create a new service job'}
        </Text>
      </View>

      {/* Form */}
      <Wrapper variant="default" style={styles.formWrapper}>
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
          variant={isValid ? "primary" : "outline"}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid}
          style={styles.submitButton}
        >
          {editJob ? 'Update Job' : 'Create Job'}
        </Button>
      </Wrapper>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  Wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentWrapper: {
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
  formWrapper: {
    margin: Spacing.screenPadding,
    marginTop: -Spacing.lg, // Overlap with header
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
});