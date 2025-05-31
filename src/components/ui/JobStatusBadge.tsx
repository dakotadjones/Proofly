import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Sizes, Spacing } from '../../theme';

// Match your actual job status types
type JobStatus = 'created' | 'in_progress' | 'pending_remote_signature' | 'completed';

interface JobStatusBadgeProps {
  status: JobStatus;
  showIcon?: boolean;
  size?: 'small' | 'medium';
  style?: ViewStyle;
  onDarkBackground?: boolean; // New prop for header usage
}

export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({
  status,
  showIcon = false, // Changed default to false - cleaner look
  size = 'medium',
  style,
  onDarkBackground = false, // New prop
}) => {
  const getStatusStyle = (status: JobStatus, onDarkBackground: boolean = false) => {
    if (onDarkBackground) {
      // High contrast styles for dark/colored backgrounds (like blue header)
      switch (status) {
        case 'created':
          return {
            backgroundColor: '#FFA500', // Solid orange background
            borderColor: '#FFA500',
            color: '#FFFFFF',          // White text for max contrast
            icon: '○',
          };
        case 'in_progress':
          return {
            backgroundColor: '#4A90E2', // Lighter blue background
            borderColor: '#4A90E2',
            color: '#FFFFFF',          // White text
            icon: '▶',
          };
        case 'pending_remote_signature':
          return {
            backgroundColor: '#FF6B35', // Vibrant orange background
            borderColor: '#FF6B35',
            color: '#FFFFFF',          // White text for maximum readability
            icon: '⏳',
          };
        case 'completed':
          return {
            backgroundColor: '#28A745', // Solid green background
            borderColor: '#28A745',
            color: '#FFFFFF',          // White text
            icon: '✓',
          };
        default:
          return {
            backgroundColor: '#6C757D', // Solid gray
            borderColor: '#6C757D',
            color: '#FFFFFF',
            icon: '○',
          };
      }
    }

    // Original light background styles
    switch (status) {
      case 'created':
        return {
          backgroundColor: Colors.warning + '15',
          borderColor: Colors.warning + '30',
          color: Colors.warning,
          icon: '○',
        };
      case 'in_progress':
        return {
          backgroundColor: Colors.primary + '15',
          borderColor: Colors.primary + '30',
          color: Colors.primary,
          icon: '▶',
        };
      case 'pending_remote_signature':
        return {
          backgroundColor: '#FF8C00' + '15',
          borderColor: '#FF8C00' + '40',
          color: '#CC6600',
          icon: '⏳',
        };
      case 'completed':
        return {
          backgroundColor: Colors.success + '15',
          borderColor: Colors.success + '30',
          color: Colors.success,
          icon: '✓',
        };
      default:
        return {
          backgroundColor: Colors.gray200,
          borderColor: Colors.gray300,
          color: Colors.gray600,
          icon: '○',
        };
    }
  };

  const getStatusText = (status: JobStatus): string => {
    switch (status) {
      case 'created':
        return 'Created';
      case 'in_progress':
        return 'In Progress';
      case 'pending_remote_signature':
        return 'Awaiting Approval'; // Clean text, no emoji
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const statusStyle = getStatusStyle(status, onDarkBackground);
  const badgeHeight = size === 'small' ? 24 : 32;
  const iconSize = size === 'small' ? 12 : 16;
  const fontSize = size === 'small' ? 10 : Typography.badge.fontSize;

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    height: badgeHeight,
    paddingHorizontal: Spacing.sm,
    backgroundColor: statusStyle.backgroundColor,
    borderWidth: 1,
    borderColor: statusStyle.borderColor,
    borderRadius: Sizes.radiusSmall,
    alignSelf: 'flex-start',
    ...style,
  };

  const iconStyle: TextStyle = {
    fontSize: iconSize,
    color: statusStyle.color,
    marginRight: showIcon ? Spacing.xs : 0,
    fontWeight: 'bold',
  };

  const textStyle: TextStyle = {
    fontSize,
    fontWeight: Typography.badge.fontWeight,
    color: statusStyle.color,
    textTransform: Typography.badge.textTransform,
    letterSpacing: Typography.badge.letterSpacing,
  };

  return (
    <View style={containerStyle}>
      {showIcon && (
        <Text style={iconStyle}>
          {statusStyle.icon}
        </Text>
      )}
      <Text style={textStyle}>
        {getStatusText(status)}
      </Text>
    </View>
  );
};