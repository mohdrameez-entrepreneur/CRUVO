import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../../assets/Motorcycle-Bike-Riding-Group-In-India_1.webp')} 
        style={styles.heroSection}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
          locations={[0, 0.4, 0.7, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.heroOverlay, { paddingTop: insets.top }]}>
          <Text style={styles.heroTitle}>CRUVO</Text>
          <Text style={styles.heroSubtitle}>Group Motorcycle Touring</Text>
        </View>
      </ImageBackground>

      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, spacing.stackLg) }]}>
        <View style={styles.handle} />

        <View style={styles.stepIndicator}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.headline}>Ride together.{'\n'}Stay connected.</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Signup')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>
            ALREADY HAVE AN ACCOUNT? <Text style={styles.linkBold}>LOG IN</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.privacyLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.stackLg,
  },
  heroOverlay: {
    marginBottom: spacing.stackLg,
    zIndex: 1,
  },
  heroTitle: {
    ...typography.displayLg,
    color: colors.primaryContainer,
    textTransform: 'uppercase',
    letterSpacing: -1.6,
  },
  heroSubtitle: {
    ...typography.bodyLg,
    color: colors.onSurfaceVariant,
    marginTop: spacing.stackSm,
  },
  bottomSheet: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackMd,
    paddingBottom: spacing.stackLg,
  },
  handle: {
    width: moderateScale(40),
    height: moderateScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: spacing.stackMd,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: moderateScale(8),
    marginBottom: spacing.stackMd,
  },
  dot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: colors.outlineVariant,
  },
  dotActive: {
    backgroundColor: colors.primaryContainer,
    width: moderateScale(24),
  },
  headline: {
    ...typography.headlineLgMobile,
    color: colors.onSurface,
    marginBottom: spacing.stackLg,
  },
  primaryButton: {
    backgroundColor: colors.primaryContainer,
    height: spacing.touchTargetMin,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.stackMd,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 4,
  },
  primaryButtonText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
    textTransform: 'uppercase',
  },
  linkText: {
    ...typography.labelTechnical,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.stackMd,
  },
  linkBold: {
    color: colors.primaryContainer,
  },
  skipText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
  },
  privacyLinkText: {
    ...typography.bodyMd,
    color: colors.outline,
    fontSize: moderateScale(13),
    textDecorationLine: 'underline',
  },
  footerDot: {
    color: colors.outlineVariant,
    fontSize: moderateScale(14),
  },
});
