import React from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

interface CardProps {
  variant?: 'default' | 'elevated' | 'flat';
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ variant = 'default', children, style }) => {
  const getCardStyle = (): ViewStyle => {
    const base: ViewStyle = {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: 20,
    };

    if (variant === 'elevated') {
      return {
        ...base,
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      };
    }

    if (variant === 'flat') {
      return {
        ...base,
        borderColor: '#E5E7EB',
        borderWidth: 1,
      };
    }

    // default
    return {
      ...base,
      borderColor: '#E5E7EB',
      borderWidth: 1,
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    };
  };

  const cardStyle = getCardStyle();
  const combinedStyle: ViewStyle = style ? { ...cardStyle, ...style } : cardStyle;

  return <View style={combinedStyle}>{children}</View>;
};