import { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { db } from '../firebase/config';

function DeleteConfirmModal({ isOpen, onClose, product, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !product) return null;

  async function handleConfirmDelete() {
    setLoading(true);
    setError('');
    try {
      await deleteDoc(doc(db, 'products', product.id));
      if (onDeleted) onDeleted(product.id);
      onClose();
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err.message || 'Failed to delete product.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content modal-content-sm"
        id="delete-confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trash2 size={20} color="var(--color-danger)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>Delete Product</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {error && <div className="auth-error modal-error-banner">{error}</div>}

        <div className="delete-modal-body">
          <p style={{ color: 'var(--color-text)', fontSize: '0.95rem' }}>
            Are you sure you want to delete <strong>&quot;{product.name}&quot;</strong>?
          </p>
          <p className="delete-warning-text" style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            This action cannot be undone. This product will be permanently removed from your storefront inventory.
          </p>
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            style={{ background: 'var(--color-danger)', color: '#ffffff', borderColor: 'var(--color-danger)' }}
            onClick={handleConfirmDelete}
            disabled={loading}
            id="confirm-delete-product-btn"
          >
            {loading ? 'Deleting…' : 'Delete Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
