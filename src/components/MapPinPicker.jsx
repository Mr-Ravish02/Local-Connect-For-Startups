import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom draggable brand pin (Deep teal with white center)
const draggablePinIcon = L.divIcon({
  className: 'shop-map-picker-pin',
  html: `<div style="
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 48px;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.35));
    cursor: grab;
  ">
    <svg width="36" height="48" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 42 16 42S32 28 32 16C32 7.16 24.84 0 16 0Z" fill="#0f766e"/>
      <circle cx="16" cy="16" r="8" fill="#ffffff"/>
      <circle cx="16" cy="16" r="4" fill="#0f766e"/>
    </svg>
  </div>`,
  iconSize: [36, 48],
  iconAnchor: [18, 48],
  popupAnchor: [0, -48],
});

function MapPinPicker({ latitude, longitude, onLocationChange, height = '260px' }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const onLocationChangeRef = useRef(onLocationChange);

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent double initialization

    const lat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : 30.9010;
    const lng = typeof longitude === 'number' && !isNaN(longitude) ? longitude : 75.8573;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat, lng], {
      draggable: true,
      icon: draggablePinIcon,
      autoPan: true,
    }).addTo(map);

    marker.bindTooltip('Drag this pin to your shop location', {
      permanent: false,
      direction: 'top',
      offset: [0, -44],
    });

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      if (onLocationChangeRef.current) {
        onLocationChangeRef.current(pos.lat, pos.lng);
      }
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      if (onLocationChangeRef.current) {
        onLocationChangeRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Invalidate size to ensure proper tile rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Sync map view and marker when latitude or longitude props change externally (e.g. Geolocation)
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        const currentPos = markerRef.current.getLatLng();
        if (
          Math.abs(currentPos.lat - latitude) > 0.00005 ||
          Math.abs(currentPos.lng - longitude) > 0.00005
        ) {
          markerRef.current.setLatLng([latitude, longitude]);
          mapInstanceRef.current.setView([latitude, longitude], 15, { animate: true });
        }
      }
    }
  }, [latitude, longitude]);

  return (
    <div
      ref={mapContainerRef}
      id="shop-pin-picker-map"
      style={{
        width: '100%',
        height,
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}
    />
  );
}

export default MapPinPicker;

