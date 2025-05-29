// screens/CloudTestHTTP.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabaseHTTP, getCurrentUser, canCreateJob } from '../services/SupabaseHTTPClient'
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TestResult {
  test: string;
  status: 'success' | 'error';
  message: string;
}

export default function CloudTestHTTP() {
  const [user, setUser] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const addTestResult = (test: string, status: 'success' | 'error', message: string) => {
    setTestResults(prev => [...prev, { test, status, message }]);
  };

  const runCloudTests = async () => {
    setTesting(true);
    setTestResults([]);

    // Test 1: Supabase Connection
    try {
      const connection = await supabaseHTTP.testConnection();
      if (connection.success) {
        addTestResult('Supabase Connection', 'success', 'Successfully connected to Supabase');
      } else {
        addTestResult('Supabase Connection', 'error', connection.error || 'Connection failed');
      }
    } catch (error) {
      addTestResult('Supabase Connection', 'error', `Connection error: ${error}`);
    }

    // Test 2: Authentication Status
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        addTestResult('Authentication', 'success', `Signed in as: ${currentUser.email}`);
      } else {
        addTestResult('Authentication', 'error', 'No user signed in');
      }
    } catch (error) {
      addTestResult('Authentication', 'error', `Auth check failed: ${error}`);
    }

    // Test 3: Local Storage Check
    try {
      const localJobs = await AsyncStorage.getItem('proofly_jobs');
      const jobCount = localJobs ? JSON.parse(localJobs).length : 0;
      addTestResult('Local Storage', 'success', `Found ${jobCount} local jobs`);
    } catch (error) {
      addTestResult('Local Storage', 'error', `Storage error: ${error}`);
    }

    setTesting(false);
  };

  const testSignUp = async () => {
    try {
      const testEmail = `test+${Date.now()}@proofly.com`;
      const testPassword = 'password123';
      
      const result = await supabaseHTTP.signUp(testEmail, testPassword, {
        full_name: 'Test User',
        company_name: 'Test Company'
      });

      if (result.error) {
        Alert.alert('Signup Error', result.error);
      } else {
        Alert.alert(
          'Success!', 
          `Test account created!\n\nEmail: ${testEmail}\nPassword: ${testPassword}\n\nCheck your email to verify the account.`
        );
      }
    } catch (error) {
      Alert.alert('Signup Error', `${error}`);
    }
  };

  const testSignIn = async () => {
    try {
      // Try to sign in with a test account
      const result = await supabaseHTTP.signIn('test@proofly.com', 'password123');

      if (result.error) {
        Alert.alert('Signin Error', result.error);
      } else {
        setUser(result.user);
        Alert.alert('Success!', 'Signed in successfully');
      }
    } catch (error) {
      Alert.alert('Signin Error', `${error}`);
    }
  };

  const testSignOut = async () => {
    try {
      await supabaseHTTP.signOut();
      setUser(null);
      Alert.alert('Success', 'Signed out successfully');
    } catch (error) {
      Alert.alert('Error', `${error}`);
    }
  };

  const testJobLimits = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    try {
      const limitCheck = await canCreateJob(user.id);
      
      Alert.alert(
        'Job Limit Check',
        limitCheck.allowed 
          ? 'You can create more jobs!' 
          : limitCheck.reason || 'Limit reached'
      );
    } catch (error) {
      Alert.alert('Error', `Limit check failed: ${error}`);
    }
  };

  const testCreateCloudJob = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    try {
      // Check limits first
      const limitCheck = await canCreateJob(user.id);
      if (!limitCheck.allowed) {
        Alert.alert('Limit Reached', limitCheck.reason);
        return;
      }

      // Create test job in cloud
      const testJob = {
        user_id: user.id,
        client_name: 'Cloud Test Client',
        client_phone: '555-999-0000',
        service_type: 'Cloud Test Service',
        address: '123 Cloud Street',
        status: 'created',
        created_at: new Date().toISOString(),
      };

      const result = await supabaseHTTP.insert('jobs', testJob);
      
      if (result.error) {
        Alert.alert('Error', `Failed to create cloud job: ${result.error}`);
      } else {
        Alert.alert('Success!', 'Test job created in cloud database');
      }
    } catch (error) {
      Alert.alert('Error', `Cloud job creation failed: ${error}`);
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
        <Text style={styles.title}>☁️ Proofly Cloud Test</Text>
        <Text style={styles.subtitle}>
          Testing HTTP-based Supabase integration
        </Text>
      </View>

      {/* User Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Status</Text>
        {user ? (
          <View>
            <Text style={styles.userInfo}>✅ Signed in as: {user.email}</Text>
            <TouchableOpacity style={styles.button} onPress={testSignOut}>
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.userInfo}>❌ Not signed in</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.button} onPress={testSignUp}>
                <Text style={styles.buttonText}>Test Signup</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={testSignIn}>
                <Text style={styles.buttonText}>Test Signin</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Test Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cloud Integration Tests</Text>
        
        <TouchableOpacity 
          style={[styles.primaryButton, testing && styles.buttonDisabled]} 
          onPress={runCloudTests}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>Run Cloud Tests</Text>
          )}
        </TouchableOpacity>

        {user && (
          <>
            <TouchableOpacity style={styles.button} onPress={testJobLimits}>
              <Text style={styles.buttonText}>Test Job Limits</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={testCreateCloudJob}>
              <Text style={styles.buttonText}>Create Cloud Job</Text>
            </TouchableOpacity>
          </>
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
          1. Update SupabaseHTTPClient.ts with your Supabase credentials{'\n'}
          2. Run "Cloud Tests" to check connection{'\n'}
          3. Use "Test Signup" to create an account{'\n'}
          4. Check your Supabase dashboard for data{'\n'}
          5. Test job limits and cloud job creation
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