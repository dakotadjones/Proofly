import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import * as Lucide from 'lucide-react';
import { Colors, Typography, Sizes, Spacing, getJobStatusStyle } from '../../theme';

interface JobStatusBadgeProps {
  status: 'pending' | 'inProgress' | 'completed' | 'signed' | 'cancelled';
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
  const statusStyle = getJobStatusStyle(status);
  
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

  const textStyle: TextStyle = {
    fontSize,
    fontWeight: Typography.badge.fontWeight,
    color: statusStyle.color,
    textTransform: Typography.badge.textTransform,
    letterSpacing: Typography.badge.letterSpacing,
    marginLeft: showIcon ? Spacing.xs : 0,
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'inProgress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'signed': return 'Signed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'Clock';
      case 'inProgress': return 'PlayCircle';
      case 'completed': return 'CheckCircle';
      case 'signed': return 'Edit3';
      case 'cancelled': return 'XCircle';
      default: return 'Circle';
    }
  };

  const IconComponent = Lucide[getStatusIcon(status) as keyof typeof Lucide] as any;

  return (
    <View style={containerStyle}>
      {showIcon && IconComponent && (
        <IconComponent 
          size={iconSize} 
          color={statusStyle.color}
        />
      )}
      <Text style={textStyle}>
        {getStatusText(status)}
      </Text>
    </View>
  );
};
