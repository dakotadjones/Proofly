// src/components/UpgradePrompt.tsx
// Small, strategic upgrade prompts that appear when users hit limits

import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Colors, Typography, Spacing, Sizes } from '../theme';
import { Wrapper, Button } from './ui';
import { stripeService } from '../services/StripeService';

interface UpgradePromptProps {
  reason: 'job_limit' | 'photo_limit' | 'pdf_branding' | 'client_portal';
  onUpgrade: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  reason,
  onUpgrade,
  onDismiss,
  compact = false
}) => {
  const getPromptContent = () => {
    switch (reason) {
      case 'job_limit':
        return {
          icon: '📈',
          title: 'Job Limit Reached',
          message: 'You\'ve hit your 20 job limit! Time to go Pro.',
          buttonText: 'Upgrade for $19/mo',
          benefit: 'Get unlimited jobs forever'
        };
      
      case 'photo_limit':
        return {
          icon: '📸',
          title: 'Photo Limit Reached',
          message: '25 photos max per job on free plan.',
          buttonText: 'Upgrade for Unlimited',
          benefit: 'Unlimited photos per job'
        };
      
      case 'pdf_branding':
        return {
          icon: '🏆',
          title: 'Professional PDFs',
          message: 'Impress clients with branded reports.',
          buttonText: 'Upgrade for $19/mo',
          benefit: 'Your logo + professional templates'
        };
      
      case 'client_portal':
        return {
          icon: '🌟',
          title: 'Client Portal',
          message: 'Give clients their own portal to view jobs.',
          buttonText: 'Upgrade for Portal',
          benefit: 'Increase referrals & satisfaction'
        };
      
      default:
        return {
          icon: '⬆️',
          title: 'Upgrade to Pro',
          message: 'Unlock all features for your business.',
          buttonText: 'Upgrade Now',
          benefit: 'More jobs, better presentation'
        };
    }
  };

  const content = getPromptContent();

  const handleLearnMore = () => {
    const upgradePrompt = stripeService.getUpgradePrompt(
      reason === 'job_limit' ? 'job_limit_reached' :
      reason === 'photo_limit' ? 'photo_limit_reached' :
      reason === 'pdf_branding' ? 'pdf_generation' : 'default'
    );

    Alert.alert(
      upgradePrompt.title,
      upgradePrompt.message + '\n\n' + upgradePrompt.benefits.join('\n• '),
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Upgrade Now', onPress: onUpgrade }
      ]
    );
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactContent}>
          <Text style={styles.compactIcon}>{content.icon}</Text>
          <View style={styles.compactText}>
            <Text style={styles.compactTitle}>{content.title}</Text>
            <Text style={styles.compactMessage}>{content.message}</Text>
          </View>
        </View>
        <Button 
          variant="primary" 
          size="small" 
          onPress={onUpgrade}
          style={styles.compactButton}
        >
          Upgrade
        </Button>
      </View>
    );
  }

  return (
    <Wrapper variant="elevated" style={styles.container}>
      {onDismiss && (
        <Button 
          variant="ghost" 
          size="small"
          onPress={onDismiss}
          style={styles.dismissButton}
          textStyle={styles.dismissButtonText}
        >
          ✕
        </Button>
      )}
      
      <View style={styles.header}>
        <Text style={styles.icon}>{content.icon}</Text>
        <Text style={styles.title}>{content.title}</Text>
      </View>
      
      <Text style={styles.message}>{content.message}</Text>
      <Text style={styles.benefit}>✓ {content.benefit}</Text>
      
      <View style={styles.actions}>
        <Button 
          variant="success" 
          onPress={onUpgrade}
          style={styles.upgradeButton}
        >
          {content.buttonText}
        </Button>
        
        <Button 
          variant="outline" 
          size="small"
          onPress={handleLearnMore}
          style={styles.learnMoreButton}
        >
          Learn More
        </Button>
      </View>
      
      <Text style={styles.guarantee}>30-day money-back guarantee</Text>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary + '40',
    borderWidth: 2,
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  dismissButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  icon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h4,
    color: Colors.primary,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  benefit: {
    ...Typography.bodySmall,
    color: Colors.success,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
  },
  actions: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  upgradeButton: {
    // Button component handles styling
  },
  learnMoreButton: {
    alignSelf: 'center',
  },
  guarantee: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Compact version styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Sizes.radiusSmall,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  compactText: {
    flex: 1,
  },
  compactTitle: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  compactMessage: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  compactButton: {
    minWidth: 80,
  },
});

export default UpgradePrompt;