import { Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const scale = (size) => (SCREEN_WIDTH / BASE_WIDTH) * size;
export const verticalScale = (size) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
export const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

export const colors = {
  // 1. Base Very Off-White
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceDim: '#F1F3F5',
  surfaceBright: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F8F9FA',
  surfaceContainer: '#FFFFFF',
  surfaceContainerHigh: '#F1F3F5',
  surfaceContainerHighest: '#E9ECEF',

  // Frosted Glassmorphism for Light Base
  glassBg: 'rgba(255, 255, 255, 0.88)',
  glassBgActive: 'rgba(245, 158, 11, 0.12)',
  glassBorder: 'rgba(10, 25, 47, 0.08)',
  glassBorderBright: 'rgba(10, 25, 47, 0.16)',
  glassGlow: 'rgba(245, 158, 11, 0.18)',

  // 2. Navy Blue (Primary structure, headings, contrast)
  primary: '#0A192F',
  onPrimary: '#FFFFFF',
  onSurface: '#0A192F',
  onSurfaceVariant: '#475569',
  inverseSurface: '#0A192F',
  inverseOnSurface: '#F8F9FA',
  outline: '#CBD5E1',
  outlineVariant: '#E2E8F0',

  // 3. Amber Yellow (Accents, CTAs, Highlights)
  primaryContainer: '#F59E0B',
  onPrimaryContainer: '#0A192F',
  inversePrimary: '#D97706',
  surfaceTint: '#F59E0B',
  accentYellow: '#F59E0B',
  warning: '#F59E0B',

  // 4. Complimentary Accent (Ice Blue / Soft Slate for telemetry utility)
  accentBlue: '#38BDF8',
  accentBlueSubtle: 'rgba(56, 189, 248, 0.12)',

  // Secondary & Tertiary
  secondary: '#1E293B',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#F1F5F9',
  onSecondaryContainer: '#0A192F',
  tertiary: '#64748B',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#F1F5F9',
  onTertiaryContainer: '#334155',

  // Status Tones
  error: '#EF4444',
  onError: '#FFFFFF',
  errorContainer: '#FEE2E2',
  onErrorContainer: '#991B1B',
  success: '#10B981',
  white: '#ffffff',
  black: '#000000',
};

export const spacing = {
  unit: moderateScale(4),
  stackSm: moderateScale(8),
  stackMd: moderateScale(16),
  stackLg: moderateScale(32),
  gutter: moderateScale(16),
  marginMobile: moderateScale(20),
  marginDesktop: moderateScale(40),
  touchTargetMin: moderateScale(48),
};

export const borderRadius = {
  sm: moderateScale(6),
  DEFAULT: moderateScale(10),
  md: moderateScale(14),
  lg: moderateScale(18),
  xl: moderateScale(24),
  full: 9999,
};

export const typography = {
  displayLg: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(34),
    lineHeight: moderateScale(42),
    letterSpacing: -0.6,
  },
  headlineLg: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(26),
    lineHeight: moderateScale(32),
    letterSpacing: -0.4,
  },
  headlineLgMobile: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(22),
    lineHeight: moderateScale(28),
    letterSpacing: -0.3,
  },
  titleMd: {
    fontFamily: 'Inter_500Medium',
    fontSize: moderateScale(18),
    lineHeight: moderateScale(24),
    letterSpacing: -0.2,
  },
  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(17),
    lineHeight: moderateScale(26),
  },
  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(15),
    lineHeight: moderateScale(22),
  },
  labelTechnical: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: moderateScale(13),
    lineHeight: moderateScale(16),
    letterSpacing: 0.4,
  },
  labelSm: {
    fontFamily: 'Inter_500Medium',
    fontSize: moderateScale(12),
    lineHeight: moderateScale(15),
  },
};

export function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string') return `rgba(255, 255, 255, ${alpha})`;
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return `rgba(255, 255, 255, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const alertStyles = StyleSheet.create({
  // Inline Alert Banner Containers
  bannerBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm + 4,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.stackSm + 2,
    marginVertical: spacing.stackSm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bannerWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  bannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  bannerInfo: {
    backgroundColor: '#F0F9FF',
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },

  // Icon wrap inside alert
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  iconWrapWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  iconWrapSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  iconWrapInfo: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },

  // Content
  contentCol: {
    flex: 1,
  },
  titleText: {
    ...typography.titleMd,
    fontSize: moderateScale(13),
    fontWeight: '700',
    marginBottom: 2,
  },
  titleError: { color: '#991B1B' },
  titleWarning: { color: '#92400E' },
  titleSuccess: { color: '#065F46' },
  titleInfo: { color: '#075985' },

  messageText: {
    ...typography.bodyMd,
    fontSize: moderateScale(12),
    lineHeight: moderateScale(17),
  },
  messageError: { color: '#B91C1C' },
  messageWarning: { color: '#B45309' },
  messageSuccess: { color: '#047857' },
  messageInfo: { color: '#0369A1' },

  // Field validation error text
  fieldErrorText: {
    ...typography.bodyMd,
    color: '#DC2626',
    fontSize: moderateScale(11),
    marginTop: 4,
    marginLeft: 2,
    fontWeight: '500',
  },
  fieldErrorBorder: {
    borderColor: '#EF4444',
  },
});

