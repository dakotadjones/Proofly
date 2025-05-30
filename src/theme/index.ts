// src/theme/index.ts
// Complete Design System for Proofly - Service Business Focused

export const Colors = {
  // Primary Brand (Professional Blue - builds trust)
  primary: '#2563EB',      // Professional blue for CTAs, links
  primaryDark: '#1D4ED8',  // Darker blue for pressed states
  primaryLight: '#DBEAFE', // Light blue for backgrounds, highlights
  
  // Secondary (Success Green - completion, positive actions)
  secondary: '#10B981',    // Success green for completed jobs
  secondaryDark: '#059669', // Darker green for pressed states
  secondaryLight: '#D1FAE5', // Light green backgrounds
  
  // Status Colors (Clear job status communication)
  pending: '#F59E0B',      // Orange - needs attention
  inProgress: '#3B82F6',   // Blue - actively working
  completed: '#10B981',    // Green - finished work
  signed: '#8B5CF6',       // Purple - signed/approved/remote pending
  cancelled: '#EF4444',    // Red - cancelled/failed
  
  // Semantic Colors
  success: '#10B981',      // Green for success messages
  warning: '#F59E0B',      // Orange for warnings
  error: '#EF4444',        // Red for errors
  info: '#3B82F6',         // Blue for info messages
  
  // Neutral Grays (Professional, clean)
  gray900: '#111827',      // Dark text, headers
  gray800: '#1F2937',      // Secondary dark text
  gray700: '#374151',      // Medium dark text
  gray600: '#4B5563',      // Muted text, captions
  gray500: '#6B7280',      // Placeholder text
  gray400: '#9CA3AF',      // Disabled text
  gray300: '#D1D5DB',      // Borders, dividers
  gray200: '#E5E7EB',      // Light borders
  gray100: '#F3F4F6',      // Light backgrounds
  gray50: '#F9FAFB',       // Very light backgrounds
  
  // Surface Colors
  background: '#FFFFFF',    // Main app background
  surface: '#FFFFFF',       // Card backgrounds
  overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays
  
  // Text Colors (Hierarchy)
  textPrimary: '#111827',   // Main content
  textSecondary: '#4B5563', // Secondary content
  textMuted: '#6B7280',     // Captions, metadata
  textInverse: '#FFFFFF',   // Text on dark backgrounds
  
  // Border Colors
  border: '#E5E7EB',        // Default borders
  borderLight: '#F3F4F6',   // Light borders
  borderDark: '#D1D5DB',    // Emphasized borders
};

export const Typography = {
  // Display (Screen titles, important headers)
  display: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
    color: Colors.gray900,
  },
  
  // Headlines (Section headers, card titles)
  h1: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    lineHeight: 36,
    color: Colors.gray900,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    lineHeight: 32,
    color: Colors.gray900,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    color: Colors.gray900,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: Colors.gray800,
  },
  
  // Body Text (Main content)
  bodyLarge: {
    fontSize: 18,
    fontWeight: 'normal' as const,
    lineHeight: 28,
    color: Colors.gray800,
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 24,
    color: Colors.gray800,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 20,
    color: Colors.gray700,
  },
  
  // UI Elements
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    color: Colors.gray700,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    lineHeight: 16,
    color: Colors.gray600,
  },
  
  // Specialized
  tabBar: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 20,
    color: Colors.gray900,
  },
};

export const Spacing = {
  // Base spacing scale (multiples of 4)
  xs: 4,    // 4px - tiny gaps between related elements
  sm: 8,    // 8px - small gaps, icon spacing
  md: 16,   // 16px - default spacing between elements
  lg: 24,   // 24px - section spacing, large gaps
  xl: 32,   // 32px - screen sections, major spacing
  xxl: 48,  // 48px - major sections, screen padding
  
  // Component-specific spacing
  inputPadding: 16,     // Internal padding for inputs
  buttonPadding: 16,    // Internal padding for buttons
  cardPadding: 20,      // Internal padding for cards/Wrappers
  screenPadding: 20,    // Screen edge padding
  listItemPadding: 16,  // List item internal padding
  
  // Layout spacing
  headerHeight: 60,     // Navigation header height
  tabBarHeight: 80,     // Bottom tab bar height
  statusBarOffset: 44,  // iOS status bar offset
};

export const Sizes = {
  // Interactive Elements (following iOS guidelines)
  buttonHeight: 48,         // Standard button height
  buttonHeightSmall: 36,    // Small button height
  buttonHeightLarge: 56,    // Large button height
  inputHeight: 48,          // Text input height
  minTouchTarget: 44,       // Minimum touch target (iOS)
  
  // Icons
  iconTiny: 12,      // Tiny icons in badges
  iconSmall: 16,     // Small icons in UI
  iconMedium: 24,    // Standard icons
  iconLarge: 32,     // Large icons, navigation
  iconXL: 48,        // Extra large icons, empty states
  
  // Border Radius (Service business = clean but not too rounded)
  radiusNone: 0,
  radiusSmall: 6,    // Small elements, badges
  radiusMedium: 8,   // Buttons, inputs, cards
  radiusLarge: 12,   // Large cards, modals
  radiusXL: 16,      // Very large elements
  radiusFull: 9999,  // Circular elements
};

// Job Status Styling (Updated to match your actual job statuses)
export const JobStatusStyles = {
  created: {
    backgroundColor: Colors.warning + '15',
    borderColor: Colors.warning + '30',
    color: Colors.warning,
    icon: 'clock',
  },
  in_progress: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary + '30',
    color: Colors.primary,
    icon: 'play-circle',
  },
  pending_remote_signature: {
    backgroundColor: Colors.signed + '15',
    borderColor: Colors.signed + '30',
    color: Colors.signed,
    icon: 'clock',
  },
  completed: {
    backgroundColor: Colors.success + '15',
    borderColor: Colors.success + '30',
    color: Colors.success,
    icon: 'check-circle',
  },
  cancelled: {
    backgroundColor: Colors.error + '15',
    borderColor: Colors.error + '30',
    color: Colors.error,
    icon: 'x-circle',
  },
};

// Button Variants (Professional service business styling)
export const ButtonStyles = {
  primary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    color: Colors.textInverse,
    pressedBackgroundColor: Colors.primaryDark,
  },
  secondary: {
    backgroundColor: Colors.background,
    borderColor: Colors.primary,
    color: Colors.primary,
    pressedBackgroundColor: Colors.primaryLight,
  },
  success: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
    color: Colors.textInverse,
    pressedBackgroundColor: Colors.secondaryDark,
  },
  danger: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
    color: Colors.textInverse,
    pressedBackgroundColor: '#DC2626',
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
    color: Colors.textPrimary,
    pressedBackgroundColor: Colors.gray100,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    color: Colors.primary,
    pressedBackgroundColor: Colors.primaryLight,
  },
};

// Input Styles (Clean, professional)
export const InputStyles = {
  default: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    placeholderColor: Colors.gray500,
    focusedBorderColor: Colors.primary,
    errorBorderColor: Colors.error,
  },
  filled: {
    backgroundColor: Colors.gray50,
    borderColor: 'transparent',
    color: Colors.textPrimary,
    placeholderColor: Colors.gray500,
    focusedBorderColor: Colors.primary,
    focusedBackgroundColor: Colors.background,
  },
};

// Card Styles (Removed - handled directly in Card component to avoid style conflicts)

// Helper Functions
export const getJobStatusStyle = (status: string) => {
  return JobStatusStyles[status as keyof typeof JobStatusStyles] || JobStatusStyles.created;
};

export const getButtonStyle = (variant: string) => {
  return ButtonStyles[variant as keyof typeof ButtonStyles] || ButtonStyles.primary;
};

export const hexToRGB = (hex: string, alpha: number = 1): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Theme object for easy consumption
export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  sizes: Sizes,
  jobStatus: JobStatusStyles,
  button: ButtonStyles,
  input: InputStyles,
  helpers: {
    getJobStatusStyle,
    getButtonStyle,
    hexToRGB,
  },
};

export default Theme;