import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import * as Location from 'expo-location';
import { searchPlaces, reverseGeocode } from '../services/locationService';

export default function LocationPicker({ label, icon, placeholder, value, onSelect, showCurrentLocation = true }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (value !== undefined && value !== query) {
      setQuery(value || '');
    }
  }, [value]);

  const performSearch = useCallback(async (text) => {
    if (!text || text.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let userCoords = null;
      try {
        const lastLoc = await Location.getLastKnownPositionAsync();
        if (lastLoc?.coords) {
          userCoords = [lastLoc.coords.latitude, lastLoc.coords.longitude];
        }
      } catch {}

      const items = await searchPlaces(text, { userCoords, limit: 6 });
      setResults(items);
      setShowResults(items.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (text) => {
    setQuery(text);
    setUsingCurrentLocation(false);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!text || text.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(() => {
      performSearch(text);
    }, 250);
  };

  const handleSelect = (item) => {
    const name = item.name || item.fullAddress;
    setQuery(name);
    setUsingCurrentLocation(false);
    setShowResults(false);
    onSelect({
      name: item.fullAddress || name,
      lat: item.lat,
      lng: item.lng,
    });
  };

  const handleCurrentLocation = async () => {
    setUsingCurrentLocation(true);
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use current location');
        setUsingCurrentLocation(false);
        setLoading(false);
        return;
      }

      let loc = await Location.getLastKnownPositionAsync();
      if (!loc) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }

      const { latitude, longitude } = loc.coords;
      const addressName = await reverseGeocode(latitude, longitude);

      setQuery(addressName);
      setUsingCurrentLocation(true);
      setShowResults(false);
      onSelect({ name: addressName, lat: latitude, lng: longitude });
    } catch {
      Alert.alert('Error', 'Failed to get current location');
      setUsingCurrentLocation(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setUsingCurrentLocation(false);
    onSelect(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={20} color={colors.onSurfaceVariant} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.outline}
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
        {loading && <ActivityIndicator size="small" color={colors.primaryContainer} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {showCurrentLocation && (
        <TouchableOpacity
          style={[styles.currentLocationBtn, usingCurrentLocation && styles.currentLocationBtnActive]}
          onPress={handleCurrentLocation}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons
            name={usingCurrentLocation ? "locate" : "navigate"}
            size={16}
            color={usingCurrentLocation ? colors.onPrimaryContainer : colors.primaryContainer}
          />
          <Text style={[styles.currentLocationText, usingCurrentLocation && styles.currentLocationTextActive]}>
            {usingCurrentLocation ? 'Using Current Location' : 'Use Current Location'}
          </Text>
        </TouchableOpacity>
      )}

      {showResults && results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(item, i) => `${item.id}-${i}`}
            scrollEnabled={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)} activeOpacity={0.7}>
                <Ionicons name="location" size={16} color={colors.primaryContainer} />
                <View style={styles.resultText}>
                  <Text style={styles.resultAddress} numberOfLines={1}>{item.name}</Text>
                  {item.subtitle ? (
                    <Text style={styles.resultSub} numberOfLines={1}>{item.subtitle}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.stackMd, zIndex: 10 },
  label: { ...typography.labelTechnical, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg,
    height: spacing.touchTargetMin,
    paddingHorizontal: spacing.stackMd,
    gap: spacing.stackSm,
  },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackSm,
    paddingVertical: spacing.stackSm,
    marginTop: spacing.stackSm,
    alignSelf: 'flex-start',
  },
  currentLocationBtnActive: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.stackMd,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.stackSm,
  },
  currentLocationText: {
    ...typography.labelMd,
    color: colors.primaryContainer,
  },
  currentLocationTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: '600',
  },
  dropdown: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg,
    marginTop: 4,
    maxHeight: 220,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: spacing.stackSm,
  },
  resultText: { flex: 1 },
  resultAddress: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  resultSub: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 1 },
});
