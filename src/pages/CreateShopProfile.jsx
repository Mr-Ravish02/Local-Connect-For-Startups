import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { Store, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
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
      <div className="auth-card" style={{ maxWidth: 520 }}>
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

          {/* ── Location Coordinates ── */}
          <div className="form-group">
            <label>
              Shop Coordinates
              <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                (used to calculate distance on customer searches)
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
              className="btn btn-secondary"
              style={{
                marginTop: '0.65rem',
                padding: '0.45rem 0.95rem',
                fontSize: '0.82rem',
              }}
            >
              <MapPin size={14} color="var(--color-primary)" />
              {detectingLocation ? 'Detecting current coordinates…' : 'Autofill with My Current GPS Location'}
            </button>
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
