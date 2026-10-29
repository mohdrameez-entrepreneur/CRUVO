import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, typography } from '../theme';

const AVATAR_COLORS = [
  '#38BDF8', '#34D399', '#F472B6', '#818CF8', '#A78BFA',
  '#FB923C', '#2DD4BF', '#F87171', '#94A3B8', '#64748B',
];

function getColorFromId(id) {
  const num = typeof id === 'number' ? id : parseInt(id, 10) || 0;
  return AVATAR_COLORS[Math.abs(num) % AVATAR_COLORS.length];
}

function getInitialsFromName(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function getFullAvatarUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiBase = (process.env.EXPO_PUBLIC_API_URL || 'https://cruvo.onrender.com/api').replace(/\/api\/?$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${apiBase}${cleanPath}`;
}

export default function UserAvatar({ avatarUrl, name, initials, id, size = 44, style }) {
  const displayInitials = initials || getInitialsFromName(name);
  const bgColor = getColorFromId(id);
  const [imgError, setImgError] = useState(false);

  const fullUrl = getFullAvatarUrl(avatarUrl);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  if (fullUrl && !imgError) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
        <Image
          source={{ uri: fullUrl }}
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

const styles = StyleSheet.create({
  container: { overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  image: { resizeMode: 'cover' },
  fallback: {},
  initials: { ...typography.labelTechnical, color: '#FFFFFF', fontWeight: '700' },
});
