import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navbar from '../components/Navbar';
import BrowseProductCard from '../components/BrowseProductCard';
import './Search.css';

function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [allProducts, setAllProducts] = useState([]);
  const [shopsMap, setShopsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [visibleCards, setVisibleCards] = useState(new Set());
  const cardRefs = useRef({});
  const inputRef = useRef(null);

  // Fetch all products + shops on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all products
        const productsSnap = await getDocs(collection(db, 'products'));
        const products = [];
        productsSnap.forEach((docSnap) => {
          products.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Fetch all shops (for names)
        const shopsSnap = await getDocs(collection(db, 'shops'));
        const shops = {};
        shopsSnap.forEach((docSnap) => {
          shops[docSnap.id] = docSnap.data();
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

  // Auto-focus the search input
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

  // Filter products by keyword (name, category, and shop name)
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return [];
    return allProducts.filter((p) => {
      const shopData = shopsMap[p.shopId];
      return (
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        shopData?.shopName?.toLowerCase().includes(q)
      );
    });
  }, [allProducts, shopsMap, searchTerm]);

  // Intersection Observer for staggered card entrance
  useEffect(() => {
    // Reset visible cards when search changes
    setVisibleCards(new Set());

    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleCards((prev) => new Set([...prev, entry.target.id]));
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
      );

      Object.values(cardRefs.current).forEach((el) => {
        if (el) observer.observe(el);
      });

      return () => observer.disconnect();
    }, 50);

    return () => clearTimeout(timer);
  }, [filteredProducts]);

  // Quick category suggestions
  const categories = useMemo(() => {
    const cats = new Set();
    allProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return [...cats];
  }, [allProducts]);

  return (
    <>
      <Navbar />
      <main className="search-page" id="search-page">
        {/* Search Hero */}
        <div className="search-hero">
          <h1 className="search-hero-title">
            🔍 Search Products
          </h1>
          <p className="search-hero-subtitle">
            Find products across all local shops in one place.
          </p>
          <div className="search-hero-bar" id="search-bar">
            <span className="search-bar-icon">🔍</span>
            <input
              ref={inputRef}
              type="text"
              className="search-bar-input"
              placeholder="Type a product name, category, or shop…"
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
                ✕
              </button>
            )}
          </div>

          {/* Quick Category Chips (when idle) */}
          {!searchTerm.trim() && categories.length > 0 && (
            <div className="search-suggestions">
              <span className="search-suggestions-label">Try:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  className="search-suggestion-chip"
                  onClick={() => setSearchTerm(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <section className="search-results" id="search-results">
          {loading ? (
            <div className="search-loading">
              <div className="loading-spinner"></div>
              <p>Loading products…</p>
            </div>
          ) : !searchTerm.trim() ? (
            <div className="search-prompt">
              <div className="search-prompt-icon">✨</div>
              <h3>Start typing to search</h3>
              <p>
                Search by product name, category, or shop name — results appear instantly.
              </p>
              <div className="search-prompt-stats">
                <span className="search-prompt-stat">
                  <strong>{allProducts.length}</strong> products
                </span>
                <span className="search-prompt-stat-divider">•</span>
                <span className="search-prompt-stat">
                  <strong>{Object.keys(shopsMap).length}</strong> shops
                </span>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="search-empty">
              <div className="search-empty-icon">🔎</div>
              <h3>No results for "{searchTerm}"</h3>
              <p>Try different keywords or check spelling.</p>
            </div>
          ) : (
            <>
              <div className="search-results-header">
                <span className="search-results-count">
                  {filteredProducts.length} result
                  {filteredProducts.length !== 1 ? 's' : ''} for "
                  <strong>{searchTerm}</strong>"
                </span>
              </div>
              <div className="search-results-grid" id="search-results-grid">
                {filteredProducts.map((product, index) => {
                  const shop = shopsMap[product.shopId];
                  return (
                    <div
                      key={product.id}
                      id={`search-card-${product.id}`}
                      ref={(el) => { cardRefs.current[product.id] = el; }}
                      className={`search-card-entry ${visibleCards.has(`search-card-${product.id}`) ? 'visible' : ''}`}
                      style={{ '--card-index': Math.min(index, 12) }}
                    >
                      <BrowseProductCard
                        product={product}
                        shopName={shop?.shopName}
                        shopId={product.shopId}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}

export default Search;
