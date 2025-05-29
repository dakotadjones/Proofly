import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet, Alert, ScrollView, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-gesture-handler';

// Import your screens
import HomeScreen, { Job } from './src/screens/HomeScreen';
import JobDetailsScreen from './src/screens/JobDetailsScreen';
import CreateJobScreen from './src/screens/CreateJobScreen';
import CameraScreen from './src/screens/CameraScreen';
import SimpleSignatureScreen from './src/screens/SimpleSignatureScreen';
import PDFGenerator from './src/screens/PDFGenerator';

// Import cloud services - ONLY HTTP client
import { getCurrentUser, supabaseHTTP } from './src/services/SupabaseHTTPClient';
import { cloudSyncService } from './src/services/CloudSyncService';

// Type definitions for navigation
export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  JobDetails: {
    job: Job;
  };
  CreateJob: {
    editJob?: Job;
  };
  Camera: {
    job: Job;
  };
  Signature: {
    job: Job;
  };
  PDFGenerator: {
    job: Job;
  };
};

export interface JobFormData {
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  serviceType: string;
  description?: string;
  address: string;
}

const Stack = createStackNavigator<RootStackParamList>();

// Loading Screen Component
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading Proofly...</Text>
    </View>
  );
}

// Simple Auth Screen using HTTP client
function AuthScreenWithNav({ navigation, onAuthSuccess }: any) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
    phone: ''
  });

  const handleSignIn = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const result = await supabaseHTTP.signIn(formData.email, formData.password);
      
      if (result.error) {
        Alert.alert('Sign In Error', result.error);
      } else {
        // Call the callback to update auth state instead of navigating
        onAuthSuccess();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      Alert.alert('Error', 'Email, password, and full name are required');
      return;
    }

    setLoading(true);
    try {
      const result = await supabaseHTTP.signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        company_name: formData.companyName,
        phone: formData.phone,
      });

      if (result.error) {
        Alert.alert('Sign Up Error', result.error);
      } else {
        Alert.alert(
          'Success!', 
          'Account created! Please check your email to verify your account.',
          [{ text: 'OK', onPress: () => setIsSignUp(false) }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.authContainer} contentContainerStyle={styles.authContentContainer}>
      <View style={styles.authHeader}>
        <Text style={styles.authTitle}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text style={styles.authSubtitle}>
          {isSignUp 
            ? 'Start documenting your service jobs professionally' 
            : 'Sign in to your Proofly account'
          }
        </Text>
      </View>

      <View style={styles.authForm}>
        {isSignUp && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your full name"
              value={formData.fullName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
              autoCapitalize="words"
            />
          </View>
        )}

        {isSignUp && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your company name (optional)"
              value={formData.companyName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, companyName: text }))}
              autoCapitalize="words"
            />
          </View>
        )}

        {isSignUp && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="your@email.com"
            value={formData.email}
            onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={isSignUp ? handleSignUp : handleSignIn}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.switchButtonText}>
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>

      {isSignUp && (
        <View style={styles.trialInfo}>
          <Text style={styles.trialTitle}>🎉 Start with 20 Free Jobs!</Text>
          <Text style={styles.trialText}>
            No credit card required. Full access to all features including cloud backup, 
            photo documentation, digital signatures, and PDF reports.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// Updated HomeScreen component with cloud sync
function HomeScreenWithNav({ navigation }: any) {
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Auto-sync on app load
  useEffect(() => {
    const performInitialSync = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setSyncStatus('Syncing...');
          const result = await cloudSyncService.syncAllJobs();
          if (result.success) {
            setSyncStatus(`Synced ${result.synced || 0} jobs`);
            setTimeout(() => setSyncStatus(''), 3000);
          } else {
            setSyncStatus('Sync failed');
            setTimeout(() => setSyncStatus(''), 3000);
          }
        }
      } catch (error) {
        console.log('Initial sync failed:', error);
      }
    };

    performInitialSync();
  }, []);

  // Add sync status to header
  React.useEffect(() => {
    if (syncStatus) {
      navigation.setOptions({
        headerRight: () => (
          <View style={styles.syncStatus}>
            <Text style={styles.syncStatusText}>{syncStatus}</Text>
          </View>
        ),
      });
    } else {
      navigation.setOptions({
        headerRight: () => null,
      });
    }
  }, [navigation, syncStatus]);

  const handleNewJob = () => {
    navigation.navigate('CreateJob', {});
  };

  const handleJobSelect = (job: Job) => {
    navigation.navigate('JobDetails', { job });
  };

  return <HomeScreen onNewJob={handleNewJob} onJobSelect={handleJobSelect} />;
}

// Job Details Screen with cloud sync
function JobDetailsScreenWithNav({ route, navigation }: any) {
  const { job } = route.params;

  const handleEditJob = (job: Job) => {
    navigation.navigate('CreateJob', { editJob: job });
  };

  const handleTakePhotos = (job: Job) => {
    navigation.navigate('Camera', { job });
  };

  const handleGetSignature = (job: Job) => {
    navigation.navigate('Signature', { job });
  };

  const handleGeneratePDF = (job: Job) => {
    navigation.navigate('PDFGenerator', { job });
  };

  // Override back button behavior
  React.useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={{ marginLeft: 15 }}
        >
          <Text style={{ color: 'white', fontSize: 16 }}>← Home</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <JobDetailsScreen
      job={job}
      onEditJob={handleEditJob}
      onTakePhotos={handleTakePhotos}
      onGetSignature={handleGetSignature}
      onGeneratePDF={handleGeneratePDF}
    />
  );
}

// Updated CreateJobScreen with cloud sync and job limits
function CreateJobScreenWithNav({ route, navigation }: any) {
  const { editJob } = route.params || {};

  // Simple UUID generator for React Native
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleJobCreated = async (jobData: JobFormData) => {
    try {
      let updatedJob: Job;
      
      if (editJob) {
        // Update existing job
        updatedJob = {
          ...editJob,
          ...jobData,
        };
      } else {
        // Create new job with UUID
        updatedJob = {
          id: generateUUID(), // Use UUID instead of timestamp
          ...jobData,
          status: 'created' as const,
          createdAt: new Date().toISOString(),
          photos: [],
        };
      }

      // Save to local storage
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      
      if (editJob) {
        const jobIndex = jobs.findIndex(j => j.id === editJob.id);
        if (jobIndex !== -1) {
          jobs[jobIndex] = updatedJob;
        }
      } else {
        jobs.push(updatedJob);
      }
      
      await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
      
      // Auto-sync to cloud (non-blocking)
      try {
        const user = await getCurrentUser();
        if (user) {
          cloudSyncService.autoSyncJob(updatedJob);
        }
      } catch (error) {
        console.log('Auto-sync failed, continuing offline:', error);
      }
      
      // Navigate to job details
      navigation.navigate('JobDetails', { job: updatedJob });
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert('Error', 'Failed to save job. Please try again.');
    }
  };

  return <CreateJobScreen onJobCreated={handleJobCreated} editJob={editJob} />;
}

// Updated CameraScreen with cloud photo sync
function CameraScreenWithNav({ route, navigation }: any) {
  const { job } = route.params;
  const photosRef = React.useRef(job.photos || []);

  // Simple UUID generator for photos
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Listen for back navigation and save photos
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async (e: any) => {
      // Prevent default behavior to handle save first
      e.preventDefault();
      
      console.log('Camera back press - saving photos:', photosRef.current.length);
      
      try {
        const updatedJob = await savePhotosToJob(photosRef.current);
        console.log('Save completed, now navigating back with updated job');
        
        // Navigate back with the updated job data
        navigation.navigate('JobDetails', { job: updatedJob });
      } catch (error) {
        console.error('Error saving photos:', error);
        // Still allow navigation even if save fails
        navigation.dispatch(e.data.action);
      }
    });

    return unsubscribe;
  }, [navigation]);

  const savePhotosToJob = async (photos: any[]) => {
    try {
      console.log('Saving photos to job:', photos.length, 'photos');
      
      // Ensure all photos have UUID format IDs
      const photosWithUUIDs = photos.map(photo => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(photo.id)) {
          return {
            ...photo,
            id: generateUUID()
          };
        }
        return photo;
      });
      
      // Calculate job status based on new logic
      const calculateJobStatus = (updatedJob: Job): Job['status'] => {
        if (updatedJob.signature) return 'completed';
        if (photosWithUUIDs.length > 0) return 'in_progress';
        return 'created';
      };

      // Update job with photos
      const updatedJob: Job = {
        ...job,
        photos: photosWithUUIDs,
        status: calculateJobStatus({ ...job, photos: photosWithUUIDs }),
      };

      // Save to local storage
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      const jobIndex = jobs.findIndex(j => j.id === job.id);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
        console.log('Successfully saved job with', photosWithUUIDs.length, 'photos');
      }

      // Auto-sync to cloud (non-blocking)
      try {
        const user = await getCurrentUser();
        if (user) {
          cloudSyncService.autoSyncJob(updatedJob);
        }
      } catch (error) {
        console.log('Photo sync failed, continuing offline:', error);
      }

      return updatedJob;
    } catch (error) {
      console.error('Error updating job with photos:', error);
      return job;
    }
  };

  const handlePhotosComplete = async (photos: any[]) => {
    const updatedJob = await savePhotosToJob(photos);
    navigation.navigate('JobDetails', { job: updatedJob });
  };

  const handlePhotosChange = (photos: any[]) => {
    // Update the ref so the back button listener has current photos
    photosRef.current = photos;
  };

  return (
    <CameraScreen 
      clientName={job.clientName} 
      onPhotosComplete={handlePhotosComplete}
      onPhotosChange={handlePhotosChange}
      initialPhotos={job.photos || []}
    />
  );
}

// Updated SignatureScreen with cloud sync
function SignatureScreenWithNav({ route, navigation }: any) {
  const { job } = route.params;

  const handleJobComplete = async (signatureData: { 
    clientSignedName: string; 
    jobSatisfaction?: string; 
    signature: string 
  }) => {
    try {
      // Update job with signature - always mark as completed when signature is captured
      const updatedJob: Job = {
        ...job,
        ...signatureData,
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
      };

      // Save to local storage
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      const jobIndex = jobs.findIndex(j => j.id === job.id);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
      }

      // Auto-sync to cloud (non-blocking)
      try {
        const user = await getCurrentUser();
        if (user) {
          cloudSyncService.autoSyncJob(updatedJob);
        }
      } catch (error) {
        console.log('Signature sync failed, continuing offline:', error);
      }

      // Go back to job details
      navigation.navigate('JobDetails', { job: updatedJob });
    } catch (error) {
      console.error('Error updating job with signature:', error);
      Alert.alert('Error', 'Failed to save signature. Please try again.');
    }
  };

  return (
    <SimpleSignatureScreen 
      clientName={job.clientName}
      photos={job.photos}
      onJobComplete={handleJobComplete}
    />
  );
}

// PDFGenerator with cloud sync
function PDFGeneratorWithNav({ route, navigation }: any) {
  const { job } = route.params;

  const handlePDFGenerated = async () => {
    try {
      // Mark job as completed in storage but don't navigate
      const updatedJob: Job = {
        ...job,
        status: 'completed' as const,
        completedAt: job.completedAt || new Date().toISOString(),
      };

      // Save to local storage
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      const jobIndex = jobs.findIndex(j => j.id === job.id);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
      }

      // Auto-sync to cloud (non-blocking)
      try {
        const user = await getCurrentUser();
        if (user) {
          cloudSyncService.autoSyncJob(updatedJob);
        }
      } catch (error) {
        console.log('PDF generation sync failed, continuing offline:', error);
      }

      // Don't navigate - stay on PDF page
    } catch (error) {
      console.error('Error marking job as completed:', error);
    }
  };

  // Convert job to the format expected by PDFGenerator
  const jobData = {
    jobId: job.id,
    clientName: job.clientName,
    clientEmail: job.clientEmail,
    clientPhone: job.clientPhone,
    serviceType: job.serviceType,
    description: job.description,
    address: job.address,
    photos: job.photos,
    clientSignedName: job.clientSignedName || '',
    jobSatisfaction: job.jobSatisfaction,
    signature: job.signature || '',
    completedAt: job.completedAt || new Date().toISOString(),
    status: job.status,
  };

  return (
    <PDFGenerator 
      jobData={jobData}
      onPDFGenerated={handlePDFGenerated}
    />
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Simple UUID generator
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Migration function to fix existing job IDs and photo IDs
  const migrateJobIds = async () => {
    try {
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      if (!savedJobs) return;
      
      const jobs: Job[] = JSON.parse(savedJobs);
      let needsUpdate = false;
      
      const updatedJobs = jobs.map(job => {
        // Check if job ID is not a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        let updatedJob = { ...job };
        
        if (!uuidRegex.test(job.id)) {
          console.log(`Migrating job ID from ${job.id} to UUID`);
          needsUpdate = true;
          updatedJob.id = generateUUID();
        }
        
        // Also migrate photo IDs
        if (job.photos && job.photos.length > 0) {
          const updatedPhotos = job.photos.map(photo => {
            if (!uuidRegex.test(photo.id)) {
              console.log(`Migrating photo ID from ${photo.id} to UUID`);
              needsUpdate = true;
              return {
                ...photo,
                id: generateUUID()
              };
            }
            return photo;
          });
          updatedJob.photos = updatedPhotos;
        }
        
        return updatedJob;
      });
      
      if (needsUpdate) {
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(updatedJobs));
        console.log('Job and photo IDs migrated to UUID format');
      }
    } catch (error) {
      console.error('Error migrating job IDs:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      // First migrate any existing jobs
      await migrateJobIds();
      
      const user = await getCurrentUser();
      setIsAuthenticated(!!user);
      
      if (user) {
        console.log('User authenticated:', user.email);
      } else {
        console.log('No user authenticated');
      }
    } catch (error) {
      console.log('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = async () => {
    // Re-check auth status to update the state
    await checkAuthStatus();
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={isAuthenticated ? "Home" : "Auth"}
          screenOptions={{
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          {!isAuthenticated ? (
            <Stack.Screen 
              name="Auth" 
              options={{ 
                title: 'Welcome to Proofly',
                headerLeft: () => null,
              }}
            >
              {(props) => <AuthScreenWithNav {...props} onAuthSuccess={handleAuthSuccess} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen 
                name="Home" 
                component={HomeScreenWithNav}
                options={{ 
                  title: 'Proofly',
                  headerLeft: () => null,
                }}
              />
              <Stack.Screen 
                name="JobDetails" 
                component={JobDetailsScreenWithNav}
                options={{ title: 'Job Details' }}
              />
              <Stack.Screen 
                name="CreateJob" 
                component={CreateJobScreenWithNav}
                options={({ route }: any) => ({ 
                  title: route.params?.editJob ? 'Edit Job' : 'New Job'
                })}
              />
              <Stack.Screen 
                name="Camera" 
                component={CameraScreenWithNav}
                options={{ title: 'Take Photos' }}
              />
              <Stack.Screen 
                name="Signature" 
                component={SignatureScreenWithNav}
                options={{ title: 'Client Signature' }}
              />
              <Stack.Screen 
                name="PDFGenerator" 
                component={PDFGeneratorWithNav}
                options={{ title: 'Generate Report' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666',
  },
  syncStatus: {
    marginRight: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  syncStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  authContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  authForm: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonDisabled: {
    backgroundColor: '#ccc',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  switchButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  trialInfo: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  trialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5a2d',
    marginBottom: 8,
  },
  trialText: {
    fontSize: 14,
    color: '#2d5a2d',
    textAlign: 'center',
    lineHeight: 20,
  },
});