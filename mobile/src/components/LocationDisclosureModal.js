import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';

const { width, height } = Dimensions.get('window');

/**
 * Google Play Prominent Disclosure & Consent Modal for Background Location Access.
 * Complies strictly with Google Play Location Policy:
 * 1. Appears before the system runtime permission prompt.
 * 2. Explicitly specifies that data is collected "even when the app is closed or not in use".
 * 3. Ties collection directly to visible core features (Active Squad Ride Tracking & Safety).
 * 4. Requires explicit affirmative user action ("Agree & Enable" vs "No Thanks").
 */
export default function LocationDisclosureModal({
  visible = false,
  onAgree,
  onDeny,
  isLoading = false,
}) {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 45,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDeny}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onDeny}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: opacityAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalCard,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Scrollable Body Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Icon Halo */}
            <View style={styles.iconHalo}>
              <Ionicons name="navigate" size={26} color={colors.primaryContainer} />
            </View>

            {/* Technical Badge */}
            <View style={styles.badgeWrap}>
              <Ionicons name="shield-checkmark" size={12} color={colors.primaryContainer} />
              <Text style={styles.badgeText}>PLAY POLICY DISCLOSURE</Text>
            </View>

            {/* Title */}
            <Text style={styles.titleText}>Background Location Access</Text>

            {/* Prominent Disclosure Box (Google Play Mandated Language) */}
            <View style={styles.disclosureBox}>
              <Ionicons
                name="information-circle"
                size={20}
                color={colors.primaryContainer}
                style={styles.disclosureIcon}
              />
              <Text style={styles.disclosureText}>
                <Text style={styles.boldText}>CRUVO</Text> collects location data to enable{' '}
                <Text style={styles.boldText}>real-time group-ride tracking</Text>,{' '}
                <Text style={styles.boldText}>squad live map synchronization</Text>, and{' '}
                <Text style={styles.boldText}>hazard stop alerts</Text>{' '}
                <Text style={styles.highlightText}>
                  even when the app is closed or not in use
                </Text>{' '}
                during an active group ride.
              </Text>
            </View>

            {/* Bulleted Explanation of Features */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name="map-outline" size={16} color={colors.primaryContainer} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>Uninterrupted Squad Tracking</Text>
                  <Text style={styles.featureDesc}>
                    Keeps your position visible to your squad if you minimize the app to check navigation, receive calls, or lock your phone.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name="warning-outline" size={16} color={colors.primaryContainer} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>Safety & Stop Flagging</Text>
                  <Text style={styles.featureDesc}>
                    Enables lead and sweep riders to track group cohesion and alerts participants when anyone flags fuel, rest, or road hazards.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color={colors.primaryContainer} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureTitle}>Active Rides Only • Zero Ads</Text>
                  <Text style={styles.featureDesc}>
                    Location tracking automatically stops when the ride is completed. Your location data is never sold or used for advertising.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Fixed Footer Buttons - Always Visible */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.denyButton}
              onPress={onDeny}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Text style={styles.denyButtonText}>NO THANKS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.agreeButton}
              onPress={onAgree}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={colors.onPrimaryContainer} />
                  <Text style={styles.agreeButtonText}>AGREE & ENABLE</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.marginMobile,
    paddingVertical: spacing.stackMd,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
  },
  modalCard: {
    width: Math.min(width - 32, 420),
    maxHeight: Math.min(height * 0.85, 620),
    backgroundColor: '#16181d',
    borderRadius: borderRadius.xl + 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 214, 0, 0.35)',
    paddingHorizontal: spacing.stackMd + 4,
    paddingTop: spacing.stackMd + 4,
    paddingBottom: spacing.stackSm + 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.75,
    shadowRadius: 28,
    elevation: 24,
    overflow: 'hidden',
  },
  scrollArea: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: spacing.stackSm,
  },
  iconHalo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 214, 0, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 214, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.stackSm + 2,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.25)',
    marginBottom: spacing.stackSm,
  },
  badgeText: {
    ...typography.labelTechnical,
    fontSize: moderateScale(9.5),
    color: colors.primaryContainer,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titleText: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: moderateScale(17.5),
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: spacing.stackSm + 4,
  },
  disclosureBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 214, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
    borderRadius: borderRadius.lg,
    padding: spacing.stackSm + 4,
    gap: spacing.stackSm,
    marginBottom: spacing.stackSm + 4,
    width: '100%',
  },
  disclosureIcon: {
    marginTop: 2,
  },
  disclosureText: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    fontSize: moderateScale(12),
    lineHeight: moderateScale(17),
  },
  boldText: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  highlightText: {
    color: colors.primaryContainer,
    fontWeight: '800',
  },
  featuresList: {
    width: '100%',
    gap: spacing.stackSm,
    marginBottom: spacing.stackSm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.stackSm + 2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    padding: spacing.stackSm + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  featureIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  featureTextWrap: {
    flex: 1,
    gap: 1,
  },
  featureTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  featureDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(11),
    lineHeight: moderateScale(15),
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm + 4,
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  denyButton: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  denyButtonText: {
    ...typography.titleMd,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(11.5),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  agreeButton: {
    flex: 1.4,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  agreeButtonText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
    fontSize: moderateScale(11.5),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
