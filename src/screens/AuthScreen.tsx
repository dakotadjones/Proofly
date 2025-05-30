import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../services/SupabaseHTTPClient';
import { Colors, Typography, Spacing, Sizes } from '../theme';
import { Input, Button, Wrapper } from '../components/ui';

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
      style={styles.Wrapper} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollWrapper}
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
        <Wrapper variant="elevated" style={styles.formWrapper}>
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
            autoComplete="email"
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
            autoComplete="password"
            editable={!loading}
            required
          />

          {/* Primary Action Button */}
          <Button
            variant="primary"
            onPress={isSignUp ? signUp : signIn}
            disabled={loading}
            loading={loading}
            style={styles.primaryButton}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Button>

          {/* Forgot Password */}
          {!isSignUp && (
            <Button 
              variant="ghost" 
              onPress={resetPassword}
              disabled={loading}
              style={styles.forgotButton}
              textStyle={styles.forgotButtonText}
            >
              Forgot Password?
            </Button>
          )}

          {/* Clear Form Button (for testing) */}
          {__DEV__ && (
            <Button 
              variant="outline" 
              onPress={clearForm}
              disabled={loading}
              style={styles.clearButton}
              size="small"
            >
              Clear Form (Dev)
            </Button>
          )}

          {/* Switch Mode */}
          <View style={styles.switchMode}>
            <Text style={styles.switchModeText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <Button 
              variant="ghost" 
              onPress={switchMode} 
              disabled={loading}
              size="small"
              style={styles.switchButton}
              textStyle={styles.switchButtonText}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Button>
          </View>
        </Wrapper>

        {/* Free Trial Info */}
        {isSignUp && (
          <Wrapper variant="flat" style={styles.trialWrapper}>
            <Text style={styles.trialTitle}>🎉 Start with 20 Free Jobs!</Text>
            <Text style={styles.trialText}>
              No credit Wrapper required. Full access to all features including cloud backup, 
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

        {/* Connection Status (for debugging) */}
        {__DEV__ && (
          <Wrapper variant="flat" style={styles.debugWrapper}>
            <Text style={styles.debugTitle}>Debug Info</Text>
            <Text style={styles.debugText}>
              Environment: {process.env.EXPO_PUBLIC_APP_ENV || 'unknown'}
            </Text>
            <Text style={styles.debugText}>
              Supabase URL: {process.env.EXPO_PUBLIC_SUPABASE_URL ? 'configured' : 'missing'}
            </Text>
          </Wrapper>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  Wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.screenPadding,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.display,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  formWrapper: {
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    marginTop: Spacing.md,
  },
  forgotButton: {
    marginTop: Spacing.md,
    alignSelf: 'center',
  },
  forgotButtonText: {
    color: Colors.primary,
  },
  clearButton: {
    marginTop: Spacing.sm,
    alignSelf: 'center',
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  switchModeText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  switchButton: {
    paddingHorizontal: 0,
  },
  switchButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  trialWrapper: {
    backgroundColor: Colors.secondaryLight,
    borderColor: Colors.secondary,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  trialTitle: {
    ...Typography.h4,
    color: Colors.secondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  trialText: {
    ...Typography.bodySmall,
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
    opacity: 0.8,
  },
  featureList: {
    alignItems: 'flex-start',
    width: '100%',
  },
  featureItem: {
    ...Typography.bodySmall,
    color: Colors.secondary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
    opacity: 0.9,
  },
  debugWrapper: {
    backgroundColor: Colors.warning + '15',
    borderColor: Colors.warning,
  },
  debugTitle: {
    ...Typography.label,
    color: Colors.warning,
    marginBottom: Spacing.sm,
  },
  debugText: {
    ...Typography.caption,
    color: Colors.warning,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: Spacing.xs,
  },
});