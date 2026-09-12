import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ADMIN_EMAIL } from '../utils/constants';
import './Navbar.css';

function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();

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
          <span className="navbar-brand-icon">🐝</span>
          <span className="navbar-brand-text">LocalHive</span>
        </Link>

        {/* Search */}
        <form
          className="navbar-search"
          onSubmit={handleSearchSubmit}
          id="navbar-search-form"
        >
          <span className="navbar-search-icon">🔍</span>
          <input
            type="text"
            className="navbar-search-input"
            placeholder="Search products…"
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
          <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        {/* Links */}
        <div className={`navbar-links ${mobileMenuOpen ? 'open' : ''}`}>
          <Link
            to="/"
            className="navbar-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Explore
          </Link>
          <Link
            to="/search"
            className="navbar-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Search
          </Link>

          {currentUser ? (
            <>
              {userRole === 'shopOwner' && (
                <Link
                  to="/dashboard"
                  className="navbar-link"
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
                    className="navbar-link navbar-link-admin"
                    onClick={() => setMobileMenuOpen(false)}
                    id="navbar-admin-link"
                  >
                    🛡️ Admin Dashboard
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
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
