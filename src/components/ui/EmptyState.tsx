// src/components/ui/EmptyState.tsx
import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Spacing, Sizes } from '../../theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📋',
  title,
  description,
  actionText,
  onAction,
  style,
}) => {
  const containerStyle: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    ...style,
  };

  const iconStyle: TextStyle = {
    fontSize: Sizes.iconXL,
    marginBottom: Spacing.lg,
  };

  const titleStyle: TextStyle = {
    ...Typography.h3,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  };

  const descriptionStyle: TextStyle = {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 280,
  };

  return (
    <View style={containerStyle}>
      <Text style={iconStyle}>{icon}</Text>
      <Text style={titleStyle}>{title}</Text>
      {description && (
        <Text style={descriptionStyle}>{description}</Text>
      )}
      {actionText && onAction && (
        <Button 
          variant="primary" 
          onPress={onAction}
          style={{ marginTop: Spacing.md }}
        >
          {actionText}
        </Button>
      )}
    </View>
  );
};