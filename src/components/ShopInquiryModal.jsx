import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { Mail, CheckCircle, X } from 'lucide-react';
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
              <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', background: 'var(--color-danger-light)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', fontSize: '0.88rem' }}>
                {error}
              </div>
            )}

            {!currentUser && (
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem', display: 'block' }}>
                  Your Contact Information (email or phone)
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
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem', display: 'block' }}>
                Your Message <span style={{ color: 'var(--color-primary)' }}>*</span>
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
                className="btn btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
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
