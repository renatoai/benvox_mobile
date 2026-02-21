// Design System - Benvox Mobile
// Modern, minimalist, clean

export const colors = {
  // Primary - WhatsApp-inspired green
  primary: '#25D366',
  primaryDark: '#128C7E',
  primaryLight: '#DCF8C6',
  primarySoft: '#E8F8F0',
  
  // Neutrals
  background: '#FAFBFC',
  surface: '#FFFFFF',
  surfaceHover: '#F8F9FA',
  
  // Text
  textPrimary: '#1A1D21',
  textSecondary: '#5F6368',
  textTertiary: '#9AA0A6',
  textInverse: '#FFFFFF',
  
  // Borders
  border: '#E8EAED',
  borderLight: '#F1F3F4',
  divider: '#EEEEEE',
  
  // Status
  success: '#34A853',
  warning: '#FBBC04',
  error: '#EA4335',
  info: '#4285F4',
  
  // Semantic
  unread: '#25D366',
  online: '#34A853',
  offline: '#9AA0A6',
  
  // Agent/Assignment
  agentBg: '#F3E8FF',
  agentText: '#7C3AED',
  humanBg: '#E0F2FE',
  humanText: '#0369A1',
  
  // Shadows (for iOS)
  shadow: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const typography = {
  // Titles
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  
  // Body
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 20 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 18 },
  
  // Labels
  label: { fontSize: 13, fontWeight: '500' as const, lineHeight: 16 },
  labelSmall: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14 },
  
  // Special
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
};

export const shadows = {
  none: {},
  xs: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Common component styles
export const components = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  input: {
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  avatar: {
    small: { width: 36, height: 36, borderRadius: 18 },
    medium: { width: 48, height: 48, borderRadius: 24 },
    large: { width: 56, height: 56, borderRadius: 28 },
  },
  button: {
    primary: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    secondary: {
      backgroundColor: colors.surfaceHover,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
  },
};

export default {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  components,
};
