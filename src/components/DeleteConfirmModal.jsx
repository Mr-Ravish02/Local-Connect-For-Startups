import { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
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
          <h2>🗑️ Delete Product</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {error && <div className="auth-error modal-error-banner">{error}</div>}

        <div className="delete-modal-body">
          <p>
            Are you sure you want to delete <strong>&quot;{product.name}&quot;</strong>?
          </p>
          <p className="delete-warning-text">
            This action cannot be undone. This product will be permanently removed from your catalog.
          </p>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="dash-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="auth-btn btn-danger modal-submit-btn"
            onClick={handleConfirmDelete}
            disabled={loading}
            id="confirm-delete-product-btn"
          >
            {loading ? 'Deleting…' : 'Yes, Delete Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
