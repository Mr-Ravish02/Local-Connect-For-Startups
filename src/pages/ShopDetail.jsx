import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import Navbar from '../components/Navbar';
import BrowseProductCard from '../components/BrowseProductCard';
import ShopInquiryModal from '../components/ShopInquiryModal';
import ShopReviewsSection, { StarRating } from '../components/ShopReviewsSection';
import './ShopDetail.css';

function ShopDetail() {
  const { shopId } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [visibleCards, setVisibleCards] = useState(new Set());
  const cardRefs = useRef({});
  const searchInputRef = useRef(null);

  // Inquiry modal state
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);

  // Rating stats state
  const [ratingStats, setRatingStats] = useState({ average: 0, count: 0 });

  useEffect(() => {
    async function fetchShopAndProducts() {
      try {
        // Fetch shop
        const shopSnap = await getDoc(doc(db, 'shops', shopId));
        if (!shopSnap.exists()) {
          setError('Shop not found.');
          setLoading(false);
          return;
        }
        setShop({ id: shopSnap.id, ...shopSnap.data() });

        // Fetch products for this shop
        const q = query(
          collection(db, 'products'),
          where('shopId', '==', shopId)
        );
        const productsSnap = await getDocs(q);
        const items = [];
        productsSnap.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort newest first
        items.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setProducts(items);
      } catch (err) {
        console.error('Error fetching shop details:', err);
        setError('Failed to load shop details.');
      } finally {
        setLoading(false);
      }
    }
    fetchShopAndProducts();
  }, [shopId]);

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
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );

    Object.values(cardRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [products, searchTerm, stockFilter]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchTerm.trim() ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase());

      const isInStock =
        p.stockStatus === 'in_stock' || p.inStock === true;
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in_stock' && isInStock) ||
        (stockFilter === 'out_of_stock' && !isInStock);

      return matchesSearch && matchesStock;
    });
  }, [products, searchTerm, stockFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter(
      (p) => p.stockStatus === 'in_stock' || p.inStock === true
    ).length;
    return { total, inStock, outOfStock: total - inStock };
  }, [products]);

  // Format shop phone / whatsapp number for wa.me link
  const whatsappUrl = useMemo(() => {
    const rawPhone = shop?.phone || shop?.whatsapp || '919876543210';
    const sanitizedDigits = rawPhone.replace(/\D/g, '');
    return `https://wa.me/${sanitizedDigits}`;
  }, [shop]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="shop-detail-loading">
          <div className="loading-spinner"></div>
          <p>Loading shop…</p>
        </div>
      </>
    );
  }

  if (error || !shop) {
    return (
      <>
        <Navbar />
        <div className="shop-detail-error">
          <div className="error-icon">🔍</div>
          <h2>{error || 'Shop not found'}</h2>
          <Link to="/" className="back-link">
            ← Back to all shops
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="shop-detail" id="shop-detail-page">
        {/* Back link */}
        <Link to="/" className="shop-detail-back" id="back-to-shops">
          ← Back to shops
        </Link>

        {/* Shop Header Card */}
        <div className="shop-detail-header" id="shop-detail-header">
          <div className="shop-detail-icon-wrap">
            <span className="shop-detail-icon">
              {shop.category === 'Clothing' ? '👗' : '🚲'}
            </span>
          </div>
          <div className="shop-detail-info">
            <div className="shop-detail-meta">
              <span className="shop-detail-category-tag">
                {shop.category}
              </span>
              {ratingStats.count > 0 ? (
                <div className="header-rating-badge" id="header-rating-badge">
                  <StarRating rating={Math.round(ratingStats.average)} readOnly size="0.9rem" />
                  <span className="rating-val">{ratingStats.average}</span>
                  <span className="rating-count">({ratingStats.count})</span>
                </div>
              ) : (
                <span className="header-rating-badge new-badge">New Shop</span>
              )}
            </div>
            <h1 className="shop-detail-name">{shop.shopName}</h1>
            <p className="shop-detail-address">
              <span>📍</span> {shop.address}
            </p>
            {shop.description && (
              <p className="shop-detail-description">{shop.description}</p>
            )}

            {/* Contact Action Buttons */}
            <div className="shop-contact-actions" id="shop-contact-actions">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-shop-btn whatsapp-btn"
                id="contact-shop-whatsapp-btn"
              >
                <span className="btn-icon">💬</span>
                Contact Shop
              </a>
              <button
                type="button"
                className="contact-shop-btn inquiry-btn"
                onClick={() => setIsInquiryModalOpen(true)}
                id="open-inquiry-modal-btn"
              >
                <span className="btn-icon">✉️</span>
                Send Inquiry
              </button>
            </div>
          </div>

          <div className="shop-detail-stats">
            <div className="shop-stat">
              <span className="shop-stat-value">{stats.total}</span>
              <span className="shop-stat-label">Products</span>
            </div>
            <div className="shop-stat">
              <span className="shop-stat-value shop-stat-green">{stats.inStock}</span>
              <span className="shop-stat-label">In Stock</span>
            </div>
            <div className="shop-stat">
              <span className="shop-stat-value shop-stat-red">{stats.outOfStock}</span>
              <span className="shop-stat-label">Out of Stock</span>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <section className="shop-products-section" id="shop-products-section">
          <div className="shop-products-toolbar">
            <h2 className="shop-products-title">
              📦 Product Catalog
            </h2>

            {/* In-shop search & filter controls */}
            {products.length > 0 && (
              <div className="shop-products-controls">
                <div className="shop-search-box" id="shop-product-search">
                  <span className="shop-search-icon">🔍</span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="shop-search-input"
                    placeholder="Search this shop's products…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    id="shop-product-search-input"
                  />
                  {searchTerm && (
                    <button
                      className="shop-search-clear"
                      onClick={() => setSearchTerm('')}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="shop-stock-filters">
                  <button
                    className={`shop-stock-pill ${stockFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStockFilter('all')}
                  >
                    All ({stats.total})
                  </button>
                  <button
                    className={`shop-stock-pill ${stockFilter === 'in_stock' ? 'active' : ''}`}
                    onClick={() => setStockFilter('in_stock')}
                  >
                    In Stock ({stats.inStock})
                  </button>
                  <button
                    className={`shop-stock-pill ${stockFilter === 'out_of_stock' ? 'active' : ''}`}
                    onClick={() => setStockFilter('out_of_stock')}
                  >
                    Out of Stock ({stats.outOfStock})
                  </button>
                </div>
              </div>
            )}
          </div>

          {products.length === 0 ? (
            <div className="shop-products-empty">
              <div className="empty-icon">🛍️</div>
              <h3>No products listed yet</h3>
              <p>This shop hasn't added any products to their catalog.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="shop-products-empty">
              <div className="empty-icon">🔎</div>
              <h3>No matching products</h3>
              <p>Try different keywords or adjust the stock filter.</p>
              <button
                className="shop-reset-filters-btn"
                onClick={() => { setSearchTerm(''); setStockFilter('all'); }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              {(searchTerm || stockFilter !== 'all') && (
                <div className="shop-filter-status">
                  <span>
                    Showing {filteredProducts.length} of {products.length} products
                    {searchTerm && <> matching "<strong>{searchTerm}</strong>"</>}
                  </span>
                </div>
              )}
              <div className="shop-products-grid" id="shop-products-grid">
                {filteredProducts.map((product, index) => (
                  <div
                    key={product.id}
                    id={`product-entry-${product.id}`}
                    ref={(el) => { cardRefs.current[product.id] = el; }}
                    className={`shop-product-entry ${visibleCards.has(`product-entry-${product.id}`) ? 'visible' : ''}`}
                    style={{ '--card-index': index }}
                  >
                    <BrowseProductCard product={product} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Reviews Section */}
        <section className="shop-reviews-container" id="shop-reviews-container-section">
          <ShopReviewsSection shopId={shopId} onRatingUpdate={setRatingStats} />
        </section>

        {/* Contact Inquiry Modal */}
        <ShopInquiryModal
          isOpen={isInquiryModalOpen}
          onClose={() => setIsInquiryModalOpen(false)}
          shop={shop}
        />
      </main>
    </>
  );
}

export default ShopDetail;

