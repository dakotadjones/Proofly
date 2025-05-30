import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getCurrentUser, supabase } from '../services/SupabaseHTTPClient';
import { getTierDisplayName, getTierColor, getTierLimits } from '../utils/JobUtils';
import { mvpStorageService } from '../services/MVPStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Account & Settings</Text>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
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
      </View>

      {/* Subscription Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <View style={[styles.tierBadge, { backgroundColor: getTierColor(profile.subscription_tier) }]}>
              <Text style={styles.tierBadgeText}>{getTierDisplayName(profile.subscription_tier)}</Text>
            </View>
          </View>
          
          <Text style={styles.tierLimits}>{getTierLimits(profile.subscription_tier)}</Text>
          
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

          {profile.subscription_tier === 'free' && (
            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <Text style={styles.upgradeButtonText}>🚀 Upgrade Plan</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* MVP: Usage Limits & Rate Limiting */}
      {usageStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Limits & Rate Limits</Text>
          
          <View style={styles.limitCard}>
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
              <>
                <View style={styles.rateLimitSection}>
                  <Text style={styles.rateLimitTitle}>Rate Limits (Abuse Protection)</Text>
                  
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
              </>
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
              <TouchableOpacity style={styles.upgradeButtonSecondary} onPress={handleUpgrade}>
                <Text style={styles.upgradeButtonSecondaryText}>
                  ⬆️ Get Unlimited Photos - $19/month
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* App Info */}
      <View style={styles.section}>
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
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

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
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
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
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  subscriptionCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tierBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tierLimits: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  usageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 14,
    color: '#666',
  },
  usageValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  upgradeButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // MVP: Enhanced styles for rate limiting display
  limitCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  limitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  limitLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  limitValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  unlimitedText: {
    color: '#34C759',
  },
  limitedText: {
    color: '#FF9500',
  },
  rateLimitSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  rateLimitTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
  },
  rateLimitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rateLimitLabel: {
    fontSize: 14,
    color: '#666',
  },
  rateLimitValue: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  limitWarning: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  limitWarningText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
    marginBottom: 4,
  },
  limitWarningSubtext: {
    fontSize: 12,
    color: '#856404',
  },
  upgradeButtonSecondary: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonSecondaryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButton: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 10,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 4,
  },
});