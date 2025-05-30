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
}

export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'medium',
  style,
}) => {
  const getStatusStyle = (status: JobStatus) => {
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
          backgroundColor: Colors.signed + '15',
          borderColor: Colors.signed + '30',
          color: Colors.signed,
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
        return 'Awaiting Approval';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const statusStyle = getStatusStyle(status);
  const badgeHeight = size === 'small' ? 24 : 32;
  const iconSize = size === 'small' ? 12 : 16;
  const fontSize = size === 'small' ? 10 : Typography.badge.fontSize;

  const WrapperStyle: ViewStyle = {
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
    <View style={WrapperStyle}>
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