import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import {
  Search as SearchIcon,
  X,
  Package,
  Store,
  MapPin,
  Sparkles,
  Filter,
  Layers,
  LayoutGrid,
  CheckCircle2,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { db } from '../firebase/config';
import { getUserLocation, haversineDistance } from '../utils/geolocation';
import Navbar from '../components/Navbar';
import BrowseProductCard from '../components/BrowseProductCard';
import ProductGroupCard from '../components/ProductGroupCard';
import './Search.css';

// Default Ludhiana city centre coordinates for fallback
const DEFAULT_LUDHIANA_LOCATION = {
  latitude: 30.9010,
  longitude: 75.8573,
  isDefault: true,
  label: 'Ludhiana City Center (Default)',
};

const POPULAR_SEARCHES = ['Jacket', 'Cycle', 'Denim Jacket', 'Mountain Cycle', 'Road Cycle', 'Shirt'];

function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [allProducts, setAllProducts] = useState([]);
  const [shopsMap, setShopsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Detecting location…');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockOnly, setStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'flat'
  const inputRef = useRef(null);

  // Request user location with automatic fallback to Ludhiana city center
  const requestLocation = useCallback(async () => {
    setLocationLabel('Detecting location…');
    try {
      const loc = await getUserLocation();
      setUserLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
        isDefault: false,
      });
      setLocationLabel('Your Current Location');
    } catch {
      // Permission denied or unavailable — fall back gracefully to Ludhiana center
      setUserLocation(DEFAULT_LUDHIANA_LOCATION);
      setLocationLabel('Ludhiana City Center');
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Fetch all products + shops on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        const products = [];
        productsSnap.forEach((docSnap) => {
          products.push({ id: docSnap.id, ...docSnap.data() });
        });

        const shopsSnap = await getDocs(collection(db, 'shops'));
        const shops = {};
        shopsSnap.forEach((docSnap) => {
          shops[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
        });

        setAllProducts(products);
        setShopsMap(shops);
      } catch (err) {
        console.error('Error fetching search data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Auto-focus the search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync URL query param
  useEffect(() => {
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [searchTerm, setSearchParams]);

  // Compute available categories from all products
  const categories = useMemo(() => {
    const cats = new Set();
    allProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ['All', ...Array.from(cats)];
  }, [allProducts]);

  // Distance helper
  const getShopDistance = useCallback(
    (shop) => {
      if (
        !userLocation ||
        !shop ||
        typeof shop.latitude !== 'number' ||
        typeof shop.longitude !== 'number'
      ) {
        return null;
      }
      return haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        shop.latitude,
        shop.longitude
      );
    },
    [userLocation]
  );

  function formatDistance(km) {
    if (km === null || km === undefined) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
  }

  // Filter individual products by query, category, and stock status
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return allProducts.filter((p) => {
      const shopData = shopsMap[p.shopId];
      const matchesQuery =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        shopData?.shopName?.toLowerCase().includes(q) ||
        shopData?.address?.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === 'All' || p.category === selectedCategory;

      const isInStock = p.stockStatus === 'in_stock' || p.inStock === true;
      const matchesStock = !stockOnly || isInStock;

      return matchesQuery && matchesCategory && matchesStock;
    });
  }, [allProducts, shopsMap, searchTerm, selectedCategory, stockOnly]);

  // Group filtered products by canonical product name (case-insensitive)
  const productGroups = useMemo(() => {
    const groupsMap = new Map();

    filteredProducts.forEach((product) => {
      const rawName = (product.name || 'Unnamed Product').trim();
      const normKey = rawName.toLowerCase();
      const shop = shopsMap[product.shopId] || null;
      const distance = getShopDistance(shop);

      if (!groupsMap.has(normKey)) {
        groupsMap.set(normKey, {
          key: normKey,
          displayName: rawName,
          category: product.category || shop?.category || 'General',
          imageUrl: product.imageUrl || '',
          offerings: [],
        });
      }

      const group = groupsMap.get(normKey);
      if (!group.imageUrl && product.imageUrl) {
        group.imageUrl = product.imageUrl;
      }

      group.offerings.push({
        product,
        shop,
        distance,
      });
    });

    // Process each group:
    // 1. Sort offerings by distance ASCENDING (nearest shop first)
    // 2. Compute min/max price, in-stock count, nearest distance
    const groupsList = Array.from(groupsMap.values()).map((group) => {
      const sortedOfferings = [...group.offerings].sort((a, b) => {
        // Offerings with valid distance come first, sorted ascending
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;

        // Fallback: in-stock first, then price ascending
        const aStock = a.product.stockStatus === 'in_stock' || a.product.inStock;
        const bStock = b.product.stockStatus === 'in_stock' || b.product.inStock;
        if (aStock && !bStock) return -1;
        if (!aStock && bStock) return 1;

        return (Number(a.product.price) || 0) - (Number(b.product.price) || 0);
      });

      const validPrices = sortedOfferings
        .map((o) => Number(o.product.price))
        .filter((p) => !isNaN(p) && p > 0);
      const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
      const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : null;

      const inStockCount = sortedOfferings.filter(
        (o) => o.product.stockStatus === 'in_stock' || o.product.inStock
      ).length;

      const hasDistances = sortedOfferings.some((o) => o.distance !== null);
      const nearestDistance = hasDistances ? sortedOfferings[0].distance : null;

      return {
        ...group,
        offerings: sortedOfferings,
        shopsCount: sortedOfferings.length,
        minPrice,
        maxPrice,
        inStockCount,
        nearestDistance,
      };
    });

    // Sort product groups: groups with closer nearest shop come first
    groupsList.sort((a, b) => {
      if (a.nearestDistance !== null && b.nearestDistance !== null) {
        return a.nearestDistance - b.nearestDistance;
      }
      if (a.nearestDistance !== null) return -1;
      if (b.nearestDistance !== null) return 1;
      return b.shopsCount - a.shopsCount;
    });

    return groupsList;
  }, [filteredProducts, shopsMap, getShopDistance]);

  // Total shop listings count
  const totalShopListings = filteredProducts.length;

  return (
    <>
      <Navbar />
      <main className="search-page" id="search-page">
        {/* Search Header Hero */}
        <section className="search-hero">
          <div className="search-hero-inner">
            <div className="search-badge-tag">
              <Sparkles size={14} />
              <span>Multi-Store Local Product Finder</span>
            </div>
            <h1 className="search-hero-title">
              Find Products in Nearby Shops
            </h1>
            <p className="search-hero-subtitle">
              Search for any item to see which local stores carry it, compare prices, and find the nearest shop to you.
            </p>

            {/* Search Input Bar */}
            <div className="search-hero-bar" id="search-bar">
              <SearchIcon className="search-bar-icon" size={20} />
              <input
                ref={inputRef}
                type="text"
                className="search-bar-input"
                placeholder="Search products (e.g. 'jacket', 'cycle', 'shirt')…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                id="global-search-input"
              />
              {searchTerm && (
                <button
                  className="search-bar-clear"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Quick search chips */}
            <div className="search-quick-tags">
              <span className="quick-tags-label">Try searching:</span>
              {POPULAR_SEARCHES.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`quick-tag-chip ${searchTerm.toLowerCase() === tag.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setSearchTerm(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Category Filter Pills */}
            <div className="search-filter-pills">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`search-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Customer Location & Stock Indicator Strip */}
            <div className="search-location-bar">
              <div className="location-info-chip" title="Location used for calculating shop distances">
                <Navigation size={13} className="loc-icon" />
                <span>Distances from: <strong>{locationLabel}</strong></span>
                <button
                  className="loc-refresh-btn"
                  onClick={requestLocation}
                  title="Refresh GPS location"
                  aria-label="Refresh location"
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              <label className="stock-only-toggle" id="stock-filter-toggle">
                <input
                  type="checkbox"
                  checked={stockOnly}
                  onChange={(e) => setStockOnly(e.target.checked)}
                />
                <span>In Stock only</span>
              </label>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="search-results-container" id="search-results">
          {loading ? (
            <div className="search-loading">
              <div className="loading-spinner" />
              <p>Searching local shops and inventories…</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="search-empty">
              <div className="search-empty-icon-box">
                <Package size={36} />
              </div>
              <h3>No matching products found</h3>
              <p>
                {searchTerm
                  ? `No nearby shops have items matching "${searchTerm}". Try checking your spelling or clicking one of the suggested tags above.`
                  : 'No products currently listed in this category.'}
              </p>
              <div className="search-empty-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('All');
                    setStockOnly(false);
                  }}
                >
                  Reset All Filters
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setSearchTerm('jacket')}
                >
                  Search "Jacket"
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setSearchTerm('cycle')}
                >
                  Search "Cycle"
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Results Meta Bar */}
              <div className="search-results-meta">
                <div className="meta-left">
                  <span className="search-results-count">
                    Found <strong>{productGroups.length}</strong> product{productGroups.length !== 1 ? 's' : ''} across{' '}
                    <strong>{totalShopListings}</strong> shop listing{totalShopListings !== 1 ? 's' : ''}
                    {searchTerm && (
                      <span> for "<strong>{searchTerm}</strong>"</span>
                    )}
                    {selectedCategory !== 'All' && (
                      <span> in <em>{selectedCategory}</em></span>
                    )}
                  </span>
                </div>

                <div className="meta-right">
                  {/* View Mode Toggle */}
                  <div className="search-view-mode" id="view-mode-toggle">
                    <button
                      className={`view-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                      onClick={() => setViewMode('grouped')}
                      title="Group by product & compare shops"
                    >
                      <Layers size={14} />
                      <span>Grouped by Product</span>
                    </button>
                    <button
                      className={`view-btn ${viewMode === 'flat' ? 'active' : ''}`}
                      onClick={() => setViewMode('flat')}
                      title="Show individual cards"
                    >
                      <LayoutGrid size={14} />
                      <span>All Items</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Grouped View (Primary Core Use Case) */}
              {viewMode === 'grouped' ? (
                <div className="search-groups-list" id="search-groups-list">
                  {productGroups.map((group) => (
                    <ProductGroupCard
                      key={group.key}
                      group={group}
                      formatDistance={formatDistance}
                    />
                  ))}
                </div>
              ) : (
                /* Flat Grid View */
                <div className="search-results-grid" id="search-results-grid">
                  {filteredProducts.map((product) => {
                    const shop = shopsMap[product.shopId];
                    const dist = getShopDistance(shop);
                    return (
                      <div
                        key={product.id}
                        id={`search-card-${product.id}`}
                        className="search-card-entry"
                      >
                        <BrowseProductCard
                          product={product}
                          shopName={shop?.shopName}
                          shopId={product.shopId}
                          distance={dist}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}

export default Search;
