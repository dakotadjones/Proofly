// src/components/ui/Card.tsx
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { CardStyles } from '../../theme';

interface CardProps {
  variant?: 'default' | 'elevated' | 'flat';
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  style,
}) => {
  const cardStyle = CardStyles[variant];

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
};