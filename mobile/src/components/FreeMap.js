import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { API_BASE } from '../config';
import { getFullAvatarUrl } from './UserAvatar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function buildHtml({ initialCenter, initialZoom, markers, polyline, initialRiders, myUserId }) {
  const markersJson = JSON.stringify(markers || []);
  const polylineJson = JSON.stringify(polyline || []);
  const initialRidersJson = JSON.stringify(initialRiders || []);
  const myUserIdJson = JSON.stringify(myUserId || null);
  const centerLng = Number.isFinite(initialCenter?.[1]) ? initialCenter[1] : 72.8777;
  const centerLat = Number.isFinite(initialCenter?.[0]) ? initialCenter[0] : 19.076;
  const zoomLevel = Number.isFinite(initialZoom) ? initialZoom : 13;
  const cleanApiBase = (API_BASE || '').replace(/\/api\/?$/, '');

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
  
  @keyframes me-pulse {
    0% { box-shadow: 0 0 0 0 rgba(255, 214, 0, 0.75), 0 3px 12px rgba(0,0,0,0.8); }
    70% { box-shadow: 0 0 0 16px rgba(255, 214, 0, 0), 0 3px 12px rgba(0,0,0,0.8); }
    100% { box-shadow: 0 0 0 0 rgba(255, 214, 0, 0), 0 3px 12px rgba(0,0,0,0.8); }
  }
  .me-marker-pulse {
    animation: me-pulse 2s infinite;
  }
  .cruvo-rider-marker {
    width: 48px;
    height: 48px;
    border-radius: 24px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.8);
    overflow: visible;
  }
  .cruvo-avatar-inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cruvo-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .cruvo-avatar-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 800;
    color: #121317;
  }
  .cruvo-flag-badge {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 22px;
    height: 22px;
    background: #e53935;
    border-radius: 11px;
    border: 2px solid #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
    z-index: 2;
  }
  .cruvo-direction-arrow {
    position: absolute;
    top: -9px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-bottom: 9px solid currentColor;
    z-index: 5;
  }
</style>
</head>
<body>
<div id="map"></div>
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
    zoom: ${zoomLevel},
    pitch: 0,
    bearing: 0,
    attributionControl: false
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right');

  var firstUserPos = true;
  var riderMarkers = {};
  var COLORS = ['#ffd600','#4CAF50','#FF9800','#2196F3','#E91E63','#9C27B0','#00BCD4','#FF5722'];
  var API_BASE_SERVER = '${cleanApiBase}';
  var rawPolyline = ${polylineJson} || [];
  // The current device’s own user ID — camera ONLY follows this user’s GPS
  var MY_USER_ID = ${myUserIdJson};

  // --- Stable camera state (prevents jitter / teleporting) ---
  var smoothedHeading = 0;         // EMA-smoothed compass bearing
  var lastCamLat = null;           // Last camera position — skip update if barely moved
  var lastCamLng = null;
  var MIN_MOVE_DEG = 0.00005;      // ~5m in degrees — ignore smaller GPS jitter
  var MIN_SPEED_FOR_BEARING = 1.5; // m/s (~5 km/h) — below this keep bearing fixed

  // Smooth heading across the 0/360 wrap-around boundary
  function smoothHeading(prev, next, alpha) {
    var diff = next - prev;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return prev + alpha * diff;
  }

  function updateProgressPolyline(userLngLat) {
    if (!rawPolyline || !Array.isArray(rawPolyline) || rawPolyline.length < 2 || !userLngLat) return;
    var uLng = userLngLat[0];
    var uLat = userLngLat[1];
    if (!Number.isFinite(uLng) || !Number.isFinite(uLat)) return;

    var minDistanceSq = Infinity;
    var closestIdx = 0;

    for (var i = 0; i < rawPolyline.length; i++) {
      var pt = rawPolyline[i];
      var dLng = pt[0] - uLng;
      var dLat = pt[1] - uLat;
      var distSq = dLng * dLng + dLat * dLat;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestIdx = i;
      }
    }

    if (minDistanceSq < 0.0003) {
      var remaining = [userLngLat].concat(rawPolyline.slice(closestIdx + 1));
      if (remaining.length >= 2) {
        var src = map.getSource('route');
        if (src) {
          src.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: remaining
            }
          });
        }
      }
    }
  }

  var interpolationStates = {};

  function easeInOutQuad(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  function interpolateAngle(current, target, t) {
    var diff = target - current;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return current + diff * t;
  }

  function updateRiderPositionState(uid, lat, lng, heading, speed) {
    var now = performance.now();
    var marker = riderMarkers[uid];
    if (!marker) return;

    if (!interpolationStates[uid]) {
      interpolationStates[uid] = {
        marker: marker,
        currentLng: lng,
        currentLat: lat,
        prevLng: lng,
        prevLat: lat,
        targetLng: lng,
        targetLat: lat,
        currentHeading: heading || 0,
        targetHeading: heading || 0,
        lastUpdateTime: now,
        updateInterval: 1000
      };
      marker.setLngLat([lng, lat]);
      if (Number.isFinite(heading)) {
        marker.setRotation(heading);
      }
    } else {
      var state = interpolationStates[uid];
      state.marker = marker;
      state.prevLng = state.currentLng;
      state.prevLat = state.currentLat;
      state.targetLng = lng;
      state.targetLat = lat;

      var elapsedSinceLastUpdate = now - state.lastUpdateTime;
      if (elapsedSinceLastUpdate > 400 && elapsedSinceLastUpdate < 12000) {
        state.updateInterval = elapsedSinceLastUpdate;
      } else {
        state.updateInterval = 1000;
      }
      state.lastUpdateTime = now;

      if (Number.isFinite(heading)) {
        state.targetHeading = heading;
      }
    }
  }

  function createMarkerElement(r, isMe, colorIndex) {
    var el = document.createElement('div');
    var color = isMe ? '#ffd600' : COLORS[colorIndex % COLORS.length];
    var borderColor = isMe ? '#ffd600' : '#ffffff';
    var pulseClass = isMe ? ' me-marker-pulse' : '';
    
    el.className = 'cruvo-rider-marker' + pulseClass;
    el.style.backgroundColor = color;
    el.style.border = '3px solid ' + borderColor;

    // Direction arrow pointing in the direction of marker rotation (heading)
    var arrow = document.createElement('div');
    arrow.className = 'cruvo-direction-arrow';
    arrow.style.color = borderColor;
    el.appendChild(arrow);

    var inner = document.createElement('div');
    inner.className = 'cruvo-avatar-inner';
    inner.style.backgroundColor = color;

    var avatarUrl = r.avatar_url;
    if (avatarUrl && avatarUrl.indexOf('http') !== 0 && avatarUrl.indexOf('data:') !== 0) {
      avatarUrl = API_BASE_SERVER + (avatarUrl.indexOf('/') === 0 ? '' : '/') + avatarUrl;
    }

    if (avatarUrl) {
      var img = document.createElement('img');
      img.className = 'cruvo-avatar-img';
      img.src = avatarUrl;
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';

      var fallback = document.createElement('div');
      fallback.className = 'cruvo-avatar-fallback';
      fallback.style.display = 'none';
      fallback.textContent = r.initials || '??';

      img.onerror = function() {
        img.style.display = 'none';
        fallback.style.display = 'flex';
      };

      inner.appendChild(img);
      inner.appendChild(fallback);
    } else {
      var fallback = document.createElement('div');
      fallback.className = 'cruvo-avatar-fallback';
      fallback.textContent = r.initials || '??';
      inner.appendChild(fallback);
    }

    el.appendChild(inner);

    if (r.flag_type) {
      var flagEmoji = '🚩';
      if (r.flag_type === 'FUEL') flagEmoji = '⛽';
      else if (r.flag_type === 'FOOD') flagEmoji = '🍔';
      else if (r.flag_type === 'BREAK') flagEmoji = '☕';
      else if (r.flag_type === 'ISSUE') flagEmoji = '⚠️';
      
      var badge = document.createElement('div');
      badge.className = 'cruvo-flag-badge';
      badge.textContent = flagEmoji;
      badge.dataset.flagType = r.flag_type;
      el.appendChild(badge);
    }

    return el;
  }

  function updateMarkerElement(marker, r, isMe, colorIndex) {
    var el = marker.getElement();
    if (!el) return;

    var borderColor = isMe ? '#ffd600' : '#ffffff';

    var existingBadge = el.querySelector('.cruvo-flag-badge');
    var existingFlagType = existingBadge ? existingBadge.dataset.flagType : null;
    var newFlagType = r.flag_type || null;

    if (String(existingFlagType) !== String(newFlagType)) {
      if (newFlagType) {
        var flagEmoji = '🚩';
        if (newFlagType === 'FUEL') flagEmoji = '⛽';
        else if (newFlagType === 'FOOD') flagEmoji = '🍔';
        else if (newFlagType === 'BREAK') flagEmoji = '☕';
        else if (newFlagType === 'ISSUE') flagEmoji = '⚠️';

        if (existingBadge) {
          existingBadge.textContent = flagEmoji;
          existingBadge.dataset.flagType = newFlagType;
        } else {
          var badge = document.createElement('div');
          badge.className = 'cruvo-flag-badge';
          badge.textContent = flagEmoji;
          badge.dataset.flagType = newFlagType;
          el.appendChild(badge);
        }
      } else {
        if (existingBadge) {
          existingBadge.remove();
        }
      }
    }

    var inner = el.querySelector('.cruvo-avatar-inner');
    if (!inner) return;

    var existingImg = inner.querySelector('img');
    var existingFallback = inner.querySelector('.cruvo-avatar-fallback');
    
    var avatarUrl = r.avatar_url;
    if (avatarUrl && avatarUrl.indexOf('http') !== 0 && avatarUrl.indexOf('data:') !== 0) {
      avatarUrl = API_BASE_SERVER + (avatarUrl.indexOf('/') === 0 ? '' : '/') + avatarUrl;
    }

    if (avatarUrl) {
      if (existingImg) {
        var normalizedImgSrc = existingImg.src;
        if (normalizedImgSrc !== avatarUrl) {
          existingImg.src = avatarUrl;
          existingImg.style.display = 'block';
          if (existingFallback) existingFallback.style.display = 'none';
        }
      } else {
        var img = document.createElement('img');
        img.className = 'cruvo-avatar-img';
        img.src = avatarUrl;
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';

        var fallback = existingFallback || document.createElement('div');
        fallback.className = 'cruvo-avatar-fallback';
        fallback.style.display = 'none';
        fallback.textContent = r.initials || '??';

        img.onerror = function() {
          img.style.display = 'none';
          fallback.style.display = 'flex';
        };

        inner.innerHTML = '';
        inner.appendChild(img);
        inner.appendChild(fallback);
      }
    } else {
      if (existingImg) existingImg.style.display = 'none';
      if (existingFallback) {
        existingFallback.style.display = 'flex';
        existingFallback.textContent = r.initials || '??';
      } else {
        var fallback = document.createElement('div');
        fallback.className = 'cruvo-avatar-fallback';
        fallback.textContent = r.initials || '??';
        inner.innerHTML = '';
        inner.appendChild(fallback);
      }
    }
  }

  function renderRiders(riders, myUserId) {
    if (!Array.isArray(riders)) return;
    var seen = {};

    riders.forEach(function(r, i) {
      if (!r || !Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return;
      var uid = String(r.user);
      seen[uid] = true;
      var isMe = myUserId && String(myUserId) === uid;

      if (riderMarkers[uid]) {
        // If it's NOT the local user, update their coordinate targets.
        // The local user's coordinate target is driven directly by the local GPS watch to prevent jumping back to server coordinates.
        if (!isMe) {
          updateRiderPositionState(uid, r.lat, r.lng, r.heading, r.speed);
        }

        // Direct DOM update instead of full marker removal/recreation to prevent flashing
        updateMarkerElement(riderMarkers[uid], r, isMe, i);
      } else {
        var el = createMarkerElement(r, isMe, i);
        var marker = new maplibregl.Marker({ element: el }).setLngLat([r.lng, r.lat]).addTo(map);
        riderMarkers[uid] = marker;
        updateRiderPositionState(uid, r.lat, r.lng, r.heading, r.speed);
      }
    });

    Object.keys(riderMarkers).forEach(function(uid) {
      if (!seen[uid]) {
        riderMarkers[uid].remove();
        delete riderMarkers[uid];
        delete interpolationStates[uid];
      }
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    var now = performance.now();

    Object.keys(interpolationStates).forEach(function(uid) {
      var state = interpolationStates[uid];
      if (!state.marker) return;

      var elapsed = now - state.lastUpdateTime;
      var t = Math.min(elapsed / state.updateInterval, 1.0);
      var easedT = easeInOutQuad(t);

      var currentLng = state.prevLng + (state.targetLng - state.prevLng) * easedT;
      var currentLat = state.prevLat + (state.targetLat - state.prevLat) * easedT;

      state.currentLng = currentLng;
      state.currentLat = currentLat;
      state.marker.setLngLat([currentLng, currentLat]);

      // Interpolate heading and set rotation
      if (Number.isFinite(state.targetHeading)) {
        var currentHeading = interpolateAngle(state.currentHeading, state.targetHeading, easedT);
        state.currentHeading = currentHeading;
        state.marker.setRotation(currentHeading);

        // Apply inverse transform on the inner avatar image/fallback so it remains upright
        var inner = state.marker.getElement().querySelector('.cruvo-avatar-inner');
        if (inner) {
          inner.style.transform = 'rotate(' + (-currentHeading) + 'deg)';
        }
      }
    });
  }

  requestAnimationFrame(animate);

  function handleMessageData(data) {
    if (!data) return;
    try {
      var msg = typeof data === 'string' ? JSON.parse(data) : data;

      if (msg.type === 'userLocation' && Number.isFinite(msg.lat) && Number.isFinite(msg.lng)) {
        var lngLat = [msg.lng, msg.lat];
        var speed = Number.isFinite(msg.speed) ? msg.speed : 0;
        var rawHeading = Number.isFinite(msg.heading) ? msg.heading : 0;

        // Move MY own avatar marker in real-time from device GPS (not waiting for WebSocket batch)
        if (MY_USER_ID && riderMarkers[String(MY_USER_ID)]) {
          updateRiderPositionState(String(MY_USER_ID), msg.lat, msg.lng, rawHeading, speed);
        }

        // Camera follow logic — only when followUser is true
        if (msg.followUser) {
          if (firstUserPos) {
            // First fix: jump immediately to current position, no bearing
            firstUserPos = false;
            lastCamLat = msg.lat;
            lastCamLng = msg.lng;
            smoothedHeading = 0;
            map.jumpTo({ center: lngLat, zoom: 17, pitch: 0, bearing: 0 });
          } else {
            // Only move camera if moved more than MIN_MOVE_DEG (eliminates GPS jitter teleport)
            var moveLat = Math.abs(msg.lat - lastCamLat);
            var moveLng = Math.abs(msg.lng - lastCamLng);
            var hasMoved = moveLat > MIN_MOVE_DEG || moveLng > MIN_MOVE_DEG;

            if (hasMoved) {
              lastCamLat = msg.lat;
              lastCamLng = msg.lng;

              // Only rotate map bearing when actually moving (speed threshold)
              // Below threshold keep bearing fixed to avoid spinning from compass noise
              var targetBearing = map.getBearing(); // default: keep current
              if (speed >= MIN_SPEED_FOR_BEARING) {
                // Smooth heading with EMA — alpha=0.25 means slow blend, very stable
                smoothedHeading = smoothHeading(smoothedHeading, rawHeading, 0.25);
                targetBearing = smoothedHeading;
              }

              map.easeTo({
                center: lngLat,
                zoom: Math.max(map.getZoom(), 15),
                pitch: 0,           // Flat top-down: no 3D tilt jitter
                bearing: targetBearing,
                duration: 1200,     // Slower ease = much smoother
              });
            }
          }
        }
        updateProgressPolyline(lngLat);
      }

      if (msg.type === 'updateRiders') {
        // Sync MY_USER_ID from the message in case it was set later
        if (msg.myUserId != null) MY_USER_ID = msg.myUserId;
        renderRiders(msg.riders || [], MY_USER_ID);
      }

      if (msg.type === 'recenter') {
        var targetLat = Number.isFinite(msg.lat) ? msg.lat : lastCamLat;
        var targetLng = Number.isFinite(msg.lng) ? msg.lng : lastCamLng;
        if (Number.isFinite(targetLat) && Number.isFinite(targetLng)) {
          lastCamLat = targetLat;
          lastCamLng = targetLng;
          smoothedHeading = 0;
          map.easeTo({
            center: [targetLng, targetLat],
            zoom: 17,
            pitch: 0,
            bearing: 0,
            duration: 800,
          });
        }
      }
    } catch(err) {
      console.warn('WebView message handler error:', err);
    }
  }

  window.handleMessageData = handleMessageData;
  window.addEventListener('message', function(e) { handleMessageData(e.data); });
  document.addEventListener('message', function(e) { handleMessageData(e.data); });

  map.on('load', function() {
    try {
      var coords = rawPolyline;
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

      var initRiders = ${initialRidersJson};
      if (Array.isArray(initRiders) && initRiders.length > 0) {
        renderRiders(initRiders, ${myUserIdJson});
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

export default function FreeMap({ ride, positions = [], myUserId, userLocation, heading, followMyLocation = false, recenterTrigger, style }) {
  const webViewRef = useRef(null);
  const lastLocationRef = useRef(null);
  const lastRidersJson = useRef('');

  // STABLE initial center computation - NEVER recomputed on userLocation changes to prevent WebView reloads!
  const initialCenter = useMemo(() => {
    let lat = 19.076;
    let lng = 72.8777;

    if (ride?.origin_lat && ride?.destination_lat) {
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
    } else if (userLocation && Number.isFinite(Number(userLocation.latitude)) && Number.isFinite(Number(userLocation.longitude))) {
      lat = Number(userLocation.latitude);
      lng = Number(userLocation.longitude);
    }
    return [lat, lng];
    // ONLY recompute on ride coordinate change, NOT on userLocation changes!
  }, [ride?.id, ride?.origin_lat, ride?.destination_lat, ride?.origin_lng, ride?.destination_lng]);

  const initialZoom = useMemo(() => {
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
  }, [ride?.id, ride?.origin_lat, ride?.destination_lat, ride?.origin_lng, ride?.destination_lng]);

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

    if (ride?.origin_lat && ride?.destination_lat) {
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

  const initialRiders = useMemo(() => {
    return (positions || [])
      .map(p => {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          user: p.user,
          lat,
          lng,
          initials: p.initials || '??',
          avatar_url: getFullAvatarUrl(p.avatar_url) || null,
          display_name: p.display_name || '',
          flag_type: p.flag_type || null,
        };
      })
      .filter(Boolean);
  }, [ride?.id]);

  // STABLE HTML: Only memoized on static ride & route properties!
  const html = useMemo(
    () => buildHtml({ initialCenter, initialZoom, markers, polyline, initialRiders, myUserId }),
    [ride?.id, initialCenter, initialZoom, markers, polyline]
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

  const sendRidersUpdate = useCallback(() => {
    const riders = (positions || [])
      .map(p => {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          user: p.user,
          lat,
          lng,
          initials: p.initials || '??',
          avatar_url: getFullAvatarUrl(p.avatar_url) || null,
          display_name: p.display_name || '',
          flag_type: p.flag_type || null,
        };
      })
      .filter(Boolean);

    const json = JSON.stringify(riders);
    if (json !== lastRidersJson.current) {
      lastRidersJson.current = json;
      sendMessage({ type: 'updateRiders', riders, myUserId });
    }
  }, [positions, myUserId, sendMessage]);

  const sendUserLocationUpdate = useCallback(() => {
    if (userLocation && Number.isFinite(Number(userLocation.latitude)) && Number.isFinite(Number(userLocation.longitude))) {
      const lat = Number(userLocation.latitude);
      const lng = Number(userLocation.longitude);
      const head = Math.round(Number(heading) || 0);
      const spd = Number.isFinite(Number(userLocation.speed)) ? Number(userLocation.speed) : 0;
      const key = `${lat.toFixed(5)},${lng.toFixed(5)},${head},${spd.toFixed(1)},${followMyLocation}`;
      if (key !== lastLocationRef.current) {
        lastLocationRef.current = key;
        sendMessage({
          type: 'userLocation',
          lat,
          lng,
          heading: head,
          speed: spd,
          followUser: followMyLocation,
        });
      }
    }
  }, [userLocation, heading, followMyLocation, sendMessage]);

  useEffect(() => {
    sendUserLocationUpdate();
  }, [sendUserLocationUpdate]);

  useEffect(() => {
    sendRidersUpdate();
  }, [sendRidersUpdate]);

  useEffect(() => {
    if (recenterTrigger) {
      if (userLocation && Number.isFinite(Number(userLocation.latitude)) && Number.isFinite(Number(userLocation.longitude))) {
        sendMessage({
          type: 'recenter',
          lat: Number(userLocation.latitude),
          lng: Number(userLocation.longitude),
        });
      } else {
        sendMessage({ type: 'recenter' });
      }
    }
  }, [recenterTrigger, userLocation, sendMessage]);

  const handleWebViewLoad = useCallback(() => {
    lastLocationRef.current = null;
    lastRidersJson.current = '';
    sendUserLocationUpdate();
    sendRidersUpdate();
  }, [sendUserLocationUpdate, sendRidersUpdate]);

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
        onLoadEnd={handleWebViewLoad}
        onMessage={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#121317', overflow: 'hidden' },
  webview: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: '#121317' },
});
