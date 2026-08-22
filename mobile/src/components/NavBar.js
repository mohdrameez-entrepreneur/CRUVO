import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';

export default function NavBar({
  title = 'CRUVO',
  subtitle,
  badge,
  showBack = false,
  onBack,
  leftAction,
  rightAction,
  variant = 'glass',
  style,
}) {
  const insets = useSafeAreaInsets();

  const isGlass = variant === 'glass';
  const isTransparent = variant === 'transparent';

  return (
    <View
      style={[
        styles.container,
        isGlass && styles.glassContainer,
        isTransparent && styles.transparentContainer,
        { paddingTop: insets.top + 6 },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {/* Left Slot */}
        <View style={styles.slotLeft}>
          {leftAction ? (
            leftAction
          ) : showBack ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color={colors.primaryContainer} />
            </TouchableOpacity>
          ) : (
            <View style={styles.actionPlaceholder} />
          )}
        </View>

        {/* Center Title Slot */}
        <View style={styles.centerSlot}>
          <View style={styles.titleWrap}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
            {badge ? (
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right Slot */}
        <View style={styles.slotRight}>
          {rightAction ? (
            rightAction
          ) : (
            <View style={styles.actionPlaceholder} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: spacing.stackSm + 4,
    paddingHorizontal: spacing.marginMobile,
    zIndex: 100,
  },
  glassContainer: {
    backgroundColor: 'rgba(18, 19, 23, 0.92)',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  transparentContainer: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  slotLeft: {
    minWidth: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  slotRight: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.stackSm,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    ...typography.displayLg,
    color: colors.primaryContainer,
    fontSize: moderateScale(19),
    letterSpacing: -0.6,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  subtitleText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(11),
    letterSpacing: 0.2,
    marginTop: 1,
  },
  badgeWrap: {
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
  },
  badgeText: {
    ...typography.labelTechnical,
    fontSize: moderateScale(9),
    color: colors.primaryContainer,
    letterSpacing: 0.5,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPlaceholder: {
    width: 40,
    height: 40,
  },
});
