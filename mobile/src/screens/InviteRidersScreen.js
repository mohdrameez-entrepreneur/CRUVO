import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { discoveryAPI, ridesAPI } from '../api';
import UserAvatar from '../components/UserAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function RiderCard({ rider, onToggle, isInvited }) {
  const p = rider.profile;
  return (
    <View style={styles.riderCard}>
      <UserAvatar
        avatarUrl={p?.avatar_url}
        name={p?.display_name}
        initials={p?.initials}
        id={rider.id}
        size={44}
      />
      <View style={styles.riderInfo}>
        <Text style={styles.riderName}>{p?.display_name || 'Unknown'}</Text>
        <Text style={styles.riderUsername}>@{rider.username}</Text>
        <Text style={styles.riderBike}>{[p?.bike_make, p?.bike_model].filter(Boolean).join(' ') || 'No bike info'}</Text>
        {p?.riding_style ? <Text style={styles.riderStyle}>{p.riding_style}</Text> : null}
      </View>
      <TouchableOpacity
        style={[styles.inviteButton, isInvited && styles.invitedButton]}
        onPress={() => onToggle(rider)}
        activeOpacity={0.7}
      >
        <Text style={[styles.inviteButtonText, isInvited && styles.invitedButtonText]}>
          {isInvited ? 'INVITED' : 'INVITE'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function InviteRidersScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { rideId, rideName, startOnDone } = route.params || {};
  const [riders, setRiders] = useState([]);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const loadRiders = async (query = '') => {
    try {
      const res = await discoveryAPI.searchRiders(query);
      setRiders(res.data);
    } catch (err) {
      console.log('LOAD RIDERS ERROR:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      const res = await ridesAPI.getParticipants(rideId);
      const ids = new Set(res.data.filter(p => p.status === 'INVITED').map(p => p.user));
      setInvitedIds(ids);
    } catch {}
  };

  useEffect(() => {
    loadRiders();
    loadParticipants();
  }, []);

  const handleSearch = (text) => {
    setSearch(text);
    loadRiders(text);
  };

  const handleDone = async () => {
    if (!startOnDone) {
      navigation.goBack();
      return;
    }
    setStarting(true);
    try {
      await ridesAPI.startRide(rideId);
      navigation.reset({ index: 0, routes: [{ name: 'ActiveRide', params: { rideId } }] });
    } catch {
      navigation.replace('RideSummary', { rideId });
    } finally {
      setStarting(false);
    }
  };

  const handleToggle = async (rider) => {
    const wasInvited = invitedIds.has(rider.id);
    try {
      const res = await ridesAPI.addParticipant(rideId, { user_id: rider.id, role: 'WINGMAN' });
      if (res.data.action === 'removed') {
        setInvitedIds(prev => {
          const next = new Set(prev);
          next.delete(rider.id);
          return next;
        });
      } else {
        setInvitedIds(prev => new Set([...prev, rider.id]));
      }
    } catch (err) {
      console.log('INVITE ERROR:', err.message, err.response?.data);
      Alert.alert('Error', 'Failed to update invitation');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.topBarButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>INVITE RIDERS</Text>
          {rideName ? <Text style={styles.topBarSub}>{rideName}</Text> : null}
        </View>
        <TouchableOpacity style={styles.topBarButton} onPress={handleDone} disabled={starting}>
          <Text style={[styles.doneText, starting && { opacity: 0.5 }]}>{starting ? 'STARTING...' : 'DONE'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search riders by name, bike, or city..."
          placeholderTextColor={colors.outline}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading riders...</Text>
        </View>
      ) : riders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={40} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>No riders found</Text>
          <Text style={styles.emptyText}>Try a different search or invite later</Text>
        </View>
      ) : (
        <FlatList
          data={riders}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <RiderCard
              rider={item}
              onToggle={handleToggle}
              isInvited={invitedIds.has(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, height: spacing.touchTargetMin,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  topBarButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  topBarCenter: { alignItems: 'center' },
  topBarTitle: { ...typography.displayLg, color: colors.primaryContainer, fontSize: 18, textTransform: 'uppercase', letterSpacing: -0.5 },
  topBarSub: { ...typography.labelSm, color: colors.onSurfaceVariant },
  doneText: { ...typography.labelTechnical, color: colors.primaryContainer },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', margin: spacing.marginMobile,
    backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.stackMd, height: spacing.touchTargetMin,
    gap: spacing.stackSm,
  },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  list: { padding: spacing.marginMobile, paddingTop: 0, paddingBottom: 100 },
  riderCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd,
    backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, padding: spacing.stackMd, marginBottom: spacing.stackSm,
  },
  riderAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center',
  },
  riderInitials: { ...typography.labelTechnical, color: colors.primaryContainer },
  riderInfo: { flex: 1, gap: 2 },
  riderName: { ...typography.titleMd, color: colors.onSurface, fontSize: 16 },
  riderUsername: { ...typography.labelSm, color: colors.primaryContainer },
  riderBike: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 13 },
  riderStyle: { ...typography.labelSm, color: colors.primaryContainer },
  inviteButton: {
    paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm,
    borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.primaryContainer,
  },
  invitedButton: {
    backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer,
  },
  inviteButtonText: { ...typography.labelTechnical, color: colors.primaryContainer, fontSize: 12 },
  invitedButtonText: { color: colors.onPrimaryContainer },
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.stackSm,
    paddingHorizontal: spacing.marginMobile,
  },
  emptyTitle: { ...typography.titleMd, color: colors.onSurface },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
});
