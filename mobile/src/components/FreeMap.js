import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function buildHtml({ center, zoom, markers, polyline, riderPositions }) {
  const markersJson = JSON.stringify(markers || []);
  const polylineJson = JSON.stringify(polyline || []);
  const ridersJson = JSON.stringify(riderPositions || []);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; background:#121317; }
  .rider-marker {
    background:#ffd600; color:#121317; font-weight:700; font-size:11px;
    font-family:monospace; width:36px; height:36px; border-radius:18px;
    display:flex; align-items:center; justify-content:center;
    border:3px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.5);
  }
  .origin-marker {
    background:#4CAF50; color:#fff; width:26px; height:26px; border-radius:13px;
    display:flex; align-items:center; justify-content:center;
    border:3px solid #fff; font-size:12px;
  }
  .dest-marker {
    background:#e53935; color:#fff; width:26px; height:26px; border-radius:13px;
    display:flex; align-items:center; justify-content:center;
    border:3px solid #fff; font-size:12px;
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([${center[0]}, ${center[1]}], ${zoom || 13});

  L.tileLayer('${TILE_URL}', {
    maxZoom: 19
  }).addTo(map);

  var markers = ${markersJson};
  markers.forEach(function(m) {
    var cls = m.type === 'origin' ? 'origin-marker' : 'dest-marker';
    var icon = L.divIcon({ className: '', html: '<div class="' + cls + '">' + (m.type === 'origin' ? '&#9654;' : '&#9873;') + '</div>', iconSize: [26, 26], iconAnchor: [13, 13] });
    L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
  });

  var polyline = ${polylineJson};
  if (polyline.length > 0) {
    L.polyline(polyline, { color: '#ffd600', weight: 4, opacity: 0.9 }).addTo(map);
    if (polyline.length > 1) {
      var bounds = L.latLngBounds(polyline);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  var riders = ${ridersJson};
  var RIDER_COLORS = ['#ffd600','#4CAF50','#FF9800','#2196F3','#E91E63','#9C27B0','#00BCD4','#FF5722'];
  riders.forEach(function(r, i) {
    var color = RIDER_COLORS[i % RIDER_COLORS.length];
    var icon = L.divIcon({
      className: '',
      html: '<div class="rider-marker" style="background:' + color + '">' + r.initials + '</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    L.marker([r.lat, r.lng], { icon: icon }).addTo(map);
  });
</script>
</body>
</html>`;
}

export default function FreeMap({ ride, positions = [], myUserId, followMyLocation = false, style }) {
  const webViewRef = useRef(null);

  const center = useMemo(() => {
    if (ride?.origin_lat && ride?.destination_lat) {
      return [(ride.origin_lat + ride.destination_lat) / 2, (ride.origin_lng + ride.destination_lng) / 2];
    }
    if (ride?.origin_lat) return [ride.origin_lat, ride.origin_lng];
    return [19.076, 72.8777];
  }, [ride]);

  const zoom = useMemo(() => {
    if (ride?.origin_lat && ride?.destination_lat) {
      const dLat = Math.abs(ride.origin_lat - ride.destination_lat);
      const dLng = Math.abs(ride.origin_lng - ride.destination_lng);
      const d = Math.max(dLat, dLng);
      if (d > 2) return 8;
      if (d > 1) return 9;
      if (d > 0.5) return 10;
      if (d > 0.1) return 11;
      if (d > 0.05) return 12;
      return 13;
    }
    return 13;
  }, [ride]);

  const markers = useMemo(() => {
    const m = [];
    if (ride?.origin_lat) m.push({ lat: ride.origin_lat, lng: ride.origin_lng, type: 'origin' });
    if (ride?.destination_lat) m.push({ lat: ride.destination_lat, lng: ride.destination_lng, type: 'dest' });
    return m;
  }, [ride]);

  const polyline = useMemo(() => {
    if (!ride?.route_polyline) {
      if (ride?.origin_lat && ride?.destination_lat) {
        return [[ride.origin_lat, ride.origin_lng], [ride.destination_lat, ride.destination_lng]];
      }
      return [];
    }
    try {
      const pts = typeof ride.route_polyline === 'string' ? JSON.parse(ride.route_polyline) : ride.route_polyline;
      return pts.map(p => [p.latitude || p.lat, p.longitude || p.lng || p.lon]);
    } catch { return []; }
  }, [ride]);

  const riderPositions = useMemo(() => {
    return (positions || []).map(p => ({
      lat: p.lat,
      lng: p.lng,
      initials: p.initials || '??',
    }));
  }, [positions]);

  const html = useMemo(() => buildHtml({ center, zoom, markers, polyline, riderPositions }), [center, zoom, markers, polyline, riderPositions]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121317', overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#121317' },
});
