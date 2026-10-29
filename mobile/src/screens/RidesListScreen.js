import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { ridesAPI, invitationsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import GlassModal from '../components/GlassModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showError } from '../utils/alert';

function InvitationCard({ invitation, onAccept, onDecline, loading }) {
  const dateStr = new Date(invitation.ride_date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = new Date(`2000-01-01T${invitation.ride_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.inviteCard}>
      <View style={styles.inviteHeader}>
        <View style={styles.inviteIcon}>
          <Ionicons name="mail-open" size={20} color={colors.primaryContainer} />
        </View>
        <View style={styles.inviteInfo}>
          <Text style={styles.inviteRideName}>{invitation.ride_name}</Text>
          <Text style={styles.inviteBy}>by {invitation.creator_name}</Text>
        </View>
      </View>

      <View style={styles.inviteDetails}>
        <View style={styles.inviteDetailRow}>
          <Ionicons name="calendar" size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.inviteDetailText}>{dateStr} at {timeStr}</Text>
        </View>
        <View style={styles.inviteDetailRow}>
          <Ionicons name="location" size={14} color={colors.primaryContainer} />
          <Text style={styles.inviteDetailText} numberOfLines={1}>
            {invitation.ride_origin || 'TBD'} → {invitation.ride_destination || 'TBD'}
          </Text>
        </View>
      </View>

      <View style={styles.inviteActions}>
        <TouchableOpacity
          style={[styles.inviteActionBtn, styles.declineBtn]}
          onPress={onDecline}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={16} color={colors.error} />
          <Text style={styles.declineBtnText}>REJECT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.inviteActionBtn, styles.acceptBtn]}
          onPress={onAccept}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
          ) : (
            <Ionicons name="checkmark" size={16} color={colors.onPrimaryContainer} />
          )}
          <Text style={styles.acceptBtnText}>ACCEPT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RideCard({ ride, onPress, onInvite, onDelete, onJoin, isCreator }) {
  const dateStr = new Date(ride.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = new Date(`2000-01-01T${ride.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const statusColors = {
    SCHEDULED: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#B45309' },
    ACTIVE: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#059669' },
    COMPLETED: { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', text: '#475569' },
    DRAFT: { bg: 'rgba(10,25,47,0.05)', border: colors.outlineVariant, text: colors.onSurfaceVariant },
    CANCELLED: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#DC2626' },
  };

  const sc = statusColors[ride.status] || statusColors.SCHEDULED;
  const isParticipant = isCreator || ride.is_user_participant;

  return (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={onPress}
      onLongPress={isCreator ? onDelete : undefined}
      activeOpacity={0.7}
    >
      <View style={styles.rideCardHeader}>
        <View style={styles.rideCardInfo}>
          <Text style={styles.rideCardTime}>{dateStr} at {timeStr}</Text>
          <Text style={styles.rideCardName}>{ride.name}</Text>
        </View>
        <View style={styles.badgeColumn}>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{ride.status}</Text>
          </View>
          {ride.is_public ? (
            <View style={styles.publicBadge}>
              <Ionicons name="globe-outline" size={10} color={colors.primaryContainer} />
              <Text style={styles.publicBadgeText}>PUBLIC</Text>
            </View>
          ) : (
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed-outline" size={10} color={colors.onSurfaceVariant} />
              <Text style={styles.privateBadgeText}>PRIVATE</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.rideRoute}>
        <Ionicons name="location" size={16} color={colors.primaryContainer} />
        <Text style={styles.rideRouteText} numberOfLines={1}>
          {ride.origin_name || 'TBD'} → {ride.destination_name || 'TBD'}
        </Text>
      </View>

      <View style={styles.rideCardFooter}>
        <View style={styles.rideStats}>
          <Ionicons name="people" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.rideStatText}>{ride.participant_count || 0} riders</Text>
          {ride.distance_km ? (
            <>
              <Ionicons name="navigate" size={16} color={colors.onSurfaceVariant} style={{ marginLeft: spacing.stackMd }} />
              <Text style={styles.rideStatText}>{ride.distance_km} km</Text>
            </>
          ) : null}
        </View>
        <View style={styles.rideCardActions}>
          {isCreator && (
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={14} color={colors.error} />
            </TouchableOpacity>
          )}
          {ride.status === 'SCHEDULED' && isCreator && !ride.is_public && (
            <TouchableOpacity style={styles.inviteBtn} onPress={() => onInvite(ride)} activeOpacity={0.7}>
              <Ionicons name="person-add-outline" size={16} color={colors.primaryContainer} />
              <Text style={styles.inviteBtnText}>Invite</Text>
            </TouchableOpacity>
          )}
          {ride.is_public && !isParticipant && (
            <TouchableOpacity style={styles.joinBtn} onPress={() => onJoin(ride.id)} activeOpacity={0.8}>
              <Ionicons name="enter-outline" size={14} color={colors.onPrimaryContainer} />
              <Text style={styles.joinBtnText}>JOIN RIDE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RidesListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [rides, setRides] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);
  const [pendingDeleteRide, setPendingDeleteRide] = useState(null);
  const [pendingDeclineInvite, setPendingDeclineInvite] = useState(null);
  const [deletingRide, setDeletingRide] = useState(false);

  const loadAll = async () => {
    try {
      const [ridesRes, invRes] = await Promise.all([
        ridesAPI.list(),
        invitationsAPI.list(),
      ]);
      setRides(ridesRes.data);
      setInvitations(invRes.data);
    } catch (err) {
      console.log('LOAD RIDES ERROR:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadAll);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleAccept = async (invitation) => {
    setRespondingId(invitation.id);
    try {
      await invitationsAPI.respond(invitation.id, 'accept');
      setInvitations(prev => prev.filter(i => i.id !== invitation.id));
      loadAll();
    } catch (err) {
      showError('Failed to accept invitation');
    } finally {
      setRespondingId(null);
    }
  };

  const handleDecline = (invitation) => {
    setPendingDeclineInvite(invitation);
  };

  const handleConfirmDecline = async () => {
    if (!pendingDeclineInvite) return;
    const invId = pendingDeclineInvite.id;
    setRespondingId(invId);
    try {
      await invitationsAPI.respond(invId, 'decline');
      setInvitations(prev => prev.filter(i => i.id !== invId));
      setPendingDeclineInvite(null);
    } catch (err) {
      setPendingDeclineInvite(null);
    } finally {
      setRespondingId(null);
    }
  };

  const handleRidePress = async (ride) => {
    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      navigation.navigate('RideSummary', { rideId: ride.id });
      return;
    }
    try {
      const localStatus = await AsyncStorage.getItem(`@cruvo_ride_status_${ride.id}`);
      if (localStatus === 'COMPLETED') {
        navigation.navigate('RideSummary', { rideId: ride.id });
        return;
      }
    } catch {}

    if (ride.status === 'ACTIVE') {
      navigation.navigate('ActiveRide', { rideId: ride.id });
    } else {
      navigation.navigate('RideSummary', { rideId: ride.id });
    }
  };

  const handleDeleteRide = (ride) => {
    setPendingDeleteRide(ride);
  };

  const handleConfirmDeleteRide = async () => {
    if (!pendingDeleteRide) return;
    setDeletingRide(true);
    try {
      await ridesAPI.delete(pendingDeleteRide.id);
      setRides(prev => prev.filter(r => r.id !== pendingDeleteRide.id));
      setPendingDeleteRide(null);
    } catch (err) {
      setPendingDeleteRide(null);
    } finally {
      setDeletingRide(false);
    }
  };

  const handleJoinRide = async (rideId) => {
    try {
      await ridesAPI.joinPublicRide(rideId);
      loadAll();
    } catch (err) {
      console.warn('JOIN RIDE ERROR:', err);
    }
  };

  const hasInvitations = invitations.length > 0;

  return (
    <View style={styles.container}>
      <NavBar
        title="YOUR RIDES"
        badge={rides.length ? `${rides.length} RIDES` : undefined}
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateRide')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={colors.onPrimaryContainer} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.emptyState}>
          <Ionicons name="hourglass-outline" size={32} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyStateText}>Loading rides...</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <RideCard
              ride={item}
              onPress={() => handleRidePress(item)}
              onInvite={(ride) => navigation.navigate('InviteRiders', { rideId: ride.id, rideName: ride.name })}
              onDelete={() => handleDeleteRide(item)}
              onJoin={handleJoinRide}
              isCreator={item.creator === user?.id}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 16) + 90 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryContainer} />}
          ListHeaderComponent={
            <>
              {hasInvitations && (
                <View style={styles.inviteSection}>
                  <View style={styles.inviteSectionHeader}>
                    <Ionicons name="mail" size={18} color={colors.primaryContainer} />
                    <Text style={styles.inviteSectionTitle}>PENDING INVITATIONS</Text>
                    <View style={styles.inviteCount}>
                      <Text style={styles.inviteCountText}>{invitations.length}</Text>
                    </View>
                  </View>
                  {invitations.map(inv => (
                    <InvitationCard
                      key={inv.id}
                      invitation={inv}
                      onAccept={() => handleAccept(inv)}
                      onDecline={() => handleDecline(inv)}
                      loading={respondingId === inv.id}
                    />
                  ))}
                </View>
              )}
              <Text style={styles.listHeader}>
                {hasInvitations && rides.length > 0 ? 'YOUR RIDES' : ''}
                {!hasInvitations && rides.length > 0 ? `${rides.length} ride${rides.length !== 1 ? 's' : ''}` : ''}
                {rides.length === 0 && !hasInvitations ? '' : ''}
              </Text>
            </>
          }
          ListEmptyComponent={
            !hasInvitations ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="bicycle-outline" size={48} color={colors.primaryContainer} />
                </View>
                <Text style={styles.emptyTitle}>No Rides Yet</Text>
                <Text style={styles.emptySubtitle}>Create your first ride and start{"\n"}riding with your crew</Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => navigation.navigate('CreateRide')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={20} color={colors.onPrimaryContainer} />
                  <Text style={styles.createButtonText}>CREATE A RIDE</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Delete Ride Glass Modal */}
      <GlassModal
        visible={Boolean(pendingDeleteRide)}
        type="danger"
        icon="trash-outline"
        badge="PERMANENT ACTION"
        title="Delete Ride?"
        message={`Are you sure you want to delete "${pendingDeleteRide?.name}"? This action cannot be reversed.`}
        confirmText="DELETE RIDE"
        cancelText="CANCEL"
        isLoading={deletingRide}
        onConfirm={handleConfirmDeleteRide}
        onCancel={() => setPendingDeleteRide(null)}
      />

      {/* Decline Invitation Glass Modal */}
      <GlassModal
        visible={Boolean(pendingDeclineInvite)}
        type="warning"
        icon="close-circle-outline"
        badge="INVITATION"
        title="Decline Ride Invite?"
        message={`Are you sure you want to decline the invitation to join "${pendingDeclineInvite?.ride_name}"?`}
        confirmText="DECLINE"
        cancelText="KEEP INVITE"
        isLoading={Boolean(respondingId)}
        onConfirm={handleConfirmDecline}
        onCancel={() => setPendingDeclineInvite(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { padding: spacing.marginMobile, paddingBottom: 110 },

  inviteSection: { marginBottom: spacing.stackLg },
  inviteSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  inviteSectionTitle: { ...typography.labelTechnical, color: colors.primary, flex: 1, fontWeight: '700' },
  inviteCount: {
    backgroundColor: colors.primaryContainer, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center',
  },
  inviteCountText: { ...typography.labelTechnical, color: colors.onPrimaryContainer, fontSize: 12 },

  inviteCard: {
    backgroundColor: colors.surface, borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)', borderRadius: borderRadius.xl,
    padding: spacing.stackMd, marginBottom: spacing.stackSm,
    gap: spacing.stackSm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd },
  inviteIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.12)', justifyContent: 'center', alignItems: 'center',
  },
  inviteInfo: { flex: 1 },
  inviteRideName: { ...typography.titleMd, color: colors.onSurface },
  inviteBy: { ...typography.labelSm, color: colors.onSurfaceVariant },
  inviteDetails: { gap: 4 },
  inviteDetailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  inviteDetailText: { ...typography.bodyMd, color: colors.onSurfaceVariant, flex: 1 },
  inviteActions: { flexDirection: 'row', gap: spacing.stackSm, marginTop: spacing.stackSm },
  inviteActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 44, borderRadius: borderRadius.lg, gap: 6,
  },
  acceptBtn: { backgroundColor: colors.primaryContainer },
  acceptBtnText: { ...typography.labelTechnical, color: colors.onPrimaryContainer, fontSize: 13, fontWeight: '700' },
  declineBtn: { borderWidth: 1, borderColor: colors.error, backgroundColor: 'rgba(239,68,68,0.05)' },
  declineBtnText: { ...typography.labelTechnical, color: colors.error, fontSize: 13, fontWeight: '700' },

  listHeader: { ...typography.labelTechnical, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },

  rideCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl, padding: spacing.stackMd, marginBottom: spacing.stackMd,
    gap: spacing.stackSm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  rideCardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  deleteBtn: {
    width: 32, height: 32, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.error, justifyContent: 'center', alignItems: 'center',
  },
  rideCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rideCardInfo: { flex: 1, gap: 2 },
  rideCardTime: { ...typography.labelTechnical, color: '#B45309', fontSize: 12, fontWeight: '600' },
  rideCardName: { ...typography.titleMd, color: colors.onSurface },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  statusText: { ...typography.labelTechnical, fontSize: 10, fontWeight: '600' },
  rideRoute: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm,
    paddingTop: spacing.stackSm, borderTopWidth: 1, borderTopColor: colors.outlineVariant,
  },
  rideRouteText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  rideCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  rideStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rideStatText: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 14 },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm,
    borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.primaryContainer,
  },
  inviteBtnText: { ...typography.labelTechnical, color: '#B45309', fontSize: 12, fontWeight: '600' },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm,
    borderRadius: borderRadius.sm,
  },
  joinBtnText: { ...typography.labelTechnical, color: colors.onPrimaryContainer, fontSize: 12, fontWeight: '800' },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  publicBadgeText: {
    ...typography.labelTechnical,
    color: '#B45309',
    fontSize: moderateScale(9),
    fontWeight: '600',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  privateBadgeText: {
    ...typography.labelTechnical,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(9),
  },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceDim,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.stackLg,
  },
  emptyTitle: { ...typography.headlineLgMobile, color: colors.onSurface, marginBottom: spacing.stackSm },
  emptySubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.stackLg },
  createButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm,
    backgroundColor: colors.primaryContainer, height: 56, paddingHorizontal: spacing.stackLg,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  createButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase', fontWeight: '700' },
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.stackSm,
  },
  emptyStateText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
});
