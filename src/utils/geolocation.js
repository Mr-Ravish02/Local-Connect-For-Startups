/**
 * Geolocation utilities for LocalHive
 * - getUserLocation: browser Geolocation API wrapper
 * - haversineDistance: distance between two lat/lng pairs (km)
 * - sortShopsByDistance: sort shops nearest-first with distance attached
 */

/**
 * Request the customer's current location via the browser Geolocation API.
 * Returns a Promise that resolves to { latitude, longitude }.
 */
export function getUserLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by this browser.'));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out.'));
            break;
          default:
            reject(new Error('An unknown location error occurred.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // cache for 5 minutes
        ...options,
      }
    );
  });
}

/**
 * Calculate the great-circle distance between two points on Earth
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lon1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lon2 - Longitude of point 2 (degrees)
 * @returns {number} Distance in kilometres
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Attach a `distance` (km) property to each shop and return a new array
 * sorted nearest-first.
 *
 * Shops without valid coordinates are pushed to the end with distance = null.
 *
 * @param {Array} shops - Array of shop objects with optional latitude/longitude
 * @param {number} userLat - Customer latitude
 * @param {number} userLon - Customer longitude
 * @returns {Array} New array of shops sorted by distance (nearest first)
 */
export function sortShopsByDistance(shops, userLat, userLon) {
  return shops
    .map((shop) => {
      const hasCoords =
        typeof shop.latitude === 'number' && typeof shop.longitude === 'number';

      return {
        ...shop,
        distance: hasCoords
          ? haversineDistance(userLat, userLon, shop.latitude, shop.longitude)
          : null,
      };
    })
    .sort((a, b) => {
      // Shops with no distance go to the end
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
}

/**
 * Reverse geocode latitude and longitude to a human-readable address
 * using OpenStreetMap's free Nominatim API.
 *
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<string>} Formatted address or empty string
 */
export async function reverseGeocode(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return '';
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Reverse geocoding error: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.display_name || '';
  } catch (err) {
    console.error('Reverse geocode failed:', err);
    return '';
  }
}

