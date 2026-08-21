import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';
import { TOMTOM_API_KEY, TOMTOM_BASE_URL } from '../config';
import * as Location from 'expo-location';
import axios from 'axios';

export default function LocationPicker({ label, icon, placeholder, value, onSelect, showCurrentLocation = true }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);

  const search = useCallback(async (text) => {
    setQuery(text);
    if (text.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${TOMTOM_BASE_URL}/search/${encodeURIComponent(text)}.json`, {
        params: { key: TOMTOM_API_KEY, limit: 5 },
      });
      const items = res.data.results || [];
      setResults(items);
      setShowResults(items.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = (item) => {
    const name = item.address.freeformAddress || item.address.municipality || item.address.country || '';
    const [lat, lng] = [item.position.lat, item.position.lon];
    setQuery(name);
    setUsingCurrentLocation(false);
    setShowResults(false);
    onSelect({ name, lat, lng });
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

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;

      const reverseRes = await axios.get(`${TOMTOM_BASE_URL}/reverseGeocode/${longitude},${latitude}.json`, {
        params: { key: TOMTOM_API_KEY },
      });
      const address = reverseRes.data.addresses?.[0];
      const name = address?.freeformAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      setQuery(name);
      setUsingCurrentLocation(true);
      onSelect({ name, lat: latitude, lng: longitude });
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
          onChangeText={search}
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
        {loading && <ActivityIndicator size="small" color={colors.primaryContainer} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={handleClear}>
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
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)} activeOpacity={0.7}>
                <Ionicons name="location" size={16} color={colors.primaryContainer} />
                <View style={styles.resultText}>
                  <Text style={styles.resultAddress} numberOfLines={1}>{item.address.freeformAddress}</Text>
                  {item.address.municipalitySubdivision && (
                    <Text style={styles.resultSub} numberOfLines={1}>{item.address.municipalitySubdivision}</Text>
                  )}
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
  container: { marginBottom: spacing.stackMd },
  label: { ...typography.labelTechnical, color: colors.onSurfaceVariant, marginBottom: spacing.stackSm },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: borderRadius.lg,
    height: spacing.touchTargetMin, paddingHorizontal: spacing.stackMd, gap: spacing.stackSm,
  },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  currentLocationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.stackSm,
    paddingVertical: spacing.stackSm, marginTop: spacing.stackSm,
    alignSelf: 'flex-start',
  },
  currentLocationBtnActive: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.stackMd,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.stackSm,
  },
  currentLocationText: {
    ...typography.labelMd, color: colors.primaryContainer,
  },
  currentLocationTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: '600',
  },
  dropdown: {
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: borderRadius.lg, marginTop: 4, maxHeight: 200, overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.stackMd,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, gap: spacing.stackSm,
  },
  resultText: { flex: 1 },
  resultAddress: { ...typography.bodyMd, color: colors.onSurface },
  resultSub: { ...typography.labelSm, color: colors.onSurfaceVariant },
});
