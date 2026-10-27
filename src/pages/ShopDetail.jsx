import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
  MapPin,
  Shirt,
  Bike,
  Phone,
  MessageSquare,
  Mail,
  ArrowLeft,
  Search as SearchIcon,
  X,
  Package,
  AlertCircle,
  QrCode,
} from 'lucide-react';
import { db } from '../firebase/config';
import Navbar from '../components/Navbar';
import BrowseProductCard from '../components/BrowseProductCard';
import ShopInquiryModal from '../components/ShopInquiryModal';
import ShopReviewsSection, { StarRating } from '../components/ShopReviewsSection';
import ShopQRCode from '../components/ShopQRCode';
import { recordShopView } from '../utils/analytics';
import './ShopDetail.css';

function getShopCover(shop) {
  if (shop?.bannerUrl) return shop.bannerUrl;
  if (shop?.imageUrl) return shop.imageUrl;
  if (shop?.photoUrl) return shop.photoUrl;
  if (shop?.category === 'Clothing') {
    return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80';
  }
  if (shop?.category === 'Cycle') {
    return 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80';
}

function ShopDetail() {
  const { shopId } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const searchInputRef = useRef(null);

  // Inquiry modal state
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

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

        // Increment profile view counter in Firestore
        recordShopView(shopId);

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
          <p>Loading shop profile…</p>
        </div>
      </>
    );
  }

  if (error || !shop) {
    return (
      <>
        <Navbar />
        <div className="shop-detail-error">
          <AlertCircle size={48} className="error-icon" />
          <h2>{error || 'Shop not found'}</h2>
          <p>The shop profile you are looking for may have been removed or does not exist.</p>
          <Link to="/" className="btn btn-primary back-link" style={{ marginTop: '1rem' }}>
            <ArrowLeft size={16} />
            Back to All Shops
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="shop-detail" id="shop-detail-page">
        {/* Navigation Breadcrumb */}
        <div className="shop-detail-topbar">
          <Link to="/" className="shop-detail-back" id="back-to-shops">
            <ArrowLeft size={16} />
            <span>Back to All Shops</span>
          </Link>
        </div>

        {/* Shop Cover Banner */}
        <div className="shop-cover-banner">
          <img
            src={getShopCover(shop)}
            alt={`${shop.shopName} Storefront`}
            className="shop-cover-img"
          />
        </div>

        {/* Shop Profile Header Card */}
        <div className="shop-detail-header" id="shop-detail-header">
          <div className="shop-header-main">
            <div className="shop-detail-icon-wrap">
              {shop.category === 'Clothing' ? <Shirt size={32} /> : <Bike size={32} />}
            </div>

            <div className="shop-detail-info">
              <div className="shop-detail-meta">
                <span className="shop-detail-category-tag">
                  {shop.category === 'Clothing' && <Shirt size={13} />}
                  {shop.category === 'Cycle' && <Bike size={13} />}
                  {shop.category}
                </span>

                {ratingStats.count > 0 ? (
                  <div className="header-rating-badge" id="header-rating-badge">
                    <StarRating rating={Math.round(ratingStats.average)} readOnly size="0.95rem" />
                    <span className="rating-val">{ratingStats.average}</span>
                    <span className="rating-count">({ratingStats.count} reviews)</span>
                  </div>
                ) : (
                  <span className="header-rating-badge new-badge">New Store</span>
                )}
              </div>

              <h1 className="shop-detail-name">{shop.shopName}</h1>

              <p className="shop-detail-address">
                <MapPin size={16} className="address-icon" />
                <span>{shop.address || 'Local Neighborhood Store'}</span>
              </p>

              {shop.description && (
                <p className="shop-detail-description">{shop.description}</p>
              )}

              {/* Direct Contact Actions */}
              <div className="shop-contact-actions" id="shop-contact-actions">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-shop-btn whatsapp-btn"
                  id="contact-shop-whatsapp-btn"
                >
                  <MessageSquare size={17} />
                  <span>Chat on WhatsApp</span>
                </a>

                <button
                  type="button"
                  className="contact-shop-btn inquiry-btn"
                  onClick={() => setIsInquiryModalOpen(true)}
                  id="open-inquiry-modal-btn"
                >
                  <Mail size={17} />
                  <span>Send Direct Inquiry</span>
                </button>

                <button
                  type="button"
                  className="contact-shop-btn qr-code-btn"
                  onClick={() => setIsQRModalOpen(true)}
                  id="open-shop-qr-btn"
                  title="View & Download Shop QR Code"
                >
                  <QrCode size={17} />
                  <span>Shop QR Code</span>
                </button>

                {shop.phone && (
                  <a
                    href={`tel:${shop.phone.replace(/\D/g, '')}`}
                    className="contact-shop-btn phone-btn"
                  >
                    <Phone size={15} />
                    <span>{shop.phone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="shop-detail-stats">
            <div className="shop-stat">
              <span className="shop-stat-value">{stats.total}</span>
              <span className="shop-stat-label">Total Items</span>
            </div>
            <div className="shop-stat stat-in-stock">
              <span className="shop-stat-value">{stats.inStock}</span>
              <span className="shop-stat-label">In Stock</span>
            </div>
            <div className="shop-stat stat-out-of-stock">
              <span className="shop-stat-value">{stats.outOfStock}</span>
              <span className="shop-stat-label">Out of Stock</span>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <section className="shop-products-section" id="shop-products-section">
          <div className="shop-products-toolbar">
            <div className="toolbar-left">
              <h2 className="shop-products-title">
                Store Inventory & Products
              </h2>
              <p className="shop-products-subtitle">
                Available items directly from this merchant
              </p>
            </div>

            {/* In-shop search & filter controls */}
            {products.length > 0 && (
              <div className="shop-products-controls">
                <div className="shop-search-box" id="shop-product-search">
                  <SearchIcon size={16} className="shop-search-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="shop-search-input"
                    placeholder="Search this store's items…"
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
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="shop-stock-pills">
                  <button
                    className={`stock-pill ${stockFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStockFilter('all')}
                  >
                    All ({products.length})
                  </button>
                  <button
                    className={`stock-pill ${stockFilter === 'in_stock' ? 'active' : ''}`}
                    onClick={() => setStockFilter('in_stock')}
                  >
                    In Stock ({stats.inStock})
                  </button>
                  <button
                    className={`stock-pill ${stockFilter === 'out_of_stock' ? 'active' : ''}`}
                    onClick={() => setStockFilter('out_of_stock')}
                  >
                    Out of Stock ({stats.outOfStock})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Product Grid */}
          {products.length === 0 ? (
            <div className="shop-products-empty">
              <Package size={40} className="empty-icon" />
              <h3>No products listed yet</h3>
              <p>This shop has not uploaded items to their catalog yet.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="shop-products-empty">
              <SearchIcon size={40} className="empty-icon" />
              <h3>No matching products</h3>
              <p>Try clearing your search keyword or stock filter.</p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchTerm('');
                  setStockFilter('all');
                }}
                style={{ marginTop: '0.75rem' }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="shop-products-grid" id="shop-products-grid">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  id={`product-${product.id}`}
                  className="shop-product-item"
                >
                  <BrowseProductCard
                    product={product}
                    shopName={shop.shopName}
                    shopId={shop.id}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reviews Section */}
        <ShopReviewsSection
          shopId={shop.id}
          onRatingUpdate={setRatingStats}
        />
      </main>

      {/* Customer Inquiry Modal */}
      <ShopInquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        shop={shop}
      />

      {/* Shop QR Code Modal */}
      {isQRModalOpen && (
        <ShopQRCode
          shopId={shop.id}
          shopName={shop.shopName}
          shopCategory={shop.category}
          variant="modal"
          onClose={() => setIsQRModalOpen(false)}
        />
      )}
    </>
  );
}

export default ShopDetail;
