import React, { useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

function buildCreateMapHtml({ initialCenter, initialZoom, activePinMode, origin, destination }) {
  const centerLng = Number.isFinite(initialCenter?.[1]) ? initialCenter[1] : 72.8777;
  const centerLat = Number.isFinite(initialCenter?.[0]) ? initialCenter[0] : 19.076;
  const zoomLevel = Number.isFinite(initialZoom) ? initialZoom : 13;
  const originJson = JSON.stringify(origin || null);
  const destinationJson = JSON.stringify(destination || null);
  const modeJson = JSON.stringify(activePinMode || 'origin');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet"/>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color: transparent; }
  html, body, #map { width:100%; height:100%; background:#121317; overflow:hidden; }
  .maplibregl-ctrl-attrib { display:none !important; }
  .maplibregl-ctrl-group { box-shadow: none !important; }
  
  @keyframes pin-pop {
    0% { transform: translateY(-16px) scale(0.8); opacity: 0; }
    60% { transform: translateY(4px) scale(1.1); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }

  @keyframes pulse-ring {
    0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.6); }
    70% { box-shadow: 0 0 0 12px rgba(76, 175, 80, 0); }
    100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
  }

  @keyframes pulse-dest {
    0% { box-shadow: 0 0 0 0 rgba(255, 214, 0, 0.7); }
    70% { box-shadow: 0 0 0 12px rgba(255, 214, 0, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 214, 0, 0); }
  }

  .pin-marker {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    animation: pin-pop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .pin-bubble {
    width: 36px;
    height: 36px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(0,0,0,0.6);
    border: 3px solid #ffffff;
    font-weight: 800;
  }

  .pin-origin .pin-bubble {
    background: #4CAF50;
    border-color: #ffffff;
    animation: pulse-ring 2s infinite;
  }

  .pin-destination .pin-bubble {
    background: #ffd600;
    color: #121317;
    border-color: #ffffff;
    animation: pulse-dest 2s infinite;
  }

  .pin-label {
    margin-top: 2px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(18, 19, 23, 0.88);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    border: 1px solid rgba(255, 255, 255, 0.15);
    white-space: nowrap;
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
try {
  var style = {
    version: 8,
    name: 'CRUVO_CREATE',
    sources: {
      osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 }
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
  };

  var map = new maplibregl.Map({
    container: 'map',
    style: style,
    center: [${centerLng}, ${centerLat}],
    zoom: ${zoomLevel},
    pitch: 0,
    bearing: 0,
    attributionControl: false
  });

  var currentMode = ${modeJson};
  var originMarker = null;
  var destMarker = null;

  function createPinElement(type) {
    var container = document.createElement('div');
    container.className = 'pin-marker ' + (type === 'origin' ? 'pin-origin' : 'pin-destination');

    var bubble = document.createElement('div');
    bubble.className = 'pin-bubble';
    bubble.innerHTML = type === 'origin' ? '&#9654;' : '&#9873;';

    var label = document.createElement('div');
    label.className = 'pin-label';
    label.textContent = type === 'origin' ? 'START' : 'DESTINATION';

    container.appendChild(bubble);
    container.appendChild(label);
    return container;
  }

  function updateRouteLine(orig, dest) {
    if (!map.getSource('create-route')) return;

    if (orig && dest && Number.isFinite(orig.lat) && Number.isFinite(orig.lng) && Number.isFinite(dest.lat) && Number.isFinite(dest.lng)) {
      var coords = [[orig.lng, orig.lat], [dest.lng, dest.lat]];
      map.getSource('create-route').setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords }
      });

      var bounds = new maplibregl.LngLatBounds();
      bounds.extend([orig.lng, orig.lat]);
      bounds.extend([dest.lng, dest.lat]);
      map.fitBounds(bounds, { padding: { top: 70, bottom: 90, left: 60, right: 60 }, maxZoom: 15, duration: 800 });
    } else {
      map.getSource('create-route').setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  }

  function setOriginPin(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (originMarker) { originMarker.remove(); originMarker = null; }
      return;
    }
    if (originMarker) {
      originMarker.setLngLat([lng, lat]);
    } else {
      originMarker = new maplibregl.Marker({ element: createPinElement('origin') })
        .setLngLat([lng, lat])
        .addTo(map);
    }
  }

  function setDestPin(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (destMarker) { destMarker.remove(); destMarker = null; }
      return;
    }
    if (destMarker) {
      destMarker.setLngLat([lng, lat]);
    } else {
      destMarker = new maplibregl.Marker({ element: createPinElement('destination') })
        .setLngLat([lng, lat])
        .addTo(map);
    }
  }

  map.on('load', function() {
    map.addSource('create-route', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    map.addLayer({
      id: 'create-route-glow',
      type: 'line',
      source: 'create-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ffd600', 'line-width': 8, 'line-opacity': 0.3 }
    });

    map.addLayer({
      id: 'create-route-line',
      type: 'line',
      source: 'create-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ffd600', 'line-width': 4, 'line-dasharray': [2, 1.5] }
    });

    var initOrigin = ${originJson};
    var initDest = ${destinationJson};
    if (initOrigin) setOriginPin(initOrigin.lat, initOrigin.lng);
    if (initDest) setDestPin(initDest.lat, initDest.lng);
    if (initOrigin && initDest) updateRouteLine(initOrigin, initDest);
  });

  map.on('click', function(e) {
    var lat = e.lngLat.lat;
    var lng = e.lngLat.lng;

    if (currentMode === 'origin') {
      setOriginPin(lat, lng);
    } else {
      setDestPin(lat, lng);
    }

    var msg = JSON.stringify({
      type: 'pinDropped',
      mode: currentMode,
      lat: lat,
      lng: lng
    });

    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(msg);
    }
  });

  function handleMessageData(data) {
    if (!data) return;
    try {
      var msg = typeof data === 'string' ? JSON.parse(data) : data;

      if (msg.type === 'setMode') {
        currentMode = msg.mode;
      }

      if (msg.type === 'updatePins') {
        if (msg.mode) currentMode = msg.mode;
        if (msg.origin) {
          setOriginPin(msg.origin.lat, msg.origin.lng);
        } else {
          if (originMarker) { originMarker.remove(); originMarker = null; }
        }

        if (msg.destination) {
          setDestPin(msg.destination.lat, msg.destination.lng);
        } else {
          if (destMarker) { destMarker.remove(); destMarker = null; }
        }

        updateRouteLine(msg.origin, msg.destination);
      }

      if (msg.type === 'flyTo' && Number.isFinite(msg.lat) && Number.isFinite(msg.lng)) {
        map.flyTo({
          center: [msg.lng, msg.lat],
          zoom: msg.zoom || 14,
          essential: true,
          duration: 900
        });
      }
    } catch(err) {
      console.warn('Map message error:', err);
    }
  }

  window.handleMessageData = handleMessageData;
  window.addEventListener('message', function(e) { handleMessageData(e.data); });
  document.addEventListener('message', function(e) { handleMessageData(e.data); });
} catch(e) {
  console.warn('MapLibre init error:', e);
}
</script>
</body>
</html>`;
}

const CreateRideMap = forwardRef(function CreateRideMap({
  origin,
  destination,
  activePinMode = 'origin',
  onPinDropped,
  initialCenter,
  style,
}, ref) {
  const webViewRef = useRef(null);

  const html = useMemo(
    () => buildCreateMapHtml({ initialCenter, initialZoom: 13, activePinMode, origin, destination }),
    []
  );

  const sendMessage = useCallback((msg) => {
    if (webViewRef.current) {
      try {
        const str = JSON.stringify(msg);
        webViewRef.current.postMessage(str);
        webViewRef.current.injectJavaScript(`if (window.handleMessageData) { window.handleMessageData(${str}); } true;`);
      } catch {}
    }
  }, []);

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom = 14) => {
      sendMessage({ type: 'flyTo', lat: Number(lat), lng: Number(lng), zoom });
    },
  }), [sendMessage]);

  // Sync mode changes
  useEffect(() => {
    sendMessage({ type: 'setMode', mode: activePinMode });
  }, [activePinMode, sendMessage]);

  // Sync pin changes
  useEffect(() => {
    sendMessage({
      type: 'updatePins',
      mode: activePinMode,
      origin: origin?.lat && origin?.lng ? { lat: Number(origin.lat), lng: Number(origin.lng) } : null,
      destination: destination?.lat && destination?.lng ? { lat: Number(destination.lat), lng: Number(destination.lng) } : null,
    });
  }, [origin, destination, activePinMode, sendMessage]);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'pinDropped' && onPinDropped) {
        onPinDropped({
          mode: data.mode,
          lat: data.lat,
          lng: data.lng,
        });
      }
    } catch {}
  }, [onPinDropped]);

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
        onMessage={handleMessage}
      />
    </View>
  );
});

export default CreateRideMap;

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%', backgroundColor: colors.background, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: colors.background },
});
