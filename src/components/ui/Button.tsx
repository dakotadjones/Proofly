// src/components/ui/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Sizes, getButtonStyle } from '../../theme';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  onPress,
  children,
  style,
  textStyle,
}) => {
  const buttonVariant = getButtonStyle(variant);
  
  const buttonHeight = {
    small: Sizes.buttonHeightSmall,
    medium: Sizes.buttonHeight,
    large: Sizes.buttonHeightLarge,
  }[size];

  const fontSize = {
    small: Typography.buttonSmall.fontSize,
    medium: Typography.button.fontSize,
    large: Typography.button.fontSize,
  }[size];

  const baseButtonStyle: ViewStyle = {
    height: buttonHeight,
    backgroundColor: buttonVariant.backgroundColor,
    borderWidth: 1,
    borderColor: buttonVariant.borderColor,
    borderRadius: Sizes.radiusMedium,
    paddingHorizontal: size === 'small' ? 16 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
  };

  const baseTextStyle: TextStyle = {
    fontSize,
    fontWeight: Typography.button.fontWeight,
    color: buttonVariant.color,
    textAlign: 'center',
  };

  return (
    <TouchableOpacity
      style={[baseButtonStyle, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={buttonVariant.color}
          style={{ marginRight: 8 }}
        />
      )}
      <Text style={[baseTextStyle, textStyle]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};