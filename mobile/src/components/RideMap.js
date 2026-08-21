import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

const RIDER_COLORS = ['#ffd600', '#4CAF50', '#FF9800', '#2196F3', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722'];

export default function RideMap({ ride, positions = [], myUserId, style, followMyLocation = true }) {
  const routeCoords = useMemo(() => {
    if (ride?.route_polyline) {
      try {
        const pts = typeof ride.route_polyline === 'string' ? JSON.parse(ride.route_polyline) : ride.route_polyline;
        return pts.map(p => ({ latitude: p.latitude || p.lat, longitude: p.longitude || p.lng || p.lon }));
      } catch { return []; }
    }
    if (ride?.origin_lat && ride?.destination_lat) {
      return [
        { latitude: ride.origin_lat, longitude: ride.origin_lng },
        { latitude: ride.destination_lat, longitude: ride.destination_lng },
      ];
    }
    return [];
  }, [ride]);

  const initialRegion = useMemo(() => {
    if (routeCoords.length > 0) {
      const lats = routeCoords.map(c => c.latitude);
      const lngs = routeCoords.map(c => c.longitude);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.02),
        longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.02),
      };
    }
    if (ride?.origin_lat) {
      return { latitude: ride.origin_lat, longitude: ride.origin_lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    return { latitude: 19.076, longitude: 72.8777, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  }, [routeCoords, ride]);

  return (
    <MapView
      style={[styles.map, style]}
      provider={PROVIDER_DEFAULT}
      initialRegion={initialRegion}
      showsUserLocation={false}
      showsMyLocationButton={false}
      followsUserLocation={followMyLocation}
      mapType="standard"
    >
      {routeCoords.length > 0 && (
        <Polyline
          coordinates={routeCoords}
          strokeColor={colors.primaryContainer}
          strokeWidth={4}
        />
      )}

      {ride?.origin_lat && (
        <Marker coordinate={{ latitude: ride.origin_lat, longitude: ride.origin_lng }}>
          <View style={styles.originMarker}>
            <Ionicons name="play" size={14} color={colors.onPrimaryContainer} />
          </View>
        </Marker>
      )}

      {ride?.destination_lat && (
        <Marker coordinate={{ latitude: ride.destination_lat, longitude: ride.destination_lng }}>
          <View style={styles.destMarker}>
            <Ionicons name="flag" size={14} color={colors.white} />
          </View>
        </Marker>
      )}

      {positions.map((pos, i) => {
        const isMe = pos.user === myUserId;
        const color = RIDER_COLORS[i % RIDER_COLORS.length];
        return (
          <Marker
            key={pos.user}
            coordinate={{ latitude: pos.lat, longitude: pos.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
          >
            <View style={styles.riderMarker}>
              <View style={[styles.riderDot, { backgroundColor: color, borderColor: isMe ? colors.white : color }]}>
                <Text style={styles.riderInitials}>{pos.initials}</Text>
              </View>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  originMarker: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#4CAF50',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: colors.white,
  },
  destMarker: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.error,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: colors.white,
  },
  riderMarker: { alignItems: 'center' },
  riderDot: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4,
  },
  riderInitials: { ...typography.labelTechnical, color: colors.background, fontSize: 12, fontWeight: '700' },
});
