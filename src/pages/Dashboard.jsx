import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import ProductFormModal from '../components/ProductFormModal';
import ProductCard from '../components/ProductCard';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
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

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch shop details
  useEffect(() => {
    async function fetchShop() {
      if (!currentUser) return;
      try {
        const shopDoc = await getDoc(doc(db, 'shops', currentUser.uid));
        if (shopDoc.exists()) {
          setShop(shopDoc.data());
        }
      } catch (err) {
        console.error('Error fetching shop:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchShop();
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
        <div className="dash-brand">
          🐝 <span className="auth-logo-accent">LocalHive</span>
        </div>
        <button className="dash-logout-btn" onClick={handleLogout} id="logout-btn">
          Log Out
        </button>
      </header>

      {/* Main Content */}
      <main className="dash-main">
        <div className="dash-header-section">
          <h1 className="dash-title">Shop Owner Dashboard</h1>
        </div>

        {/* Shop Info Card */}
        {shop ? (
          <div className="dash-shop-card" id="shop-info-card">
            <div className="dash-shop-header">
              <span className="dash-shop-icon">
                {shop.category === 'Clothing' ? '👗' : '🚲'}
              </span>
              <div>
                <h2 className="dash-shop-name">{shop.shopName}</h2>
                <span className="dash-shop-category">{shop.category}</span>
              </div>
            </div>
            <div className="dash-shop-details">
              <div className="dash-detail">
                <span className="dash-detail-label">📍 Address</span>
                <span className="dash-detail-value">{shop.address}</span>
              </div>
              <div className="dash-detail">
                <span className="dash-detail-label">📝 Description</span>
                <span className="dash-detail-value">{shop.description}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="dash-empty">
            <p>No shop profile found.</p>
            <button
              className="auth-btn auth-btn-primary"
              style={{ maxWidth: 240, marginTop: '1rem' }}
              onClick={() => navigate('/create-shop')}
            >
              Create Shop Profile
            </button>
          </div>
        )}

        {/* Product Catalog Section (Visible if shop exists) */}
        {shop && (
          <section className="catalog-section" id="product-catalog-section">
            <div className="catalog-header">
              <div className="catalog-title-group">
                <h2 className="catalog-title">📦 Product Catalog</h2>
                <p className="catalog-subtitle">
                  Manage your inventory, prices, photos, and stock status
                </p>
              </div>
              <button
                className="add-product-btn"
                onClick={handleOpenAddModal}
                id="add-product-btn"
              >
                <span className="btn-icon">➕</span> Add Product
              </button>
            </div>

            {/* Catalog Stats */}
            <div className="catalog-stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Products</div>
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
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search products by name or category…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    id="product-search-input"
                  />
                  {searchTerm && (
                    <button
                      className="search-clear-btn"
                      onClick={() => setSearchTerm('')}
                    >
                      ✕
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
                <div className="empty-state-icon">🛍️</div>
                <h3>No products in your catalog yet</h3>
                <p>Start showcasing your items to local shoppers by adding your first product.</p>
                <button
                  className="auth-btn auth-btn-primary empty-add-btn"
                  onClick={handleOpenAddModal}
                  id="empty-add-product-btn"
                >
                  ➕ Add Your First Product
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="catalog-empty-state">
                <div className="empty-state-icon">🔎</div>
                <h3>No matching products</h3>
                <p>Try adjusting your search or filters to find what you&apos;re looking for.</p>
                <button
                  className="dash-btn-secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setStockFilter('all');
                  }}
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

        {/* Customer Inquiries Section (Visible if shop exists) */}
        {shop && (
          <section className="catalog-section" id="customer-inquiries-section" style={{ marginTop: '2rem' }}>
            <div className="catalog-header">
              <div className="catalog-title-group">
                <h2 className="catalog-title">✉️ Customer Inquiries</h2>
                <p className="catalog-subtitle">
                  Direct messages and questions sent by shoppers to your shop
                </p>
              </div>
            </div>

            {inquiriesLoading ? (
              <div className="products-loading">
                <div className="loading-spinner"></div>
                <p>Loading inquiries…</p>
              </div>
            ) : inquiries.length === 0 ? (
              <div className="catalog-empty-state" style={{ padding: '2.5rem 1.5rem' }}>
                <div className="empty-state-icon">📩</div>
                <h3>No customer inquiries yet</h3>
                <p>When customers send questions from your shop page, they will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }} id="inquiries-list">
                {inquiries.map((inq) => (
                  <div
                    key={inq.id}
                    id={`inquiry-card-${inq.id}`}
                    style={{
                      padding: '1.25rem 1.5rem',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9' }}>
                          👤 {inq.customerEmail || 'Customer Inquiry'}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          textTransform: 'uppercase',
                        }}>
                          {inq.status || 'pending'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {inq.createdAt ? new Date(inq.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.92rem', color: '#cbd5e1', lineHeight: '1.5', background: 'rgba(0, 0, 0, 0.2)', padding: '0.85rem 1rem', borderRadius: '10px' }}>
                      "{inq.message}"
                    </p>
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
