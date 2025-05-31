// App.tsx - Updated with KeyboardAvoidingWrapper throughout
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

// Import services
import { getCurrentUser, supabase } from './src/services/SupabaseHTTPClient';
import { backgroundSyncService } from './src/services/BackgroundSyncService';
import { migrationService } from './src/services/MigrationService';
import { remoteSigningService } from './src/services/RemoteSigningService';
import { revenueCatService } from './src/services/RevenueCatService';

// Import utilities
import { generateUUID, calculateJobStatus } from './src/utils/JobUtils';

// Import UI components
import { KeyboardAvoidingWrapper, Wrapper, Input, Button } from './src/components/ui';

// Types
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

// Loading Screen
function LoadingScreen() {
  return (
    <View style={styles.loadingWrapper}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Getting your jobs...</Text>
    </View>
  );
}

// Updated Auth Screen with KeyboardAvoidingWrapper
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

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Email and password are required');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    
    if (isSignUp && !formData.fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return false;
    }
    
    return true;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await supabase.signIn(formData.email.trim(), formData.password);
      if (result.error) {
        Alert.alert('Sign In Error', result.error);
      } else {
        console.log('Sign in successful:', result.user?.email);
        onAuthSuccess();
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await supabase.signUp(
        formData.email.trim(), 
        formData.password, 
        {
          full_name: formData.fullName.trim(),
          company_name: formData.companyName.trim() || null,
          phone: formData.phone.trim() || null,
        }
      );

      if (result.error) {
        Alert.alert('Sign Up Error', result.error);
      } else {
        Alert.alert(
          'Success!', 
          'Account created! Please check your email to verify your account.',
          [{ 
            text: 'OK', 
            onPress: () => {
              setIsSignUp(false);
              // Clear form except email for easier sign in
              setFormData(prev => ({
                ...prev,
                password: '',
                fullName: '',
                companyName: '',
                phone: ''
              }));
            }
          }]
        );
      }
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.resetPasswordForEmail(formData.email.trim());
      
      if (error) {
        Alert.alert('Error', error);
      } else {
        Alert.alert(
          'Password Reset Email Sent', 
          `Check your email (${formData.email}) for password reset instructions.`
        );
      }
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('Error', 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingWrapper 
      keyboardVerticalOffset={0} // No header for auth screen
      contentContainerStyle={styles.authContentWrapper}
    >
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

      <Wrapper variant="elevated" style={styles.authForm}>
        {isSignUp && (
          <>
            <Input
              label="Full Name"
              placeholder="Your full name"
              value={formData.fullName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
              required
            />

            <Input
              label="Company Name"
              placeholder="Your company name (optional)"
              value={formData.companyName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, companyName: text }))}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
            />

            <Input
              label="Phone Number"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
              autoCorrect={false}
              editable={!loading}
            />
          </>
        )}

        <Input
          label="Email Address"
          placeholder="your@email.com"
          value={formData.email}
          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          required
        />

        <Input
          label="Password"
          placeholder="Minimum 6 characters"
          value={formData.password}
          onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          required
        />

        <Button
          variant="primary"
          onPress={isSignUp ? handleSignUp : handleSignIn}
          disabled={loading}
          loading={loading}
          style={styles.primaryButton}
        >
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Button>

        {!isSignUp && (
          <Button 
            variant="ghost" 
            onPress={resetPassword}
            disabled={loading}
            style={styles.forgotButton}
          >
            Forgot Password?
          </Button>
        )}

        <View style={styles.switchMode}>
          <Text style={styles.switchModeText}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </Text>
          <Button 
            variant="ghost" 
            onPress={() => setIsSignUp(!isSignUp)} 
            disabled={loading}
            size="small"
            style={styles.switchButton}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </Button>
        </View>
      </Wrapper>

      {isSignUp && (
        <Wrapper variant="flat" style={styles.trialInfo}>
          <Text style={styles.trialTitle}>🎉 Start with 20 Free Jobs!</Text>
          <Text style={styles.trialText}>
            No credit card required. Full access to all features including cloud backup, 
            photo documentation, digital signatures, and PDF reports.
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>✅ 20 jobs included</Text>
            <Text style={styles.featureItem}>✅ Unlimited photos per job</Text>
            <Text style={styles.featureItem}>✅ Professional PDF reports</Text>
            <Text style={styles.featureItem}>✅ Digital signatures</Text>
            <Text style={styles.featureItem}>✅ Cloud backup & sync</Text>
          </View>
        </Wrapper>
      )}
    </KeyboardAvoidingWrapper>
  );
}

// Updated Home Screen with minimal sync indicators
function HomeScreenWithNav({ navigation }: any) {
  const [syncStatus, setSyncStatus] = useState<any>(null);

  useEffect(() => {
    // Initialize background sync with minimal status updates
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
        // Only show indicator if sync is failing AND has pending changes
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

// Updated job creation with background sync
function CreateJobScreenWithNav({ route, navigation }: any) {
  const { editJob } = route.params || {};

  const handleJobCreated = async (jobData: JobFormData) => {
    try {
      console.log('🔄 Starting job creation...');
      
      const updatedJob: Job = editJob ? {
        ...editJob,
        ...jobData,
      } : {
        id: generateUUID(), // Generate UUID once here
        ...jobData,
        status: 'created' as const,
        createdAt: new Date().toISOString(),
        photos: [],
      };

      console.log(`🔄 ${editJob ? 'Editing' : 'Creating'} job with ID: ${updatedJob.id}`);

      // Save locally first
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
        // Double-check we're not creating a duplicate
        const existingJob = jobs.find(j => 
          j.id === updatedJob.id || // Same ID
          (j.clientName === updatedJob.clientName && 
           Math.abs(new Date(j.createdAt).getTime() - new Date(updatedJob.createdAt).getTime()) < 5000) // Same client within 5 seconds
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
      
      // DELAY the background sync to avoid race conditions
      setTimeout(() => {
        console.log(`🔄 Queuing job ${updatedJob.id} for background sync`);
        backgroundSyncService.queueJobSync(updatedJob, editJob ? 'update' : 'create');
      }, 1000); // 1 second delay
      
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

// Updated camera screen with background sync
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

      // Save locally
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      const jobIndex = jobs.findIndex(j => j.id === job.id);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
      }

      // Queue for background sync
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

// Updated signature screen with background sync
function SignatureScreenWithNav({ route, navigation }: any) {
  const { job } = route.params;

  const handleJobComplete = async (signatureData: any) => {
    try {
      if (signatureData.completionMethod === 'remote') {
        // Handle remote signing
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

        // Save locally
        const savedJobs = await AsyncStorage.getItem('proofly_jobs');
        const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
        const jobIndex = jobs.findIndex(j => j.id === job.id);
        
        if (jobIndex !== -1) {
          jobs[jobIndex] = updatedJob;
          await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
        }

        // Queue for background sync
        backgroundSyncService.queueJobSync(updatedJob, 'update');
        
        navigation.navigate('JobDetails', { job: updatedJob });

      } else {
        // In-person signature completion
        const updatedJob: Job = {
          ...job,
          ...signatureData,
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
        };

        // Save locally
        const savedJobs = await AsyncStorage.getItem('proofly_jobs');
        const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
        const jobIndex = jobs.findIndex(j => j.id === job.id);
        
        if (jobIndex !== -1) {
          jobs[jobIndex] = updatedJob;
          await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
        }

        // Queue for background sync
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

// Updated PDF generator with background sync
function PDFGeneratorWithNav({ route, navigation }: any) {
  const { job } = route.params;

  const handlePDFGenerated = async () => {
    try {
      const updatedJob: Job = {
        ...job,
        status: 'completed' as const,
        completedAt: job.completedAt || new Date().toISOString(),
      };

      // Save locally
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      const jobIndex = jobs.findIndex(j => j.id === job.id);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
      }

      // Queue for background sync
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
      // Clear sync queue on sign out
      await backgroundSyncService.clearSyncQueue();
      await supabase.signOut();
      onSignOut();
    } catch (error) {
      console.error('Sign out error:', error);
      onSignOut();
    }
  };

  return <ProfileScreen onSignOut={handleSignOut} />;
}

// Other screens remain unchanged...
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

  // Pass the job editing functions that properly update without creating duplicates
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
        
        // Queue for background sync
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
      // Initialize RevenueCat
      const revenueCatReady = await revenueCatService.initialize();
      console.log(revenueCatReady ? '✅ RevenueCat ready' : '⚠️ RevenueCat failed (demo mode)');

      // Run migration
      await migrationService.runMigrationIfNeeded();
      
      // Check authentication
      const user = await getCurrentUser();
      setIsAuthenticated(!!user);
      
      if (user) {
        console.log('User authenticated:', user.email);
      }
    } catch (error) {
      console.log('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleAuthSuccess = React.useCallback(async () => {
    await checkAuthStatus();
  }, []);

  const handleSignOut = React.useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  const ProfileScreenWithSignOut = React.useCallback((props: any) => {
    return <ProfileScreenWithNav {...props} onSignOut={handleSignOut} />;
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
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
  authContentWrapper: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 20,
    minHeight: '100%'
  },
  authHeader: { 
    alignItems: 'center', 
    marginBottom: 40 
  },
  authTitle: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 8,
    textAlign: 'center'
  },
  authSubtitle: { 
    fontSize: 16, 
    color: '#666', 
    textAlign: 'center', 
    lineHeight: 24,
    paddingHorizontal: 20
  },
  authForm: { 
    marginBottom: 20
  },
  primaryButton: { 
    marginTop: 16
  },
  forgotButton: { 
    marginTop: 16, 
    alignSelf: 'center'
  },
  switchMode: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 24, 
    paddingTop: 24, 
    borderTopWidth: 1, 
    borderTopColor: '#e9ecef' 
  },
  switchModeText: { 
    fontSize: 16, 
    color: '#666', 
    marginRight: 8 
  },
  switchButton: { 
    paddingHorizontal: 0 
  },
  trialInfo: { 
    alignItems: 'center', 
    marginTop: 20 
  },
  trialTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#10B981', 
    marginBottom: 8,
    textAlign: 'center'
  },
  trialText: { 
    fontSize: 14, 
    color: '#10B981', 
    textAlign: 'center', 
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.8
  },
  featureList: { 
    alignItems: 'flex-start', 
    width: '100%' 
  },
  featureItem: { 
    fontSize: 14, 
    color: '#10B981', 
    marginBottom: 4, 
    fontWeight: '500',
    opacity: 0.9
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