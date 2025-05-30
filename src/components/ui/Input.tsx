// src/components/ui/Input.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Sizes, Spacing } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  variant?: 'default' | 'filled';
  required?: boolean;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  variant = 'default',
  required = false,
  containerStyle,
  labelStyle,
  inputStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const inputVariantStyle = variant === 'filled' 
    ? {
        backgroundColor: isFocused ? Colors.background : Colors.gray50,
        borderColor: isFocused ? Colors.primary : 'transparent',
      }
    : {
        backgroundColor: Colors.background,
        borderColor: error ? Colors.error : (isFocused ? Colors.primary : Colors.border),
      };

  const containerStyles: ViewStyle = {
    marginBottom: Spacing.md,
    ...containerStyle,
  };

  const labelStyles: TextStyle = {
    ...Typography.label,
    marginBottom: Spacing.sm,
    ...labelStyle,
  };

  const inputStyles: ViewStyle & TextStyle = {
    height: Sizes.inputHeight,
    paddingHorizontal: Spacing.inputPadding,
    borderWidth: 1,
    borderRadius: Sizes.radiusMedium,
    fontSize: Typography.input.fontSize,
    color: Colors.textPrimary,
    ...inputVariantStyle,
    ...inputStyle,
  };

  const errorTextStyle: TextStyle = {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  };

  return (
    <View style={containerStyles}>
      {label && (
        <Text style={labelStyles}>
          {label}{required && <Text style={{ color: Colors.error }}> *</Text>}
        </Text>
      )}
      <TextInput
        style={inputStyles}
        placeholderTextColor={Colors.gray500}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && <Text style={errorTextStyle}>{error}</Text>}
    </View>
  );
};