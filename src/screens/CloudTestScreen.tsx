// screens/CloudTestScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase, getCurrentUser } from '../lib/supabase';
import { cloudSyncService } from '../services/CloudSyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
}

export default function CloudTestScreen() {
  const [user, setUser] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.log('No user signed in');
    }
  };

  const addTestResult = (test: string, status: 'success' | 'error', message: string) => {
    setTestResults(prev => [...prev, { test, status, message }]);
  };

  const runAllTests = async () => {
    setTesting(true);
    setTestResults([]);

    // Test 1: Database Connection
    try {
      const { data, error } = await supabase.from('profiles').select('count');
      if (error) throw error;
      addTestResult('Database Connection', 'success', 'Successfully connected to Supabase');
    } catch (error) {
      addTestResult('Database Connection', 'error', `Failed: ${error}`);
    }

    // Test 2: Authentication Check
    try {
      const user = await getCurrentUser();
      if (user) {
        addTestResult('Authentication', 'success', `Signed in as: ${user.email}`);
      } else {
        addTestResult('Authentication', 'error', 'No user signed in');
      }
    } catch (error) {
      addTestResult('Authentication', 'error', `Auth error: ${error}`);
    }

    // Test 3: Job Limit Check
    try {
      const limitCheck = await cloudSyncService.canCreateJob();
      if (limitCheck.allowed) {
        addTestResult('Job Limits', 'success', 'Can create jobs');
      } else {
        addTestResult('Job Limits', 'error', limitCheck.reason || 'Limit reached');
      }
    } catch (error) {
      addTestResult('Job Limits', 'error', `Limit check failed: ${error}`);
    }

    // Test 4: Local Storage Check
    try {
      const localJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobCount = localJobs ? JSON.parse(localJobs).length : 0;
      addTestResult('Local Storage', 'success', `Found ${jobCount} local jobs`);
    } catch (error) {
      addTestResult('Local Storage', 'error', `Storage error: ${error}`);
    }

    // Test 5: Cloud Sync Status
    try {
      const syncStatus = cloudSyncService.getSyncStatus();
      addTestResult('Sync Service', 'success', 
        `Last sync: ${syncStatus.lastSync || 'Never'}, In progress: ${syncStatus.inProgress}`);
    } catch (error) {
      addTestResult('Sync Service', 'error', `Sync error: ${error}`);
    }

    setTesting(false);
  };

  const testCreateDummyJob = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    try {
      // Check if user can create jobs
      const limitCheck = await cloudSyncService.canCreateJob();
      if (!limitCheck.allowed) {
        Alert.alert('Limit Reached', limitCheck.reason);
        return;
      }

      // Create a test job
      const testJob = {
        id: Date.now().toString(),
        clientName: 'Test Client',
        clientPhone: '555-123-4567',
        serviceType: 'Test Service',
        address: '123 Test Street',
        status: 'created' as const,
        createdAt: new Date().toISOString(),
        photos: [],
      };

      // Add to local storage
      const existingJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobs = existingJobs ? JSON.parse(existingJobs) : [];
      jobs.push(testJob);
      await AsyncStorage.setItem('proofly_jobs', JSON.stringify(jobs));

      // Try to sync to cloud
      const syncResult = await cloudSyncService.syncJob(testJob);
      
      if (syncResult.success) {
        Alert.alert('Success!', 'Test job created and synced to cloud');
      } else {
        Alert.alert('Partial Success', `Job created locally but sync failed: ${syncResult.error}`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to create test job: ${error}`);
    }
  };

  const testQuickSignup = async () => {
    try {
      const testEmail = `test+${Date.now()}@proofly.com`;
      const testPassword = 'password123';
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Test User',
            company_name: 'Test Company'
          }
        }
      });

      if (error) throw error;
      
      Alert.alert('Success!', `Test account created: ${testEmail}\nPassword: ${testPassword}\n\nCheck your email to verify the account.`);
    } catch (error) {
      Alert.alert('Signup Error', `${error}`);
    }
  };

  const testQuickSignin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@proofly.com',
        password: 'password123',
      });

      if (error) throw error;
      
      setUser(data.user);
      Alert.alert('Success!', 'Signed in successfully');
    } catch (error) {
      Alert.alert('Signin Error', `${error}`);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      Alert.alert('Success', 'Signed out');
    } catch (error) {
      Alert.alert('Error', `${error}`);
    }
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Proofly Cloud Test</Text>
        <Text style={styles.subtitle}>
          Quick integration test for Supabase authentication and cloud sync
        </Text>
      </View>

      {/* User Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Status</Text>
        {user ? (
          <View>
            <Text style={styles.userInfo}>✅ Signed in as: {user.email}</Text>
            <TouchableOpacity style={styles.button} onPress={signOut}>
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.userInfo}>❌ Not signed in</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.button} onPress={testQuickSignup}>
                <Text style={styles.buttonText}>Quick Signup</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={testQuickSignin}>
                <Text style={styles.buttonText}>Quick Signin</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Test Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integration Tests</Text>
        
        <TouchableOpacity 
          style={[styles.primaryButton, testing && styles.buttonDisabled]} 
          onPress={runAllTests}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>Run All Tests</Text>
          )}
        </TouchableOpacity>

        {user && (
          <TouchableOpacity style={styles.button} onPress={testCreateDummyJob}>
            <Text style={styles.buttonText}>Create Test Job</Text>
          </TouchableOpacity>
        )}
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
          1. Run "Run All Tests" to check basic connectivity{'\n'}
          2. Use "Quick Signup" to create a test account{'\n'}
          3. Try "Create Test Job" to test job limits and sync{'\n'}
          4. Check your Supabase dashboard to see the data
        </Text>
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
  userInfo: {
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
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