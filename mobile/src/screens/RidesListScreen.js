import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { ridesAPI, invitationsAPI } from '../api';
import { useAuth } from '../context/AuthContext';

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

function RideCard({ ride, onPress, onInvite, onDelete, isCreator }) {
  const dateStr = new Date(ride.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = new Date(`2000-01-01T${ride.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const statusColors = {
    SCHEDULED: { bg: 'rgba(255,214,0,0.15)', border: 'rgba(255,214,0,0.3)', text: colors.primaryContainer },
    ACTIVE: { bg: 'rgba(76,175,80,0.15)', border: 'rgba(76,175,80,0.3)', text: '#4CAF50' },
    COMPLETED: { bg: 'rgba(158,158,158,0.15)', border: 'rgba(158,158,158,0.3)', text: '#9E9E9E' },
    DRAFT: { bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.2)', text: colors.onSurfaceVariant },
    CANCELLED: { bg: 'rgba(244,67,54,0.15)', border: 'rgba(244,67,54,0.3)', text: '#F44336' },
  };

  const sc = statusColors[ride.status] || statusColors.SCHEDULED;

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
        <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{ride.status}</Text>
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
              <Ionicons name="route" size={16} color={colors.onSurfaceVariant} style={{ marginLeft: spacing.stackMd }} />
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
          {ride.status === 'SCHEDULED' && (
            <TouchableOpacity style={styles.inviteBtn} onPress={() => onInvite(ride)} activeOpacity={0.7}>
              <Ionicons name="person-add-outline" size={16} color={colors.primaryContainer} />
              <Text style={styles.inviteBtnText}>Invite</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RidesListScreen({ navigation }) {
  const { user } = useAuth();
  const [rides, setRides] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

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
      Alert.alert('Error', 'Failed to accept invitation');
    } finally {
      setRespondingId(null);
    }
  };

  const handleDecline = async (invitation) => {
    Alert.alert(
      'Decline Invitation',
      `Decline ride "${invitation.ride_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setRespondingId(invitation.id);
            try {
              await invitationsAPI.respond(invitation.id, 'decline');
              setInvitations(prev => prev.filter(i => i.id !== invitation.id));
            } catch (err) {
              Alert.alert('Error', 'Failed to decline invitation');
            } finally {
              setRespondingId(null);
            }
          },
        },
      ]
    );
  };

  const handleRidePress = (ride) => {
    if (ride.status === 'ACTIVE') {
      navigation.navigate('ActiveRide', { rideId: ride.id });
    } else {
      navigation.navigate('RideSummary', { rideId: ride.id });
    }
  };

  const handleDeleteRide = (ride) => {
    Alert.alert(
      'Delete Ride',
      `Are you sure you want to delete "${ride.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ridesAPI.delete(ride.id);
              setRides(prev => prev.filter(r => r.id !== ride.id));
            } catch (err) {
              const msg = err.response?.data?.error || 'Failed to delete ride';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const hasInvitations = invitations.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topBarButton} />
        <Text style={styles.topBarTitle}>RIDES</Text>
        <TouchableOpacity
          style={styles.topBarButton}
          onPress={() => navigation.navigate('CreateRide')}
        >
          <Ionicons name="add" size={28} color={colors.primaryContainer} />
        </TouchableOpacity>
      </View>

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
              isCreator={item.creator === user?.id}
            />
          )}
          contentContainerStyle={styles.list}
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
  topBarTitle: { ...typography.displayLg, color: colors.primaryContainer, fontSize: 24, textTransform: 'uppercase', letterSpacing: -0.8 },
  list: { padding: spacing.marginMobile, paddingBottom: 100 },

  inviteSection: { marginBottom: spacing.stackLg },
  inviteSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  inviteSectionTitle: { ...typography.labelTechnical, color: colors.primaryContainer, flex: 1 },
  inviteCount: {
    backgroundColor: colors.primaryContainer, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center',
  },
  inviteCountText: { ...typography.labelTechnical, color: colors.onPrimaryContainer, fontSize: 12 },

  inviteCard: {
    backgroundColor: colors.surfaceContainerLowest, borderWidth: 1,
    borderColor: colors.primaryContainer, borderRadius: borderRadius.xl,
    padding: spacing.stackMd, marginBottom: spacing.stackSm,
    gap: spacing.stackSm,
  },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd },
  inviteIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,214,0,0.15)', justifyContent: 'center', alignItems: 'center',
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
  acceptBtnText: { ...typography.labelTechnical, color: colors.onPrimaryContainer, fontSize: 13 },
  declineBtn: { borderWidth: 1, borderColor: colors.error },
  declineBtnText: { ...typography.labelTechnical, color: colors.error, fontSize: 13 },

  listHeader: { ...typography.labelTechnical, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },

  rideCard: {
    backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl, padding: spacing.stackMd, marginBottom: spacing.stackMd,
    gap: spacing.stackSm,
  },
  rideCardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm },
  deleteBtn: {
    width: 32, height: 32, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.error, justifyContent: 'center', alignItems: 'center',
  },
  rideCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rideCardInfo: { flex: 1, gap: 2 },
  rideCardTime: { ...typography.labelTechnical, color: colors.primaryContainer, fontSize: 12 },
  rideCardName: { ...typography.titleMd, color: colors.onSurface },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  statusText: { ...typography.labelTechnical, fontSize: 10 },
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
  inviteBtnText: { ...typography.labelTechnical, color: colors.primaryContainer, fontSize: 12 },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.stackLg,
  },
  emptyTitle: { ...typography.headlineLgMobile, color: colors.onSurface, marginBottom: spacing.stackSm },
  emptySubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.stackLg },
  createButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm,
    backgroundColor: colors.primaryContainer, height: 56, paddingHorizontal: spacing.stackLg,
    borderRadius: borderRadius.lg,
  },
  createButtonText: { ...typography.titleMd, color: colors.onPrimaryContainer, textTransform: 'uppercase' },
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.stackSm,
  },
  emptyStateText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
});
