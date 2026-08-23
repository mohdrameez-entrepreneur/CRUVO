import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, moderateScale } from '../theme';
import { discoveryAPI, friendsAPI } from '../api';
import UserAvatar from '../components/UserAvatar';
import NavBar from '../components/NavBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: screenHeight } = Dimensions.get('window');

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
  const insets = useSafeAreaInsets();
  const [local, setLocal] = useState(filters);

  useEffect(() => {
    setLocal(filters);
  }, [visible, filters]);

  const toggle = (key, value) => {
    setLocal(prev => ({ ...prev, [key]: prev[key] === value ? '' : value }));
  };

  const activeCount = Object.values(local).filter(Boolean).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Text style={styles.modalTitle}>SEARCH FILTERS</Text>
              {activeCount > 0 && (
                <View style={styles.modalBadge}>
                  <Text style={styles.modalBadgeText}>{activeCount} ACTIVE</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.closeIconBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Filters Content */}
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Riding Style */}
            <Text style={styles.filterLabel}>RIDING STYLE</Text>
            <View style={styles.chipRow}>
              {RIDING_STYLES.map(s => (
                <FilterChip
                  key={s}
                  label={s}
                  active={local.style === s}
                  onPress={() => toggle('style', s)}
                />
              ))}
            </View>

            {/* Experience Level */}
            <Text style={styles.filterLabel}>EXPERIENCE LEVEL</Text>
            <View style={styles.chipRow}>
              {EXPERIENCE_LEVELS.map(e => (
                <FilterChip
                  key={e}
                  label={e}
                  active={local.experience === e}
                  onPress={() => toggle('experience', e)}
                />
              ))}
            </View>

            {/* Location */}
            <Text style={styles.filterLabel}>LOCATION CITY</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={18} color={colors.onSurfaceVariant} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Mumbai, Delhi, Bengaluru..."
                placeholderTextColor={colors.outline}
                value={local.location}
                onChangeText={v => setLocal(prev => ({ ...prev, location: v }))}
              />
              {local.location ? (
                <TouchableOpacity onPress={() => setLocal(prev => ({ ...prev, location: '' }))}>
                  <Ionicons name="close-circle" size={16} color={colors.outline} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Bike Make / Model */}
            <Text style={styles.filterLabel}>BIKE MAKE & MODEL</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="bicycle-outline" size={18} color={colors.onSurfaceVariant} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Royal Enfield, BMW, Ducati..."
                placeholderTextColor={colors.outline}
                value={local.bike}
                onChangeText={v => setLocal(prev => ({ ...prev, bike: v }))}
              />
              {local.bike ? (
                <TouchableOpacity onPress={() => setLocal(prev => ({ ...prev, bike: '' }))}>
                  <Ionicons name="close-circle" size={16} color={colors.outline} />
                </TouchableOpacity>
              ) : null}
            </View>
          </ScrollView>

          {/* Fixed Non-Overlapping Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                onClear();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.clearBtnText}>CLEAR ALL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                onApply(local);
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.applyBtnText}>APPLY FILTERS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RiderCard({ rider, onSendRequest, onRespondRequest, actionLoading }) {
  const p = rider.profile;
  const status = rider.friendship_status || 'NONE';
  const isReceivedPending = status === 'RECEIVED_PENDING';

  return (
    <View style={[styles.riderCard, isReceivedPending && styles.riderCardPending]}>
      <View style={styles.riderHeader}>
        <UserAvatar
          avatarUrl={p?.avatar_url}
          name={p?.display_name}
          initials={p?.initials}
          id={rider.id}
          size={48}
        />
        <View style={styles.riderInfo}>
          <Text style={styles.riderName} numberOfLines={1} ellipsizeMode="tail">
            {p?.display_name || 'Rider'}
          </Text>
          <Text style={styles.riderBike} numberOfLines={1} ellipsizeMode="tail">
            {[p?.bike_make, p?.bike_model].filter(Boolean).join(' ') || 'Motorcycle enthusiast'}
          </Text>
          <Text style={styles.riderLocation} numberOfLines={1} ellipsizeMode="tail">
            <Ionicons name="location-outline" size={12} color={colors.outline} /> {p?.location_city || 'Worldwide'}
          </Text>
        </View>

        {/* Friend Action Button / Status (when not pending response) */}
        {!isReceivedPending && (
          <View style={styles.actionWrap}>
            {status === 'ACCEPTED' ? (
              <View style={styles.friendsBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={styles.friendsText}>FRIENDS</Text>
              </View>
            ) : status === 'SENT_PENDING' ? (
              <View style={styles.pendingBadge}>
                <Ionicons name="time-outline" size={14} color={colors.primaryContainer} />
                <Text style={styles.pendingText}>REQUEST SENT</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addFriendBtn}
                onPress={() => onSendRequest(rider.id)}
                disabled={actionLoading === rider.id}
                activeOpacity={0.85}
              >
                <Ionicons name="person-add" size={14} color={colors.onPrimaryContainer} />
                <Text style={styles.addFriendText}>ADD FRIEND</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isReceivedPending && (
          <View style={styles.incomingTagBadge}>
            <Ionicons name="mail-unread-outline" size={12} color={colors.primaryContainer} />
            <Text style={styles.incomingTagText}>REQUEST</Text>
          </View>
        )}
      </View>

      {/* When Received Pending: Wide, dedicated Action Row so the name has 100% space and never wraps */}
      {isReceivedPending && (
        <View style={styles.requestActionRow}>
          <TouchableOpacity
            style={styles.acceptActionBtn}
            onPress={() => onRespondRequest(rider.friendship_id, 'accept')}
            disabled={actionLoading === rider.id}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={14} color="#ffffff" />
            <Text style={styles.acceptActionText}>ACCEPT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineActionBtn}
            onPress={() => onRespondRequest(rider.friendship_id, 'decline')}
            disabled={actionLoading === rider.id}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={14} color="#ff5252" />
            <Text style={styles.declineActionText}>DECLINE</Text>
          </TouchableOpacity>
        </View>
      )}

      {(p?.riding_style || p?.experience_level) && (
        <View style={styles.riderTags}>
          {p?.riding_style ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{p.riding_style}</Text>
            </View>
          ) : null}
          {p?.experience_level ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{p.experience_level}</Text>
            </View>
          ) : null}
        </View>
      )}
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
  const [actionLoading, setActionLoading] = useState(null);
  const [notificationToast, setNotificationToast] = useState(null);
  const debounceRef = useRef(null);

  const searchRiders = useCallback(async (q, f) => {
    setLoading(true);
    try {
      const res = await discoveryAPI.searchRiders(q, f);
      setRiders(res.data);
    } catch {}
    setLoading(false);
  }, []);

  const checkFriendNotifications = useCallback(async () => {
    try {
      const res = await friendsAPI.getRequests();
      const incoming = res.data.incoming || [];
      const accepted = res.data.accepted_notifications || [];
      if (incoming.length > 0) {
        const latest = incoming[0];
        setNotificationToast(`You received a friend request from ${latest.sender_name || 'a rider'}!`);
      } else if (accepted.length > 0) {
        const latest = accepted[0];
        setNotificationToast(`${latest.receiver_name} accepted your friend request!`);
      }
    } catch {}
  }, []);

  useEffect(() => {
    searchRiders('', {});
    checkFriendNotifications();
  }, []);

  const handleSendFriendRequest = async (userId) => {
    setActionLoading(userId);
    try {
      const res = await friendsAPI.sendRequest(userId);
      setRiders(prev => prev.map(r => r.id === userId ? {
        ...r,
        friendship_status: 'SENT_PENDING',
        friendship_id: res.data.id,
      } : r));
    } catch (err) {
      console.warn('Friend request failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRespondFriendRequest = async (friendshipId, action) => {
    const targetRider = riders.find(r => r.friendship_id === friendshipId);
    const targetId = targetRider ? targetRider.id : null;
    if (targetId) setActionLoading(targetId);

    try {
      const res = await friendsAPI.respondRequest(friendshipId, action);
      const newStatus = res.data.status === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED';
      setRiders(prev => prev.map(r => r.friendship_id === friendshipId ? {
        ...r,
        friendship_status: newStatus,
        is_friend: newStatus === 'ACCEPTED',
      } : r));

      if (action === 'accept' && targetRider) {
        setNotificationToast(`You are now friends with ${targetRider.profile?.display_name || targetRider.username}!`);
      }
    } catch (err) {
      console.warn('Respond friend request failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTextChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchRiders(text, filters), 350);
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
      <NavBar
        title="EXPLORE"
        subtitle="DISCOVER RIDERS & CREWS"
        badge={riders.length > 0 ? `${riders.length} FOUND` : undefined}
      />

      {notificationToast && (
        <View style={styles.notificationToast}>
          <Ionicons name="sparkles" size={18} color="#ffd600" />
          <Text style={styles.toastText} numberOfLines={1}>{notificationToast}</Text>
          <TouchableOpacity onPress={() => setNotificationToast(null)}>
            <Ionicons name="close" size={18} color={colors.onSurface} />
          </TouchableOpacity>
        </View>
      )}

      {/* Search Input Section */}
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

      {/* Horizontal Active Filter Chips Section */}
      <View style={styles.filterSectionWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, styles.filterChipPrimary, activeFilterCount > 0 && styles.filterChipActive]}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="options"
              size={15}
              color={activeFilterCount > 0 ? colors.onPrimaryContainer : colors.primaryContainer}
            />
            <Text style={[styles.filterChipText, styles.filterChipTextActive]}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>

          {filters.style ? (
            <FilterChip
              label={filters.style}
              active
              onPress={() => handleApplyFilters({ ...filters, style: '' })}
            />
          ) : null}

          {filters.experience ? (
            <FilterChip
              label={filters.experience}
              active
              onPress={() => handleApplyFilters({ ...filters, experience: '' })}
            />
          ) : null}

          {filters.location ? (
            <FilterChip
              label={filters.location}
              icon="location"
              active
              onPress={() => handleApplyFilters({ ...filters, location: '' })}
            />
          ) : null}

          {filters.bike ? (
            <FilterChip
              label={filters.bike}
              active
              onPress={() => handleApplyFilters({ ...filters, bike: '' })}
            />
          ) : null}
        </ScrollView>
      </View>

      {/* Riders List */}
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primaryContainer} />
          <Text style={styles.emptyStateText}>Searching riders...</Text>
        </View>
      ) : (
        <FlatList
          data={riders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
          renderItem={({ item }) => (
            <RiderCard
              rider={item}
              onSendRequest={handleSendFriendRequest}
              onRespondRequest={handleRespondFriendRequest}
              actionLoading={actionLoading}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.outline} />
              <Text style={styles.emptyStateText}>No riders found</Text>
              <Text style={styles.emptyStateSubtext}>Try refining or clearing your search filters</Text>
            </View>
          }
        />
      )}

      {/* Clean Glassmorphic Filter Modal */}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchSection: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackSm + 4,
    paddingBottom: spacing.stackSm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg,
    height: 48,
    paddingHorizontal: spacing.stackMd,
    gap: spacing.stackSm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  filterSectionWrapper: {
    paddingBottom: spacing.stackSm + 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterScroll: {
    paddingHorizontal: spacing.marginMobile,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 7,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  filterChipPrimary: {
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    borderColor: 'rgba(255, 214, 0, 0.3)',
  },
  filterChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  filterChipText: {
    ...typography.labelTechnical,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(11),
  },
  filterChipTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.marginMobile,
    gap: spacing.stackMd,
  },
  riderCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.xl,
    padding: spacing.stackMd,
    gap: spacing.stackSm + 4,
  },
  riderHeader: {
    flexDirection: 'row',
    gap: spacing.stackMd,
    alignItems: 'center',
  },
  riderInfo: {
    flex: 1,
    gap: 2,
  },
  riderName: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
  riderBike: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(13),
  },
  riderLocation: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: moderateScale(11),
  },
  riderTags: {
    flexDirection: 'row',
    gap: spacing.stackSm,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: spacing.stackSm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.25)',
  },
  tagText: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: moderateScale(10),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    padding: spacing.stackLg * 2,
    marginTop: 20,
  },
  emptyStateText: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: moderateScale(16),
  },
  emptyStateSubtext: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(13),
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: 'rgba(22, 24, 29, 0.98)',
    borderTopLeftRadius: borderRadius.xl + 4,
    borderTopRightRadius: borderRadius.xl + 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: screenHeight * 0.82,
    paddingTop: spacing.stackMd,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    ...typography.displayLg,
    color: colors.primaryContainer,
    fontSize: moderateScale(16),
    letterSpacing: -0.4,
  },
  modalBadge: {
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
  },
  modalBadgeText: {
    ...typography.labelTechnical,
    fontSize: moderateScale(9),
    color: colors.primaryContainer,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackMd,
    paddingBottom: spacing.stackLg,
    gap: spacing.stackSm,
  },
  filterLabel: {
    ...typography.labelTechnical,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(11),
    letterSpacing: 0.8,
    marginTop: spacing.stackSm,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.stackSm,
    marginBottom: spacing.stackSm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.stackMd,
    height: 48,
    gap: spacing.stackSm,
    marginBottom: spacing.stackSm,
  },
  textInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.stackMd,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackMd,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(22, 24, 29, 0.98)',
  },
  clearBtn: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    ...typography.labelTechnical,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  applyBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  applyBtnText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
    fontSize: moderateScale(13),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionWrap: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.stackSm + 4,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  addFriendText: {
    ...typography.labelTechnical,
    color: colors.onPrimaryContainer,
    fontSize: moderateScale(11),
    fontWeight: '800',
  },
  friendsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.35)',
    paddingHorizontal: spacing.stackSm + 4,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
  },
  friendsText: {
    ...typography.labelTechnical,
    color: '#4CAF50',
    fontSize: moderateScale(11),
    fontWeight: '800',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.35)',
    paddingHorizontal: spacing.stackSm + 4,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
  },
  pendingText: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: moderateScale(10),
    fontWeight: '700',
  },
  riderCardPending: {
    borderColor: 'rgba(255, 214, 0, 0.35)',
    backgroundColor: 'rgba(255, 214, 0, 0.04)',
  },
  incomingTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  incomingTagText: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: moderateScale(9),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  requestActionRow: {
    flexDirection: 'row',
    gap: spacing.stackSm + 2,
    marginTop: 2,
  },
  acceptActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  acceptActionText: {
    ...typography.labelTechnical,
    color: '#ffffff',
    fontSize: moderateScale(11),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  declineActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.35)',
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  declineActionText: {
    ...typography.labelTechnical,
    color: '#ff5252',
    fontSize: moderateScale(11),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  binaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  acceptBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: spacing.stackSm + 2,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
  },
  acceptText: {
    ...typography.labelTechnical,
    color: '#ffffff',
    fontSize: moderateScale(10),
    fontWeight: '800',
  },
  declineBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.4)',
    paddingHorizontal: spacing.stackSm + 2,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
  },
  declineText: {
    ...typography.labelTechnical,
    color: '#ff5252',
    fontSize: moderateScale(10),
    fontWeight: '800',
  },
  notificationToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.35)',
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.stackSm,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 10,
  },
  toastText: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
});
