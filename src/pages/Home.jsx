import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getUserLocation, sortShopsByDistance } from '../utils/geolocation';
import Navbar from '../components/Navbar';
import ShopMap from '../components/ShopMap';
import './Home.css';

const CATEGORIES = ['All', 'Clothing', 'Cycle'];

function Home() {
  const [shops, setShops] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [visibleCards, setVisibleCards] = useState(new Set());
  const shopsRef = useRef(null);
  const cardRefs = useRef({});
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

  // Intersection Observer for staggered card entrance
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleCards((prev) => new Set([...prev, entry.target.id]));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    Object.values(cardRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [shops, activeCategory, userLocation]);

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
        {/* ── Hero Section ── */}
        <section className="hero">
          <div className="hero-content">
            <span className="hero-badge">🐝 Hyperlocal Shopping</span>
            <h1 className="hero-title">
              Discover Local Shops
              <span className="hero-title-accent"> Near You</span>
            </h1>
            <p className="hero-subtitle">
              LocalHive connects you with nearby clothing boutiques and cycle
              shops. Support your community — shop local, shop smart.
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
                <span className="hero-stat-label">Products</span>
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
                Explore Shops
              </button>
              <button
                className="btn btn-secondary"
                id="list-shop-btn"
                onClick={() => navigate('/signup')}
              >
                List Your Shop
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-glow"></div>
            <div className="hero-card hero-card-1">
              <span className="card-icon">👗</span>
              <span className="card-label">Clothing</span>
            </div>
            <div className="hero-card hero-card-2">
              <span className="card-icon">🚲</span>
              <span className="card-label">Cycles</span>
            </div>
            <div className="hero-card hero-card-3">
              <span className="card-icon">📍</span>
              <span className="card-label">Near You</span>
            </div>
          </div>
        </section>

        {/* ── Location Status Bar ── */}
        <section className="location-bar" id="location-bar">
          {locationStatus === 'loading' && (
            <div className="location-bar-inner location-bar-loading">
              <div className="location-bar-spinner" />
              <span>Detecting your location…</span>
            </div>
          )}
          {locationStatus === 'granted' && userLocation && (
            <div className="location-bar-inner location-bar-granted">
              <span className="location-bar-icon">📍</span>
              <span>
                Showing shops nearest to you
                <span className="location-bar-coords">
                  ({userLocation.latitude.toFixed(4)}°, {userLocation.longitude.toFixed(4)}°)
                </span>
              </span>
            </div>
          )}
          {locationStatus === 'denied' && (
            <div className="location-bar-inner location-bar-denied">
              <span className="location-bar-icon">⚠️</span>
              <span>{locationError || 'Location access denied.'}</span>
              <button
                className="location-bar-retry"
                onClick={requestLocation}
                id="location-retry-btn"
              >
                Try Again
              </button>
            </div>
          )}
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
                Browse Local Shops
              </h2>
              <p className="shops-section-subtitle">
                Explore stores in your neighborhood — filter by category to find
                exactly what you need.
              </p>
            </div>
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
                {cat === 'Clothing' && '👗 '}
                {cat === 'Cycle' && '🚲 '}
                {cat === 'All' && '🏪 '}
                {cat}
                <span className="pill-count">
                  {cat === 'All'
                    ? shops.length
                    : shops.filter((s) => s.category === cat).length}
                </span>
              </button>
            ))}
          </div>

          {/* Shop Cards Grid */}
          {loading ? (
            <div className="shops-loading">
              <div className="loading-spinner"></div>
              <p>Finding local shops…</p>
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="shops-empty">
              <div className="shops-empty-icon">🏪</div>
              <h3>No shops found</h3>
              <p>
                {activeCategory === 'All'
                  ? 'No shops have been listed yet. Be the first!'
                  : `No ${activeCategory} shops listed yet.`}
              </p>
            </div>
          ) : (
            <div className="shops-grid" id="shops-grid">
              {filteredShops.map((shop, index) => (
                <Link
                  to={`/shop/${shop.id}`}
                  key={shop.id}
                  className={`shop-card ${visibleCards.has(`shop-card-${shop.id}`) ? 'shop-card-visible' : ''}`}
                  id={`shop-card-${shop.id}`}
                  ref={(el) => { cardRefs.current[shop.id] = el; }}
                  style={{ '--card-index': index }}
                >
                  <div className="shop-card-header">
                    <span className="shop-card-icon">
                      {shop.category === 'Clothing' ? '👗' : '🚲'}
                    </span>
                    <span className="shop-card-category-tag">
                      {shop.category}
                    </span>
                  </div>
                  <div className="shop-card-body">
                    <h3 className="shop-card-name">{shop.shopName}</h3>
                    <p className="shop-card-address">
                      <span className="address-icon">📍</span>
                      {shop.address}
                    </p>
                    <p className="shop-card-desc">{shop.description}</p>
                  </div>
                  <div className="shop-card-footer">
                    <div className="shop-card-footer-left">
                      <span className="shop-card-product-count">
                        📦 {productCounts[shop.id] || 0} products
                      </span>
                      {shop.distance !== null && shop.distance !== undefined && (
                        <span className="shop-card-distance">
                          📍 {formatDistance(shop.distance)} away
                        </span>
                      )}
                    </div>
                    <span className="shop-card-cta">
                      View Products
                      <span className="cta-arrow">→</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default Home;
