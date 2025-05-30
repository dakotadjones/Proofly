import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { getCurrentUser, supabase } from '../services/SupabaseHTTPClient';
import { getTierDisplayName, getTierColor, getTierLimits } from '../utils/JobUtils';
import { mvpStorageService } from '../services/MVPStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Sizes } from '../theme';
import { Wrapper, Button, Badge, LoadingSpinner } from '../components/ui';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  subscription_tier: 'free' | 'starter' | 'professional' | 'business';
  jobs_count: number;
  created_at: string;
  storage_used_bytes?: number;
  last_photo_upload?: string;
}

interface UsageStats {
  tier: string;
  photosPerJobLimit: number | undefined;
  upgradeNeeded: boolean;
  dailyUploads?: number;
  dailyLimit?: number;
}

interface ProfileScreenProps {
  onSignOut: () => void;
}

export default function ProfileScreen({ onSignOut }: ProfileScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [localJobCount, setLocalJobCount] = useState(0);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<any>(null);

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

      // MVP: Get usage stats
      const stats = await mvpStorageService.getUsageStats(user.id);
      setUsageStats(stats);

      // Get rate limit status for debugging/display
      const rateLimits = mvpStorageService.getRateLimitStatus(user.id, stats.tier);
      setRateLimitStatus(rateLimits);

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
    Alert.alert(
      '🚀 Upgrade to Starter Plan',
      'Unlock unlimited photos and grow your business!\n\n✅ Unlimited photos per job\n✅ 200 total jobs\n✅ 2GB cloud storage\n✅ PDF reports with your photos\n✅ Client signatures\n✅ 10 photos per minute (vs 5)\n✅ 1000 photos per day (vs 200)\n\nPerfect for growing service businesses.',
      [
        { text: 'Maybe Later', style: 'cancel' },
        { 
          text: 'Learn More', 
          onPress: () => {
            Alert.alert(
              'Coming Soon!', 
              'Stripe integration is being finalized. Contact support@proofly.com for early access to paid plans.\n\nEarly users get 50% off first 3 months!'
            );
          }
        }
      ]
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.Wrapper}>
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
      <View style={styles.Wrapper}>
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

  return (
    <ScrollView style={styles.Wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Account & Settings</Text>
      </View>

      {/* Profile Info */}
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

        {profile.phone && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profile.phone}</Text>
          </View>
        )}

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>
            {new Date(profile.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Last Photo Upload</Text>
          <Text style={styles.infoValue}>
            {formatDate(profile.last_photo_upload)}
          </Text>
        </View>
      </Wrapper>

      {/* Subscription Info */}
      <Wrapper variant="default" style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        
        <View style={styles.subscriptionWrapper}>
          <View style={styles.subscriptionHeader}>
            <Badge 
              variant={profile.subscription_tier === 'free' ? 'warning' : 'success'}
              style={styles.tierBadge}
            >
              {getTierDisplayName(profile.subscription_tier)}
            </Badge>
          </View>
          
          <Text style={styles.tierLimits}>{getTierLimits(profile.subscription_tier)}</Text>
          
          <View style={styles.usageGrid}>
            <View style={styles.usageInfo}>
              <Text style={styles.usageLabel}>Jobs Created:</Text>
              <Text style={styles.usageValue}>
                {profile.jobs_count} {profile.subscription_tier === 'free' ? '/ 20' : ''}
              </Text>
            </View>

            <View style={styles.usageInfo}>
              <Text style={styles.usageLabel}>Local Jobs:</Text>
              <Text style={styles.usageValue}>{localJobCount}</Text>
            </View>

            <View style={styles.usageInfo}>
              <Text style={styles.usageLabel}>Storage Used:</Text>
              <Text style={styles.usageValue}>
                {formatBytes(profile.storage_used_bytes || 0)}
              </Text>
            </View>
          </View>

          {profile.subscription_tier === 'free' && (
            <Button 
              variant="success" 
              onPress={handleUpgrade} 
              style={styles.upgradeButton}
            >
              🚀 Upgrade Plan
            </Button>
          )}
        </View>
      </Wrapper>

      {/* MVP: Usage Limits & Rate Limiting */}
      {usageStats && (
        <Wrapper variant="default" style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Limits & Rate Limits</Text>
          
          <View style={styles.limitWrapper}>
            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Photos Per Job:</Text>
              <Text style={[
                styles.limitValue, 
                usageStats.photosPerJobLimit === undefined ? styles.unlimitedText : styles.limitedText
              ]}>
                {usageStats.photosPerJobLimit === undefined ? 'Unlimited ✨' : `${usageStats.photosPerJobLimit} max`}
              </Text>
            </View>

            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Daily Photos:</Text>
              <Text style={styles.limitValue}>
                {usageStats.dailyUploads || 0} / {usageStats.dailyLimit === undefined ? '∞' : usageStats.dailyLimit}
              </Text>
            </View>

            {rateLimitStatus && (
              <View style={styles.rateLimitSection}>
                <Text style={styles.rateLimitTitle}>Rate Limits (Abuse Protection)</Text>
                
                <View style={styles.rateLimitGrid}>
                  <View style={styles.rateLimitItem}>
                    <Text style={styles.rateLimitLabel}>Per Minute:</Text>
                    <Text style={styles.rateLimitValue}>
                      {rateLimitStatus.minute.used} / {rateLimitStatus.minute.limit || '∞'}
                    </Text>
                  </View>
                  
                  <View style={styles.rateLimitItem}>
                    <Text style={styles.rateLimitLabel}>Per Hour:</Text>
                    <Text style={styles.rateLimitValue}>
                      {rateLimitStatus.hour.used} / {rateLimitStatus.hour.limit || '∞'}
                    </Text>
                  </View>
                  
                  <View style={styles.rateLimitItem}>
                    <Text style={styles.rateLimitLabel}>Per Day:</Text>
                    <Text style={styles.rateLimitValue}>
                      {rateLimitStatus.day.used} / {rateLimitStatus.day.limit || '∞'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {usageStats.tier === 'free' && (
              <View style={styles.limitWarning}>
                <Text style={styles.limitWarningText}>
                  📸 Free plan limits: 25 photos/job, 5/min, 200/day
                </Text>
                <Text style={styles.limitWarningSubtext}>
                  Upgrade for unlimited photos and higher rate limits
                </Text>
              </View>
            )}

            {usageStats.upgradeNeeded && (
              <Button 
                variant="primary" 
                onPress={handleUpgrade}
                style={styles.upgradeButtonSecondary}
              >
                ⬆️ Get Unlimited Photos - $19/month
              </Button>
            )}
          </View>
        </Wrapper>
      )}

      {/* App Info */}
      <Wrapper variant="default" style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📞 Support</Text>
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

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Proofly - Professional Service Documentation
        </Text>
        <Text style={styles.footerSubtext}>
          Protected by advanced rate limiting and abuse prevention
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  Wrapper: {
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
  subscriptionWrapper: {
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
    borderRadius: Sizes.radiusMedium,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tierBadge: {
    // Badge component handles styling
  },
  tierLimits: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  usageGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  usageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  usageValue: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  upgradeButton: {
    marginTop: Spacing.md,
  },
  // MVP: Enhanced styles for rate limiting display
  limitWrapper: {
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
    borderRadius: Sizes.radiusMedium,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  limitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  limitLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  limitValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  unlimitedText: {
    color: Colors.success,
  },
  limitedText: {
    color: Colors.warning,
  },
  rateLimitSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  rateLimitTitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  rateLimitGrid: {
    gap: Spacing.sm,
  },
  rateLimitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateLimitLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  rateLimitValue: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
  },
  limitWarning: {
    backgroundColor: Colors.warning + '15',
    padding: Spacing.md,
    borderRadius: Sizes.radiusSmall,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  limitWarningText: {
    ...Typography.bodySmall,
    color: Colors.warning,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  limitWarningSubtext: {
    ...Typography.caption,
    color: Colors.warning,
  },
  upgradeButtonSecondary: {
    // Button component handles styling
  },
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
  footerSubtext: {
    ...Typography.caption,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});