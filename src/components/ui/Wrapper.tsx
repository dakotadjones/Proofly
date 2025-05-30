import React from 'react';
import { View } from 'react-native';
import { Colors, Spacing, Sizes } from '../../theme';

export function Wrapper(props: {
  variant?: 'default' | 'elevated' | 'flat';
  children: React.ReactNode;
  style?: object;
}) {
  const { variant = 'default', children, style } = props;

  const baseStyles = {
    backgroundColor: Colors.surface,
    borderRadius: Sizes.radiusMedium,
    padding: Spacing.cardPadding,
  };

  let variantStyles = {};

  if (variant === 'elevated') {
    variantStyles = {
      shadowColor: Colors.gray900,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 0,
    };
  } else if (variant === 'flat') {
    variantStyles = {
      borderColor: Colors.border,
      borderWidth: 1,
      shadowOpacity: 0,
      elevation: 0,
    };
  } else {
    // default variant
    variantStyles = {
      borderColor: Colors.border,
      borderWidth: 1,
      shadowColor: Colors.gray900,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    };
  }

  const combinedStyles = {
    ...baseStyles,
    ...variantStyles,
    ...style,
  };

  return <View style={combinedStyles}>{children}</View>;
}