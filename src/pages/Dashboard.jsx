import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  Store,
  Shirt,
  Bike,
  MapPin,
  FileText,
  Plus,
  Search,
  X,
  Mail,
  Package,
  LogOut,
  CheckCircle,
  Clock,
  User,
  Eye,
  Star,
  Flame,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import ProductFormModal from '../components/ProductFormModal';
import ProductCard from '../components/ProductCard';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ShopQRCode from '../components/ShopQRCode';
import { fetchWeeklyShopViews } from '../utils/analytics';
import './Dashboard.css';

function Dashboard() {
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in_stock' | 'out_of_stock'

  // Analytics & Reviews state
  const [reviews, setReviews] = useState([]);
  const [weeklyViews, setWeeklyViews] = useState(0);

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Real-time listener for shop profile & live view counters
  useEffect(() => {
    if (!currentUser) return;

    const unsubShop = onSnapshot(
      doc(db, 'shops', currentUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const shopData = docSnap.data();
          setShop({ id: docSnap.id, ...shopData });
          if (shopData.weeklyViews !== undefined) {
            setWeeklyViews(shopData.weeklyViews);
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to shop:', err);
        setLoading(false);
      }
    );

    // Also fetch weekly views aggregation from shopViews collection
    fetchWeeklyShopViews(currentUser.uid).then((count) => {
      if (count > 0) {
        setWeeklyViews((prev) => Math.max(prev, count));
      }
    });

    return () => unsubShop();
  }, [currentUser]);

  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);

  // Real-time listener for products belonging to this shop
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'products'),
      where('shopId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({
            id: docSnap.id,
            ...docSnap.data(),
          });
        });
        // Sort newest first
        items.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setProducts(items);
        setProductsLoading(false);
      },
      (err) => {
        console.error('Error listening to products:', err);
        setProductsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Real-time listener for customer inquiries
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'inquiries'),
      where('shopId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({
            id: docSnap.id,
            ...docSnap.data(),
          });
        });
        items.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        setInquiries(items);
        setInquiriesLoading(false);
      },
      (err) => {
        console.error('Error listening to inquiries:', err);
        setInquiriesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Real-time listener for customer reviews
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'reviews'),
      where('shopId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        setReviews(items);
      },
      (err) => {
        console.error('Error listening to reviews:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Rating and review calculations
  const ratingStats = useMemo(() => {
    if (reviews.length === 0) return { avg: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return {
      avg: (sum / reviews.length).toFixed(1),
      count: reviews.length,
    };
  }, [reviews]);

  // Most viewed product calculation
  const mostViewedProduct = useMemo(() => {
    if (products.length === 0) return null;
    return products.reduce((top, p) => {
      const topViews = top?.views || top?.viewCount || 0;
      const pViews = p?.views || p?.viewCount || 0;
      return pViews > topViews ? p : top;
    }, products[0]);
  }, [products]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  function handleOpenAddModal() {
    setEditingProduct(null);
    setIsFormModalOpen(true);
  }

  function handleOpenEditModal(product) {
    setEditingProduct(product);
    setIsFormModalOpen(true);
  }

  function handleCloseFormModal() {
    setIsFormModalOpen(false);
    setEditingProduct(null);
  }

  function handleOpenDeleteModal(product) {
    setDeletingProduct(product);
  }

  function handleCloseDeleteModal() {
    setDeletingProduct(null);
  }

  // Filtered products calculation
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase());

      const itemStockStatus = item.stockStatus || (item.inStock ? 'in_stock' : 'out_of_stock');
      const matchesStock =
        stockFilter === 'all' || itemStockStatus === stockFilter;

      return matchesSearch && matchesStock;
    });
  }, [products, searchTerm, stockFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter(
      (p) => p.stockStatus === 'in_stock' || p.inStock === true
    ).length;
    const outOfStock = total - inStock;
    return { total, inStock, outOfStock };
  }, [products]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard" id="dashboard-page">
      {/* Top Header */}
      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="dash-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="dash-brand-icon">
              <Store size={18} />
            </div>
            <span className="dash-brand-text">LocalHive <span className="dash-badge">Merchant</span></span>
          </div>

          <div className="dash-header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}
            >
              View Public Site
            </button>
            <button className="dash-logout-btn" onClick={handleLogout} id="logout-btn">
              <LogOut size={15} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dash-main">
        <div className="dash-header-section">
          <h1 className="dash-title">Shop Owner Dashboard</h1>
          <p className="dash-subtitle">
            Manage your store details, product catalog, and customer inquiries in real-time.
          </p>
        </div>

        {/* Shop Analytics Section - Stat Cards at Top of Dashboard */}
        {shop && (
          <section className="dash-analytics-section" id="shop-analytics-section">
            <div className="dash-analytics-header">
              <h2 className="dash-analytics-title">
                <TrendingUp size={20} color="var(--color-primary)" />
                Store Performance & Analytics
              </h2>
            </div>

            <div className="dash-analytics-grid" id="analytics-stat-cards">
              {/* Stat 1: Total profile views this week */}
              <div className="analytics-stat-card" id="stat-card-views">
                <div className="analytics-stat-top">
                  <div className="analytics-stat-icon analytics-icon-views">
                    <Eye size={22} />
                  </div>
                  <span className="analytics-stat-pill pill-teal">This Week</span>
                </div>
                <div className="analytics-stat-body">
                  <div className="analytics-stat-value" id="stat-value-views">
                    {(weeklyViews || shop?.weeklyViews || shop?.viewCount || 0).toLocaleString()}
                  </div>
                  <div className="analytics-stat-label">Profile Views</div>
                </div>
                <div className="analytics-stat-footer">
                  <Clock size={13} />
                  <span>Real-time visits this week</span>
                </div>
              </div>

              {/* Stat 2: Total inquiries received */}
              <div className="analytics-stat-card" id="stat-card-inquiries">
                <div className="analytics-stat-top">
                  <div className="analytics-stat-icon analytics-icon-inquiries">
                    <Mail size={22} />
                  </div>
                  <span className="analytics-stat-pill pill-blue">Inquiries</span>
                </div>
                <div className="analytics-stat-body">
                  <div className="analytics-stat-value" id="stat-value-inquiries">
                    {inquiries.length}
                  </div>
                  <div className="analytics-stat-label">Messages Received</div>
                </div>
                <div className="analytics-stat-footer">
                  <MessageSquare size={13} />
                  <span>
                    {inquiries.filter((i) => (i.status || 'pending') === 'pending').length} pending response
                  </span>
                </div>
              </div>

              {/* Stat 3: Total reviews received and average rating */}
              <div className="analytics-stat-card" id="stat-card-reviews">
                <div className="analytics-stat-top">
                  <div className="analytics-stat-icon analytics-icon-reviews">
                    <Star size={22} />
                  </div>
                  <span className="analytics-stat-pill pill-amber">Rating</span>
                </div>
                <div className="analytics-stat-body">
                  <div className="analytics-stat-value" id="stat-value-rating">
                    {ratingStats.count > 0 ? `${ratingStats.avg} ★` : 'New'}
                  </div>
                  <div className="analytics-stat-label">Reviews & Rating</div>
                </div>
                <div className="analytics-stat-footer">
                  <CheckCircle size={13} />
                  <span>{ratingStats.count} total review{ratingStats.count === 1 ? '' : 's'}</span>
                </div>
              </div>

              {/* Stat 4: Most viewed product */}
              <div className="analytics-stat-card" id="stat-card-top-product">
                <div className="analytics-stat-top">
                  <div className="analytics-stat-icon analytics-icon-product">
                    <Flame size={22} />
                  </div>
                  <span className="analytics-stat-pill pill-purple">Popular</span>
                </div>
                <div className="analytics-stat-body">
                  <div
                    className="analytics-stat-value"
                    id="stat-value-top-product"
                    title={mostViewedProduct?.name || 'No products yet'}
                    style={{ fontSize: '1.25rem', paddingTop: '0.35rem' }}
                  >
                    {mostViewedProduct ? mostViewedProduct.name : 'No items yet'}
                  </div>
                  <div className="analytics-stat-label">Most Viewed Product</div>
                </div>
                <div className="analytics-stat-footer">
                  <Package size={13} />
                  <span>
                    {mostViewedProduct
                      ? `${mostViewedProduct.views || mostViewedProduct.viewCount || 0} customer views`
                      : 'Catalog is empty'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Top Grid: Shop Info Card + Store QR Code Card */}
        {shop ? (
          <div className="dash-top-grid">
            {/* Shop Details Card */}
            <div className="dash-shop-card" id="shop-info-card">
              <div className="dash-shop-header">
                <div className="dash-shop-icon-box">
                  {shop.category === 'Clothing' ? <Shirt size={28} /> : <Bike size={28} />}
                </div>
                <div>
                  <h2 className="dash-shop-name">{shop.shopName}</h2>
                  <span className="dash-shop-category">
                    {shop.category} Store
                  </span>
                </div>
              </div>

              <div className="dash-shop-details">
                <div className="dash-detail">
                  <span className="dash-detail-label">
                    <MapPin size={13} />
                    Store Location
                  </span>
                  <span className="dash-detail-value">{shop.address || 'Address not set'}</span>
                </div>
                <div className="dash-detail">
                  <span className="dash-detail-label">
                    <FileText size={13} />
                    Description
                  </span>
                  <span className="dash-detail-value">{shop.description || 'No description provided.'}</span>
                </div>
              </div>
            </div>

            {/* Storefront QR Code Card with Download */}
            <ShopQRCode
              shopId={currentUser.uid}
              shopName={shop.shopName}
              shopCategory={shop.category}
              size={170}
            />
          </div>
        ) : (
          <div className="dash-empty">
            <Store size={40} className="empty-icon" />
            <p>No shop profile registered yet.</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={() => navigate('/create-shop')}
            >
              Create Shop Profile
            </button>
          </div>
        )}

        {/* Product Catalog Section */}
        {shop && (
          <section className="catalog-section" id="product-catalog-section">
            <div className="catalog-header">
              <div className="catalog-title-group">
                <h2 className="catalog-title">
                  <Package size={22} color="var(--color-primary)" />
                  Product Inventory
                </h2>
                <p className="catalog-subtitle">
                  Manage your items, prices, photos, and live in-stock availability
                </p>
              </div>

              <button
                className="btn btn-primary add-product-btn"
                onClick={handleOpenAddModal}
                id="add-product-btn"
              >
                <Plus size={16} />
                <span>Add Product</span>
              </button>
            </div>

            {/* Catalog Stats */}
            <div className="catalog-stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Items</div>
              </div>
              <div className="stat-card stat-success">
                <div className="stat-value">{stats.inStock}</div>
                <div className="stat-label">In Stock</div>
              </div>
              <div className="stat-card stat-warning">
                <div className="stat-value">{stats.outOfStock}</div>
                <div className="stat-label">Out of Stock</div>
              </div>
            </div>

            {/* Search and Filters Bar */}
            {products.length > 0 && (
              <div className="catalog-controls">
                <div className="search-box">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Filter products by title or category…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    id="product-search-input"
                  />
                  {searchTerm && (
                    <button
                      className="search-clear-btn"
                      onClick={() => setSearchTerm('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="filter-pills">
                  <button
                    className={`filter-pill ${stockFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStockFilter('all')}
                  >
                    All ({products.length})
                  </button>
                  <button
                    className={`filter-pill ${stockFilter === 'in_stock' ? 'active' : ''}`}
                    onClick={() => setStockFilter('in_stock')}
                  >
                    In Stock ({stats.inStock})
                  </button>
                  <button
                    className={`filter-pill ${stockFilter === 'out_of_stock' ? 'active' : ''}`}
                    onClick={() => setStockFilter('out_of_stock')}
                  >
                    Out of Stock ({stats.outOfStock})
                  </button>
                </div>
              </div>
            )}

            {/* Product List / Grid */}
            {productsLoading ? (
              <div className="products-loading">
                <div className="loading-spinner"></div>
                <p>Loading your products…</p>
              </div>
            ) : products.length === 0 ? (
              <div className="catalog-empty-state">
                <Package size={44} className="empty-state-icon" />
                <h3>No items in your catalog yet</h3>
                <p>Add your first product to display it on your public store page.</p>
                <button
                  className="btn btn-primary"
                  onClick={handleOpenAddModal}
                  id="empty-add-product-btn"
                  style={{ marginTop: '1rem' }}
                >
                  <Plus size={16} />
                  Add First Product
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="catalog-empty-state">
                <Search size={44} className="empty-state-icon" />
                <h3>No matching products</h3>
                <p>Try clearing your search term or stock filter.</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setStockFilter('all');
                  }}
                  style={{ marginTop: '0.75rem' }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="products-grid" id="products-list-grid">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleOpenEditModal}
                    onDelete={handleOpenDeleteModal}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Customer Inquiries Section */}
        {shop && (
          <section className="catalog-section" id="customer-inquiries-section" style={{ marginTop: '2rem' }}>
            <div className="catalog-header">
              <div className="catalog-title-group">
                <h2 className="catalog-title">
                  <Mail size={22} color="var(--color-primary)" />
                  Customer Inquiries
                </h2>
                <p className="catalog-subtitle">
                  Messages and questions sent by shoppers visiting your store page
                </p>
              </div>
            </div>

            {inquiriesLoading ? (
              <div className="products-loading">
                <div className="loading-spinner"></div>
                <p>Loading customer inquiries…</p>
              </div>
            ) : inquiries.length === 0 ? (
              <div className="catalog-empty-state" style={{ padding: '3rem 1.5rem' }}>
                <Mail size={40} className="empty-state-icon" />
                <h3>No inquiries yet</h3>
                <p>When customers ask about items or custom requests from your store page, they will appear here.</p>
              </div>
            ) : (
              <div className="inquiries-list-container" id="inquiries-list">
                {inquiries.map((inq) => (
                  <div
                    key={inq.id}
                    id={`inquiry-card-${inq.id}`}
                    className="inquiry-item-card"
                  >
                    <div className="inquiry-header-row">
                      <div className="inquiry-user-meta">
                        <User size={15} color="var(--color-text-secondary)" />
                        <span className="inquiry-user-email">
                          {inq.customerEmail || 'Customer Inquiry'}
                        </span>
                        <span className="inquiry-status-tag">
                          {inq.status || 'pending'}
                        </span>
                      </div>
                      <span className="inquiry-date-text">
                        <Clock size={12} style={{ marginRight: '4px' }} />
                        {inq.createdAt ? new Date(inq.createdAt).toLocaleString() : ''}
                      </span>
                    </div>

                    <div className="inquiry-message-bubble">
                      &quot;{inq.message}&quot;
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        shopId={currentUser.uid}
        productToEdit={editingProduct}
        shopCategory={shop?.category}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingProduct)}
        onClose={handleCloseDeleteModal}
        product={deletingProduct}
      />
    </div>
  );
}

export default Dashboard;
