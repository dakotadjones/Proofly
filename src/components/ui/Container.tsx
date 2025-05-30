import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Colors, Spacing, Sizes } from '../../theme';

interface WrapperProps {
  variant?: 'default' | 'elevated' | 'flat';
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Wrapper: React.FC<WrapperProps> = ({
  variant = 'default',
  children,
  style,
}) => {
  const baseStyle: ViewStyle = {
    backgroundColor: Colors.surface,
    borderRadius: Sizes.radiusMedium,
    padding: Spacing.cardPadding, // Now this should work
  };

  let variantStyle: ViewStyle = {};

  switch (variant) {
    case 'elevated':
      variantStyle = {
        shadowColor: Colors.gray900,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      };
      break;
    case 'flat':
      variantStyle = {
        borderColor: Colors.border,
        borderWidth: 1,
      };
      break;
    case 'default':
    default:
      variantStyle = {
        borderColor: Colors.border,
        borderWidth: 1,
        shadowColor: Colors.gray900,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      };
      break;
  }

  return (
    <View style={[baseStyle, variantStyle, style]}>
      {children}
    </View>
  );
};