import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

function ShopInquiryModal({ isOpen, onClose, shop }) {
  const [message, setMessage] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { currentUser } = useAuth();

  if (!isOpen || !shop) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const customerId = currentUser ? currentUser.uid : 'guest';

      await addDoc(collection(db, 'inquiries'), {
        shopId: shop.id,
        customerId,
        customerEmail: currentUser?.email || customerEmail || 'Anonymous Customer',
        message: message.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      setSuccess(true);
      setMessage('');
      setCustomerEmail('');
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.3rem', margin: 0, color: '#f8fafc' }}>
              ✉️ Send Inquiry to {shop.shopName}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
              Have questions about products or custom orders? Drop a message below.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} id="close-inquiry-modal-btn">
            ✕
          </button>
        </div>

        {success ? (
          <div className="inquiry-success-box" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
            <h3 style={{ color: '#10b981', margin: '0 0 0.5rem' }}>Inquiry Sent!</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              The shop owner will review your message shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {error && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.88rem' }}>
                {error}
              </div>
            )}

            {!currentUser && (
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem', display: 'block' }}>
                  Your Email / Contact Info (optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. customer@example.com or phone number"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  id="inquiry-customer-email"
                />
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem', display: 'block' }}>
                Your Message <span style={{ color: '#f59e0b' }}>*</span>
              </label>
              <textarea
                className="form-textarea"
                rows="4"
                placeholder="Ask about product availability, sizes, pricing, or custom requests…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                id="inquiry-message-input"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="dash-btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="auth-btn auth-btn-primary"
                style={{ width: 'auto', padding: '0.6rem 1.4rem' }}
                disabled={submitting || !message.trim()}
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
