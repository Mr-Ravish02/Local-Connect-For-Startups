import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, ShoppingBag, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    if (role !== 'customer' && role !== 'shopOwner') {
      return setError('Please select a valid account role.');
    }

    setSubmitting(true);
    try {
      await signup(email, password, role);
      // Shop owners go to profile creation; customers go home
      if (role === 'shopOwner') {
        navigate('/create-shop');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page" id="signup-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <div className="auth-logo-box">
              <Store size={22} color="#ffffff" strokeWidth={2.4} />
            </div>
            <span className="auth-logo-text">LocalHive</span>
          </Link>
          <h1>Create an Account</h1>
          <p>Join your local neighborhood shopping directory</p>
        </div>

        {error && (
          <div className="auth-error" id="signup-error">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Role Selector */}
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem', display: 'block' }}>
            I am joining as a…
          </label>
          <div className="role-selector" id="role-selector">
            <div
              className={`role-option ${role === 'customer' ? 'active' : ''}`}
              onClick={() => setRole('customer')}
              id="role-customer"
            >
              <div className="role-icon-box">
                <ShoppingBag size={20} />
              </div>
              <span className="role-label">Shopper</span>
            </div>
            <div
              className={`role-option ${role === 'shopOwner' ? 'active' : ''}`}
              onClick={() => setRole('shopOwner')}
              id="role-shop-owner"
            >
              <div className="role-icon-box">
                <Store size={20} />
              </div>
              <span className="role-label">Shop Owner</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="signup-email">Email Address</label>
            <input
              id="signup-email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              className="form-input"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-confirm">Confirm Password</label>
            <input
              id="signup-confirm"
              className="form-input"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={submitting}
            id="signup-submit-btn"
          >
            {submitting ? 'Creating Account…' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
