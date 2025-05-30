// screens/AuthScreen.tsx
// Updated to use the new SupabaseHTTPClient instead of official SDK

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../services/SupabaseHTTPClient';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
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

  const signIn = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const { user, error } = await supabase.signIn(
        formData.email.trim(),
        formData.password
      );

      if (error) {
        Alert.alert('Sign In Error', error);
      } else if (user) {
        console.log('Sign in successful:', user.email);
        onAuthSuccess();
      } else {
        Alert.alert('Sign In Error', 'Sign in failed - no user returned');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'An unexpected error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const { user, error } = await supabase.signUp(
        formData.email.trim(),
        formData.password,
        {
          full_name: formData.fullName.trim(),
          company_name: formData.companyName.trim() || null,
          phone: formData.phone.trim() || null,
        }
      );

      if (error) {
        Alert.alert('Sign Up Error', error);
      } else if (user) {
        Alert.alert(
          'Success!', 
          'Account created! Please check your email to verify your account before signing in.',
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
      } else {
        Alert.alert('Sign Up Error', 'Account creation failed - please try again');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Error', 'An unexpected error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    // Basic email validation
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

  const clearForm = () => {
    setFormData({
      email: '',
      password: '',
      fullName: '',
      companyName: '',
      phone: ''
    });
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    // Clear password when switching modes for security
    setFormData(prev => ({ ...prev, password: '' }));
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp 
              ? 'Start documenting your service jobs professionally' 
              : 'Sign in to your Proofly account'
            }
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {isSignUp && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  value={formData.fullName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Company Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your company name (optional)"
                  value={formData.companyName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, companyName: text }))}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              editable={!loading}
            />
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={isSignUp ? signUp : signIn}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Forgot Password */}
          {!isSignUp && (
            <TouchableOpacity 
              style={styles.forgotPassword} 
              onPress={resetPassword}
              disabled={loading}
            >
              <Text style={[styles.forgotPasswordText, loading && styles.disabledText]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          )}

          {/* Clear Form Button (for testing) */}
          {__DEV__ && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={clearForm}
              disabled={loading}
            >
              <Text style={styles.clearButtonText}>Clear Form (Dev)</Text>
            </TouchableOpacity>
          )}

          {/* Switch Mode */}
          <View style={styles.switchMode}>
            <Text style={styles.switchModeText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={switchMode} disabled={loading}>
              <Text style={[styles.switchModeLink, loading && styles.disabledText]}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Free Trial Info */}
        {isSignUp && (
          <View style={styles.trialInfo}>
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
          </View>
        )}

        {/* Connection Status (for debugging) */}
        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              Environment: {process.env.EXPO_PUBLIC_APP_ENV || 'unknown'}
            </Text>
            <Text style={styles.debugText}>
              Supabase URL: {process.env.EXPO_PUBLIC_SUPABASE_URL ? 'configured' : 'missing'}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
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
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  clearButton: {
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
  },
  clearButtonText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '500',
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  switchModeText: {
    color: '#666',
    fontSize: 16,
    marginRight: 4,
  },
  switchModeLink: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: '#ccc',
  },
  trialInfo: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  trialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5a2d',
    marginBottom: 8,
    textAlign: 'center',
  },
  trialText: {
    fontSize: 14,
    color: '#2d5a2d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  featureList: {
    alignItems: 'flex-start',
    width: '100%',
  },
  featureItem: {
    fontSize: 14,
    color: '#2d5a2d',
    marginBottom: 4,
    fontWeight: '500',
  },
  debugInfo: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#856404',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});