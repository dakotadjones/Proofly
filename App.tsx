import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-gesture-handler';

// Import your screens
import HomeScreen, { Job } from './src/screens/HomeScreen';
import JobDetailsScreen from './src/screens/JobDetailsScreen';
import CreateJobScreen from './src/screens/CreateJobScreen';
import CameraScreen from './src/screens/CameraScreen';
import SimpleSignatureScreen from './src/screens/SimpleSignatureScreen';
import PDFGenerator from './src/screens/PDFGenerator';

// Type definitions for navigation
export type RootStackParamList = {
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

// Updated HomeScreen component with navigation
function HomeScreenWithNav({ navigation }: any) {
  const handleNewJob = () => {
    navigation.navigate('CreateJob', {});
  };

  const handleJobSelect = (job: Job) => {
    navigation.navigate('JobDetails', { job });
  };

  return <HomeScreen onNewJob={handleNewJob} onJobSelect={handleJobSelect} />;
}

// Job Details Screen with navigation
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

// Updated CreateJobScreen component with navigation
function CreateJobScreenWithNav({ route, navigation }: any) {
  const { editJob } = route.params || {};

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
        // Create new job
        updatedJob = {
          id: `JOB-${Date.now()}`,
          ...jobData,
          status: 'created' as const,
          createdAt: new Date().toISOString(),
          photos: [],
        };
      }

      // Save to storage
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
      
      // Navigate to job details
      navigation.navigate('JobDetails', { job: updatedJob });
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  return <CreateJobScreen onJobCreated={handleJobCreated} editJob={editJob} />;
}

// Updated CameraScreen component with navigation
function CameraScreenWithNav({ route, navigation }: any) {
  const { job } = route.params;
  const photosRef = React.useRef(job.photos || []);

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
      // Update job with photos
      const updatedJob: Job = {
        ...job,
        photos,
        status: job.signature ? 'signed' : 'photos_taken',
      };

      // Save to storage
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      const jobIndex = jobs.findIndex(j => j.id === job.id);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
        console.log('Successfully saved job with', photos.length, 'photos');
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

// Updated SignatureScreen component with navigation
function SignatureScreenWithNav({ route, navigation }: any) {
  const { job } = route.params;

  const handleJobComplete = async (signatureData: { 
    clientSignedName: string; 
    jobSatisfaction?: string; 
    signature: string 
  }) => {
    try {
      // Update job with signature
      const updatedJob: Job = {
        ...job,
        ...signatureData,
        status: 'signed' as const,
      };

      // Save to storage
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      const jobIndex = jobs.findIndex(j => j.id === job.id);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
      }

      // Go back to job details
      navigation.navigate('JobDetails', { job: updatedJob });
    } catch (error) {
      console.error('Error updating job with signature:', error);
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

// PDFGenerator with navigation
function PDFGeneratorWithNav({ route, navigation }: any) {
  const { job } = route.params;

  const handlePDFGenerated = async () => {
    try {
      // Mark job as completed in storage but don't navigate
      const updatedJob: Job = {
        ...job,
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
      };

      // Save to storage
      const savedJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      const jobIndex = jobs.findIndex(j => j.id === job.id);
      
      if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
        await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));
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
  };

  return (
    <PDFGenerator 
      jobData={jobData}
      onPDFGenerated={handlePDFGenerated}
    />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}