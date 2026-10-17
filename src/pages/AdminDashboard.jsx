import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import {
  Shield,
  Store,
  Package,
  Users,
  Star,
  Search,
  X,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  User,
} from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { ADMIN_EMAIL } from '../utils/constants';
import Navbar from '../components/Navbar';
import './AdminDashboard.css';

function AdminDashboard() {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Component-level authorization check
  useEffect(() => {
    if (!authLoading) {
      if (
        !currentUser ||
        currentUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase() ||
        userRole !== 'admin'
      ) {
        navigate('/', { replace: true });
      }
    }
  }, [currentUser, userRole, authLoading, navigate]);

  // Active Tab: 'shops' | 'products' | 'users' | 'reviews'
  const [activeTab, setActiveTab] = useState('shops');

  // Firestore Data Collections
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState(null); // { type: 'success' | 'error', message: string }

  // Filter & Search States
  const [shopSearch, setShopSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewRatingFilter, setReviewRatingFilter] = useState('all');

  // Deletion Confirmation Modal States
  const [deletingShop, setDeletingShop] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deletingReview, setDeletingReview] = useState(null);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [modalError, setModalError] = useState('');

  // 1. Subscribe in real-time to all collections
  useEffect(() => {
    const unsubs = [];

    // Listen to Shops
    const unsubShops = onSnapshot(
      collection(db, 'shops'),
      (snapshot) => {
        const list = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setShops(list);
      },
      (err) => console.error('Error fetching shops:', err)
    );
    unsubs.push(unsubShops);

    // Listen to Products
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setProducts(list);
      },
      (err) => console.error('Error fetching products:', err)
    );
    unsubs.push(unsubProducts);

    // Listen to Users
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setUsers(list);
      },
      (err) => console.error('Error fetching users:', err)
    );
    unsubs.push(unsubUsers);

    // Listen to Reviews
    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      (snapshot) => {
        const list = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setReviews(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching reviews:', err);
        setLoading(false);
      }
    );
    unsubs.push(unsubReviews);

    return () => {
      unsubs.forEach((unsub) => unsub && unsub());
    };
  }, []);

  // Quick lookup map: shopId -> shopName
  const shopNameMap = useMemo(() => {
    const map = {};
    shops.forEach((s) => {
      map[s.id] = s.shopName || s.name || 'Unnamed Shop';
    });
    return map;
  }, [shops]);

  // Product counts per shop
  const shopProductCountMap = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      if (p.shopId) {
        map[p.shopId] = (map[p.shopId] || 0) + 1;
      }
    });
    return map;
  }, [products]);

  // Notice banner auto-dismiss
  useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  // ── DELETE ACTIONS ──────────────────────────────────────────

  // 1. Delete Shop (Cascading: deletes shop + all products + inquiries + reviews)
  async function confirmDeleteShop() {
    if (!deletingShop) return;
    setIsProcessingDelete(true);
    setModalError('');

    try {
      const shopId = deletingShop.id;
      const shopName = deletingShop.shopName || deletingShop.name || 'Shop';

      // 1. Fetch & delete all products of this shop
      const prodQuery = query(collection(db, 'products'), where('shopId', '==', shopId));
      const prodSnap = await getDocs(prodQuery);
      const deletePromises = [];
      let deletedProductsCount = 0;

      prodSnap.forEach((pDoc) => {
        deletePromises.push(deleteDoc(doc(db, 'products', pDoc.id)));
        deletedProductsCount++;
      });

      // 2. Fetch & delete all inquiries of this shop
      const inqQuery = query(collection(db, 'inquiries'), where('shopId', '==', shopId));
      const inqSnap = await getDocs(inqQuery);
      inqSnap.forEach((iDoc) => {
        deletePromises.push(deleteDoc(doc(db, 'inquiries', iDoc.id)));
      });

      // 3. Fetch & delete all reviews of this shop
      const revQuery = query(collection(db, 'reviews'), where('shopId', '==', shopId));
      const revSnap = await getDocs(revQuery);
      revSnap.forEach((rDoc) => {
        deletePromises.push(deleteDoc(doc(db, 'reviews', rDoc.id)));
      });

      // 4. Delete the shop document
      deletePromises.push(deleteDoc(doc(db, 'shops', shopId)));

      await Promise.all(deletePromises);

      setActionNotice({
        type: 'success',
        message: `Shop "${shopName}" and ${deletedProductsCount} associated product(s) deleted successfully.`,
      });
      setDeletingShop(null);
    } catch (err) {
      console.error('Failed to delete shop:', err);
      setModalError(err.message || 'Failed to delete shop. Please try again.');
    } finally {
      setIsProcessingDelete(false);
    }
  }

  // 2. Delete Single Product
  async function confirmDeleteProduct() {
    if (!deletingProduct) return;
    setIsProcessingDelete(true);
    setModalError('');

    try {
      const productName = deletingProduct.name || 'Product';
      await deleteDoc(doc(db, 'products', deletingProduct.id));

      setActionNotice({
        type: 'success',
        message: `Product "${productName}" deleted successfully.`,
      });
      setDeletingProduct(null);
    } catch (err) {
      console.error('Failed to delete product:', err);
      setModalError(err.message || 'Failed to delete product. Please try again.');
    } finally {
      setIsProcessingDelete(false);
    }
  }

  // 3. Delete Single Review
  async function confirmDeleteReview() {
    if (!deletingReview) return;
    setIsProcessingDelete(true);
    setModalError('');

    try {
      await deleteDoc(doc(db, 'reviews', deletingReview.id));

      setActionNotice({
        type: 'success',
        message: `Review deleted successfully.`,
      });
      setDeletingReview(null);
    } catch (err) {
      console.error('Failed to delete review:', err);
      setModalError(err.message || 'Failed to delete review. Please try again.');
    } finally {
      setIsProcessingDelete(false);
    }
  }

  // ── FILTERED DATA ──────────────────────────────────────────

  const filteredShops = useMemo(() => {
    return shops.filter((s) => {
      const q = shopSearch.toLowerCase();
      const name = (s.shopName || s.name || '').toLowerCase();
      const cat = (s.category || '').toLowerCase();
      const addr = (s.address || '').toLowerCase();
      const owner = (s.ownerId || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || addr.includes(q) || owner.includes(q);
    });
  }, [shops, shopSearch]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = productSearch.toLowerCase();
      const name = (p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const shopName = (shopNameMap[p.shopId] || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || shopName.includes(q);
    });
  }, [products, productSearch, shopNameMap]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = u.role || 'customer';
      const matchesSearch = email.includes(q);
      const matchesRole = userRoleFilter === 'all' || role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const q = reviewSearch.toLowerCase();
      const comment = (r.comment || '').toLowerCase();
      const email = (r.customerEmail || '').toLowerCase();
      const shopName = (shopNameMap[r.shopId] || '').toLowerCase();
      const matchesSearch = comment.includes(q) || email.includes(q) || shopName.includes(q);
      const matchesRating =
        reviewRatingFilter === 'all' || String(r.rating) === reviewRatingFilter;
      return matchesSearch && matchesRating;
    });
  }, [reviews, reviewSearch, reviewRatingFilter, shopNameMap]);

  // Format date helper
  function formatDate(val) {
    if (!val) return '—';
    try {
      if (val.toDate) {
        return val.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return new Date(val).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(val);
    }
  }

  // Calculate platform avg rating
  const avgPlatformRating = useMemo(() => {
    if (!reviews.length) return '—';
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <div className="admin-page" id="admin-dashboard-page">
      <Navbar />

      <main className="admin-main">
        {/* Admin Header & Banner */}
        <div className="admin-header-card">
          <div className="admin-header-left">
            <div className="admin-badge">
              <Shield size={14} />
              <span>Platform Administration</span>
            </div>
            <h1 className="admin-title">System Administration & Moderation</h1>
            <p className="admin-subtitle">
              Manage platform shops, catalog products, user accounts, and customer reviews.
            </p>
          </div>
          <div className="admin-user-info">
            <span className="admin-user-label">Logged in as:</span>
            <span className="admin-user-email">{currentUser?.email}</span>
            <span className="admin-role-tag">Super Admin</span>
          </div>
        </div>

        {/* Global Action Notice */}
        {actionNotice && (
          <div
            className={`admin-notice ${
              actionNotice.type === 'success' ? 'notice-success' : 'notice-error'
            }`}
            id="admin-action-notice"
          >
            {actionNotice.type === 'success' ? (
              <CheckCircle size={18} style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
            )}
            <span>{actionNotice.message}</span>
            <button
              className="notice-close-btn"
              onClick={() => setActionNotice(null)}
              aria-label="Dismiss notice"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* KPI Metrics Summary Bar */}
        <section className="admin-kpis" id="admin-kpis">
          <div
            className={`admin-kpi-card ${activeTab === 'shops' ? 'active-kpi' : ''}`}
            onClick={() => setActiveTab('shops')}
          >
            <div className="kpi-icon-wrap kpi-shops">
              <Store size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value" id="kpi-total-shops">
                {shops.length}
              </span>
              <span className="kpi-label">Registered Shops</span>
            </div>
          </div>

          <div
            className={`admin-kpi-card ${activeTab === 'products' ? 'active-kpi' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <div className="kpi-icon-wrap kpi-products">
              <Package size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value" id="kpi-total-products">
                {products.length}
              </span>
              <span className="kpi-label">Total Products</span>
            </div>
          </div>

          <div
            className={`admin-kpi-card ${activeTab === 'users' ? 'active-kpi' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <div className="kpi-icon-wrap kpi-users">
              <Users size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value" id="kpi-total-users">
                {users.length}
              </span>
              <span className="kpi-label">Registered Users</span>
            </div>
          </div>

          <div
            className={`admin-kpi-card ${activeTab === 'reviews' ? 'active-kpi' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            <div className="kpi-icon-wrap kpi-reviews">
              <Star size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-value" id="kpi-total-reviews">
                {reviews.length}
              </span>
              <span className="kpi-label">Reviews ({avgPlatformRating}★ avg)</span>
            </div>
          </div>
        </section>

        {/* Admin Navigation Tabs */}
        <div className="admin-tabs" id="admin-tabs">
          <button
            className={`admin-tab-btn ${activeTab === 'shops' ? 'active' : ''}`}
            onClick={() => setActiveTab('shops')}
            id="tab-shops-btn"
          >
            <Store size={16} />
            <span>Shops</span>
            <span className="tab-counter">{shops.length}</span>
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
            id="tab-products-btn"
          >
            <Package size={16} />
            <span>Products</span>
            <span className="tab-counter">{products.length}</span>
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
            id="tab-users-btn"
          >
            <Users size={16} />
            <span>Users</span>
            <span className="tab-counter">{users.length}</span>
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
            id="tab-reviews-btn"
          >
            <Star size={16} />
            <span>Reviews</span>
            <span className="tab-counter">{reviews.length}</span>
          </button>
        </div>

        {/* ── TAB 1: SHOPS ────────────────────────────────────────── */}
        {activeTab === 'shops' && (
          <section className="admin-panel" id="admin-shops-panel">
            <div className="panel-toolbar">
              <div className="toolbar-search">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search shops by name, category, or address…"
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                  id="admin-shop-search-input"
                />
                {shopSearch && (
                  <button className="clear-search-btn" onClick={() => setShopSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="toolbar-stats">
                Showing {filteredShops.length} of {shops.length} shop(s)
              </div>
            </div>

            {loading ? (
              <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Loading shops…</p>
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="admin-empty" id="shops-empty-state">
                <Store size={36} className="empty-icon" />
                <h3>No shops found</h3>
                <p>
                  {shopSearch
                    ? 'No shops match your search criteria.'
                    : 'There are currently no registered shops in the database.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table" id="admin-shops-table">
                  <thead>
                    <tr>
                      <th>Shop Name</th>
                      <th>Category</th>
                      <th>Address</th>
                      <th>Phone</th>
                      <th>Products</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShops.map((shop) => {
                      const prodCount = shopProductCountMap[shop.id] || 0;
                      return (
                        <tr key={shop.id} id={`shop-row-${shop.id}`}>
                          <td>
                            <div className="cell-shop-info">
                              <div className="cell-avatar">
                                <Store size={16} />
                              </div>
                              <div>
                                <span className="cell-title">
                                  {shop.shopName || shop.name || 'Unnamed Shop'}
                                </span>
                                <span className="cell-sub">ID: {shop.id}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="category-pill">{shop.category || 'General'}</span>
                          </td>
                          <td className="cell-truncate">{shop.address || '—'}</td>
                          <td>{shop.phone || '—'}</td>
                          <td>
                            <span className="count-badge">{prodCount} product(s)</span>
                          </td>
                          <td>{formatDate(shop.createdAt)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-actions">
                              <Link
                                to={`/shop/${shop.id}`}
                                className="action-btn action-view"
                                target="_blank"
                                rel="noreferrer"
                                title="View public storefront"
                              >
                                <span>View Shop</span>
                                <ExternalLink size={12} />
                              </Link>
                              <button
                                className="action-btn action-delete"
                                onClick={() => {
                                  setModalError('');
                                  setDeletingShop(shop);
                                }}
                                id={`delete-shop-btn-${shop.id}`}
                              >
                                <Trash2 size={13} />
                                <span>Delete Shop</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── TAB 2: PRODUCTS ─────────────────────────────────────── */}
        {activeTab === 'products' && (
          <section className="admin-panel" id="admin-products-panel">
            <div className="panel-toolbar">
              <div className="toolbar-search">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search products by title, category, or shop name…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  id="admin-product-search-input"
                />
                {productSearch && (
                  <button className="clear-search-btn" onClick={() => setProductSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="toolbar-stats">
                Showing {filteredProducts.length} of {products.length} product(s)
              </div>
            </div>

            {loading ? (
              <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Loading products…</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="admin-empty" id="products-empty-state">
                <Package size={36} className="empty-icon" />
                <h3>No products found</h3>
                <p>
                  {productSearch
                    ? 'No products match your search query.'
                    : 'There are currently no products across any shops.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table" id="admin-products-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Shop</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((prod) => (
                      <tr key={prod.id} id={`product-row-${prod.id}`}>
                        <td>
                          <div className="cell-product-info">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="prod-thumbnail"
                              />
                            ) : (
                              <div className="prod-thumb-placeholder">
                                <Package size={16} />
                              </div>
                            )}
                            <div>
                              <span className="cell-title">{prod.name || 'Unnamed Product'}</span>
                              <span className="cell-sub">ID: {prod.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Link
                            to={`/shop/${prod.shopId}`}
                            className="shop-link"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shopNameMap[prod.shopId] || prod.shopId || 'Unknown Shop'}
                          </Link>
                        </td>
                        <td>
                          <span className="category-pill">{prod.category || 'General'}</span>
                        </td>
                        <td className="cell-price">
                          ₹{typeof prod.price === 'number' ? prod.price.toFixed(2) : prod.price || '0.00'}
                        </td>
                        <td>
                          <span
                            className={`stock-pill ${
                              prod.inStock !== false ? 'stock-in' : 'stock-out'
                            }`}
                          >
                            {prod.inStock !== false ? '● In Stock' : '○ Out of Stock'}
                          </span>
                        </td>
                        <td>{formatDate(prod.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="action-btn action-delete"
                            onClick={() => {
                              setModalError('');
                              setDeletingProduct(prod);
                            }}
                            id={`delete-product-btn-${prod.id}`}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── TAB 3: USERS ────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <section className="admin-panel" id="admin-users-panel">
            <div className="panel-toolbar">
              <div className="toolbar-search">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search users by email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  id="admin-user-search-input"
                />
                {userSearch && (
                  <button className="clear-search-btn" onClick={() => setUserSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="toolbar-filter-group">
                <label htmlFor="user-role-filter">Filter Role:</label>
                <select
                  id="user-role-filter"
                  className="toolbar-select"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles ({users.length})</option>
                  <option value="admin">
                    Admins ({users.filter((u) => u.role === 'admin').length})
                  </option>
                  <option value="shopOwner">
                    Shop Owners ({users.filter((u) => u.role === 'shopOwner').length})
                  </option>
                  <option value="customer">
                    Customers ({users.filter((u) => u.role === 'customer' || !u.role).length})
                  </option>
                </select>
              </div>
              <div className="toolbar-stats">
                Showing {filteredUsers.length} of {users.length} user(s)
              </div>
            </div>

            {loading ? (
              <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Loading users…</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="admin-empty" id="users-empty-state">
                <Users size={36} className="empty-icon" />
                <h3>No users found</h3>
                <p>No user accounts matched your search or role filter.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table" id="admin-users-table">
                  <thead>
                    <tr>
                      <th>User / Email</th>
                      <th>Assigned Role</th>
                      <th>Account UID</th>
                      <th>Registered On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const r = user.role || 'customer';
                      return (
                        <tr key={user.id} id={`user-row-${user.id}`}>
                          <td>
                            <div className="cell-user-info">
                              <div className="user-avatar">
                                <User size={15} />
                              </div>
                              <span className="user-email-text">{user.email || 'No email registered'}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`role-badge role-badge-${
                                r === 'admin'
                                  ? 'admin'
                                  : r === 'shopOwner'
                                  ? 'shop-owner'
                                  : 'customer'
                              }`}
                            >
                              {r === 'admin'
                                ? 'Admin'
                                : r === 'shopOwner'
                                ? 'Shop Owner'
                                : 'Customer'}
                            </span>
                          </td>
                          <td className="cell-mono">{user.id}</td>
                          <td>{formatDate(user.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── TAB 4: REVIEWS ──────────────────────────────────────── */}
        {activeTab === 'reviews' && (
          <section className="admin-panel" id="admin-reviews-panel">
            <div className="panel-toolbar">
              <div className="toolbar-search">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search reviews by comment text, user email, or shop…"
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  id="admin-review-search-input"
                />
                {reviewSearch && (
                  <button className="clear-search-btn" onClick={() => setReviewSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="toolbar-filter-group">
                <label htmlFor="review-rating-filter">Filter Rating:</label>
                <select
                  id="review-rating-filter"
                  className="toolbar-select"
                  value={reviewRatingFilter}
                  onChange={(e) => setReviewRatingFilter(e.target.value)}
                >
                  <option value="all">All Stars ({reviews.length})</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
              <div className="toolbar-stats">
                Showing {filteredReviews.length} of {reviews.length} review(s)
              </div>
            </div>

            {loading ? (
              <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Loading reviews…</p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="admin-empty" id="reviews-empty-state">
                <Star size={36} className="empty-icon" />
                <h3>No reviews found</h3>
                <p>
                  {reviewSearch
                    ? 'No reviews match your query or star rating filter.'
                    : 'There are currently no reviews on any platform shops.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table" id="admin-reviews-table">
                  <thead>
                    <tr>
                      <th>Rating</th>
                      <th>Comment</th>
                      <th>Customer Email</th>
                      <th>Target Shop</th>
                      <th>Submitted On</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReviews.map((rev) => (
                      <tr key={rev.id} id={`review-row-${rev.id}`}>
                        <td>
                          <span className="rating-stars">
                            {'★'.repeat(Number(rev.rating) || 5)}
                            {'☆'.repeat(5 - Math.min(5, Math.max(0, Number(rev.rating) || 5)))}
                          </span>
                        </td>
                        <td className="cell-comment">
                          <p className="comment-text">&quot;{rev.comment}&quot;</p>
                        </td>
                        <td className="cell-email">{rev.customerEmail || rev.customerId || 'Anonymous'}</td>
                        <td>
                          <Link
                            to={`/shop/${rev.shopId}`}
                            className="shop-link"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shopNameMap[rev.shopId] || rev.shopId || 'Shop'}
                          </Link>
                        </td>
                        <td>{formatDate(rev.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="action-btn action-delete"
                            onClick={() => {
                              setModalError('');
                              setDeletingReview(rev);
                            }}
                            id={`delete-review-btn-${rev.id}`}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── MODAL: DELETE SHOP ────────────────────────────────────── */}
      {deletingShop && (
        <div className="modal-backdrop" onClick={() => !isProcessingDelete && setDeletingShop(null)}>
          <div
            className="modal-content modal-content-sm"
            id="delete-shop-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={20} color="var(--color-danger)" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>Delete Shop</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setDeletingShop(null)}
                disabled={isProcessingDelete}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {modalError && <div className="auth-error modal-error-banner">{modalError}</div>}

            <div className="delete-modal-body">
              <p style={{ color: 'var(--color-text)', fontSize: '0.95rem' }}>
                Are you sure you want to delete{' '}
                <strong>&quot;{deletingShop.shopName || deletingShop.name || 'this shop'}&quot;</strong>?
              </p>
              <div className="delete-cascade-warning">
                <AlertTriangle size={20} className="warning-icon" />
                <div>
                  <strong>Permanent Cascade Deletion:</strong>
                  <p>
                    Deleting this shop will automatically and permanently delete all{' '}
                    <strong>{shopProductCountMap[deletingShop.id] || 0} associated product(s)</strong>,
                    customer inquiries, and customer reviews linked to this shop.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingShop(null)}
                disabled={isProcessingDelete}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--color-danger)', color: '#ffffff', borderColor: 'var(--color-danger)' }}
                onClick={confirmDeleteShop}
                disabled={isProcessingDelete}
                id="confirm-delete-shop-btn"
              >
                {isProcessingDelete ? 'Deleting Shop & Products…' : 'Delete Shop & Products'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE PRODUCT ─────────────────────────────────── */}
      {deletingProduct && (
        <div className="modal-backdrop" onClick={() => !isProcessingDelete && setDeletingProduct(null)}>
          <div
            className="modal-content modal-content-sm"
            id="delete-product-admin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={20} color="var(--color-danger)" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>Delete Product</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setDeletingProduct(null)}
                disabled={isProcessingDelete}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {modalError && <div className="auth-error modal-error-banner">{modalError}</div>}

            <div className="delete-modal-body">
              <p style={{ color: 'var(--color-text)', fontSize: '0.95rem' }}>
                Are you sure you want to delete product{' '}
                <strong>&quot;{deletingProduct.name}&quot;</strong> from{' '}
                <strong>
                  {shopNameMap[deletingProduct.shopId] || 'its shop'}
                </strong>
                ?
              </p>
              <p className="delete-warning-text" style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                This action cannot be undone. This product will be immediately removed from the catalog.
              </p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingProduct(null)}
                disabled={isProcessingDelete}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--color-danger)', color: '#ffffff', borderColor: 'var(--color-danger)' }}
                onClick={confirmDeleteProduct}
                disabled={isProcessingDelete}
                id="confirm-delete-product-btn"
              >
                {isProcessingDelete ? 'Deleting…' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE REVIEW ──────────────────────────────────── */}
      {deletingReview && (
        <div className="modal-backdrop" onClick={() => !isProcessingDelete && setDeletingReview(null)}>
          <div
            className="modal-content modal-content-sm"
            id="delete-review-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={20} color="var(--color-danger)" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>Moderate & Delete Review</h2>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setDeletingReview(null)}
                disabled={isProcessingDelete}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {modalError && <div className="auth-error modal-error-banner">{modalError}</div>}

            <div className="delete-modal-body">
              <p style={{ color: 'var(--color-text)', fontSize: '0.95rem' }}>
                Are you sure you want to delete this {deletingReview.rating}★ review by{' '}
                <strong>{deletingReview.customerEmail || 'a customer'}</strong>?
              </p>
              <blockquote className="modal-review-preview" style={{ fontStyle: 'italic', margin: '0.75rem 0', padding: '0.75rem 1rem', background: 'var(--color-surface-subtle)', borderRadius: '6px', borderLeft: '3px solid var(--color-primary)' }}>
                &quot;{deletingReview.comment}&quot;
              </blockquote>
              <p className="delete-warning-text" style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                This review will be permanently deleted from the shop page.
              </p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingReview(null)}
                disabled={isProcessingDelete}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--color-danger)', color: '#ffffff', borderColor: 'var(--color-danger)' }}
                onClick={confirmDeleteReview}
                disabled={isProcessingDelete}
                id="confirm-delete-review-btn"
              >
                {isProcessingDelete ? 'Deleting…' : 'Delete Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
