import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import * as Location from 'expo-location';

import { colors, spacing, typography, borderRadius } from '../theme';
import { ridesAPI } from '../api';
import { TOMTOM_API_KEY, TOMTOM_BASE_URL } from '../config';
import AlertCard from '../components/AlertCard';
import GlassModal from '../components/GlassModal';
import CreateRideMap from '../components/CreateRideMap';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_BASE_HEIGHT = SCREEN_HEIGHT * 0.42;
const MINIMIZED_TRANSLATE_Y = SCREEN_HEIGHT * 0.48;

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function formatTime(d) {
  return d.toTimeString().slice(0, 5);
}

export default function CreateRideScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  // Animated Sheet Position
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const isMinimizedRef = useRef(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Form State
  const [form, setForm] = useState({ name: '', is_public: false });
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [activePinMode, setActivePinMode] = useState('origin'); // 'origin' | 'destination'
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [createdRideModal, setCreatedRideModal] = useState(null);

  // Scheduling State
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [scheduledTime, setScheduledTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Autocomplete Search State
  const [originQuery, setOriginQuery] = useState('');
  const [originResults, setOriginResults] = useState([]);
  const [originLoading, setOriginLoading] = useState(false);
  const [showOriginResults, setShowOriginResults] = useState(false);

  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState([]);
  const [destLoading, setDestLoading] = useState(false);
  const [showDestResults, setShowDestResults] = useState(false);

  const [locatingUser, setLocatingUser] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  // Auto-acquire user location on mount and center map
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted || !loc?.coords) return;

        const { latitude, longitude } = loc.coords;
        setUserCoords([latitude, longitude]);

        if (mapRef.current?.flyTo) {
          mapRef.current.flyTo(latitude, longitude, 14);
        }

        // Auto-populate Start Point with current location
        try {
          const reverseRes = await axios.get(`${TOMTOM_BASE_URL}/reverseGeocode/${longitude},${latitude}.json`, {
            params: { key: TOMTOM_API_KEY },
          });
          const address = reverseRes.data.addresses?.[0];
          const name = address?.freeformAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          if (mounted) {
            setOrigin({ name, lat: latitude, lng: longitude });
            setOriginQuery(name);
            setActivePinMode('destination');
          }
        } catch {
          if (mounted) {
            const fallbackName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setOrigin({ name: fallbackName, lat: latitude, lng: longitude });
            setOriginQuery(fallbackName);
            setActivePinMode('destination');
          }
        }
      } catch (err) {
        console.log('[CreateRide] Auto-location error:', err?.message);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Sheet Spring Animation Helpers
  const snapTo = useCallback((toValue, callback) => {
    const minimized = toValue > 50;
    isMinimizedRef.current = minimized;
    setIsMinimized(minimized);
    Animated.spring(sheetTranslateY, {
      toValue,
      friction: 8,
      tension: 45,
      useNativeDriver: true,
    }).start(callback);
  }, [sheetTranslateY]);

  const toggleSheet = useCallback(() => {
    if (isMinimizedRef.current) {
      snapTo(0);
    } else {
      snapTo(MINIMIZED_TRANSLATE_Y);
    }
  }, [snapTo]);

  // Real Gesture PanResponder for drag handle / header
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
      onPanResponderGrant: () => {
        sheetTranslateY.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging between 0 and MINIMIZED_TRANSLATE_Y + 40
        sheetTranslateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        sheetTranslateY.flattenOffset();
        const { dy, vy } = gestureState;

        if (isMinimizedRef.current) {
          // Currently minimized -> if swiped up or released above threshold
          if (dy < -40 || vy < -0.4) {
            snapTo(0);
          } else {
            snapTo(MINIMIZED_TRANSLATE_Y);
          }
        } else {
          // Currently expanded -> if swiped down or released below threshold
          if (dy > 60 || vy > 0.4) {
            snapTo(MINIMIZED_TRANSLATE_Y);
          } else {
            snapTo(0);
          }
        }
      },
    })
  ).current;

  // Search places via TomTom API
  const searchPlaces = useCallback(async (text, isOrigin = true) => {
    if (isOrigin) {
      setOriginQuery(text);
      if (text.length < 3) {
        setOriginResults([]);
        setShowOriginResults(false);
        return;
      }
      setOriginLoading(true);
    } else {
      setDestQuery(text);
      if (text.length < 3) {
        setDestResults([]);
        setShowDestResults(false);
        return;
      }
      setDestLoading(true);
    }

    try {
      const res = await axios.get(`${TOMTOM_BASE_URL}/search/${encodeURIComponent(text)}.json`, {
        params: { key: TOMTOM_API_KEY, limit: 5 },
      });
      const items = res.data.results || [];
      if (isOrigin) {
        setOriginResults(items);
        setShowOriginResults(items.length > 0);
      } else {
        setDestResults(items);
        setShowDestResults(items.length > 0);
      }
    } catch {
      if (isOrigin) setOriginResults([]);
      else setDestResults([]);
    } finally {
      if (isOrigin) setOriginLoading(false);
      else setDestLoading(false);
    }
  }, []);

  // Handle Autocomplete Selection
  const handleSelectSearchResult = (item, isOrigin = true) => {
    const name = item.address.freeformAddress || item.address.municipality || item.address.country || '';
    const lat = item.position.lat;
    const lng = item.position.lon;

    if (isOrigin) {
      setOrigin({ name, lat, lng });
      setOriginQuery(name);
      setShowOriginResults(false);
      setActivePinMode('destination');
    } else {
      setDestination({ name, lat, lng });
      setDestQuery(name);
      setShowDestResults(false);
    }

    if (mapRef.current?.flyTo) {
      mapRef.current.flyTo(lat, lng, 14);
    }
  };

  // Reverse Geocoding when Pin is Tapped/Dropped on Map
  const handlePinDropped = useCallback(async ({ mode, lat, lng }) => {
    try {
      const res = await axios.get(`${TOMTOM_BASE_URL}/reverseGeocode/${lng},${lat}.json`, {
        params: { key: TOMTOM_API_KEY },
      });
      const address = res.data.addresses?.[0];
      const name = address?.freeformAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      if (mode === 'origin') {
        setOrigin({ name, lat, lng });
        setOriginQuery(name);
        if (!destination) {
          setActivePinMode('destination');
        }
      } else {
        setDestination({ name, lat, lng });
        setDestQuery(name);
      }
    } catch {
      const fallbackName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      if (mode === 'origin') {
        setOrigin({ name: fallbackName, lat, lng });
        setOriginQuery(fallbackName);
        if (!destination) setActivePinMode('destination');
      } else {
        setDestination({ name: fallbackName, lat, lng });
        setDestQuery(fallbackName);
      }
    }
  }, [destination]);

  // Jump to Current Device Location
  const handleUseCurrentLocation = async () => {
    setLocatingUser(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use current location');
        setLocatingUser(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;

      const reverseRes = await axios.get(`${TOMTOM_BASE_URL}/reverseGeocode/${longitude},${latitude}.json`, {
        params: { key: TOMTOM_API_KEY },
      });
      const address = reverseRes.data.addresses?.[0];
      const name = address?.freeformAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      setOrigin({ name, lat: latitude, lng: longitude });
      setOriginQuery(name);
      setActivePinMode('destination');

      if (mapRef.current?.flyTo) {
        mapRef.current.flyTo(latitude, longitude, 15);
      }
    } catch {
      Alert.alert('Error', 'Failed to acquire current location');
    } finally {
      setLocatingUser(false);
    }
  };

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleCreate = async () => {
    setErrorMessage(null);
    if (!origin || !destination) {
      setErrorMessage('Please select both starting point and destination.');
      // Expand sheet if minimized so user sees the message
      snapTo(0);
      return;
    }

    const now = new Date();
    const dateStr = isScheduled ? formatDate(scheduledDate) : formatDate(now);
    const timeStr = isScheduled ? formatTime(scheduledTime) : formatTime(now);

    const destCleanName = destination?.name ? destination.name.split(',')[0].trim() : 'Destination';
    const defaultRideName = `Ride to ${destCleanName}`;
    const rideName = (form.name && form.name.trim()) ? form.name.trim() : defaultRideName;

    setLoading(true);
    try {
      const payload = {
        name: rideName,
        origin_name: (origin.name && origin.name.trim()) ? origin.name.trim() : 'Start Point',
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_name: (destination.name && destination.name.trim()) ? destination.name.trim() : 'Destination',
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        date: dateStr,
        time: timeStr,
        is_public: Boolean(form.is_public),
      };
      const res = await ridesAPI.create(payload);
      const newRide = res.data;

      setCreatedRideModal({ ride: newRide, isScheduled });
    } catch (err) {
      const msg = err.response?.data;
      if (msg && typeof msg === 'object') {
        const firstError = Object.values(msg)[0];
        setErrorMessage(Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        setErrorMessage('Failed to create ride. Please check your connection and try again.');
      }
      snapTo(0);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (selectedDate) setScheduledDate(selectedDate);
    if (Platform.OS === 'android') setShowDatePicker(false);
  };

  const onTimeChange = (event, selectedTime) => {
    if (selectedTime) setScheduledTime(selectedTime);
    if (Platform.OS === 'android') setShowTimePicker(false);
  };

  // Interpolate gradient opacity so it smoothly disappears when sheet slides down
  const gradientOpacity = sheetTranslateY.interpolate({
    inputRange: [0, MINIMIZED_TRANSLATE_Y * 0.5, MINIMIZED_TRANSLATE_Y],
    outputRange: [1, 0.2, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* 1. FULL BACKGROUND INTERACTIVE MAP */}
      <View style={styles.mapBackground}>
        <CreateRideMap
          ref={mapRef}
          origin={origin}
          destination={destination}
          activePinMode={activePinMode}
          onPinDropped={handlePinDropped}
          initialCenter={userCoords || [19.076, 72.8777]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* FADING DOWN GRADIENT (Fades out dynamically when sheet slides down) */}
        <Animated.View
          style={[
            styles.mapGradientOverlay,
            {
              height: MAP_BASE_HEIGHT * 0.9,
              opacity: gradientOpacity,
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['transparent', 'rgba(18, 19, 23, 0.4)', 'rgba(18, 19, 23, 0.92)', colors.background]}
            locations={[0, 0.35, 0.75, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        {/* TOP FLOATING HEADER */}
        <View style={[styles.topFloatingBar, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.glassCircleBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.onSurface} />
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>NEW RIDE</Text>

          <TouchableOpacity
            style={[styles.glassCircleBtn, isMinimized && styles.glassCircleBtnActive]}
            onPress={toggleSheet}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isMinimized ? "options" : "map"}
              size={18}
              color={isMinimized ? colors.onPrimaryContainer : colors.primaryContainer}
            />
          </TouchableOpacity>
        </View>

        {/* FLOATING PIN MODE CHIPS */}
        <View style={[styles.pinModeBar, { top: insets.top + 58 }]}>
          <TouchableOpacity
            style={[styles.pinChip, activePinMode === 'origin' && styles.pinChipOriginActive]}
            onPress={() => setActivePinMode('origin')}
            activeOpacity={0.85}
          >
            <View style={[styles.dotIndicator, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.pinChipText, activePinMode === 'origin' && styles.pinChipTextActive]}>
              START PIN
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pinChip, activePinMode === 'destination' && styles.pinChipDestActive]}
            onPress={() => setActivePinMode('destination')}
            activeOpacity={0.85}
          >
            <View style={[styles.dotIndicator, { backgroundColor: colors.primaryContainer }]} />
            <Text style={[styles.pinChipText, activePinMode === 'destination' && styles.pinChipTextActiveDest]}>
              DEST PIN
            </Text>
          </TouchableOpacity>

          {/* Quick Locate GPS Button */}
          <TouchableOpacity
            style={styles.locateBtn}
            onPress={handleUseCurrentLocation}
            disabled={locatingUser}
            activeOpacity={0.8}
          >
            {locatingUser ? (
              <ActivityIndicator size="small" color={colors.primaryContainer} />
            ) : (
              <Ionicons name="navigate" size={17} color={colors.primaryContainer} />
            )}
          </TouchableOpacity>
        </View>

        {/* Contextual Tip */}
        <View style={[styles.mapHintBadge, { top: insets.top + 106 }]}>
          <Ionicons name="finger-print-outline" size={13} color={colors.primaryContainer} />
          <Text style={styles.mapHintText}>
            {activePinMode === 'origin' ? 'Tap map to drop Start Point' : 'Tap map to drop Destination'}
          </Text>
        </View>
      </View>

      {/* 2. SLIDING GLASSMORPHIC FORM SHEET */}
      <Animated.View
        style={[
          styles.slidingSheet,
          {
            top: MAP_BASE_HEIGHT - 60,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        {/* DRAG HANDLE & SWIPE HEADER */}
        <View {...panResponder.panHandlers} style={styles.dragHeaderArea}>
          <View style={styles.handleBar} />

          {/* Collapsed / Minimized Header State */}
          {isMinimized ? (
            <TouchableOpacity onPress={() => snapTo(0)} activeOpacity={0.85} style={styles.minimizedGlassBar}>
              <View style={styles.minimizedPinsRow}>
                <View style={styles.minimizedPinChip}>
                  <View style={[styles.dotIndicator, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.minimizedPinText} numberOfLines={1}>
                    {origin?.name ? origin.name.split(',')[0].trim() : 'Start Point'}
                  </Text>
                </View>

                <Ionicons name="arrow-forward" size={12} color={colors.primaryContainer} />

                <View style={styles.minimizedPinChip}>
                  <View style={[styles.dotIndicator, { backgroundColor: colors.primaryContainer }]} />
                  <Text style={styles.minimizedPinText} numberOfLines={1}>
                    {destination?.name ? destination.name.split(',')[0].trim() : 'Destination'}
                  </Text>
                </View>
              </View>

              <View style={styles.expandPillBadge}>
                <Text style={styles.expandPillText}>RIDE OPTIONS</Text>
                <Ionicons name="chevron-up" size={13} color={colors.primaryContainer} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.dragHintRow}>
              <Ionicons name="chevron-down" size={13} color={colors.outline} />
              <Text style={styles.dragHintText}>SWIPE DOWN FOR FULL MAP</Text>
            </View>
          )}
        </View>

        {/* SCROLLABLE FORM CONTENT */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {errorMessage && (
            <AlertCard
              type="error"
              title="Unable to Create Ride"
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
              style={{ marginBottom: spacing.stackMd }}
            />
          )}

          {/* ROUTE LOCATION CARD */}
          <View style={styles.routeGlassCard}>
            {/* Starting Point Input */}
            <View style={styles.locationRow}>
              <View style={styles.pinIconCol}>
                <View style={[styles.locationDot, { backgroundColor: '#4CAF50' }]} />
                <View style={styles.routeConnector} />
              </View>
              <View style={styles.locationInputCol}>
                <Text style={styles.locationLabel}>STARTING POINT</Text>
                <View style={styles.textInputBox}>
                  <TextInput
                    style={styles.locationTextInput}
                    placeholder="Search starting point or tap map..."
                    placeholderTextColor={colors.outline}
                    value={originQuery}
                    onChangeText={(t) => searchPlaces(t, true)}
                    onFocus={() => {
                      setActivePinMode('origin');
                      if (originResults.length > 0) setShowOriginResults(true);
                    }}
                  />
                  {originLoading && <ActivityIndicator size="small" color={colors.primaryContainer} style={{ marginRight: 4 }} />}
                  {originQuery.length > 0 && !originLoading && (
                    <TouchableOpacity onPress={() => { setOrigin(null); setOriginQuery(''); }} style={styles.inputActionIcon}>
                      <Ionicons name="close-circle" size={16} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  )}
                  {/* Clean GPS Button inside input */}
                  <TouchableOpacity
                    style={[styles.gpsIconBtn, origin?.lat && styles.gpsIconBtnActive]}
                    onPress={handleUseCurrentLocation}
                    disabled={locatingUser}
                    activeOpacity={0.7}
                  >
                    {locatingUser ? (
                      <ActivityIndicator size="small" color="#4CAF50" />
                    ) : (
                      <Ionicons name="navigate" size={15} color={origin?.lat ? colors.onPrimaryContainer : "#4CAF50"} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Autocomplete Dropdown for Origin */}
                {showOriginResults && originResults.length > 0 && (
                  <View style={styles.dropdown}>
                    {originResults.map((item, i) => (
                      <TouchableOpacity
                        key={`orig-${item.id || i}`}
                        style={styles.dropdownItem}
                        onPress={() => handleSelectSearchResult(item, true)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="location" size={14} color="#4CAF50" />
                        <Text style={styles.dropdownText} numberOfLines={1}>
                          {item.address.freeformAddress}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Destination Input */}
            <View style={[styles.locationRow, { marginTop: spacing.stackSm }]}>
              <View style={styles.pinIconCol}>
                <View style={[styles.locationDot, { backgroundColor: colors.primaryContainer }]} />
              </View>
              <View style={styles.locationInputCol}>
                <Text style={styles.locationLabel}>DESTINATION</Text>
                <View style={styles.textInputBox}>
                  <TextInput
                    style={styles.locationTextInput}
                    placeholder="Search destination or tap map..."
                    placeholderTextColor={colors.outline}
                    value={destQuery}
                    onChangeText={(t) => searchPlaces(t, false)}
                    onFocus={() => {
                      setActivePinMode('destination');
                      if (destResults.length > 0) setShowDestResults(true);
                    }}
                  />
                  {destLoading && <ActivityIndicator size="small" color={colors.primaryContainer} style={{ marginRight: 4 }} />}
                  {destQuery.length > 0 && !destLoading && (
                    <TouchableOpacity onPress={() => { setDestination(null); setDestQuery(''); }} style={styles.inputActionIcon}>
                      <Ionicons name="close-circle" size={16} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Autocomplete Dropdown for Destination */}
                {showDestResults && destResults.length > 0 && (
                  <View style={styles.dropdown}>
                    {destResults.map((item, i) => (
                      <TouchableOpacity
                        key={`dest-${item.id || i}`}
                        style={styles.dropdownItem}
                        onPress={() => handleSelectSearchResult(item, false)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="flag" size={14} color={colors.primaryContainer} />
                        <Text style={styles.dropdownText} numberOfLines={1}>
                          {item.address.freeformAddress}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* RIDE NAME INPUT */}
          <View style={styles.inputGroup}>
            <Text style={styles.sectionLabel}>RIDE NAME (OPTIONAL)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="flag-outline" size={18} color={colors.onSurfaceVariant} />
              <TextInput
                style={styles.input}
                placeholder={
                  destination?.name
                    ? `e.g. Ride to ${destination.name.split(',')[0].trim()}`
                    : "e.g. Sunday Morning Cruise, Squad Ride"
                }
                placeholderTextColor={colors.outline}
                value={form.name}
                onChangeText={(v) => update('name', v)}
              />
            </View>
          </View>

          {/* TIMING / SCHEDULE TOGGLE */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="calendar-outline" size={20} color={colors.onSurfaceVariant} />
              <View>
                <Text style={styles.toggleLabel}>Schedule Ride</Text>
                <Text style={styles.toggleSubtext}>
                  {isScheduled ? 'Set a future date & time' : 'Start ride immediately'}
                </Text>
              </View>
            </View>
            <Switch
              value={isScheduled}
              onValueChange={setIsScheduled}
              trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
              thumbColor={isScheduled ? colors.onPrimaryContainer : colors.onSurface}
            />
          </View>

          {/* DATE & TIME PICKERS (If Scheduled) */}
          {isScheduled && (
            <View style={styles.dateTimePickerRow}>
              <TouchableOpacity
                style={[styles.pickerButton, { flex: 1 }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primaryContainer} />
                <Text style={styles.pickerButtonText}>{formatDate(scheduledDate)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerButton, { flex: 1 }]}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={18} color={colors.primaryContainer} />
                <Text style={styles.pickerButtonText}>{formatTime(scheduledTime)}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* VISIBILITY TOGGLE */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="eye-outline" size={20} color={colors.onSurfaceVariant} />
              <View>
                <Text style={styles.toggleLabel}>Visibility</Text>
                <Text style={styles.toggleSubtext}>
                  {form.is_public ? 'Public - Visible to all riders' : 'Private - Invite only'}
                </Text>
              </View>
            </View>
            <Switch
              value={form.is_public}
              onValueChange={(v) => update('is_public', v)}
              trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
              thumbColor={form.is_public ? colors.onPrimaryContainer : colors.onSurface}
            />
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={scheduledDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
              themeVariant="dark"
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={scheduledTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              themeVariant="dark"
            />
          )}

          {/* PRIMARY HERO ACTION BUTTON */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isScheduled ? "calendar" : "navigate"}
              size={22}
              color={colors.onPrimaryContainer}
            />
            <Text style={styles.primaryButtonText}>
              {loading ? 'Creating...' : isScheduled ? 'Save & Schedule Ride' : 'Start Ride Now'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* SUCCESS MODAL */}
      {createdRideModal && (
        <GlassModal
          visible={Boolean(createdRideModal)}
          type="success"
          icon={createdRideModal.isScheduled ? "calendar" : "navigate"}
          badge={createdRideModal.isScheduled ? "SCHEDULED" : "READY TO ROLL"}
          title={createdRideModal.isScheduled ? "Ride Scheduled!" : "Ride Created!"}
          message={
            createdRideModal.isScheduled
              ? `"${createdRideModal.ride.name}" has been scheduled successfully.`
              : `"${createdRideModal.ride.name}" is ready! Invite your squad or hit the road now.`
          }
          confirmText={createdRideModal.isScheduled ? "INVITE RIDERS" : "START RIDE NOW"}
          cancelText={createdRideModal.isScheduled ? "VIEW RIDE" : "INVITE FRIENDS"}
          onConfirm={async () => {
            const ride = createdRideModal.ride;
            const scheduled = createdRideModal.isScheduled;
            setCreatedRideModal(null);
            if (scheduled) {
              navigation.replace('InviteRiders', { rideId: ride.id, rideName: ride.name });
            } else {
              try {
                await ridesAPI.startRide(ride.id);
                navigation.replace('ActiveRide', { rideId: ride.id });
              } catch {
                navigation.replace('RideSummary', { rideId: ride.id });
              }
            }
          }}
          onCancel={() => {
            const ride = createdRideModal.ride;
            const scheduled = createdRideModal.isScheduled;
            setCreatedRideModal(null);
            if (scheduled) {
              navigation.replace('RideSummary', { rideId: ride.id });
            } else {
              navigation.replace('InviteRiders', {
                rideId: ride.id,
                rideName: ride.name,
                startOnDone: true,
              });
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  mapGradientOverlay: {
    position: 'absolute',
    top: MAP_BASE_HEIGHT - 120,
    left: 0,
    right: 0,
  },
  topFloatingBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  glassCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 21, 26, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 4,
  },
  glassCircleBtnActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  topBarTitle: {
    ...typography.displayLg,
    color: colors.primaryContainer,
    fontSize: 20,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  pinModeBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 9,
  },
  pinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: 'rgba(24, 25, 30, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  pinChipOriginActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.22)',
    borderColor: '#4CAF50',
  },
  pinChipDestActive: {
    backgroundColor: 'rgba(255, 214, 0, 0.22)',
    borderColor: colors.primaryContainer,
  },
  dotIndicator: { width: 8, height: 8, borderRadius: 4 },
  pinChipText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 11, fontWeight: '700' },
  pinChipTextActive: { color: '#81C784' },
  pinChipTextActiveDest: { color: colors.primaryContainer },
  locateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(24, 25, 30, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  mapHintBadge: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(18, 19, 23, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 8,
  },
  mapHintText: { ...typography.labelSm, color: colors.onSurface, fontSize: 11 },

  // SLIDING SHEET STYLES
  slidingSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 19, 23, 0.95)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderBottomWidth: 0,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.65,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 20,
  },
  dragHeaderArea: {
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 6,
  },
  dragHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  dragHintText: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  minimizedGlassBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(28, 29, 35, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.25)',
    borderRadius: borderRadius.xl,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
    gap: 8,
  },
  minimizedPinsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  minimizedPinChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(18, 19, 23, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  minimizedPinText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  expandPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryContainer + '25',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryContainer + '50',
  },
  expandPillText: {
    ...typography.labelSm,
    color: colors.primaryContainer,
    fontSize: 10,
    fontWeight: '800',
  },

  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.marginMobile, paddingTop: 6 },
  routeGlassCard: {
    backgroundColor: 'rgba(26, 27, 31, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.xl,
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start' },
  pinIconCol: { width: 24, alignItems: 'center', paddingTop: 8 },
  locationDot: { width: 12, height: 12, borderRadius: 6 },
  routeConnector: { width: 2, height: 38, backgroundColor: colors.outlineVariant, marginVertical: 4 },
  locationInputCol: { flex: 1, marginLeft: spacing.stackSm },
  locationLabel: { ...typography.labelTechnical, color: colors.onSurfaceVariant, fontSize: 11, marginBottom: 4 },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.md,
    height: 42,
    paddingHorizontal: spacing.stackSm,
    gap: 6,
  },
  locationTextInput: { flex: 1, ...typography.bodyMd, color: colors.onSurface, fontSize: 14 },
  inputActionIcon: { padding: 4 },
  gpsIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  gpsIconBtnActive: {
    backgroundColor: '#4CAF50',
  },
  dropdown: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.md,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: 8,
  },
  dropdownText: { ...typography.bodyMd, color: colors.onSurface, fontSize: 13, flex: 1 },
  inputGroup: { marginBottom: spacing.stackMd },
  sectionLabel: { ...typography.labelTechnical, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 27, 31, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    height: spacing.touchTargetMin,
    paddingHorizontal: spacing.stackMd,
    gap: spacing.stackSm,
  },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 27, 31, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd, flex: 1 },
  toggleLabel: { ...typography.titleMd, color: colors.onSurface, fontSize: 15 },
  toggleSubtext: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 12 },
  dateTimePickerRow: {
    flexDirection: 'row',
    gap: spacing.stackMd,
    marginBottom: spacing.stackMd,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    backgroundColor: 'rgba(26, 27, 31, 0.85)',
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    borderRadius: borderRadius.lg,
    height: spacing.touchTargetMin,
  },
  pickerButtonText: {
    ...typography.titleMd,
    color: colors.primaryContainer,
    fontSize: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.stackSm,
    backgroundColor: colors.primaryContainer,
    height: 56,
    borderRadius: borderRadius.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 4,
    marginTop: spacing.stackSm,
  },
  disabled: { opacity: 0.6 },
  primaryButtonText: {
    ...typography.titleMd,
    color: colors.onPrimaryContainer,
    textTransform: 'uppercase',
    fontWeight: '800',
    fontSize: 16,
  },
});
