import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { Store, MapPin, AlertCircle, RefreshCw, Navigation } from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { getUserLocation, reverseGeocode } from '../utils/geolocation';
import MapPinPicker from '../components/MapPinPicker';
import './Auth.css';

const DEFAULT_LATITUDE = 30.9010;
const DEFAULT_LONGITUDE = 75.8573;

function CreateShopProfile() {
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(DEFAULT_LATITUDE);
  const [longitude, setLongitude] = useState(DEFAULT_LONGITUDE);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState('');

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Reverse geocode default initial coordinates on mount
  useEffect(() => {
    let active = true;
    setReverseGeocoding(true);
    reverseGeocode(DEFAULT_LATITUDE, DEFAULT_LONGITUDE)
      .then((addr) => {
        if (active && addr) {
          setDetectedAddress(addr);
        }
      })
      .finally(() => {
        if (active) setReverseGeocoding(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Update coordinates and reverse geocode when pin moves or map is clicked
  const handleLocationChange = useCallback(async (newLat, newLng) => {
    setLatitude(newLat);
    setLongitude(newLng);
    setReverseGeocoding(true);
    try {
      const addr = await reverseGeocode(newLat, newLng);
      if (addr) {
        setDetectedAddress(addr);
        // Auto-fill address field if currently empty
        setAddress((prev) => (prev.trim() ? prev : addr));
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    } finally {
      setReverseGeocoding(false);
    }
  }, []);

  // "Use My Current Location" button handler
  async function handleUseCurrentLocation() {
    setDetectingLocation(true);
    setError('');
    try {
      const loc = await getUserLocation();
      const newLat = loc.latitude;
      const newLng = loc.longitude;
      setLatitude(newLat);
      setLongitude(newLng);

      setReverseGeocoding(true);
      const addr = await reverseGeocode(newLat, newLng);
      if (addr) {
        setDetectedAddress(addr);
        setAddress((prev) => (prev.trim() ? prev : addr));
      }
    } catch (err) {
      setError(err.message || 'Unable to detect location. Please check browser permissions.');
    } finally {
      setDetectingLocation(false);
      setReverseGeocoding(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!category) {
      return setError('Please select a shop category.');
    }

    setSubmitting(true);
    try {
      const shopData = {
        ownerId: currentUser.uid,
        shopName,
        category,
        address: address.trim(),
        description: description.trim(),
        phone: phone.trim() || '919876543210',
        latitude: typeof latitude === 'number' ? latitude : parseFloat(latitude),
        longitude: typeof longitude === 'number' ? longitude : parseFloat(longitude),
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'shops', currentUser.uid), shopData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page" id="create-shop-page">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <div className="auth-logo-box">
              <Store size={22} color="#ffffff" strokeWidth={2.4} />
            </div>
            <span className="auth-logo-text">LocalHive</span>
          </Link>
          <h1>Set Up Your Store Profile</h1>
          <p>Tell local shoppers about your business and location</p>
        </div>

        {error && (
          <div className="auth-error" id="shop-error">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="shop-name">Store Name</label>
            <input
              id="shop-name"
              className="form-input"
              type="text"
              placeholder="e.g. Apex Cycle Works or City Boutique"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="shop-category">Category</label>
            <select
              id="shop-category"
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="" disabled>Select business category</option>
              <option value="Clothing">Clothing</option>
              <option value="Cycle">Cycle</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="shop-address">Store Address</label>
            <input
              id="shop-address"
              className="form-input"
              type="text"
              placeholder="Shop number, street, landmark, city"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="shop-description">About Your Store</label>
            <textarea
              id="shop-description"
              className="form-textarea"
              placeholder="Tell customers about your products, brands, or repair services…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="shop-phone">WhatsApp / Contact Number</label>
            <input
              id="shop-phone"
              className="form-input"
              type="text"
              placeholder="e.g. +91 98765 43210 (customers use this to message you)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* ── Shop Location & Map Pin Picker ── */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <label style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                Store Location on Map
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={detectingLocation}
                id="use-my-location-btn"
                className="btn btn-secondary detect-location-btn"
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  height: 'auto',
                }}
              >
                {detectingLocation ? (
                  <>
                    <RefreshCw size={13} className="spin-icon" />
                    <span>Detecting location…</span>
                  </>
                ) : (
                  <>
                    <Navigation size={13} color="var(--color-primary)" />
                    <span>Use My Current Location</span>
                  </>
                )}
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem' }}>
              Drag the pin or click on the map to pinpoint your exact storefront location.
            </p>

            {/* Interactive Leaflet Map */}
            <MapPinPicker
              latitude={latitude}
              longitude={longitude}
              onLocationChange={handleLocationChange}
              height="260px"
            />

            {/* Approximate Address Card */}
            <div
              className="approximate-address-card"
              id="approximate-address-card"
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border)',
                fontSize: '0.84rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <MapPin size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Approximate Address:</span>
                    {detectedAddress && (
                      <button
                        type="button"
                        onClick={() => setAddress(detectedAddress)}
                        className="btn btn-primary"
                        style={{ padding: '2px 8px', fontSize: '0.74rem', height: 'auto', lineHeight: '1.2' }}
                        id="apply-detected-address-btn"
                        title="Copy detected address to Store Address field"
                      >
                        Apply to Store Address
                      </button>
                    )}
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: '1.4' }}>
                    {reverseGeocoding ? (
                      <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                        Fetching approximate address from OpenStreetMap…
                      </span>
                    ) : (
                      detectedAddress || 'No address detected yet. Click "Use My Current Location" or move the pin.'
                    )}
                  </p>
                  <div style={{ marginTop: '5px', fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                    Pin coordinates: <strong>{Number(latitude).toFixed(6)}</strong>, <strong>{Number(longitude).toFixed(6)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={submitting}
            id="create-shop-submit-btn"
          >
            {submitting ? 'Creating Profile…' : 'Complete Shop Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateShopProfile;
