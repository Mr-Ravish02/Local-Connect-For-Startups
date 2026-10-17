import { useState, useRef } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Pencil, RefreshCw, Trash2, UploadCloud, X } from 'lucide-react';
import { db } from '../firebase/config';
import { uploadToCloudinary } from '../utils/cloudinary';

const DEFAULT_CATEGORIES = [
  'Clothing',
  'Cycle',
  'Accessories',
  'Apparel',
  'Footwear',
  'Helmets & Gear',
  'Parts & Components',
  'Maintenance',
  'Other',
];

function ProductForm({ shopId, productToEdit, shopCategory, onClose, onSaved }) {
  const isEditing = Boolean(productToEdit);

  const [name, setName] = useState(() => productToEdit?.name || '');
  const [price, setPrice] = useState(() =>
    productToEdit?.price !== undefined ? String(productToEdit.price) : ''
  );
  const [category, setCategory] = useState(
    () => productToEdit?.category || shopCategory || 'Clothing'
  );
  const [stockStatus, setStockStatus] = useState(
    () => productToEdit?.stockStatus || 'in_stock'
  );
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    () => productToEdit?.imageUrl || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (PNG, JPG, WEBP, etc.)');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Please enter a valid price (0 or greater).');
      return;
    }

    if (!category.trim()) {
      setError('Please select or specify a category.');
      return;
    }

    if (!isEditing && !imageFile && !imagePreview) {
      setError('Please upload a product photo.');
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl = productToEdit?.imageUrl || '';

      // If a new image file was selected, upload it to Cloudinary
      if (imageFile) {
        const uploadResult = await uploadToCloudinary(imageFile);
        finalImageUrl = uploadResult.secure_url;
      }

      if (!finalImageUrl) {
        throw new Error('Image URL could not be resolved. Please upload a photo.');
      }

      const productData = {
        name: name.trim(),
        price: parsedPrice,
        category: category.trim(),
        stockStatus, // 'in_stock' | 'out_of_stock'
        inStock: stockStatus === 'in_stock',
        imageUrl: finalImageUrl,
        shopId,
        updatedAt: serverTimestamp(),
      };

      if (isEditing) {
        const productRef = doc(db, 'products', productToEdit.id);
        await updateDoc(productRef, productData);
      } else {
        productData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'products'), productData);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.message || 'Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-content"
      id="product-form-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isEditing ? <Pencil size={20} color="var(--color-primary)" /> : <Plus size={20} color="var(--color-primary)" />}
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </h2>
        </div>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={16} />
        </button>
      </div>

      {error && <div className="auth-error modal-error-banner">{error}</div>}

      <form onSubmit={handleSubmit} className="product-form">
        {/* Product Name */}
        <div className="form-group">
          <label htmlFor="product-name">Product Name *</label>
          <input
            id="product-name"
            className="form-input"
            type="text"
            placeholder="e.g. Classic Cotton T-Shirt / Road Bike 700c"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {/* Price and Category (Two columns) */}
        <div className="form-row">
          <div className="form-group form-col">
            <label htmlFor="product-price">Price (₹) *</label>
            <input
              id="product-price"
              className="form-input"
              type="number"
              step="0.01"
              min="0"
              placeholder="799"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group form-col">
            <label htmlFor="product-category">Category *</label>
            <select
              id="product-category"
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              disabled={loading}
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stock Status */}
        <div className="form-group">
          <label>Stock Status *</label>
          <div className="stock-toggle-group">
            <button
              type="button"
              className={`stock-toggle-btn ${
                stockStatus === 'in_stock' ? 'active in-stock' : ''
              }`}
              onClick={() => setStockStatus('in_stock')}
              disabled={loading}
              id="stock-status-in-stock"
            >
              <span className="stock-indicator in-stock"></span>
              In Stock
            </button>
            <button
              type="button"
              className={`stock-toggle-btn ${
                stockStatus === 'out_of_stock' ? 'active out-of-stock' : ''
              }`}
              onClick={() => setStockStatus('out_of_stock')}
              disabled={loading}
              id="stock-status-out-of-stock"
            >
              <span className="stock-indicator out-of-stock"></span>
              Out of Stock
            </button>
          </div>
        </div>

        {/* Photo Upload with Cloudinary */}
        <div className="form-group">
          <label>
            Product Photo {isEditing ? '(Optional to replace)' : '*'}
          </label>

          {imagePreview ? (
            <div className="image-preview-container">
              <img
                src={imagePreview}
                alt="Product Preview"
                className="image-preview"
              />
              <div className="image-preview-overlay">
                <button
                  type="button"
                  className="img-btn img-btn-change"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <RefreshCw size={14} /> Replace
                </button>
                <button
                  type="button"
                  className="img-btn img-btn-remove"
                  onClick={handleRemoveImage}
                  disabled={loading}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              className="file-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={28} className="dropzone-icon" />
              <span className="dropzone-text">Click to choose a product photo</span>
              <span className="dropzone-subtext">PNG, JPG, WEBP up to 10MB</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            id="product-image-file"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={loading}
          />
        </div>

        {/* Actions */}
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            id="save-product-btn"
          >
            {loading ? (
              <span className="btn-loading-content">
                <span className="btn-spinner"></span>
                {imageFile ? 'Uploading…' : 'Saving…'}
              </span>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Add Product'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProductFormModal({
  isOpen,
  onClose,
  shopId,
  productToEdit,
  onSaved,
  shopCategory,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <ProductForm
        key={productToEdit ? productToEdit.id : 'new-product'}
        shopId={shopId}
        productToEdit={productToEdit}
        shopCategory={shopCategory}
        onClose={onClose}
        onSaved={onSaved}
      />
    </div>
  );
}

export default ProductFormModal;
