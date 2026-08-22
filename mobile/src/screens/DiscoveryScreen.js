import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import { discoveryAPI } from '../api';
import UserAvatar from '../components/UserAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RIDING_STYLES = ['ADVENTURE', 'SPORT', 'TOURING', 'CRUISE', 'COMMUTE'];
const EXPERIENCE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'VETERAN', 'EXPERT'];

function FilterChip({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon && <Ionicons name={icon} size={14} color={active ? colors.onPrimaryContainer : colors.onSurfaceVariant} />}
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterModal({ visible, filters, onApply, onClear, onClose }) {
  const [local, setLocal] = useState(filters);

  useEffect(() => { setLocal(filters); }, [visible]);

  if (!visible) return null;

  const toggle = (key, value) => {
    setLocal(prev => ({ ...prev, [key]: prev[key] === value ? '' : value }));
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>FILTERS</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <Text style={styles.filterLabel}>RIDING STYLE</Text>
        <View style={styles.filterGroup}>
          {RIDING_STYLES.map(s => (
            <FilterChip key={s} label={s} active={local.style === s} onPress={() => toggle('style', s)} />
          ))}
        </View>

        <Text style={styles.filterLabel}>EXPERIENCE</Text>
        <View style={styles.filterGroup}>
          {EXPERIENCE_LEVELS.map(e => (
            <FilterChip key={e} label={e} active={local.experience === e} onPress={() => toggle('experience', e)} />
          ))}
        </View>

        <Text style={styles.filterLabel}>LOCATION</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="e.g. Delhi, Mumbai..."
          placeholderTextColor={colors.outline}
          value={local.location}
          onChangeText={v => setLocal(prev => ({ ...prev, location: v }))}
        />

        <Text style={styles.filterLabel}>BIKE</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="e.g. Royal Enfield, BMW..."
          placeholderTextColor={colors.outline}
          value={local.bike}
          onChangeText={v => setLocal(prev => ({ ...prev, bike: v }))}
        />

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.clearBtn} onPress={() => { onClear(); onClose(); }}>
            <Text style={styles.clearBtnText}>CLEAR ALL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={() => { onApply(local); onClose(); }}>
            <Text style={styles.applyBtnText}>APPLY</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function RiderCard({ rider }) {
  const p = rider.profile;
  return (
    <View style={styles.riderCard}>
      <View style={styles.riderHeader}>
        <UserAvatar
          avatarUrl={p?.avatar_url}
          name={p?.display_name}
          initials={p?.initials}
          id={rider.id}
          size={44}
        />
        <View style={styles.riderInfo}>
          <Text style={styles.riderName}>{p?.display_name}</Text>
          <Text style={styles.riderBike}>{[p?.bike_make, p?.bike_model].filter(Boolean).join(' ') || 'No bike info'}</Text>
          <Text style={styles.riderLocation}>{p?.location_city || 'Unknown location'}</Text>
        </View>
      </View>
      <View style={styles.riderTags}>
        {p?.riding_style ? <View style={styles.tag}><Text style={styles.tagText}>{p.riding_style}</Text></View> : null}
        {p?.experience_level ? <View style={styles.tag}><Text style={styles.tagText}>{p.experience_level}</Text></View> : null}
      </View>
    </View>
  );
}

export default function DiscoveryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ style: '', experience: '', bike: '', location: '' });
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef(null);

  const searchRiders = useCallback(async (q, f) => {
    setLoading(true);
    try {
      const res = await discoveryAPI.searchRiders(q, f);
      setRiders(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { searchRiders('', {}); }, []);

  const handleTextChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchRiders(text, filters), 400);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    searchRiders(query, newFilters);
  };

  const handleClearFilters = () => {
    setFilters({ style: '', experience: '', bike: '', location: '' });
    searchRiders(query, {});
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.topBarButton}>
          <Ionicons name="menu" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>CRUVO</Text>
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
            onChangeText={handleTextChange}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); searchRiders('', filters); }}>
              <Ionicons name="close-circle" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filterSection}>
        <TouchableOpacity
          style={[styles.filterChip, styles.filterChipPrimary]}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="options" size={14} color={colors.onPrimaryContainer} />
          <Text style={[styles.filterChipText, styles.filterChipTextActive]}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
        {filters.style ? (
          <FilterChip label={filters.style} active onPress={() => handleApplyFilters({ ...filters, style: '' })} />
        ) : null}
        {filters.experience ? (
          <FilterChip label={filters.experience} active onPress={() => handleApplyFilters({ ...filters, experience: '' })} />
        ) : null}
        {filters.location ? (
          <FilterChip label={filters.location} icon="location" active onPress={() => handleApplyFilters({ ...filters, location: '' })} />
        ) : null}
        {filters.bike ? (
          <FilterChip label={filters.bike} active onPress={() => handleApplyFilters({ ...filters, bike: '' })} />
        ) : null}
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primaryContainer} />
          <Text style={styles.emptyStateText}>Searching...</Text>
        </View>
      ) : (
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
      )}

      <FilterModal
        visible={showFilters}
        filters={filters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        onClose={() => setShowFilters(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, minHeight: spacing.touchTargetMin, paddingTop: 0,
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
  filterChipPrimary: {
    backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer,
  },
  filterChipActive: {
    backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer,
  },
  filterChipText: { ...typography.labelTechnical, color: colors.onSurfaceVariant, fontSize: 12 },
  filterChipTextActive: { color: colors.onPrimaryContainer },
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
  emptyState: { alignItems: 'center', gap: spacing.stackMd, padding: spacing.stackLg * 2 },
  emptyStateText: { ...typography.bodyMd, color: colors.onSurfaceVariant },

  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceContainer, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    padding: spacing.marginMobile, paddingBottom: 50, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.stackLg,
  },
  modalTitle: { ...typography.titleMd, color: colors.onSurface },
  filterLabel: { ...typography.labelTechnical, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm, marginTop: spacing.stackMd },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.stackSm },
  modalInput: {
    backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.stackMd, height: 48,
    ...typography.bodyMd, color: colors.onSurface,
  },
  modalActions: { flexDirection: 'row', gap: spacing.stackMd, marginTop: spacing.stackLg },
  clearBtn: {
    flex: 1, height: 48, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  clearBtnText: { ...typography.labelTechnical, color: colors.onSurfaceVariant },
  applyBtn: {
    flex: 1, height: 48, borderRadius: borderRadius.lg, backgroundColor: colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
  },
  applyBtnText: { ...typography.labelTechnical, color: colors.onPrimaryContainer },
});
