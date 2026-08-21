import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const TILES = 'https://demotiles.maplibre.org/style.json';

function buildHtml({ center, zoom, markers, polyline, riderPositions }) {
  const markersJson = JSON.stringify(markers || []);
  const polylineJson = JSON.stringify(polyline || []);
  const ridersJson = JSON.stringify(riderPositions || []);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet"/>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; background:#121317; overflow:hidden; }
  .maplibregl-ctrl-attrib { display:none !important; }
</style>
</head>
<body>
<div id="map"></div>
<script>
var style = {
  version: 8,
  name: 'CRUVO',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: ''
    }
  },
  layers: [{
    id: 'osm',
    type: 'raster',
    source: 'osm',
    minzoom: 0,
    maxzoom: 19
  }]
};

var map = new maplibregl.Map({
  container: 'map',
  style: style,
  center: [${center[1]}, ${center[0]}],
  zoom: ${zoom || 13},
  attributionControl: false
});

map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

map.on('load', function() {
  var polyline = ${polylineJson};
  if (polyline.length > 0) {
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: polyline.map(function(p) { return [p[1], p[0]]; }) }
      }
    });
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ffd600', 'line-width': 4, 'line-opacity': 0.9 }
    });

    var bounds = polyline.reduce(function(b, p) { return b.extend([p[1], p[0]]); }, new maplibregl.LngLatBounds());
    if (polyline.length > 1) {
      map.fitBounds(bounds, { padding: { top: 50, bottom: 50, left: 50, right: 50 } });
    }
  }

  var markers = ${markersJson};
  markers.forEach(function(m) {
    var color = m.type === 'origin' ? '#4CAF50' : '#e53935';
    var el = document.createElement('div');
    el.style.cssText = 'width:28px;height:28px;border-radius:14px;background:' + color + ';display:flex;align-items:center;justify-content:center;border:3px solid #fff;color:#fff;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.5);';
    el.innerHTML = m.type === 'origin' ? '&#9654;' : '&#9873;';
    new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
  });

  var riders = ${ridersJson};
  var COLORS = ['#ffd600','#4CAF50','#FF9800','#2196F3','#E91E63','#9C27B0','#00BCD4','#FF5722'];
  riders.forEach(function(r, i) {
    var color = COLORS[i % COLORS.length];
    var el = document.createElement('div');
    el.style.cssText = 'width:38px;height:38px;border-radius:19px;background:' + color + ';display:flex;align-items:center;justify-content:center;border:3px solid #fff;color:#121317;font-size:11px;font-weight:700;font-family:monospace;box-shadow:0 2px 8px rgba(0,0,0,0.5);';
    el.textContent = r.initials;
    new maplibregl.Marker({ element: el }).setLngLat([r.lng, r.lat]).addTo(map);
  });
});
</script>
</body>
</html>`;
}

export default function FreeMap({ ride, positions = [], myUserId, followMyLocation = false, style }) {
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

  const html = useMemo(
    () => buildHtml({ center, zoom, markers, polyline, riderPositions }),
    [center, zoom, markers, polyline, riderPositions]
  );

  return (
    <View style={[styles.container, style]}>
      <WebView
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
