// src/components/ui/KeyboardAvoidingWrapper.tsx
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ViewStyle,
  KeyboardAvoidingViewProps,
} from 'react-native';
import { Colors } from '../../theme';

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  scrollEnabled?: boolean;
  keyboardVerticalOffset?: number;
  behavior?: KeyboardAvoidingViewProps['behavior'];
  showsVerticalScrollIndicator?: boolean;
}

export const KeyboardAvoidingWrapper: React.FC<KeyboardAvoidingWrapperProps> = ({
  children,
  style,
  contentContainerStyle,
  scrollEnabled = true,
  keyboardVerticalOffset,
  behavior,
  showsVerticalScrollIndicator = false,
}) => {
  // Smart defaults based on platform and use case
  const defaultBehavior = behavior || (Platform.OS === 'ios' ? 'padding' : 'height');
  
  // Dynamic offset calculation
  const getKeyboardOffset = () => {
    if (keyboardVerticalOffset !== undefined) {
      return keyboardVerticalOffset;
    }
    
    // Smart defaults - adjust based on your header heights
    if (Platform.OS === 'ios') {
      return 90; // Accounts for status bar + navigation header
    }
    return 0;
  };

  const defaultStyle: ViewStyle = {
    flex: 1,
    backgroundColor: Colors.background,
  };

  const defaultContentStyle: ViewStyle = {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, // Extra bottom padding on iOS
  };

  if (!scrollEnabled) {
    // Non-scrollable version for simple forms
    return (
      <KeyboardAvoidingView
        style={[defaultStyle, style]}
        behavior={defaultBehavior}
        keyboardVerticalOffset={getKeyboardOffset()}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }

  // Scrollable version for longer content
  return (
    <KeyboardAvoidingView
      style={[defaultStyle, style]}
      behavior={defaultBehavior}
      keyboardVerticalOffset={getKeyboardOffset()}
    >
      <ScrollView
        contentContainerStyle={[defaultContentStyle, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        bounces={Platform.OS === 'ios'}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};