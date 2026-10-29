import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { discoveryAPI, ridesAPI } from '../api';
import UserAvatar from '../components/UserAvatar';
import NavBar from '../components/NavBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showError } from '../utils/alert';

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
  const [ride, setRide] = useState(null);
  const [riders, setRiders] = useState([]);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const loadRide = async () => {
    if (!rideId) return;
    try {
      const res = await ridesAPI.get(rideId);
      setRide(res.data);
    } catch {}
  };

  const loadRiders = async (query = '') => {
    try {
      const res = await discoveryAPI.searchRiders(query);
      // For private rides: Only include accepted friends
      const friendsOnly = (res.data || []).filter(r => r.is_friend || r.friendship_status === 'ACCEPTED');
      setRiders(friendsOnly);
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
    loadRide();
    loadRiders();
    loadParticipants();
  }, [rideId]);

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
      showError(err.response?.data?.error || 'Failed to update invitation');
    }
  };

  const isPublicRide = ride?.is_public;

  return (
    <View style={styles.container}>
      <NavBar
        title="INVITE RIDERS"
        subtitle={rideName || undefined}
        badge={isPublicRide ? 'PUBLIC RIDE' : 'PRIVATE RIDE'}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={handleDone}
            disabled={starting}
            activeOpacity={0.8}
          >
            <Text style={[styles.doneBtnText, starting && { opacity: 0.5 }]}>
              {starting ? '...' : 'DONE'}
            </Text>
          </TouchableOpacity>
        }
      />

      {isPublicRide ? (
        <View style={styles.publicInfoContainer}>
          <View style={styles.publicBanner}>
            <Ionicons name="globe-outline" size={24} color="#B45309" />
            <View style={styles.publicTextWrap}>
              <Text style={styles.publicTitle}>PUBLIC RIDE</Text>
              <Text style={styles.publicSubtext}>
                This ride is public — anyone in the CRUVO community can discover and join directly from Explore!
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.doneFullBtn} onPress={handleDone} activeOpacity={0.8}>
            <Text style={styles.doneFullText}>FINISH & RETURN</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.privateHeaderBanner}>
            <Ionicons name="lock-closed" size={14} color="#B45309" />
            <Text style={styles.privateBannerText}>
              PRIVATE RIDE • Only your accepted friends can be invited
            </Text>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.onSurfaceVariant} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends by name, bike, or city..."
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
              <ActivityIndicator size="large" color={colors.primaryContainer} />
              <Text style={styles.emptyText}>Loading friends...</Text>
            </View>
          ) : riders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>No friends found</Text>
              <Text style={styles.emptyText}>
                You can only invite riders who have accepted your friend request. Add friends in Explore first!
              </Text>
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  doneBtn: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  doneBtnText: {
    ...typography.labelTechnical,
    color: colors.onPrimaryContainer,
    fontSize: moderateScale(12),
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', margin: spacing.marginMobile,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.stackMd, height: spacing.touchTargetMin,
    gap: spacing.stackSm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  list: { padding: spacing.marginMobile, paddingTop: 0, paddingBottom: 100 },
  riderCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg, padding: spacing.stackMd, marginBottom: spacing.stackSm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  riderAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceDim,
    justifyContent: 'center', alignItems: 'center',
  },
  riderInitials: { ...typography.labelTechnical, color: '#B45309' },
  riderInfo: { flex: 1, gap: 2 },
  riderName: { ...typography.titleMd, color: colors.onSurface, fontSize: 16 },
  riderUsername: { ...typography.labelSm, color: '#B45309' },
  riderBike: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 13 },
  riderStyle: { ...typography.labelSm, color: '#B45309' },
  inviteButton: {
    paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm,
    borderRadius: borderRadius.sm, borderWidth: 1, borderColor: '#B45309',
    backgroundColor: colors.surfaceDim,
  },
  invitedButton: {
    backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer,
  },
  inviteButtonText: { ...typography.labelTechnical, color: '#B45309', fontSize: 12 },
  invitedButtonText: { color: colors.onPrimaryContainer },
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.stackSm,
    paddingHorizontal: spacing.marginMobile,
  },
  emptyTitle: { ...typography.titleMd, color: colors.onSurface },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
  privateHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.stackSm,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  privateBannerText: {
    ...typography.labelTechnical,
    color: '#B45309',
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  publicInfoContainer: {
    flex: 1,
    padding: spacing.marginMobile,
    justifyContent: 'center',
    gap: spacing.stackLg,
  },
  publicBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.xl,
    padding: spacing.stackLg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  publicTextWrap: {
    flex: 1,
    gap: 4,
  },
  publicTitle: {
    ...typography.titleMd,
    color: colors.primary,
    fontSize: moderateScale(16),
    fontWeight: '800',
  },
  publicSubtext: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(13),
  },
  doneFullBtn: {
    backgroundColor: colors.primaryContainer,
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  doneFullText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
    fontSize: moderateScale(14),
    fontWeight: '800',
  },
});
