import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function buildHtml({ center, zoom, markers, polyline, followUser }) {
  const markersJson = JSON.stringify(markers || []);
  const polylineJson = JSON.stringify(polyline || []);
  const centerLng = Number.isFinite(center?.[1]) ? center[1] : 72.8777;
  const centerLat = Number.isFinite(center?.[0]) ? center[0] : 19.076;
  const zoomLevel = Number.isFinite(zoom) ? zoom : 13;

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
  .maplibregl-ctrl-group { box-shadow: none !important; }
  .maplibregl-ctrl button { background: rgba(30,31,35,0.9) !important; border: 1px solid #4d4632 !important; }
  .maplibregl-ctrl button span { filter: invert(1); }
  #user-dot {
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
    width:16px; height:16px; border-radius:8px; background:#4285F4;
    border:3px solid #fff; box-shadow:0 0 0 2px rgba(66,133,244,0.3), 0 2px 8px rgba(0,0,0,0.5);
    z-index:10; pointer-events:none; display:none;
  }
  #user-ring {
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
    width:60px; height:60px; border-radius:30px; background:rgba(66,133,244,0.12);
    z-index:9; pointer-events:none; display:none;
  }
  #user-heading {
    position:absolute; top:50%; left:50%;
    width:4px; height:22px; margin-left:-2px; margin-top:-28px;
    background:#4285F4; border-radius:2px; transform-origin:bottom center;
    z-index:11; pointer-events:none; display:none;
  }
</style>
</head>
<body>
<div id="map"></div>
<div id="user-ring"></div>
<div id="user-dot"></div>
<div id="user-heading"></div>
<script>
try {
  var style = {
    version: 8,
    name: 'CRUVO',
    sources: {
      osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 }
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
  };

  var map = new maplibregl.Map({
    container: 'map',
    style: style,
    center: [${centerLng}, ${centerLat}],
    zoom: ${followUser ? 17 : zoomLevel},
    pitch: ${followUser ? 45 : 0},
    bearing: 0,
    attributionControl: false
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right');

  var userMarker = document.getElementById('user-dot');
  var userRing = document.getElementById('user-ring');
  var userHeading = document.getElementById('user-heading');

  var firstUserPos = true;
  var riderMarkers = {};
  var COLORS = ['#ffd600','#4CAF50','#FF9800','#2196F3','#E91E63','#9C27B0','#00BCD4','#FF5722'];

  window.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);

      if (msg.type === 'userLocation' && Number.isFinite(msg.lat) && Number.isFinite(msg.lng)) {
        var lngLat = [msg.lng, msg.lat];
        if (firstUserPos) {
          firstUserPos = false;
          userMarker.style.display = 'block';
          userRing.style.display = 'block';
          userHeading.style.display = 'block';
          map.jumpTo({ center: lngLat, zoom: 17, pitch: 45, bearing: msg.heading || 0 });
        } else {
          userMarker.style.display = 'block';
          userRing.style.display = 'block';
          userHeading.style.display = 'block';
          map.easeTo({ center: lngLat, zoom: 17, pitch: 45, bearing: msg.heading || 0, duration: 1000 });
        }
        if (msg.heading !== undefined && msg.heading !== null) {
          userHeading.style.transform = 'translate(-50%,-100%) rotate(' + (-msg.heading) + 'deg)';
        }
      }

      if (msg.type === 'updateRiders') {
        var riders = msg.riders || [];
        var seen = {};
        riders.forEach(function(r, i) {
          if (!r || !Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return;
          seen[r.user] = true;
          if (riderMarkers[r.user]) {
            riderMarkers[r.user].setLngLat([r.lng, r.lat]);
          } else {
            var color = COLORS[i % COLORS.length];
            var el = document.createElement('div');
            el.style.cssText = 'width:38px;height:38px;border-radius:19px;background:' + color + ';display:flex;align-items:center;justify-content:center;border:3px solid #fff;color:#121317;font-size:11px;font-weight:700;font-family:monospace;box-shadow:0 2px 8px rgba(0,0,0,0.5);transition:transform 0.3s ease;';
            el.textContent = r.initials || '??';
            var marker = new maplibregl.Marker({ element: el }).setLngLat([r.lng, r.lat]).addTo(map);
            riderMarkers[r.user] = marker;
          }
        });
        Object.keys(riderMarkers).forEach(function(uid) {
          if (!seen[uid]) {
            riderMarkers[uid].remove();
            delete riderMarkers[uid];
          }
        });
      }
    } catch(err) {
      console.warn('WebView message handler error:', err);
    }
  });

  map.on('load', function() {
    try {
      var coords = ${polylineJson};
      if (Array.isArray(coords) && coords.length > 0) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords }
          }
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ffd600', 'line-width': 4, 'line-opacity': 0.9 }
        });
        map.addLayer({
          id: 'route-outline',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#705d00', 'line-width': 8, 'line-opacity': 0.4 }
        }, 'route-line');

        if (!${followUser} && coords.length > 1) {
          var bounds = new maplibregl.LngLatBounds();
          coords.forEach(function(c) {
            if (Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
              bounds.extend(c);
            }
          });
          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 60, right: 60 }, maxZoom: 16 });
          }
        }
      }

      var markers = ${markersJson};
      if (Array.isArray(markers)) {
        markers.forEach(function(m) {
          if (!m || !Number.isFinite(m.lat) || !Number.isFinite(m.lng)) return;
          var color = m.type === 'origin' ? '#4CAF50' : '#e53935';
          var el = document.createElement('div');
          el.style.cssText = 'width:28px;height:28px;border-radius:14px;background:' + color + ';display:flex;align-items:center;justify-content:center;border:3px solid #fff;color:#fff;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.5);';
          el.innerHTML = m.type === 'origin' ? '&#9654;' : '&#9873;';
          new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
        });
      }
    } catch(err) {
      console.warn('Map load handling error:', err);
    }
  });
} catch(e) {
  console.warn('MapLibre init error:', e);
}
</script>
</body>
</html>`;
}

export default function FreeMap({ ride, positions = [], myUserId, userLocation, heading, followMyLocation = false, style }) {
  const webViewRef = useRef(null);
  const lastLocationRef = useRef(null);
  const lastRidersJson = useRef('');

  const center = useMemo(() => {
    let lat = 19.076;
    let lng = 72.8777;

    if (userLocation && followMyLocation && Number.isFinite(Number(userLocation.latitude)) && Number.isFinite(Number(userLocation.longitude))) {
      lat = Number(userLocation.latitude);
      lng = Number(userLocation.longitude);
    } else if (ride?.origin_lat && ride?.destination_lat) {
      const oLat = Number(ride.origin_lat);
      const oLng = Number(ride.origin_lng);
      const dLat = Number(ride.destination_lat);
      const dLng = Number(ride.destination_lng);
      if (Number.isFinite(oLat) && Number.isFinite(oLng) && Number.isFinite(dLat) && Number.isFinite(dLng)) {
        lat = (oLat + dLat) / 2;
        lng = (oLng + dLng) / 2;
      }
    } else if (ride?.origin_lat && ride?.origin_lng) {
      const oLat = Number(ride.origin_lat);
      const oLng = Number(ride.origin_lng);
      if (Number.isFinite(oLat) && Number.isFinite(oLng)) {
        lat = oLat;
        lng = oLng;
      }
    }
    return [lat, lng];
  }, [ride?.id, ride?.origin_lat, ride?.destination_lat, ride?.origin_lng, ride?.destination_lng, userLocation, followMyLocation]);

  const zoom = useMemo(() => {
    if (followMyLocation && userLocation) return 17;
    if (ride?.origin_lat && ride?.destination_lat) {
      const oLat = Number(ride.origin_lat);
      const oLng = Number(ride.origin_lng);
      const dLat = Number(ride.destination_lat);
      const dLng = Number(ride.destination_lng);
      if (Number.isFinite(oLat) && Number.isFinite(oLng) && Number.isFinite(dLat) && Number.isFinite(dLng)) {
        const d = Math.max(Math.abs(oLat - dLat), Math.abs(oLng - dLng));
        if (d > 2) return 8;
        if (d > 1) return 9;
        if (d > 0.5) return 10;
        if (d > 0.1) return 11;
        if (d > 0.05) return 12;
        return 13;
      }
    }
    return 13;
  }, [ride?.id, ride?.origin_lat, ride?.destination_lat, ride?.origin_lng, ride?.destination_lng, userLocation, followMyLocation]);

  const markers = useMemo(() => {
    const m = [];
    if (ride?.origin_lat && ride?.origin_lng) {
      const lat = Number(ride.origin_lat);
      const lng = Number(ride.origin_lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        m.push({ lat, lng, type: 'origin' });
      }
    }
    if (ride?.destination_lat && ride?.destination_lng) {
      const lat = Number(ride.destination_lat);
      const lng = Number(ride.destination_lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        m.push({ lat, lng, type: 'dest' });
      }
    }
    return m;
  }, [ride?.id, ride?.origin_lat, ride?.destination_lat, ride?.origin_lng, ride?.destination_lng]);

  const polyline = useMemo(() => {
    if (!ride) return [];
    if (ride.route_polyline) {
      try {
        let pts = ride.route_polyline;
        if (typeof pts === 'string') {
          pts = JSON.parse(pts);
        }
        if (typeof pts === 'string') {
          pts = JSON.parse(pts);
        }
        if (Array.isArray(pts)) {
          const coords = [];
          for (const p of pts) {
            if (!p) continue;
            let lat = null, lng = null;
            if (Array.isArray(p)) {
              lat = Number(p[0]);
              lng = Number(p[1]);
            } else if (typeof p === 'object') {
              lat = Number(p.latitude ?? p.lat);
              lng = Number(p.longitude ?? p.lng ?? p.lon);
            }
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              coords.push([lng, lat]);
            }
          }
          if (coords.length > 0) return coords;
        }
      } catch (e) {
        console.warn('Polyline parse error', e);
      }
    }

    if (ride.origin_lat && ride.destination_lat) {
      const oLat = Number(ride.origin_lat);
      const oLng = Number(ride.origin_lng);
      const dLat = Number(ride.destination_lat);
      const dLng = Number(ride.destination_lng);
      if (Number.isFinite(oLat) && Number.isFinite(oLng) && Number.isFinite(dLat) && Number.isFinite(dLng)) {
        return [[oLng, oLat], [dLng, dLat]];
      }
    }
    return [];
  }, [ride?.id, ride?.route_polyline, ride?.origin_lat, ride?.destination_lat, ride?.origin_lng, ride?.destination_lng]);

  const html = useMemo(
    () => buildHtml({ center, zoom, markers, polyline, followUser: followMyLocation }),
    [center, zoom, markers, polyline, followMyLocation]
  );

  const sendMessage = useCallback((msg) => {
    if (webViewRef.current) {
      try {
        webViewRef.current.postMessage(JSON.stringify(msg));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (userLocation && followMyLocation && Number.isFinite(Number(userLocation.latitude)) && Number.isFinite(Number(userLocation.longitude))) {
      const lat = Number(userLocation.latitude);
      const lng = Number(userLocation.longitude);
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (key !== lastLocationRef.current) {
        lastLocationRef.current = key;
        sendMessage({
          type: 'userLocation',
          lat,
          lng,
          heading: Number(heading) || 0,
        });
      }
    }
  }, [userLocation, heading, followMyLocation, sendMessage]);

  useEffect(() => {
    const riders = (positions || [])
      .map(p => {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { user: p.user, lat, lng, initials: p.initials || '??' };
      })
      .filter(Boolean);

    const json = JSON.stringify(riders);
    if (json !== lastRidersJson.current) {
      lastRidersJson.current = json;
      sendMessage({ type: 'updateRiders', riders });
    }
  }, [positions, sendMessage]);

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
        onMessage={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#121317', overflow: 'hidden' },
  webview: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#121317' },
});
