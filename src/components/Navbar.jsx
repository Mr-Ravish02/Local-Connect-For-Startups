import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Store, Shield, LogOut, Menu, X, User, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ADMIN_EMAIL } from '../utils/constants';
import './Navbar.css';

function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('To install LocalHive on your phone: Tap your browser menu (⋮ or Share) and select "Add to Home Screen".');
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/" className="navbar-brand" id="navbar-brand-link">
          <div className="navbar-brand-icon-box">
            <Store className="navbar-brand-icon" size={20} strokeWidth={2.4} />
          </div>
          <span className="navbar-brand-text">LocalHive</span>
        </Link>

        {/* Search */}
        <form
          className="navbar-search"
          onSubmit={handleSearchSubmit}
          id="navbar-search-form"
        >
          <Search className="navbar-search-icon" size={17} />
          <input
            type="text"
            className="navbar-search-input"
            placeholder="Search local products or shops…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="navbar-search-input"
          />
        </form>

        {/* Mobile toggle */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          id="navbar-mobile-toggle"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Links */}
        <div className={`navbar-links ${mobileMenuOpen ? 'open' : ''}`}>
          <Link
            to="/"
            className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Explore
          </Link>
          <Link
            to="/search"
            className={`navbar-link ${location.pathname === '/search' ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Search
          </Link>

          {currentUser ? (
            <>
              {userRole === 'shopOwner' && (
                <Link
                  to="/dashboard"
                  className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                  id="navbar-dashboard-link"
                >
                  Dashboard
                </Link>
              )}
              {userRole === 'admin' &&
                currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
                  <Link
                    to="/admin"
                    className={`navbar-link navbar-link-admin ${location.pathname === '/admin' ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                    id="navbar-admin-link"
                  >
                    <Shield size={15} />
                    Admin
                  </Link>
                )}
              <button
                className="navbar-btn navbar-btn-outline"
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                id="navbar-logout-btn"
              >
                <LogOut size={15} style={{ marginRight: '6px' }} />
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="navbar-btn navbar-btn-outline"
                onClick={() => setMobileMenuOpen(false)}
                id="navbar-login-btn"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="navbar-btn navbar-btn-primary"
                onClick={() => setMobileMenuOpen(false)}
                id="navbar-signup-btn"
              >
                Sign Up
              </Link>
            </>
          )}

          {!isInstalled && (
            <button
              type="button"
              className="navbar-btn navbar-btn-install"
              onClick={() => {
                handleInstallClick();
                setMobileMenuOpen(false);
              }}
              id="pwa-install-btn"
              title="Install LocalHive App"
            >
              <Smartphone size={15} />
              <span>Install App</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
