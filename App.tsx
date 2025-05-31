// App.tsx - Updated with Remember Me auto-login functionality
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-gesture-handler';

// Import screens
import HomeScreen, { Job } from './src/screens/HomeScreen';
import JobDetailsScreen from './src/screens/JobDetailsScreen';
import CreateJobScreen from './src/screens/CreateJobScreen';
import CameraScreen from './src/screens/CameraScreen';
import SimpleSignatureScreen from './src/screens/SimpleSignatureScreen';
import PDFGenerator from './src/screens/PDFGenerator';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen'; // Updated auth screen

// Import services
import { getCurrentUser, supabase } from './src/services/SupabaseHTTPClient';
import { authStorageService } from './src/services/AuthStorageService';
import { backgroundSyncService } from './src/services/BackgroundSyncService';
import { migrationService } from './src/services/MigrationService';
import { remoteSigningService } from './src/services/RemoteSigningService';
import { revenueCatService } from './src/services/RevenueCatService';

// Import utilities
import { generateUUID, calculateJobStatus } from './src/utils/JobUtils';

// Import UI components
import { KeyboardAvoidingWrapper, Wrapper, Input, Button } from './src/components/ui';

// Types remain the same...
export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  JobDetails: { job: Job };
  CreateJob: { editJob?: Job };
  Camera: { job: Job };
  Signature: { job: Job };
  PDFGenerator: { job: Job };
  Profile: undefined;
  Upgrade: { reason?: 'job_limit' | 'photo_limit' | 'pdf_branding' | 'general' };
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

// Enhanced Loading Screen with Remember Me status
function LoadingScreen({ message = 'Getting your jobs...' }: { message?: string }) {
  return (
    <View style={styles.loadingWrapper}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

// Simplified Auth Screen wrapper (using new AuthScreen component)
function AuthScreenWithNav({ navigation, onAuthSuccess }: any) {
  return <AuthScreen onAuthSuccess={onAuthSuccess} />;
}

// All other screen wrappers remain the same...
function HomeScreenWithNav({ navigation }: any) {
  const [syncStatus, setSyncStatus] = useState<any>(null);

  useEffect(() => {
    backgroundSyncService.initialize((status) => {
      setSyncStatus(status);
    });

    return () => {
      backgroundSyncService.destroy();
    };
  }, []);

  React.useEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        const showFailureIndicator = syncStatus?.failureCount >= 3 && syncStatus?.hasPendingChanges;
        
        return (
          <View style={styles.headerRight}>
            {showFailureIndicator && (
              <View style={styles.syncFailureIndicator}>
                <View style={styles.failureDot} />
              </View>
            )}
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileButtonText}>👤</Text>
            </TouchableOpacity>
          </View>
        );
      },
    });
  }, [navigation, syncStatus]);

  return <HomeScreen 
    onNewJob={() => navigation.navigate('CreateJob', {})}
    onJobSelect={(job: Job) => navigation.navigate('JobDetails', { job })}
  />;
}

// Other screen wrappers remain unchanged (CreateJobScreenWithNav, CameraScreenWithNav, etc.)
function CreateJobScreenWithNav({ route, navigation }: any) {
  const { editJob } = route.params || {};

  const handleJobCreated = async (jobData: JobFormData) => {
    try {
      console.log('🔄 Starting job creation...');
      
      const updatedJob: Job = editJob ? {
        ...editJob,
        ...jobData,
      } : {
        id: generateUUID(),
        ...jobData,
        status: 'created' as const,
        createdAt: new Date().toISOString(),
        photos: [],
      };

      console.log(`🔄 ${editJob ? 'Editing' : 'Creating'} job with ID: ${updatedJob.id}`);

      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      
      console.log(`📊 Current jobs count before save: ${jobs.length}`);
      
      if (editJob) {
        const jobIndex = jobs.findIndex(j => j.id === editJob.id);
        if (jobIndex !== -1) {
          jobs[jobIndex] = updatedJob;
          console.log(`✅ Updated existing job at index ${jobIndex}`);
        }
      } else {
        const existingJob = jobs.find(j => 
          j.id === updatedJob.id ||
          (j.clientName === updatedJob.clientName && 
           Math.abs(new Date(j.createdAt).getTime() - new Date(updatedJob.createdAt).getTime()) < 5000)
        );
        
        if (!existingJob) {
          jobs.push(updatedJob);
          console.log(`✅ Added new job. Jobs count now: ${jobs.length}`);
        } else {
          console.log('⚠️ Job already exists, skipping duplicate creation');
          navigation.navigate('JobDetails', { job: existingJob });
          return;
        }
      }
      
      await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
      console.log(`💾 Saved jobs to storage. Total count: ${jobs.length}`);
      
      setTimeout(() => {
        console.log(`🔄 Queuing job ${updatedJob.id} for background sync`);
        backgroundSyncService.queueJobSync(updatedJob, editJob ? 'update' : 'create');
      }, 1000);
      
      navigation.navigate('JobDetails', { job: updatedJob });
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert('Error', 'Failed to save job. Please try again.');
    }
  };

  const handleUpgrade = () => {
    navigation.navigate('Upgrade', { reason: 'job_limit' });
  };

  return (
    <CreateJobScreen 
      onJobCreated={handleJobCreated} 
      onUpgrade={handleUpgrade}
      editJob={editJob} 
    />
  );
}

function CameraScreenWithNav({ route, navigation }: any) {
  const { job } = route.params;
  const photosRef = React.useRef(job.photos || []);

  const savePhotosToJob = async (photos: any[]) => {
    try {
      const photosWithUUIDs = photos.map(photo => ({
        ...photo,
        id: photo.id.includes('-') ? photo.id : generateUUID()
      }));
      
      const updatedJob: Job = {
        ...job,
        photos: photosWithUUIDs,
        status: calculateJobStatus({ ...job, photos: photosWithUUIDs }),
      };

      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      const jobIndex = jobs.findIndex(j => j.id === job.id);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
      }

      backgroundSyncService.queueJobSync(updatedJob, 'update');

      return updatedJob;
    } catch (error) {
      console.error('Error updating job with photos:', error);
      return job;
    }
  };

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async (e: any) => {
      e.preventDefault();
      const updatedJob = await savePhotosToJob(photosRef.current);
      navigation.navigate('JobDetails', { job: updatedJob });
    });
    return unsubscribe;
  }, [navigation]);

  return <CameraScreen 
    clientName={job.clientName} 
    onPhotosComplete={async (photos: any[]) => {
      const updatedJob = await savePhotosToJob(photos);
      navigation.navigate('JobDetails', { job: updatedJob });
    }}
    onPhotosChange={(photos: any[]) => { photosRef.current = photos; }}
    initialPhotos={job.photos || []}
  />;
}

function SignatureScreenWithNav({ route, navigation }: any) {
  const { job } = route.params;

  const handleJobComplete = async (signatureData: any) => {
    try {
      if (signatureData.completionMethod === 'remote') {
        try {
          const result = await remoteSigningService.createRemoteSigningRequest(
            job,
            signatureData.remoteSigningData.sentVia,
            signatureData.remoteSigningData.sentTo
          );

          if (!result.success) {
            Alert.alert('Error', `Failed to send remote signing request: ${result.error}`);
            return;
          }
        } catch (error) {
          console.warn('Remote signing service failed, continuing with basic flow:', error);
        }
        
        const updatedJob: Job = {
          ...job,
          status: 'pending_remote_signature' as const,
          remoteSigningData: signatureData.remoteSigningData,
        };

        const savedJobs = await AsyncStorage.getItem('proofly_jobs');
        const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
        const jobIndex = jobs.findIndex(j => j.id === job.id);
        
        if (jobIndex !== -1) {
          jobs[jobIndex] = updatedJob;
          await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
        }

        backgroundSyncService.queueJobSync(updatedJob, 'update');
        
        navigation.navigate('JobDetails', { job: updatedJob });

      } else {
        const updatedJob: Job = {
          ...job,
          ...signatureData,
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
        };

        const savedJobs = await AsyncStorage.getItem('proofly_jobs');
        const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
        const jobIndex = jobs.findIndex(j => j.id === job.id);
        
        if (jobIndex !== -1) {
          jobs[jobIndex] = updatedJob;
          await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
        }

        backgroundSyncService.queueJobSync(updatedJob, 'complete');

        navigation.navigate('JobDetails', { job: updatedJob });
      }
    } catch (error) {
      console.error('Error updating job with signature:', error);
      Alert.alert('Error', 'Failed to save signature. Please try again.');
    }
  };

  return <SimpleSignatureScreen 
    clientName={job.clientName}
    clientEmail={job.clientEmail}
    clientPhone={job.clientPhone}
    photos={job.photos}
    onJobComplete={handleJobComplete}
  />;
}

function PDFGeneratorWithNav({ route, navigation }: any) {
  const { job } = route.params;

  const handlePDFGenerated = async () => {
    try {
      const updatedJob: Job = {
        ...job,
        status: 'completed' as const,
        completedAt: job.completedAt || new Date().toISOString(),
      };

      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      const jobIndex = jobs.findIndex(j => j.id === job.id);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
      }

      backgroundSyncService.queueJobSync(updatedJob, 'complete');
    } catch (error) {
      console.error('Error marking job as completed:', error);
    }
  };

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

  return <PDFGenerator jobData={jobData} onPDFGenerated={handlePDFGenerated} />;
}

function ProfileScreenWithNav({ navigation, onSignOut }: any) {
  const handleSignOut = async () => {
    try {
      await backgroundSyncService.clearSyncQueue();
      await authStorageService.clearAuthData(); // Clear remember me data
      await supabase.signOut();
      onSignOut();
    } catch (error) {
      console.error('Sign out error:', error);
      onSignOut();
    }
  };

  return <ProfileScreen onSignOut={handleSignOut} />;
}

function JobDetailsScreenWithNav({ route, navigation }: any) {
  const { job } = route.params;

  React.useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginLeft: 15 }}>
          <Text style={{ color: 'white', fontSize: 16 }}>← Home</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleEditJob = (editedJob: Job) => {
    navigation.navigate('CreateJob', { editJob: editedJob });
  };

  const handleJobUpdate = async (updatedJob: Job) => {
    try {
      console.log(`🔄 JobDetails updating job ${updatedJob.id}`);
      
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      
      const jobIndex = jobs.findIndex(j => j.id === updatedJob.id);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
        console.log(`✅ Updated job ${updatedJob.id} from JobDetails`);
        
        backgroundSyncService.queueJobSync(updatedJob, 'update');
      } else {
        console.log(`⚠️ Job ${updatedJob.id} not found for update in JobDetails`);
      }
    } catch (error) {
      console.error('Error updating job from JobDetails:', error);
    }
  };

  return <JobDetailsScreen
    job={job}
    onEditJob={handleEditJob}
    onTakePhotos={(job: Job) => navigation.navigate('Camera', { job })}
    onGetSignature={(job: Job) => navigation.navigate('Signature', { job })}
    onGeneratePDF={(job: Job) => navigation.navigate('PDFGenerator', { job })}
    onJobUpdate={handleJobUpdate}
  />;
}

function UpgradeScreenWithNav({ route, navigation }: any) {
  const { reason } = route.params || {};

  const handleClose = () => {
    navigation.goBack();
  };

  const handleUpgrade = async () => {
    try {
      const result = await revenueCatService.purchaseSubscription();
      
      if (result.success) {
        Alert.alert(
          '🎉 Upgrade Successful!',
          'Welcome to Proofly Pro! You now have unlimited jobs and photos.',
          [{ text: 'Awesome!', onPress: handleClose }]
        );
      } else {
        Alert.alert('Upgrade Failed', result.error || 'Please try again');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      Alert.alert('Error', 'Failed to process upgrade. Please try again.');
    }
  };

  return (
    <View style={styles.upgradeWrapper}>
      <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
      <Text style={styles.upgradeText}>
        Reason: {reason || 'general'}{'\n\n'}
        This is demo mode. In the real app, this would show the upgrade screen with RevenueCat pricing.
      </Text>
      <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
        <Text style={styles.upgradeButtonText}>Try Demo Purchase</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      // Initialize RevenueCat
      const revenueCatReady = await revenueCatService.initialize();
      console.log(revenueCatReady ? '✅ RevenueCat ready' : '⚠️ RevenueCat failed (demo mode)');

      // Run migration
      await migrationService.runMigrationIfNeeded();
      
      // ENHANCED: Check for stored auth data first
      console.log('🔐 Checking for stored authentication...');
      const hasStoredAuth = await authStorageService.hasValidStoredAuth();
      
      if (hasStoredAuth) {
        console.log('🔐 Found valid stored auth, attempting auto-login...');
        const storedAuthData = await authStorageService.getStoredAuthData();
        
        if (storedAuthData) {
          // Try to verify the stored token with Supabase
          try {
            // Set the token in the HTTP client
            const user = await getCurrentUser();
            if (user && user.email === storedAuthData.email) {
              console.log('✅ Auto-login successful:', user.email);
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            } else {
              console.log('🔐 Stored token invalid, clearing auth data');
              await authStorageService.clearAuthData();
            }
          } catch (error) {
            console.log('🔐 Token verification failed:', error);
            await authStorageService.clearAuthData();
          }
        }
      }
      
      // Fallback: Check regular authentication
      const user = await getCurrentUser();
      setIsAuthenticated(!!user);
      
      if (user) {
        console.log('✅ User authenticated:', user.email);
      } else {
        console.log('🔐 No authentication found');
      }
    } catch (error) {
      console.log('❌ Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleAuthSuccess = React.useCallback(async () => {
    console.log('🎉 Auth success callback triggered');
    await checkAuthStatus();
  }, []);

  const handleSignOut = React.useCallback(() => {
    console.log('👋 Sign out callback triggered');
    setIsAuthenticated(false);
  }, []);

  const ProfileScreenWithSignOut = React.useCallback((props: any) => {
    return <ProfileScreenWithNav {...props} onSignOut={handleSignOut} />;
  }, []);

  if (isLoading) {
    return <LoadingScreen message="Checking your authentication..." />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={isAuthenticated ? "Home" : "Auth"}
          screenOptions={{
            headerStyle: { backgroundColor: '#007AFF' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          {!isAuthenticated ? (
            <Stack.Screen 
              name="Auth" 
              options={{ title: 'Welcome to Proofly', headerLeft: () => null }}
            >
              {(props) => <AuthScreenWithNav {...props} onAuthSuccess={handleAuthSuccess} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeScreenWithNav} options={{ title: 'Proofly', headerLeft: () => null }} />
              <Stack.Screen name="JobDetails" component={JobDetailsScreenWithNav} options={{ title: 'Job Details' }} />
              <Stack.Screen name="CreateJob" component={CreateJobScreenWithNav} options={({ route }: any) => ({ title: route.params?.editJob ? 'Edit Job' : 'New Job' })} />
              <Stack.Screen name="Camera" component={CameraScreenWithNav} options={{ title: 'Take Photos' }} />
              <Stack.Screen name="Signature" component={SignatureScreenWithNav} options={{ title: 'Complete Job' }} />
              <Stack.Screen name="PDFGenerator" component={PDFGeneratorWithNav} options={{ title: 'Generate Report' }} />
              <Stack.Screen name="Profile" component={ProfileScreenWithSignOut} options={{ title: 'Profile' }} />
              <Stack.Screen name="Upgrade" component={UpgradeScreenWithNav} options={{ title: 'Upgrade to Pro', presentation: 'modal' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingWrapper: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f8f9fa' 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 18, 
    color: '#666' 
  },
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginRight: 15 
  },
  syncFailureIndicator: { 
    marginRight: 10 
  },
  failureDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#FF3B30' 
  },
  profileButton: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  profileButtonText: { 
    fontSize: 24 
  },
  upgradeWrapper: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#f8f9fa' 
  },
  upgradeTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 20 
  },
  upgradeText: { 
    fontSize: 16, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 30, 
    lineHeight: 24 
  },
  upgradeButton: { 
    backgroundColor: '#34C759', 
    padding: 16, 
    borderRadius: 8, 
    minWidth: 200, 
    alignItems: 'center', 
    marginBottom: 15 
  },
  upgradeButtonText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  closeButton: { 
    backgroundColor: '#666', 
    padding: 12, 
    borderRadius: 8, 
    minWidth: 200, 
    alignItems: 'center' 
  },
  closeButtonText: { 
    color: 'white', 
    fontSize: 16 
  },
});