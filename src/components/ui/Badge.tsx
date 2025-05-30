// src/components/ui/Badge.tsx
import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Sizes, Spacing } from '../../theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gray';
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  size = 'medium',
  style,
}) => {
  const getVariantStyle = (variant: string) => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: Colors.primary + '15', color: Colors.primary };
      case 'secondary':
        return { backgroundColor: Colors.secondary + '15', color: Colors.secondary };
      case 'success':
        return { backgroundColor: Colors.success + '15', color: Colors.success };
      case 'warning':
        return { backgroundColor: Colors.warning + '15', color: Colors.warning };
      case 'error':
        return { backgroundColor: Colors.error + '15', color: Colors.error };
      default:
        return { backgroundColor: Colors.gray200, color: Colors.gray700 };
    }
  };

  const variantStyle = getVariantStyle(variant);
  const badgeHeight = size === 'small' ? 20 : 24;
  const fontSize = size === 'small' ? 10 : Typography.badge.fontSize;

  const containerStyle: ViewStyle = {
    height: badgeHeight,
    paddingHorizontal: Spacing.sm,
    backgroundColor: variantStyle.backgroundColor,
    borderRadius: Sizes.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    ...style,
  };

  const textStyle: TextStyle = {
    fontSize,
    fontWeight: Typography.badge.fontWeight,
    color: variantStyle.color,
    textTransform: Typography.badge.textTransform,
    letterSpacing: Typography.badge.letterSpacing,
  };

  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{children}</Text>
    </View>
  );
};