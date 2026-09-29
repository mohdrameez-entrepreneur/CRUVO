import axios from 'axios';
import { TOMTOM_API_KEY, TOMTOM_BASE_URL } from '../config';

/**
 * Search places and landmarks with fuzzy matching, proximity biasing, and multi-provider fallbacks.
 * @param {string} query - The search text typed by the user
 * @param {object} options - Options including userCoords ([lat, lng]), limit
 * @returns {Promise<Array<{id: string, name: string, subtitle: string, fullAddress: string, lat: number, lng: number}>>}
 */
export async function searchPlaces(query, options = {}) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return [];
  }

  const cleanQuery = query.trim();
  const limit = options.limit || 6;
  const userCoords = options.userCoords; // [lat, lng] or null
  let results = [];

  // 1. Primary: TomTom Search API (High accuracy, POIs, streets, localities)
  if (TOMTOM_API_KEY) {
    try {
      const params = {
        key: TOMTOM_API_KEY,
        limit,
        typeahead: true,
      };

      if (userCoords && Array.isArray(userCoords) && userCoords.length === 2 && Number.isFinite(userCoords[0]) && Number.isFinite(userCoords[1])) {
        params.lat = userCoords[0];
        params.lon = userCoords[1];
        params.radius = 50000; // 50km bias
      }

      const res = await axios.get(`${TOMTOM_BASE_URL}/search/${encodeURIComponent(cleanQuery)}.json`, {
        params,
        timeout: 4000,
      });

      if (res.data?.results?.length > 0) {
        results = res.data.results.map((r, i) => {
          const addr = r.address || {};
          const poi = r.poi?.name;
          const mainName = poi || addr.freeformAddress?.split(',')?.[0] || addr.municipality || cleanQuery;
          
          const parts = [
            addr.municipalitySubdivision,
            addr.municipality,
            addr.countrySubdivision,
            addr.country,
          ].filter(Boolean);

          const subtitle = parts.length > 0 ? parts.join(', ') : addr.freeformAddress || '';
          const fullAddress = addr.freeformAddress || [mainName, subtitle].filter(Boolean).join(', ');

          return {
            id: r.id || `tt-${i}-${Date.now()}`,
            name: mainName.trim(),
            subtitle: subtitle.trim(),
            fullAddress: fullAddress.trim(),
            lat: r.position.lat,
            lng: r.position.lon,
            source: 'tomtom',
          };
        });
      }
    } catch (err) {
      console.log('[LocationService] TomTom search notice:', err.message);
    }
  }

  // 2. Secondary Fallback: Photon API (OSM Geocoder with high coverage)
  if (results.length === 0) {
    try {
      const params = {
        q: cleanQuery,
        limit,
      };

      if (userCoords && Array.isArray(userCoords) && userCoords.length === 2) {
        params.lat = userCoords[0];
        params.lon = userCoords[1];
      }

      const res = await axios.get('https://photon.komoot.io/api/', {
        params,
        timeout: 4000,
      });

      if (res.data?.features?.length > 0) {
        results = res.data.features.map((f, i) => {
          const p = f.properties || {};
          const coords = f.geometry?.coordinates || [0, 0];
          const mainName = p.name || p.street || cleanQuery;
          const parts = [p.district || p.suburb, p.city || p.county, p.state, p.country].filter(Boolean);
          const subtitle = parts.join(', ');
          const fullAddress = [mainName, subtitle].filter(Boolean).join(', ');

          return {
            id: String(p.osm_id || `ph-${i}`),
            name: mainName.trim(),
            subtitle: subtitle.trim(),
            fullAddress: fullAddress.trim(),
            lat: coords[1],
            lng: coords[0],
            source: 'photon',
          };
        });
      }
    } catch (err) {
      console.log('[LocationService] Photon fallback notice:', err.message);
    }
  }

  // 3. Tertiary Fallback: OpenStreetMap Nominatim API
  if (results.length === 0) {
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          format: 'json',
          q: cleanQuery,
          limit,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'CRUVO-RiderApp/3.1',
        },
        timeout: 4000,
      });

      if (Array.isArray(res.data) && res.data.length > 0) {
        results = res.data.map((item, i) => {
          const displayName = item.display_name || cleanQuery;
          const nameParts = displayName.split(',').map(s => s.trim());
          const mainName = nameParts[0] || cleanQuery;
          const subtitle = nameParts.slice(1, 4).join(', ');

          return {
            id: String(item.place_id || `nom-${i}`),
            name: mainName,
            subtitle: subtitle || displayName,
            fullAddress: displayName,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            source: 'nominatim',
          };
        });
      }
    } catch (err) {
      console.log('[LocationService] Nominatim fallback notice:', err.message);
    }
  }

  return results;
}

/**
 * Reverse geocode latitude and longitude to a human-readable address.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string>}
 */
export async function reverseGeocode(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'Unknown Location';
  }

  // 1. Try TomTom Reverse Geocoding
  if (TOMTOM_API_KEY) {
    try {
      const res = await axios.get(`${TOMTOM_BASE_URL}/reverseGeocode/${lng},${lat}.json`, {
        params: { key: TOMTOM_API_KEY },
        timeout: 3500,
      });
      const addr = res.data?.addresses?.[0]?.address;
      if (addr?.freeformAddress) {
        return addr.freeformAddress;
      }
    } catch (err) {
      console.log('[LocationService] TomTom reverse geocode notice:', err.message);
    }
  }

  // 2. Fallback Nominatim Reverse Geocoding
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat,
        lon: lng,
      },
      headers: {
        'User-Agent': 'CRUVO-RiderApp/3.1',
      },
      timeout: 3500,
    });
    if (res.data?.display_name) {
      const parts = res.data.display_name.split(',').map(s => s.trim());
      return parts.slice(0, 3).join(', ');
    }
  } catch (err) {
    console.log('[LocationService] Nominatim reverse notice:', err.message);
  }

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
