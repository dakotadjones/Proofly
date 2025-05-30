// screens/SimpleTestScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TestResult {
  test: string;
  status: 'success' | 'error';
  message: string;
}

export default function SimpleTestScreen() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const addTestResult = (test: string, status: 'success' | 'error', message: string) => {
    setTestResults(prev => [...prev, { test, status, message }]);
  };

  const runBasicTests = async () => {
    setTesting(true);
    setTestResults([]);

    // Test 1: Local Storage Access
    try {
      const testData = { test: 'data', timestamp: new Date().toISOString() };
      await AsyncStorage.setItem('proofly_test', JSON.stringify(testData));
      
      const retrieved = await AsyncStorage.getItem('proofly_test');
      if (retrieved) {
        const parsed = JSON.parse(retrieved);
        addTestResult('Local Storage', 'success', 'Can read/write data successfully');
      } else {
        addTestResult('Local Storage', 'error', 'Failed to retrieve test data');
      }
    } catch (error) {
      addTestResult('Local Storage', 'error', `Storage error: ${error}`);
    }

    // Test 2: Existing Jobs Check
    try {
      const existingJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobCount = existingJobs ? JSON.parse(existingJobs).length : 0;
      addTestResult('Existing Jobs', 'success', `Found ${jobCount} existing jobs in local storage`);
    } catch (error) {
      addTestResult('Existing Jobs', 'error', `Error reading jobs: ${error}`);
    }

    // Test 3: Job Creation Simulation
    try {
      const newJob = {
        id: Date.now().toString(),
        clientName: 'Test Client',
        clientPhone: '555-123-4567',
        serviceType: 'Test Service',
        address: '123 Test Street',
        status: 'created' as const,
        createdAt: new Date().toISOString(),
        photos: [],
      };

      // Read existing jobs
      const existingJobsData = await AsyncStorage.getItem('proofly_jobs');
      const existingJobs = existingJobsData ? JSON.parse(existingJobsData) : [];
      
      // Add new job
      existingJobs.push(newJob);
      
      // Save back
      await AsyncStorage.setItem('proofly_jobs', JSON.stringify(existingJobs));
      
      addTestResult('Job Creation', 'success', 'Successfully created and saved test job');
    } catch (error) {
      addTestResult('Job Creation', 'error', `Job creation failed: ${error}`);
    }

    // Test 4: Image Manipulator (if available)
    try {
      // Just check if the expo-image-manipulator module can be imported
      const ImageManipulator = require('expo-image-manipulator');
      addTestResult('Image Processing', 'success', 'Image manipulator available for photo compression');
    } catch (error) {
      addTestResult('Image Processing', 'error', 'Image manipulator not available');
    }

    // Test 5: File System Access
    try {
      const FileSystem = require('expo-file-system');
      const testFile = FileSystem.documentDirectory + 'test.txt';
      await FileSystem.writeAsStringAsync(testFile, 'test data');
      const content = await FileSystem.readAsStringAsync(testFile);
      
      if (content === 'test data') {
        addTestResult('File System', 'success', 'Can read/write files successfully');
      } else {
        addTestResult('File System', 'error', 'File content mismatch');
      }
    } catch (error) {
      addTestResult('File System', 'error', `File system error: ${error}`);
    }

    setTesting(false);
  };

  const testCreateMultipleJobs = async () => {
    try {
      const existingJobsData = await AsyncStorage.getItem('proofly_jobs');
      const existingJobs = existingJobsData ? JSON.parse(existingJobsData) : [];
      
      // Create 5 test jobs
      for (let i = 1; i <= 5; i++) {
        const newJob = {
          id: `test-${Date.now()}-${i}`,
          clientName: `Test Client ${i}`,
          clientPhone: `555-123-456${i}`,
          serviceType: `Test Service ${i}`,
          address: `${i}23 Test Street`,
          status: 'created' as const,
          createdAt: new Date().toISOString(),
          photos: [],
        };
        existingJobs.push(newJob);
      }
      
      await AsyncStorage.setItem('proofly_jobs', JSON.stringify(existingJobs));
      
      Alert.alert('Success!', `Created 5 test jobs. Total jobs: ${existingJobs.length}`);
    } catch (error) {
      Alert.alert('Error', `Failed to create test jobs: ${error}`);
    }
  };

  const clearTestData = async () => {
    Alert.alert(
      'Clear Test Data',
      'This will remove all test data but keep your real jobs. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('proofly_test');
              
              // Remove only test jobs (keep real ones)
              const existingJobsData = await AsyncStorage.getItem('proofly_jobs');
              if (existingJobsData) {
                const existingJobs = JSON.parse(existingJobsData);
                const realJobs = existingJobs.filter((job: any) => !job.id.startsWith('test-'));
                await AsyncStorage.setItem('proofly_jobs', JSON.stringify(realJobs));
              }
              
              Alert.alert('Success', 'Test data cleared');
            } catch (error) {
              Alert.alert('Error', `Failed to clear test data: ${error}`);
            }
          }
        }
      ]
    );
  };

  const renderTestResult = (result: TestResult) => (
    <View key={result.test} style={[
      styles.testResult,
      result.status === 'success' ? styles.testSuccess : styles.testError
    ]}>
      <Text style={styles.testName}>
        {result.status === 'success' ? '✅' : '❌'} {result.test}
      </Text>
      <Text style={styles.testMessage}>{result.message}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.Wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Proofly Basic Test</Text>
        <Text style={styles.subtitle}>
          Testing local functionality without cloud integration
        </Text>
      </View>

      {/* Test Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Integration Tests</Text>
        
        <TouchableOpacity 
          style={[styles.primaryButton, testing && styles.buttonDisabled]} 
          onPress={runBasicTests}
          disabled={testing}
        >
          <Text style={styles.primaryButtonText}>
            {testing ? 'Testing...' : 'Run Basic Tests'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testCreateMultipleJobs}>
          <Text style={styles.buttonText}>Create 5 Test Jobs</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={clearTestData}>
          <Text style={styles.clearButtonText}>Clear Test Data</Text>
        </TouchableOpacity>
      </View>

      {/* Test Results */}
      {testResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {testResults.map(renderTestResult)}
        </View>
      )}

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Testing Instructions</Text>
        <Text style={styles.instruction}>
          1. Run "Basic Tests" to check core functionality{'\n'}
          2. Create test jobs to verify job creation works{'\n'}
          3. Check your existing app to see if test jobs appear{'\n'}
          4. Clear test data when done{'\n'}
          {'\n'}
          This tests the foundation before adding cloud features.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  Wrapper: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  clearButton: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testResult: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  testSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  testError: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  testName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  testMessage: {
    fontSize: 14,
    color: '#666',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});