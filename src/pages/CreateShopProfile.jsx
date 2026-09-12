import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { getUserLocation } from '../utils/geolocation';
import './Auth.css';

function CreateShopProfile() {
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  async function handleDetectLocation() {
    setDetectingLocation(true);
    setError('');
    try {
      const loc = await getUserLocation();
      setLatitude(loc.latitude.toFixed(6));
      setLongitude(loc.longitude.toFixed(6));
    } catch (err) {
      setError(err.message);
    } finally {
      setDetectingLocation(false);
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
        address,
        description,
        phone: phone.trim() || '919876543210',
        createdAt: new Date().toISOString(),
      };

      // Only include coordinates if provided
      if (latitude && longitude) {
        shopData.latitude = parseFloat(latitude);
        shopData.longitude = parseFloat(longitude);
      }

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
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-header">
          <div className="auth-logo">
            🏪 <span className="auth-logo-accent">Set Up Your Shop</span>
          </div>
          <h1>Create Shop Profile</h1>
          <p>Tell customers about your business</p>
        </div>

        {error && <div className="auth-error" id="shop-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="shop-name">Shop Name</label>
            <input
              id="shop-name"
              className="form-input"
              type="text"
              placeholder="e.g. Pedal Power Cycles"
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
              <option value="" disabled>Select a category</option>
              <option value="Clothing">Clothing</option>
              <option value="Cycle">Cycle</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="shop-address">Address</label>
            <input
              id="shop-address"
              className="form-input"
              type="text"
              placeholder="123 Main Street, City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="shop-description">Description</label>
            <textarea
              id="shop-description"
              className="form-textarea"
              placeholder="Tell customers what makes your shop special…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="shop-phone">WhatsApp / Phone Number</label>
            <input
              id="shop-phone"
              className="form-input"
              type="text"
              placeholder="e.g. +91 98765 43210 (for WhatsApp customer contact)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* ── Location Coordinates ── */}
          <div className="form-group">
            <label>
              Shop Location
              <span style={{ fontSize: '0.78rem', fontWeight: 400, color: '#94a3b8', marginLeft: '0.5rem' }}>
                (optional)
              </span>
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <input
                id="shop-latitude"
                className="form-input"
                type="number"
                step="any"
                placeholder="Latitude (e.g. 28.6139)"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                id="shop-longitude"
                className="form-input"
                type="number"
                step="any"
                placeholder="Longitude (e.g. 77.2090)"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={detectingLocation}
              id="detect-location-btn"
              style={{
                marginTop: '0.5rem',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#fbbf24',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: detectingLocation ? 'not-allowed' : 'pointer',
                opacity: detectingLocation ? 0.6 : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              📍 {detectingLocation ? 'Detecting…' : 'Use My Location'}
            </button>
          </div>

          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={submitting}
            id="create-shop-submit-btn"
          >
            {submitting ? 'Creating Shop…' : 'Create Shop Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateShopProfile;
