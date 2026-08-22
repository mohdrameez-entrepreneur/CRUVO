import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';

const TYPE_CONFIG = {
  error: {
    icon: 'alert-circle',
    iconColor: '#ffb4ab',
    bg: '#2c1517',
    border: '#5c1e22',
    textColor: '#ffdad6',
  },
  warning: {
    icon: 'warning',
    iconColor: '#ffd600',
    bg: '#2a240e',
    border: '#57480a',
    textColor: '#fff5dc',
  },
  success: {
    icon: 'checkmark-circle',
    iconColor: '#81c784',
    bg: '#142918',
    border: '#244d2b',
    textColor: '#e8f5e9',
  },
  info: {
    icon: 'information-circle',
    iconColor: '#90caf9',
    bg: '#122338',
    border: '#1e3d63',
    textColor: '#e3f2fd',
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
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
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
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -10,
        duration: 200,
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
          opacity,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={config.icon} size={22} color={config.iconColor} />
      </View>
      <View style={styles.textContainer}>
        {title ? <Text style={[styles.title, { color: config.textColor }]}>{title}</Text> : null}
        {message ? <Text style={[styles.message, { color: config.textColor }]}>{message}</Text> : null}
      </View>
      {onAction && (
        <TouchableOpacity style={[styles.actionBtn, { borderColor: config.border }]} onPress={onAction}>
          <Text style={[styles.actionText, { color: config.iconColor }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
      {onDismiss && (
        <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
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
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginVertical: spacing.stackSm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
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
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    ...typography.bodyMd,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(18),
    opacity: 0.9,
  },
  actionBtn: {
    paddingHorizontal: spacing.stackSm + 4,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginLeft: spacing.stackSm,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  actionText: {
    ...typography.labelTechnical,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
    marginLeft: spacing.stackSm - 2,
  },
});
