import { useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { Mail, CheckCircle, X } from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

function ShopInquiryModal({ isOpen, onClose, shop }) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { currentUser } = useAuth();

  if (!isOpen || !shop) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!currentUser) {
      setError('Please log in to send a message');
      return;
    }

    if (!message.trim()) {
      setError('Please enter a message.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'inquiries'), {
        shopId: shop.id,
        ownerId: shop.ownerId || shop.id,
        customerId: currentUser.uid,
        customerEmail: currentUser.email || 'Customer',
        message: message.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      setSuccess(true);
      setMessage('');
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error sending inquiry:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} id="inquiry-modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={20} color="var(--color-primary)" />
              Send Inquiry to {shop.shopName}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
              Have questions about items, custom orders, or availability? Drop a message directly to the shop.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} id="close-inquiry-modal-btn">
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="inquiry-success-box" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <CheckCircle size={44} color="var(--color-success)" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ color: 'var(--color-text)', margin: '0 0 0.5rem', fontWeight: 700 }}>Inquiry Sent Successfully!</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              The shop owner will review your message shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div
                id="inquiry-error-box"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  background: 'var(--color-danger-light, #fee2e2)',
                  border: '1px solid var(--color-danger-border, #fca5a5)',
                  color: 'var(--color-danger, #dc2626)',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <span>{error}</span>
                {error.includes('log in') && (
                  <Link
                    to="/login"
                    className="btn btn-primary"
                    id="inquiry-error-login-btn"
                    style={{ textDecoration: 'none', padding: '0.35rem 0.85rem', fontSize: '0.85rem' }}
                  >
                    Login
                  </Link>
                )}
              </div>
            )}

            {!currentUser && !error && (
              <div
                id="inquiry-login-prompt"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  background: 'var(--color-surface-subtle, #f8fafc)',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
                  Please log in to send a message
                </span>
                <Link
                  to="/login"
                  className="btn btn-primary"
                  id="inquiry-login-btn"
                  style={{ textDecoration: 'none', padding: '0.35rem 0.85rem', fontSize: '0.85rem' }}
                >
                  Login
                </Link>
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label
                htmlFor="inquiry-message-input"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  marginBottom: '0.35rem',
                  display: 'block',
                }}
              >
                Your Message <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <textarea
                className="form-textarea"
                rows="4"
                placeholder="Ask about product availability, sizes, pricing, or custom requests…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required={Boolean(currentUser)}
                id="inquiry-message-input"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || (Boolean(currentUser) && !message.trim())}
                id="submit-inquiry-btn"
              >
                {submitting ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ShopInquiryModal;
