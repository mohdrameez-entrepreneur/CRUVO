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
    iconColor: '#ff5252',
    iconBg: 'rgba(255, 82, 82, 0.15)',
    iconBorder: 'rgba(255, 82, 82, 0.35)',
    btnBg: '#e53935',
    btnText: '#ffffff',
    cardBorder: 'rgba(255, 82, 82, 0.25)',
  },
  warning: {
    iconColor: '#ffd600',
    iconBg: 'rgba(255, 214, 0, 0.15)',
    iconBorder: 'rgba(255, 214, 0, 0.35)',
    btnBg: '#ffd600',
    btnText: '#000000',
    cardBorder: 'rgba(255, 214, 0, 0.25)',
  },
  primary: {
    iconColor: '#ffd600',
    iconBg: 'rgba(255, 214, 0, 0.15)',
    iconBorder: 'rgba(255, 214, 0, 0.35)',
    btnBg: '#ffd600',
    btnText: '#000000',
    cardBorder: 'rgba(255, 214, 0, 0.25)',
  },
  success: {
    iconColor: '#81c784',
    iconBg: 'rgba(129, 199, 132, 0.15)',
    iconBorder: 'rgba(129, 199, 132, 0.35)',
    btnBg: '#4caf50',
    btnText: '#ffffff',
    cardBorder: 'rgba(129, 199, 132, 0.25)',
  },
  info: {
    iconColor: '#90caf9',
    iconBg: 'rgba(144, 202, 249, 0.15)',
    iconBorder: 'rgba(144, 202, 249, 0.35)',
    btnBg: '#1e88e5',
    btnText: '#ffffff',
    cardBorder: 'rgba(144, 202, 249, 0.25)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.marginMobile,
  },
  modalCard: {
    width: Math.min(width - 36, 380),
    backgroundColor: 'rgba(22, 24, 29, 0.96)',
    borderRadius: borderRadius.xl + 4,
    borderWidth: 1,
    paddingHorizontal: spacing.stackLg,
    paddingTop: spacing.stackLg + 4,
    paddingBottom: spacing.stackLg,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 20,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: spacing.stackSm,
  },
  badgeText: {
    ...typography.labelTechnical,
    fontSize: moderateScale(10),
    color: colors.primaryContainer,
    letterSpacing: 0.8,
  },
  titleText: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: moderateScale(18),
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    textTransform: 'uppercase',
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    ...typography.titleMd,
    fontSize: moderateScale(13),
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
