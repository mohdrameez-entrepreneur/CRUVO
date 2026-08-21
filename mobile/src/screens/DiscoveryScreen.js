import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { discoveryAPI } from '../api';

function RiderCard({ rider }) {
  const p = rider.profile;
  return (
    <View style={styles.riderCard}>
      <View style={styles.riderHeader}>
        <View style={styles.riderAvatar}>
          <Text style={styles.riderInitials}>{p?.initials || '??'}</Text>
        </View>
        <View style={styles.riderInfo}>
          <Text style={styles.riderName}>{p?.display_name}</Text>
          <Text style={styles.riderBike}>{p?.bike_make} {p?.bike_model}</Text>
          <Text style={styles.riderLocation}>{p?.location_city || 'Unknown location'}</Text>
        </View>
      </View>
      <View style={styles.riderTags}>
        {p?.riding_style ? <View style={styles.tag}><Text style={styles.tagText}>{p.riding_style}</Text></View> : null}
        {p?.experience_level ? <View style={styles.tag}><Text style={styles.tagText}>{p.experience_level}</Text></View> : null}
      </View>
      <TouchableOpacity style={styles.inviteButton} activeOpacity={0.8}>
        <Ionicons name="person-add-outline" size={18} color={colors.onPrimaryContainer} />
        <Text style={styles.inviteButtonText}>Invite</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DiscoveryScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchRiders = async (q = '') => {
    setLoading(true);
    try {
      const res = await discoveryAPI.searchRiders(q);
      setRiders(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { searchRiders(); }, []);

  const handleSearch = () => searchRiders(query);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarButton}>
          <Ionicons name="menu" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>IGNITION</Text>
        <TouchableOpacity style={styles.topBarButton}>
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search riders, bikes, locations..."
            placeholderTextColor={colors.outline}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="mic" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterSection}>
        <TouchableOpacity style={styles.filterChipActive}>
          <Text style={styles.filterChipTextActive}>Filters</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Ionicons name="location" size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.filterChipText}>Nearby (50km)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Style: ADV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Bike: Royal Enfield</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Exp: Veteran</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={riders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <RiderCard rider={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.outline} />
            <Text style={styles.emptyStateText}>No riders found</Text>
          </View>
        }
      />
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
  searchSection: { padding: spacing.marginMobile, paddingBottom: spacing.stackSm },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.lg,
    height: spacing.touchTargetMin, paddingHorizontal: spacing.stackMd, gap: spacing.stackSm,
  },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  filterSection: {
    flexDirection: 'row', paddingHorizontal: spacing.marginMobile, paddingBottom: spacing.stackMd,
    gap: spacing.stackSm, flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  filterChipActive: {
    paddingHorizontal: spacing.stackMd, paddingVertical: spacing.stackSm,
    borderRadius: borderRadius.lg, backgroundColor: colors.primaryContainer,
  },
  filterChipText: { ...typography.labelTechnical, color: colors.onSurfaceVariant, fontSize: 12 },
  filterChipTextActive: { ...typography.labelTechnical, color: colors.onPrimaryContainer, fontSize: 12 },
  listContent: { padding: spacing.marginMobile, paddingBottom: 100, gap: spacing.stackMd },
  riderCard: {
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl, padding: spacing.stackMd, gap: spacing.stackMd,
  },
  riderHeader: { flexDirection: 'row', gap: spacing.stackMd },
  riderAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.outlineVariant,
  },
  riderInitials: { ...typography.labelTechnical, color: colors.primaryContainer },
  riderInfo: { flex: 1, gap: 2 },
  riderName: { ...typography.titleMd, color: colors.onSurface },
  riderBike: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  riderLocation: { ...typography.labelSm, color: colors.outline },
  riderTags: { flexDirection: 'row', gap: spacing.stackSm, flexWrap: 'wrap' },
  tag: {
    paddingHorizontal: spacing.stackSm, paddingVertical: 2,
    borderRadius: borderRadius.sm, backgroundColor: 'rgba(255,214,0,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,214,0,0.2)',
  },
  tagText: { ...typography.labelTechnical, color: colors.primaryContainer, fontSize: 11 },
  inviteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.stackSm,
    backgroundColor: colors.primaryContainer, height: 44, borderRadius: borderRadius.lg,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 4,
  },
  inviteButtonText: { ...typography.labelTechnical, color: colors.onPrimaryContainer },
  emptyState: { alignItems: 'center', gap: spacing.stackMd, padding: spacing.stackLg * 2 },
  emptyStateText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
});
