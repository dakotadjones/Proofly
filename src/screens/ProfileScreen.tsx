import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { getCurrentUser, supabase } from '../services/SupabaseHTTPClient';
import { getTierDisplayName, getTierColor, getTierLimits } from '../utils/JobUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Sizes } from '../theme';
import { Wrapper, Button, Badge, LoadingSpinner, KeyboardAvoidingWrapper } from '../components/ui';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  subscription_tier: 'free' | 'starter' | 'professional' | 'business';
  jobs_count: number;
  created_at: string;
}

interface ProfileScreenProps {
  onSignOut: () => void;
}

export default function ProfileScreen({ onSignOut }: ProfileScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [localJobCount, setLocalJobCount] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('No user found');
      }

      // Get user profile from database
      const profileResult = await supabase.select('profiles', '*', { id: user.id });
      
      if (profileResult.error) {
        throw new Error(profileResult.error);
      }

      const userProfile = profileResult.data?.[0];
      if (userProfile) {
        setProfile(userProfile);
      } else {
        // Fallback to user data if profile doesn't exist
        setProfile({
          id: user.id,
          email: user.email,
          subscription_tier: 'free',
          jobs_count: 0,
          created_at: new Date().toISOString(),
        });
      }

      // Get local job count
      const localJobs = await AsyncStorage.getItem('proofly_jobs');
      if (localJobs) {
        const jobs = JSON.parse(localJobs);
        setLocalJobCount(jobs.length);
      }

    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.signOut();
              onSignOut();
            } catch (error) {
              console.error('Sign out error:', error);
              // Still call onSignOut even if API call fails
              onSignOut();
            }
          },
        },
      ]
    );
  };

  const handleUpgrade = () => {
    const jobsUsed = Math.max(profile?.jobs_count || 0, localJobCount);
    const isNearLimit = jobsUsed >= 15; // 75% of free limit
    
    Alert.alert(
      isNearLimit ? '🔥 Almost at Your Limit!' : '🚀 Upgrade to Pro',
      isNearLimit 
        ? `You've used ${jobsUsed}/20 free jobs. Upgrade now before you hit the limit!\n\n✅ Unlimited jobs forever\n✅ Professional branded PDFs\n✅ Client review portal\n✅ Priority support\n\nJust $19/month - less than one small job!`
        : `Unlock unlimited potential for your business!\n\n✅ Unlimited jobs (vs 20)\n✅ Professional PDF branding\n✅ Client review portal\n✅ Advanced features\n✅ Priority support\n\nJust $19/month - pays for itself with one job!`,
      [
        { text: 'Maybe Later', style: 'cancel' },
        { 
          text: isNearLimit ? 'Upgrade Now!' : 'Learn More', 
          onPress: () => {
            Alert.alert(
              'Coming Soon!', 
              'Stripe integration is being finalized. Contact support@proofly.com for early access to Pro!\n\n🎉 Early users get 50% off first 3 months!'
            );
          }
        }
      ]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Account & Settings</Text>
        </View>
        <LoadingSpinner text="Loading profile..." style={styles.loadingWrapper} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Account & Settings</Text>
        </View>
        <View style={styles.errorWrapper}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <Button variant="primary" onPress={loadProfile} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  const jobsUsed = Math.max(profile.jobs_count, localJobCount);
  const isFreeTier = profile.subscription_tier === 'free';
  const isNearLimit = jobsUsed >= 15; // 75% of 20
  const isAtLimit = jobsUsed >= 20;

  return (
    <KeyboardAvoidingWrapper>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Account & Settings</Text>
      </View>

      {/* Account Info */}
      <Wrapper variant="default" style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profile.email}</Text>
        </View>

        {profile.full_name && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{profile.full_name}</Text>
          </View>
        )}

        {profile.company_name && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>{profile.company_name}</Text>
          </View>
        )}

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>
            {new Date(profile.created_at).toLocaleDateString()}
          </Text>
        </View>
      </Wrapper>

      {/* Plan & Usage - The Money Maker Section */}
      <Wrapper variant="elevated" style={[styles.section, styles.planSection]}>
        <View style={styles.planHeader}>
          <Text style={styles.sectionTitle}>Your Plan</Text>
          <Badge 
            variant={isFreeTier ? 'warning' : 'success'}
            style={styles.tierBadge}
          >
            {getTierDisplayName(profile.subscription_tier)}
          </Badge>
        </View>
        
        {/* Simple, Clean Usage Display */}
        <View style={styles.usageDisplay}>
          <View style={styles.usageMain}>
            <Text style={styles.usageNumber}>{jobsUsed}</Text>
            <Text style={styles.usageLabel}>
              {isFreeTier ? `of 20 jobs used` : 'jobs created'}
            </Text>
          </View>
          
          {isFreeTier && (
            <View style={styles.usageBar}>
              <View style={styles.usageBarBackground}>
                <View 
                  style={[
                    styles.usageBarFill, 
                    { 
                      width: `${Math.min((jobsUsed / 20) * 100, 100)}%`,
                      backgroundColor: isAtLimit ? Colors.error : 
                                     isNearLimit ? Colors.warning : Colors.primary
                    }
                  ]} 
                />
              </View>
              <Text style={[
                styles.usageBarText,
                { color: isAtLimit ? Colors.error : 
                         isNearLimit ? Colors.warning : Colors.textSecondary }
              ]}>
                {20 - jobsUsed} jobs remaining
              </Text>
            </View>
          )}
        </View>

        {/* Upgrade CTA */}
        {isFreeTier && (
          <View style={styles.upgradeSection}>
            {isAtLimit ? (
              <View style={styles.limitReached}>
                <Text style={styles.limitReachedTitle}>🚨 Limit Reached!</Text>
                <Text style={styles.limitReachedText}>
                  Upgrade to Pro to continue creating jobs
                </Text>
              </View>
            ) : isNearLimit ? (
              <View style={styles.nearLimit}>
                <Text style={styles.nearLimitTitle}>⚠️ Almost Full!</Text>
                <Text style={styles.nearLimitText}>
                  Only {20 - jobsUsed} jobs left. Upgrade before you run out!
                </Text>
              </View>
            ) : (
              <View style={styles.upgradePrompt}>
                <Text style={styles.upgradePromptTitle}>💼 Growing Your Business?</Text>
                <Text style={styles.upgradePromptText}>
                  Upgrade to Pro for unlimited jobs and professional features
                </Text>
              </View>
            )}
            
            <Button 
              variant={isAtLimit ? "primary" : isNearLimit ? "primary" : "success"}
              onPress={handleUpgrade}
              style={styles.upgradeButton}
            >
              {isAtLimit ? '🔓 Upgrade Now - $19/mo' : 
               isNearLimit ? '⬆️ Upgrade Before Limit' : 
               '🚀 Upgrade to Pro'}
            </Button>
          </View>
        )}

        {/* Pro User Success Message */}
        {!isFreeTier && (
          <View style={styles.proUserSection}>
            <Text style={styles.proUserTitle}>🎉 You're a Pro!</Text>
            <Text style={styles.proUserText}>
              Enjoy unlimited jobs and all premium features
            </Text>
          </View>
        )}
      </Wrapper>

      {/* Quick Actions */}
      <Wrapper variant="default" style={styles.section}>
        <Text style={styles.sectionTitle}>Support & Legal</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📞 Contact Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📄 Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📋 Terms of Service</Text>
        </TouchableOpacity>
      </Wrapper>

      {/* Sign Out */}
      <Wrapper variant="default" style={styles.section}>
        <Button 
          variant="danger" 
          onPress={handleSignOut}
          style={styles.signOutButton}
        >
          Sign Out
        </Button>
      </Wrapper>

      {/* Simple Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Proofly - Professional Service Documentation
        </Text>
        <Text style={styles.footerVersion}>Version 1.0.0</Text>
      </View>
    </KeyboardAvoidingWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  errorWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 120,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.statusBarOffset + Spacing.md,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.screenPadding,
  },
  headerTitle: {
    ...Typography.display,
    color: Colors.textInverse,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textInverse,
    opacity: 0.8,
    marginTop: Spacing.xs,
  },
  section: {
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  
  // Plan Section - The Money Maker
  planSection: {
    backgroundColor: Colors.gray50,
    borderWidth: 2,
    borderColor: Colors.primary + '20',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  tierBadge: {
    // Badge component handles styling
  },
  usageDisplay: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  usageMain: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  usageNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
    lineHeight: 56,
  },
  usageLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  usageBar: {
    width: '100%',
    alignItems: 'center',
  },
  usageBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    marginBottom: Spacing.sm,
  },
  usageBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  usageBarText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  
  // Upgrade CTAs
  upgradeSection: {
    alignItems: 'center',
  },
  limitReached: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  limitReachedTitle: {
    ...Typography.h4,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  limitReachedText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  nearLimit: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  nearLimitTitle: {
    ...Typography.h4,
    color: Colors.warning,
    marginBottom: Spacing.sm,
  },
  nearLimitText: {
    ...Typography.body,
    color: Colors.warning,
    textAlign: 'center',
  },
  upgradePrompt: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  upgradePromptTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  upgradePromptText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  upgradeButton: {
    minWidth: 200,
  },
  proUserSection: {
    alignItems: 'center',
  },
  proUserTitle: {
    ...Typography.h4,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  proUserText: {
    ...Typography.body,
    color: Colors.success,
    textAlign: 'center',
  },
  
  // Simple sections
  actionButton: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  actionButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
  },
  signOutButton: {
    // Button component handles styling
  },
  footer: {
    alignItems: 'center',
    padding: Spacing.screenPadding,
    marginBottom: Spacing.lg,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  footerVersion: {
    ...Typography.caption,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});