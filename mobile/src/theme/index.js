import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const scale = (size) => (SCREEN_WIDTH / BASE_WIDTH) * size;
export const verticalScale = (size) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
export const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

export const colors = {
  background: '#121317',
  surface: '#121317',
  surfaceDim: '#121317',
  surfaceBright: '#38393d',
  surfaceContainerLowest: '#0d0e12',
  surfaceContainerLow: '#1a1b1f',
  surfaceContainer: '#1e1f23',
  surfaceContainerHigh: '#292a2e',
  surfaceContainerHighest: '#343539',
  onSurface: '#e3e2e7',
  onSurfaceVariant: '#d0c6ab',
  inverseSurface: '#e3e2e7',
  inverseOnSurface: '#2f3034',
  outline: '#999077',
  outlineVariant: '#4d4632',
  surfaceTint: '#e9c400',
  primary: '#fff5dc',
  onPrimary: '#3a3000',
  primaryContainer: '#ffd600',
  onPrimaryContainer: '#705d00',
  inversePrimary: '#705d00',
  secondary: '#c8c6c8',
  onSecondary: '#303032',
  secondaryContainer: '#474649',
  onSecondaryContainer: '#b7b4b7',
  tertiary: '#f7f5f7',
  onTertiary: '#303032',
  tertiaryContainer: '#dbd8db',
  onTertiaryContainer: '#5f5e60',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
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
  sm: moderateScale(2),
  DEFAULT: moderateScale(4),
  md: moderateScale(6),
  lg: moderateScale(8),
  xl: moderateScale(12),
  full: 9999,
};

export const typography = {
  displayLg: {
    fontFamily: 'HankenGrotesk_800ExtraBold',
    fontSize: moderateScale(40),
    lineHeight: moderateScale(48),
    letterSpacing: -0.8,
  },
  headlineLg: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: moderateScale(28),
    lineHeight: moderateScale(34),
  },
  headlineLgMobile: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: moderateScale(24),
    lineHeight: moderateScale(30),
  },
  titleMd: {
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontSize: moderateScale(20),
    lineHeight: moderateScale(26),
  },
  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(18),
    lineHeight: moderateScale(28),
  },
  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: moderateScale(16),
    lineHeight: moderateScale(24),
  },
  labelTechnical: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: moderateScale(14),
    lineHeight: moderateScale(16),
    letterSpacing: 0.7,
  },
  labelSm: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: moderateScale(12),
    lineHeight: moderateScale(14),
  },
};
