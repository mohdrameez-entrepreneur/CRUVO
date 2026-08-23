import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, scale, moderateScale } from '../theme';
import UserAvatar from './UserAvatar';
import GlassModal from './GlassModal';

export default function ProfileSummaryModal({
  visible,
  rider,
  currentUserId,
  onClose,
  onSendRequest,
  onRespondRequest,
  onRemoveFriend,
  onEditProfile,
  actionLoading,
}) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  if (!rider) return null;

  const p = rider.profile || {};
  const isOwnProfile = String(rider.id) === String(currentUserId);
  const status = rider.friendship_status || (isOwnProfile ? 'SELF' : 'NONE');
  const bikeText = [p.bike_make, p.bike_model].filter(Boolean).join(' ');

  const hasEmail = Boolean(p.email);
  const hasPhone = Boolean(p.phone);

  const handleCall = () => {
    if (p.phone) {
      Linking.openURL(`tel:${p.phone}`).catch(() => {
        Alert.alert('Error', 'Unable to initiate phone call');
      });
    }
  };

  const handleEmail = () => {
    if (p.email) {
      Linking.openURL(`mailto:${p.email}`).catch(() => {
        Alert.alert('Error', 'Unable to open mail client');
      });
    }
  };

  const confirmRemove = () => {
    setShowRemoveConfirm(false);
    if (onRemoveFriend) {
      onRemoveFriend(rider.friendship_id || rider.id);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalCard}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {isOwnProfile ? 'YOUR PROFILE' : status === 'ACCEPTED' ? 'FRIEND' : 'RIDER PROFILE'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar & Name Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrapper}>
                <UserAvatar
                  avatarUrl={p.avatar_url}
                  name={p.display_name}
                  initials={p.initials}
                  id={rider.id}
                  size={76}
                />
              </View>

              <Text style={styles.displayName} numberOfLines={1}>
                {p.display_name || rider.username || 'Rider'}
              </Text>
              <Text style={styles.username}>@{rider.username || 'rider'}</Text>

              {p.location_city ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={colors.primaryContainer} />
                  <Text style={styles.locationText}>{p.location_city}</Text>
                </View>
              ) : null}
            </View>

            {/* Bio Card */}
            {p.bio ? (
              <View style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="document-text-outline" size={16} color={colors.primaryContainer} />
                  <Text style={styles.cardTitle}>ABOUT</Text>
                </View>
                <Text style={styles.bioText}>{p.bio}</Text>
              </View>
            ) : null}

            {/* Motorcycle & Riding Info */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="speedometer-outline" size={16} color={colors.primaryContainer} />
                <Text style={styles.cardTitle}>RIDE & STYLE</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bike</Text>
                <Text style={styles.detailValue}>{bikeText || 'Motorcycle enthusiast'}</Text>
              </View>

              <View style={styles.chipsRow}>
                {p.riding_style ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipLabel}>STYLE: </Text>
                    <Text style={styles.chipValue}>{p.riding_style}</Text>
                  </View>
                ) : null}

                {p.experience_level ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipLabel}>LEVEL: </Text>
                    <Text style={styles.chipValue}>{p.experience_level}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Contact Details (Strict Privacy Filtered) */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.primaryContainer} />
                <Text style={styles.cardTitle}>CONTACT INFO & PRIVACY</Text>
              </View>

              {isOwnProfile ? (
                <>
                  {/* Owner View: Show email & phone with their actual privacy statuses */}
                  <View style={styles.contactRow}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="mail-outline" size={16} color={colors.primaryContainer} />
                    </View>
                    <View style={styles.contactInfo}>
                      <View style={styles.contactHeaderRow}>
                        <Text style={styles.contactLabel}>Email</Text>
                        <View style={[styles.miniPrivacyPill, p.is_email_public ? styles.pillPublic : styles.pillPrivate]}>
                          <Text style={[styles.miniPrivacyText, p.is_email_public ? styles.pillTextPublic : styles.pillTextPrivate]}>
                            {p.is_email_public ? '👥 FRIENDS ONLY' : '🔒 PRIVATE (ONLY YOU)'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.contactValue}>{p.email || 'No email set'}</Text>
                    </View>
                  </View>

                  <View style={styles.contactRow}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="call-outline" size={16} color={colors.primaryContainer} />
                    </View>
                    <View style={styles.contactInfo}>
                      <View style={styles.contactHeaderRow}>
                        <Text style={styles.contactLabel}>Phone Number</Text>
                        <View style={[styles.miniPrivacyPill, p.is_phone_public ? styles.pillPublic : styles.pillPrivate]}>
                          <Text style={[styles.miniPrivacyText, p.is_phone_public ? styles.pillTextPublic : styles.pillTextPrivate]}>
                            {p.is_phone_public ? '👥 FRIENDS ONLY' : '🔒 PRIVATE (ONLY YOU)'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.contactValue}>{p.phone || 'No phone set'}</Text>
                    </View>
                  </View>

                  <View style={styles.ownerPrivacyHint}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.outline} />
                    <Text style={styles.ownerPrivacyHintText}>
                      Fields marked Private are strictly hidden and never shown to other riders.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  {/* Other Rider View: Only render what backend returned (if public) */}
                  {hasEmail ? (
                    <TouchableOpacity style={styles.contactRow} onPress={handleEmail} activeOpacity={0.7}>
                      <View style={styles.contactIcon}>
                        <Ionicons name="mail-outline" size={16} color={colors.primaryContainer} />
                      </View>
                      <View style={styles.contactInfo}>
                        <View style={styles.contactHeaderRow}>
                          <Text style={styles.contactLabel}>Email</Text>
                          <View style={[styles.miniPrivacyPill, styles.pillPublic]}>
                            <Text style={[styles.miniPrivacyText, styles.pillTextPublic]}>👥 FRIENDS ONLY</Text>
                          </View>
                        </View>
                        <Text style={styles.contactValue}>{p.email}</Text>
                      </View>
                      <Ionicons name="send-outline" size={14} color={colors.primaryContainer} />
                    </TouchableOpacity>
                  ) : null}

                  {hasPhone ? (
                    <TouchableOpacity style={styles.contactRow} onPress={handleCall} activeOpacity={0.7}>
                      <View style={styles.contactIcon}>
                        <Ionicons name="call-outline" size={16} color={colors.primaryContainer} />
                      </View>
                      <View style={styles.contactInfo}>
                        <View style={styles.contactHeaderRow}>
                          <Text style={styles.contactLabel}>Phone</Text>
                          <View style={[styles.miniPrivacyPill, styles.pillPublic]}>
                            <Text style={[styles.miniPrivacyText, styles.pillTextPublic]}>👥 FRIENDS ONLY</Text>
                          </View>
                        </View>
                        <Text style={styles.contactValue}>{p.phone}</Text>
                      </View>
                      <Ionicons name="call" size={14} color={colors.primaryContainer} />
                    </TouchableOpacity>
                  ) : null}

                  {!hasEmail && !hasPhone ? (
                    <View style={styles.privateNotice}>
                      <Ionicons name="lock-closed" size={16} color={colors.primaryContainer} />
                      <Text style={styles.privateNoticeText}>
                        This rider has kept their contact details private.
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            {isOwnProfile ? (
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => {
                  onClose();
                  if (onEditProfile) onEditProfile();
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={16} color={colors.onPrimaryContainer} />
                <Text style={styles.primaryActionText}>EDIT PROFILE</Text>
              </TouchableOpacity>
            ) : status === 'ACCEPTED' ? (
              <View style={styles.friendsActionRow}>
                <View style={styles.connectedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.connectedText}>CONNECTED FRIENDS</Text>
                </View>

                <TouchableOpacity
                  style={styles.removeFriendBtn}
                  onPress={() => setShowRemoveConfirm(true)}
                  disabled={actionLoading === rider.id}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-remove-outline" size={15} color="#ff5252" />
                  <Text style={styles.removeFriendText}>REMOVE</Text>
                </TouchableOpacity>
              </View>
            ) : status === 'RECEIVED_PENDING' ? (
              <View style={styles.binaryActionRow}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => onRespondRequest && onRespondRequest(rider.friendship_id, 'accept')}
                  disabled={actionLoading === rider.id}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                  <Text style={styles.acceptBtnText}>ACCEPT REQUEST</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => onRespondRequest && onRespondRequest(rider.friendship_id, 'decline')}
                  disabled={actionLoading === rider.id}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={16} color="#ff5252" />
                  <Text style={styles.declineBtnText}>DECLINE</Text>
                </TouchableOpacity>
              </View>
            ) : status === 'SENT_PENDING' ? (
              <View style={styles.pendingActionWrap}>
                <Ionicons name="time-outline" size={16} color={colors.primaryContainer} />
                <Text style={styles.pendingActionText}>FRIEND REQUEST PENDING</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => onSendRequest && onSendRequest(rider.id)}
                disabled={actionLoading === rider.id}
                activeOpacity={0.85}
              >
                {actionLoading === rider.id ? (
                  <ActivityIndicator size="small" color={colors.onPrimaryContainer} />
                ) : (
                  <>
                    <Ionicons name="person-add" size={16} color={colors.onPrimaryContainer} />
                    <Text style={styles.primaryActionText}>ADD FRIEND</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Remove Confirmation Dialog */}
      <GlassModal
        visible={showRemoveConfirm}
        type="danger"
        icon="person-remove-outline"
        badge="REMOVE FRIEND"
        title={`Remove ${p.display_name || rider.username}?`}
        message="Are you sure you want to remove this rider from your friends? You will no longer be able to invite each other to private rides."
        confirmText="REMOVE FRIEND"
        cancelText="KEEP FRIEND"
        onConfirm={confirmRemove}
        onCancel={() => setShowRemoveConfirm(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: 'rgba(20, 22, 27, 0.98)',
    borderTopLeftRadius: borderRadius.xl + 6,
    borderTopRightRadius: borderRadius.xl + 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '88%',
    paddingBottom: spacing.stackLg,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackMd,
    paddingBottom: spacing.stackSm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: moderateScale(10),
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.marginMobile,
  },
  scrollContent: {
    paddingBottom: spacing.stackMd,
    gap: spacing.stackMd,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.stackSm,
    gap: 2,
  },
  avatarWrapper: {
    marginBottom: spacing.stackSm,
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    borderRadius: 999,
    padding: 2,
  },
  displayName: {
    ...typography.headlineLgMobile,
    color: colors.onSurface,
    fontSize: moderateScale(18),
    fontWeight: '800',
  },
  username: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: moderateScale(12),
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(12),
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: borderRadius.lg,
    padding: spacing.stackMd,
    gap: spacing.stackSm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  cardTitle: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: moderateScale(11),
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  bioText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(18),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: moderateScale(13),
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.stackSm,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  chipLabel: {
    ...typography.labelTechnical,
    color: colors.outline,
    fontSize: moderateScale(9),
    fontWeight: '700',
  },
  chipValue: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: moderateScale(10),
    fontWeight: '800',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm + 2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: spacing.stackSm + 2,
    borderRadius: borderRadius.md,
  },
  contactIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  contactLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: moderateScale(10),
  },
  contactValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  miniPrivacyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  pillPublic: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.35)',
  },
  pillPrivate: {
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    borderColor: 'rgba(255, 214, 0, 0.3)',
  },
  miniPrivacyText: {
    ...typography.labelTechnical,
    fontSize: moderateScale(8),
    fontWeight: '800',
  },
  pillTextPublic: {
    color: '#4CAF50',
  },
  pillTextPrivate: {
    color: colors.primaryContainer,
  },
  ownerPrivacyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  ownerPrivacyHintText: {
    flex: 1,
    ...typography.labelSm,
    color: colors.outline,
    fontSize: moderateScale(10),
  },
  privateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  privateNoticeText: {
    flex: 1,
    ...typography.labelSm,
    color: colors.outline,
    fontSize: moderateScale(11),
  },
  footer: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackSm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryContainer,
    height: 48,
    borderRadius: borderRadius.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryActionText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
    fontSize: moderateScale(13),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  friendsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm + 4,
  },
  connectedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.35)',
    height: 48,
    borderRadius: borderRadius.lg,
  },
  connectedText: {
    ...typography.labelTechnical,
    color: '#4CAF50',
    fontSize: moderateScale(11),
    fontWeight: '800',
  },
  removeFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.35)',
    paddingHorizontal: spacing.stackMd,
    height: 48,
    borderRadius: borderRadius.lg,
  },
  removeFriendText: {
    ...typography.labelTechnical,
    color: '#ff5252',
    fontSize: moderateScale(11),
    fontWeight: '800',
  },
  binaryActionRow: {
    flexDirection: 'row',
    gap: spacing.stackSm + 4,
  },
  acceptBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    height: 48,
    borderRadius: borderRadius.lg,
  },
  acceptBtnText: {
    ...typography.labelTechnical,
    color: '#ffffff',
    fontSize: moderateScale(12),
    fontWeight: '800',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.35)',
    height: 48,
    borderRadius: borderRadius.lg,
  },
  declineBtnText: {
    ...typography.labelTechnical,
    color: '#ff5252',
    fontSize: moderateScale(12),
    fontWeight: '800',
  },
  pendingActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.35)',
    height: 48,
    borderRadius: borderRadius.lg,
  },
  pendingActionText: {
    ...typography.labelTechnical,
    color: colors.primaryContainer,
    fontSize: moderateScale(11),
    fontWeight: '800',
  },
});
