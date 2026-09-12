import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
          <div className="auth-logo">
            🐝 <span className="auth-logo-accent">LocalHive</span>
          </div>
          <h1>Create an Account</h1>
          <p>Join your local shopping community</p>
        </div>

        {error && <div className="auth-error" id="signup-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Role Selector */}
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem', display: 'block' }}>
            I am a…
          </label>
          <div className="role-selector" id="role-selector">
            <div
              className={`role-option ${role === 'customer' ? 'active' : ''}`}
              onClick={() => setRole('customer')}
              id="role-customer"
            >
              <span className="role-icon">🛍️</span>
              <span className="role-label">Customer</span>
            </div>
            <div
              className={`role-option ${role === 'shopOwner' ? 'active' : ''}`}
              onClick={() => setRole('shopOwner')}
              id="role-shop-owner"
            >
              <span className="role-icon">🏪</span>
              <span className="role-label">Shop Owner</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="signup-email">Email</label>
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
              placeholder="Re-enter password"
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
