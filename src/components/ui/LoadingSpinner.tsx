// src/components/ui/LoadingSpinner.tsx
import React from 'react';
import { View, ActivityIndicator, Text, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = Colors.primary,
  text,
  style,
}) => {
  const containerStyle: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    ...style,
  };

  const textStyle: TextStyle = {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  };

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={textStyle}>{text}</Text>}
    </View>
  );
};
