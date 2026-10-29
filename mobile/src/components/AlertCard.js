import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';

const TYPE_CONFIG = {
  error: {
    icon: 'alert-circle',
    iconColor: '#DC2626',
    bg: '#FEF2F2',
    border: 'rgba(239, 68, 68, 0.3)',
    glow: 'rgba(239, 68, 68, 0.12)',
    textColor: '#991B1B',
  },
  warning: {
    icon: 'warning',
    iconColor: '#D97706',
    bg: '#FFFBEB',
    border: 'rgba(245, 158, 11, 0.35)',
    glow: 'rgba(245, 158, 11, 0.12)',
    textColor: '#92400E',
  },
  success: {
    icon: 'checkmark-circle',
    iconColor: '#059669',
    bg: '#ECFDF5',
    border: 'rgba(16, 185, 129, 0.3)',
    glow: 'rgba(16, 185, 129, 0.12)',
    textColor: '#065F46',
  },
  info: {
    icon: 'information-circle',
    iconColor: '#0284C7',
    bg: '#F0F9FF',
    border: 'rgba(56, 189, 248, 0.35)',
    glow: 'rgba(56, 189, 248, 0.12)',
    textColor: '#075985',
  },
};

export default function AlertCard({
  type = 'error',
  title,
  message,
  onDismiss,
  onAction,
  actionLabel = 'Retry',
  autoDismissMs,
  style,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-14)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (autoDismissMs && onDismiss) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [message, title]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -10,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.error;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          shadowColor: config.iconColor,
          opacity,
          transform: [{ translateY }, { scale }],
        },
        style,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.glow }]}>
        <Ionicons name={config.icon} size={20} color={config.iconColor} />
      </View>
      <View style={styles.textContainer}>
        {title ? <Text style={[styles.title, { color: config.textColor }]}>{title}</Text> : null}
        {message ? <Text style={[styles.message, { color: config.textColor }]}>{message}</Text> : null}
      </View>
      {onAction && (
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: config.border, backgroundColor: config.glow }]}
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionText, { color: config.iconColor }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
      {onDismiss && (
        <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} activeOpacity={0.6}>
          <Ionicons name="close" size={18} color={config.textColor} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackSm + 4,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginVertical: spacing.stackSm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: spacing.stackSm + 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.labelTechnical,
    fontSize: moderateScale(13),
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  message: {
    ...typography.bodyMd,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(18),
    opacity: 0.95,
  },
  actionBtn: {
    paddingHorizontal: spacing.stackSm + 4,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginLeft: spacing.stackSm,
  },
  actionText: {
    ...typography.labelTechnical,
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    marginLeft: spacing.stackSm - 2,
    borderRadius: 14,
    backgroundColor: 'rgba(10, 25, 47, 0.05)',
  },
});
