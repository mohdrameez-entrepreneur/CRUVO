import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { ridesAPI } from '../api';

function RideCard({ ride, onPress, onInvite }) {
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
    <TouchableOpacity style={styles.rideCard} onPress={onPress} activeOpacity={0.7}>
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
        {ride.status === 'SCHEDULED' && (
          <TouchableOpacity style={styles.inviteBtn} onPress={() => onInvite(ride)} activeOpacity={0.7}>
            <Ionicons name="person-add-outline" size={16} color={colors.primaryContainer} />
            <Text style={styles.inviteBtnText}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function RidesListScreen({ navigation }) {
  const [rides, setRides] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRides = async () => {
    try {
      const res = await ridesAPI.list();
      setRides(res.data);
    } catch (err) {
      console.log('LOAD RIDES ERROR:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadRides);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRides();
    setRefreshing(false);
  };

  const handleRidePress = (ride) => {
    if (ride.status === 'ACTIVE') {
      navigation.navigate('ActiveRide', { rideId: ride.id });
    } else {
      navigation.navigate('RideSummary', { rideId: ride.id });
    }
  };

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
      ) : rides.length === 0 ? (
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
            <Ionicons name="add-road" size={20} color={colors.onPrimaryContainer} />
            <Text style={styles.createButtonText}>CREATE A RIDE</Text>
          </TouchableOpacity>
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
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryContainer} />}
          ListHeaderComponent={
            <Text style={styles.listHeader}>{rides.length} ride{rides.length !== 1 ? 's' : ''}</Text>
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
  listHeader: { ...typography.labelTechnical, color: colors.onSurfaceVariant, marginBottom: spacing.stackMd },
  rideCard: {
    backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl, padding: spacing.stackMd, marginBottom: spacing.stackMd,
    gap: spacing.stackSm,
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
