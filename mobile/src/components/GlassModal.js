import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';

const { width } = Dimensions.get('window');

const TYPE_THEMES = {
  danger: {
    iconColor: '#EF4444',
    iconBg: 'rgba(239, 68, 68, 0.1)',
    iconBorder: 'rgba(239, 68, 68, 0.3)',
    btnBg: '#EF4444',
    btnText: '#ffffff',
    cardBorder: 'rgba(239, 68, 68, 0.2)',
  },
  warning: {
    iconColor: '#D97706',
    iconBg: 'rgba(245, 158, 11, 0.12)',
    iconBorder: 'rgba(245, 158, 11, 0.3)',
    btnBg: '#F59E0B',
    btnText: '#0A192F',
    cardBorder: 'rgba(245, 158, 11, 0.25)',
  },
  primary: {
    iconColor: '#0A192F',
    iconBg: 'rgba(245, 158, 11, 0.15)',
    iconBorder: 'rgba(245, 158, 11, 0.4)',
    btnBg: '#F59E0B',
    btnText: '#0A192F',
    cardBorder: 'rgba(245, 158, 11, 0.3)',
  },
  success: {
    iconColor: '#10B981',
    iconBg: 'rgba(16, 185, 129, 0.1)',
    iconBorder: 'rgba(16, 185, 129, 0.3)',
    btnBg: '#10B981',
    btnText: '#ffffff',
    cardBorder: 'rgba(16, 185, 129, 0.2)',
  },
  info: {
    iconColor: '#0A192F',
    iconBg: 'rgba(10, 25, 47, 0.08)',
    iconBorder: 'rgba(10, 25, 47, 0.2)',
    btnBg: '#0A192F',
    btnText: '#ffffff',
    cardBorder: 'rgba(10, 25, 47, 0.15)',
  },
};

export default function GlassModal({
  visible = false,
  type = 'primary',
  icon,
  badge,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = true,
  isLoading = false,
}) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
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

  const theme = TYPE_THEMES[type] || TYPE_THEMES.primary;
  const defaultIcon =
    type === 'danger'
      ? 'alert-circle'
      : type === 'warning'
      ? 'warning'
      : type === 'success'
      ? 'checkmark-circle'
      : 'information-circle';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  borderColor: theme.cardBorder,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Top Glow Icon Badge */}
              <View style={[styles.iconHalo, { backgroundColor: theme.iconBg, borderColor: theme.iconBorder }]}>
                <Ionicons name={icon || defaultIcon} size={30} color={theme.iconColor} />
              </View>

              {/* Badge if provided */}
              {badge ? (
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ) : null}

              {/* Title & Description */}
              <Text style={styles.titleText}>{title}</Text>
              {message ? <Text style={styles.messageText}>{message}</Text> : null}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                {showCancel && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onCancel}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>{cancelText}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: theme.btnBg },
                    !showCancel && { flex: 1 },
                    isLoading && { opacity: 0.7 },
                  ]}
                  onPress={onConfirm}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.btnText} />
                  ) : (
                    <Text style={[styles.confirmBtnText, { color: theme.btnText }]}>{confirmText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 47, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.marginMobile,
  },
  modalCard: {
    width: Math.min(width - 36, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(10, 25, 47, 0.08)',
    paddingHorizontal: spacing.stackLg,
    paddingTop: spacing.stackLg + 4,
    paddingBottom: spacing.stackLg,
    alignItems: 'center',
    shadowColor: '#0A192F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  iconHalo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.stackMd,
  },
  badgeWrap: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: spacing.stackSm,
  },
  badgeText: {
    ...typography.labelTechnical,
    fontSize: moderateScale(10),
    color: '#B45309',
    letterSpacing: 0.6,
  },
  titleText: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: moderateScale(18),
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: spacing.stackSm,
  },
  messageText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(19),
    textAlign: 'center',
    marginBottom: spacing.stackLg,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm + 4,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    ...typography.titleMd,
    fontSize: moderateScale(13),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
