import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, typography, borderRadius } from '../theme';

const AVATAR_COLORS = [
  '#ffd600', '#4CAF50', '#FF9800', '#2196F3', '#E91E63',
  '#9C27B0', '#00BCD4', '#FF5722', '#607D8B', '#795548',
];

function getColorFromId(id) {
  const num = typeof id === 'number' ? id : parseInt(id, 10) || 0;
  return AVATAR_COLORS[Math.abs(num) % AVATAR_COLORS.length];
}

export default function UserAvatar({ avatarUrl, name, initials, id, size = 44, style }) {
  const displayInitials = initials || getInitialsFromName(name);
  const bgColor = getColorFromId(id);
  const [imgError, setImgError] = useState(false);

  if (avatarUrl && !imgError) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }, style]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{displayInitials}</Text>
    </View>
  );
}

function getInitialsFromName(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  image: { resizeMode: 'cover' },
  fallback: {},
  initials: { ...typography.labelTechnical, color: colors.onSurface },
});
