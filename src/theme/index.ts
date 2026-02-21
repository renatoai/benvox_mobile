// Benvox Mobile Theme - Based on Pantone 2026 Color Palette
// Matching the desktop frontend design system

export const colors = {
  // === Primary - Ice Melt (Pantone 13-4305) ===
  primary: '#36abd5',
  primaryLight: '#58c0e1',
  primaryDark: '#2690b9',
  primarySoft: '#e0f2f8',
  
  // === Secondary - Orchid Tint (Pantone 13-3802) ===
  secondary: '#b8a4be',
  secondaryLight: '#d4c4d9',
  secondaryDark: '#9d8aa3',
  
  // === Accent - Almost Aqua (Pantone 15-5000) ===
  accent: '#6fbfb8',
  accentLight: '#8ad9d3',
  accentDark: '#4aa39c',
  
  // === Success / WhatsApp Green ===
  success: '#25d366',
  successLight: '#dcfce7',
  successDark: '#16a34a',
  
  // === Warning - Lemon Icing ===
  warning: '#f5edd4',
  warningAccent: '#f59e0b',
  warningDark: '#d97706',
  
  // === Error / Danger ===
  error: '#ef4444',
  errorLight: '#fef2f2',
  errorDark: '#dc2626',
  
  // === Surface - Cloud Dancer ===
  surface: '#ffffff',
  surfaceSecondary: '#f9fafb',  // neutral-50
  surfaceTertiary: '#f0ede5',   // Cloud Dancer
  
  // === Background ===
  background: '#f9fafb',        // neutral-50
  backgroundDark: '#f3f4f6',    // neutral-100
  
  // === Muted - Nimbus Cloud ===
  muted: '#c5cdd4',
  mutedLight: '#e5e7eb',        // neutral-200
  
  // === Borders ===
  border: '#e5e7eb',            // neutral-200
  borderLight: '#f3f4f6',       // neutral-100
  borderDark: '#d1d5db',        // neutral-300
  
  // === Text ===
  textPrimary: '#111827',       // neutral-900
  textSecondary: '#6b7280',     // neutral-500
  textTertiary: '#9ca3af',      // neutral-400
  textInverse: '#ffffff',
  
  // === Warm - Peach Dust ===
  warm: '#e5cfc3',
  warmLight: '#f5eeea',
  
  // === Soft - Raindrops on Roses ===
  soft: '#e8ddd8',
  softLight: '#f3efed',
  
  // === Channel Colors ===
  whatsapp: '#25d366',
  telegram: '#0088cc',
  instagram: '#E4405F',
  facebook: '#1877F2',
  email: '#6b7280',
  
  // === Status Colors ===
  online: '#22c55e',
  offline: '#9ca3af',
  busy: '#f59e0b',
  away: '#eab308',
  
  // === Priority Colors ===
  priorityLow: '#9ca3af',
  priorityNormal: '#3b82f6',
  priorityHigh: '#f97316',
  priorityUrgent: '#ef4444',
  
  // === Unread Badge ===
  unreadBadge: '#25d366',
  unreadText: '#ffffff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  // Headers
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  
  // Body
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
  bodySemibold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  
  // Small
  small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  smallMedium: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  
  // Caption
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  captionMedium: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  
  // Label
  label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18, letterSpacing: 0.3 },
  
  // Inbox specific
  contactName: { fontSize: 16, lineHeight: 22 },
  messagePreview: { fontSize: 13, lineHeight: 18 },
  timestamp: { fontSize: 12, lineHeight: 16 },
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
};

// Inbox specific styles
export const inbox = {
  // Conversation item
  itemPadding: { paddingHorizontal: 12, paddingVertical: 12 },
  itemRadius: 16,
  itemMargin: { marginHorizontal: 8, marginVertical: 2 },
  
  // Avatar
  avatarSize: 50,
  avatarRadius: 25,
  channelBadgeSize: 20,
  
  // Selected state
  selectedBg: 'rgba(229, 231, 235, 0.5)', // neutral-200/50
  hoverBg: 'rgba(249, 250, 251, 1)',       // neutral-50
  
  // Channel header
  headerBg: '#f9fafb',
  headerHeight: 36,
};

export default {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  inbox,
};
