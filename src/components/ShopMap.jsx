import { useEffect, useRef } from 'react';
import L from 'leaflet';
import './ShopMap.css';

// Fix Leaflet's default marker icon paths (broken by bundlers)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom amber shop marker
const shopIcon = L.divIcon({
  className: 'shop-map-marker',
  html: `<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 42 16 42S32 28 32 16C32 7.16 24.84 0 16 0Z" fill="#f59e0b"/>
    <circle cx="16" cy="16" r="8" fill="#1a1726"/>
    <circle cx="16" cy="16" r="4" fill="#fbbf24"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});

// Customer "You are here" marker
const userIcon = L.divIcon({
  className: 'shop-map-marker-user',
  html: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="14" fill="rgba(59,130,246,0.2)"/>
    <circle cx="14" cy="14" r="8" fill="rgba(59,130,246,0.5)"/>
    <circle cx="14" cy="14" r="5" fill="#3b82f6"/>
    <circle cx="14" cy="14" r="2.5" fill="white"/>
  </svg>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

/**
 * Helper to check if latitude and longitude are valid numbers within range,
 * excluding (0, 0) Null Island.
 */
function isValidCoord(lat, lng) {
  return (
    typeof lat === 'number' &&
    !isNaN(lat) &&
    typeof lng === 'number' &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    (Math.abs(lat) > 0.001 || Math.abs(lng) > 0.001)
  );
}

/**
 * Calculate distance in km between two lat/lng points (Haversine formula).
 */
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * ShopMap — renders an interactive Leaflet map with shop + user markers.
 *
 * Props:
 *   shops        — Array of shop objects (need latitude, longitude, shopName, category, distance)
 *   userLocation — { latitude, longitude } or null
 */
function ShopMap({ shops = [], userLocation = null }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Filter to only shops with valid lat/lng coordinates
    const validShops = shops.filter((s) => isValidCoord(s.latitude, s.longitude));

    // Calculate center of shop cluster (default to Ludhiana centre: 30.9010, 75.8573)
    let centerLat = 30.9010;
    let centerLng = 75.8573;

    if (validShops.length > 0) {
      const sumLat = validShops.reduce((sum, s) => sum + s.latitude, 0);
      const sumLng = validShops.reduce((sum, s) => sum + s.longitude, 0);
      centerLat = sumLat / validShops.length;
      centerLng = sumLng / validShops.length;
    }

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    mapInstanceRef.current = map;

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const shopBoundsPoints = [];

    // Add valid shop markers
    validShops.forEach((shop) => {
      const distStr =
        shop.distance !== null && shop.distance !== undefined
          ? `<div class="map-popup-distance">
               📍 <span class="map-popup-distance-value">${shop.distance.toFixed(1)} km</span> away
             </div>`
          : '';

      const popupContent = `
        <div class="map-popup">
          <div class="map-popup-name">${shop.shopName || 'Shop'}</div>
          <span class="map-popup-category">${shop.category || ''}</span>
          ${distStr}
        </div>
      `;

      L.marker([shop.latitude, shop.longitude], { icon: shopIcon })
        .addTo(map)
        .bindPopup(popupContent);

      shopBoundsPoints.push([shop.latitude, shop.longitude]);
    });

    // Add user marker if valid
    const isUserValid =
      userLocation && isValidCoord(userLocation.latitude, userLocation.longitude);

    if (isUserValid) {
      const userMarker = L.marker(
        [userLocation.latitude, userLocation.longitude],
        { icon: userIcon, zIndexOffset: 1000 }
      ).addTo(map);

      userMarker.bindPopup(
        '<div class="map-popup-user">📍 You are here</div>',
        { closeButton: false }
      );
    }

    // Determine auto-fit bounds:
    // Only include user location in auto-fit if it's within 50 km of the shop cluster
    const boundsPoints = [...shopBoundsPoints];
    if (isUserValid) {
      const userDistFromShops = getDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        centerLat,
        centerLng
      );

      // If user is nearby (<= 50 km), fit map to include both user and shops
      if (userDistFromShops <= 50) {
        boundsPoints.push([userLocation.latitude, userLocation.longitude]);
      }
    }

    // Fit bounds or set view cleanly
    if (boundsPoints.length > 1) {
      map.fitBounds(boundsPoints, { padding: [50, 50], maxZoom: 15 });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 14);
    } else {
      map.setView([centerLat, centerLng], 13);
    }

    // Cleanup on unmount
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [shops, userLocation]);

  return (
    <div className="shop-map-section" id="shop-map-section">
      <h3 className="shop-map-heading">
        <span className="shop-map-heading-icon">🗺️</span>
        Shops Near You
      </h3>
      <div className="shop-map-container">
        <div
          ref={mapContainerRef}
          className="shop-map-inner"
          id="shop-map"
        />
      </div>
    </div>
  );
}

export default ShopMap;
