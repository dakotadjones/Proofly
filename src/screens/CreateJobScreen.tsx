import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Job } from './HomeScreen';

// Form validation schema
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

  const onSubmit = (data: JobFormData) => {
    console.log('Job Data:', data);
    
    if (onJobCreated) {
      onJobCreated(data);
    } else {
      // Fallback for standalone testing
      Alert.alert(
        'Job Created!',
        `Job for ${data.clientName} has been created.`,
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
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{editJob ? 'Edit Job' : 'New Job'}</Text>
        <Text style={styles.subtitle}>
          {editJob ? 'Update job information' : 'Create a new service job'}
        </Text>
      </View>

      <View style={styles.form}>
        {/* Client Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Client Name *</Text>
          <Controller
            control={control}
            name="clientName"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.clientName && styles.inputError]}
                placeholder="Enter client name"
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
              />
            )}
          />
          {errors.clientName && (
            <Text style={styles.errorText}>{errors.clientName.message}</Text>
          )}
        </View>

        {/* Client Phone */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <Controller
            control={control}
            name="clientPhone"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.clientPhone && styles.inputError]}
                placeholder="(555) 123-4567"
                value={value}
                onChangeText={onChange}
                keyboardType="phone-pad"
              />
            )}
          />
          {errors.clientPhone && (
            <Text style={styles.errorText}>{errors.clientPhone.message}</Text>
          )}
        </View>

        {/* Client Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email (Optional)</Text>
          <Controller
            control={control}
            name="clientEmail"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.clientEmail && styles.inputError]}
                placeholder="client@email.com"
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
          {errors.clientEmail && (
            <Text style={styles.errorText}>{errors.clientEmail.message}</Text>
          )}
        </View>

        {/* Service Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service Type *</Text>
          <Controller
            control={control}
            name="serviceType"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.serviceType && styles.inputError]}
                placeholder="House cleaning, lawn care, etc."
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
              />
            )}
          />
          {errors.serviceType && (
            <Text style={styles.errorText}>{errors.serviceType.message}</Text>
          )}
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service Address *</Text>
          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.address && styles.inputError]}
                placeholder="123 Main St, City, State"
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
                multiline
              />
            )}
          />
          {errors.address && (
            <Text style={styles.errorText}>{errors.address.message}</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes about the job..."
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
              />
            )}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid}
        >
          <Text style={styles.submitButtonText}>
            {editJob ? 'Update Job' : 'Create Job'}
          </Text>
        </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});