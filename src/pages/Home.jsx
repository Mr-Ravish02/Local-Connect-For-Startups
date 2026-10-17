import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import {
  MapPin,
  Store,
  Shirt,
  Bike,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Package,
  Layers,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { db } from '../firebase/config';
import { getUserLocation, sortShopsByDistance } from '../utils/geolocation';
import Navbar from '../components/Navbar';
import ShopMap from '../components/ShopMap';
import './Home.css';

const CATEGORIES = ['All', 'Clothing', 'Cycle'];

function getShopBanner(shop) {
  if (shop.bannerUrl) return shop.bannerUrl;
  if (shop.imageUrl) return shop.imageUrl;
  if (shop.photoUrl) return shop.photoUrl;
  if (shop.category === 'Clothing') {
    return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=700&auto=format&fit=crop&q=80';
  }
  if (shop.category === 'Cycle') {
    return 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=700&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&auto=format&fit=crop&q=80';
}

function Home() {
  const [shops, setShops] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const shopsRef = useRef(null);
  const navigate = useNavigate();

  // ── Geolocation state ──
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('loading'); // loading | granted | denied | unavailable
  const [locationError, setLocationError] = useState('');

  // Request user's location
  const requestLocation = useCallback(async () => {
    setLocationStatus('loading');
    setLocationError('');
    try {
      const loc = await getUserLocation();
      setUserLocation(loc);
      setLocationStatus('granted');
    } catch (err) {
      setLocationStatus('denied');
      setLocationError(err.message);
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    async function fetchShopsAndProducts() {
      try {
        // Fetch shops
        const shopsSnap = await getDocs(collection(db, 'shops'));
        const items = [];
        shopsSnap.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        setShops(items);

        // Fetch products to count per shop
        const productsSnap = await getDocs(collection(db, 'products'));
        const counts = {};
        productsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.shopId) {
            counts[data.shopId] = (counts[data.shopId] || 0) + 1;
          }
        });
        setProductCounts(counts);
      } catch (err) {
        console.error('Error fetching shops:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchShopsAndProducts();
  }, []);

  // Sort shops by distance when location is available
  const shopsWithDistance = useMemo(() => {
    if (userLocation) {
      return sortShopsByDistance(shops, userLocation.latitude, userLocation.longitude);
    }
    return shops.map((s) => ({ ...s, distance: null }));
  }, [shops, userLocation]);

  const filteredShops = useMemo(() => {
    if (activeCategory === 'All') return shopsWithDistance;
    return shopsWithDistance.filter((s) => s.category === activeCategory);
  }, [shopsWithDistance, activeCategory]);

  // Shops with valid coordinates for the map
  const mappableShops = useMemo(() => {
    return shopsWithDistance.filter(
      (s) => typeof s.latitude === 'number' && typeof s.longitude === 'number'
    );
  }, [shopsWithDistance]);

  // Compute total products across all shops
  const totalProducts = useMemo(() => {
    return Object.values(productCounts).reduce((sum, c) => sum + c, 0);
  }, [productCounts]);

  function scrollToShops() {
    shopsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  /** Format distance for display */
  function formatDistance(km) {
    if (km === null || km === undefined) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
  }

  return (
    <>
      <Navbar />
      <main className="home" id="home-page">
        {/* ── Hero Section: Clean & Professional ── */}
        <section className="hero">
          <div className="hero-content">
            <div className="hero-badge">
              <ShieldCheck size={15} />
              <span>Verified Local Business Directory</span>
            </div>
            <h1 className="hero-title">
              Discover & Support Local Shops Near You
            </h1>
            <p className="hero-subtitle">
              LocalHive connects you directly with neighborhood boutiques and cycle stores.
              Check live inventory, compare prices, and connect directly with local store owners.
            </p>

            {/* Quick Stats */}
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">{shops.length}</span>
                <span className="hero-stat-label">Local Shops</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">{totalProducts}</span>
                <span className="hero-stat-label">Products Listed</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">
                  {new Set(shops.map((s) => s.category)).size}
                </span>
                <span className="hero-stat-label">Categories</span>
              </div>
            </div>

            <div className="hero-actions">
              <button
                className="btn btn-primary"
                id="explore-shops-btn"
                onClick={scrollToShops}
              >
                <Store size={18} />
                Explore Nearby Shops
              </button>
              <button
                className="btn btn-secondary"
                id="list-shop-btn"
                onClick={() => navigate('/signup')}
              >
                Register Your Shop
              </button>
            </div>
          </div>

          {/* Clean Directory Highlights Panel (No neon glow or floating animation) */}
          <div className="hero-features-panel">
            <div className="feature-item">
              <div className="feature-icon-box">
                <MapPin size={20} />
              </div>
              <div className="feature-item-text">
                <h3>Hyperlocal Proximity</h3>
                <p>Find clothing and cycles within walking or quick cycling distance.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon-box">
                <ShoppingBag size={20} />
              </div>
              <div className="feature-item-text">
                <h3>Real-Time Inventory</h3>
                <p>View genuine store catalogs with live in-stock verification.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon-box">
                <ShieldCheck size={20} />
              </div>
              <div className="feature-item-text">
                <h3>Direct Merchant Chat</h3>
                <p>Connect instantly with shopkeepers via WhatsApp and messaging.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Location Status Bar: Clean Light Alert ── */}
        <section className="location-bar-wrapper">
          <div className="location-bar" id="location-bar">
            {locationStatus === 'loading' && (
              <div className="location-bar-inner location-bar-loading">
                <div className="location-bar-spinner" />
                <span>Locating nearby stores around you…</span>
              </div>
            )}
            {locationStatus === 'granted' && userLocation && (
              <div className="location-bar-inner location-bar-granted">
                <div className="location-bar-left">
                  <MapPin size={16} className="location-bar-icon" />
                  <span>
                    Showing shops sorted by distance to your current location
                    <span className="location-bar-coords">
                      ({userLocation.latitude.toFixed(3)}°, {userLocation.longitude.toFixed(3)}°)
                    </span>
                  </span>
                </div>
                <button
                  className="location-bar-refresh"
                  onClick={requestLocation}
                  title="Refresh location"
                >
                  <RefreshCw size={13} />
                  Refresh
                </button>
              </div>
            )}
            {locationStatus === 'denied' && (
              <div className="location-bar-inner location-bar-denied">
                <div className="location-bar-left">
                  <AlertCircle size={16} className="location-bar-icon" />
                  <span>{locationError || 'Location access denied. Enable GPS to sort shops by distance.'}</span>
                </div>
                <button
                  className="location-bar-retry"
                  onClick={requestLocation}
                  id="location-retry-btn"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Map Section ── */}
        {!loading && mappableShops.length > 0 && (
          <section className="map-wrapper" id="map-wrapper">
            <ShopMap shops={mappableShops} userLocation={userLocation} />
          </section>
        )}

        {/* ── Shop Listings Section ── */}
        <section className="shops-section" ref={shopsRef} id="shops-section">
          <div className="shops-section-header">
            <div>
              <h2 className="shops-section-title">
                Browse Neighborhood Shops
              </h2>
              <p className="shops-section-subtitle">
                Verified retail stores and workshops in your local community.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="category-filters" id="category-filters">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                  id={`filter-${cat.toLowerCase()}`}
                >
                  {cat === 'Clothing' && <Shirt size={15} />}
                  {cat === 'Cycle' && <Bike size={15} />}
                  {cat === 'All' && <Store size={15} />}
                  <span>{cat}</span>
                  <span className="pill-count">
                    {cat === 'All'
                      ? shops.length
                      : shops.filter((s) => s.category === cat).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Shop Cards Grid: Clean Real Store Cards */}
          {loading ? (
            <div className="shops-loading">
              <div className="loading-spinner"></div>
              <p>Loading neighborhood shops…</p>
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="shops-empty">
              <div className="shops-empty-icon-box">
                <Store size={36} />
              </div>
              <h3>No shops found</h3>
              <p>
                {activeCategory === 'All'
                  ? 'No local shops have been registered yet.'
                  : `No ${activeCategory} shops listed in this area yet.`}
              </p>
            </div>
          ) : (
            <div className="shops-grid" id="shops-grid">
              {filteredShops.map((shop) => (
                <div
                  key={shop.id}
                  className="shop-card"
                  id={`shop-card-${shop.id}`}
                >
                  {/* Shop Banner / Photo */}
                  <div className="shop-card-media">
                    <img
                      src={getShopBanner(shop)}
                      alt={shop.shopName}
                      className="shop-card-banner-img"
                      loading="lazy"
                    />
                    <div className="shop-card-badge-container">
                      <span className="shop-card-category-badge">
                        {shop.category === 'Clothing' && <Shirt size={13} />}
                        {shop.category === 'Cycle' && <Bike size={13} />}
                        {shop.category !== 'Clothing' && shop.category !== 'Cycle' && <Store size={13} />}
                        {shop.category}
                      </span>
                      {shop.distance !== null && shop.distance !== undefined && (
                        <span className="shop-card-distance-badge">
                          <MapPin size={12} />
                          {formatDistance(shop.distance)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Shop Info */}
                  <div className="shop-card-content">
                    <h3 className="shop-card-name" title={shop.shopName}>
                      {shop.shopName}
                    </h3>
                    <p className="shop-card-address">
                      <MapPin size={14} className="address-icon" />
                      <span>{shop.address || 'Local neighborhood'}</span>
                    </p>
                    <p className="shop-card-desc">
                      {shop.description || 'Visit store to explore collection and speak with the owner.'}
                    </p>

                    <div className="shop-card-footer">
                      <span className="shop-card-product-count">
                        <Package size={14} />
                        {productCounts[shop.id] || 0} products listed
                      </span>
                      <Link
                        to={`/shop/${shop.id}`}
                        className="shop-card-btn"
                        id={`view-shop-btn-${shop.id}`}
                      >
                        <span>View Shop</span>
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default Home;
