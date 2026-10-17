import { useState, useRef } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  Plus,
  Pencil,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
  Sparkles,
  Link as LinkIcon,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
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

/**
 * Built-in high-quality preset photos that do NOT require Cloudinary storage.
 * Denim Jacket and Cycle are served directly as local static assets!
 */
export const PRESET_IMAGES = [
  {
    id: 'denim-jacket',
    label: 'Denim Jacket',
    category: 'Clothing',
    url: '/products/denim-jacket.jpg',
    defaultName: 'Classic Denim Jacket',
    badge: 'Local Photo',
  },
  {
    id: 'cycle',
    label: 'Modern Cycle',
    category: 'Cycle',
    url: '/products/cycle.jpg',
    defaultName: 'Modern Road Cycle',
    badge: 'Local Photo',
  },
  {
    id: 'leather-jacket',
    label: 'Leather Jacket',
    category: 'Clothing',
    url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
    defaultName: 'Premium Leather Jacket',
    badge: 'Catalog',
  },
  {
    id: 'casual-shirt',
    label: 'Casual Shirt',
    category: 'Clothing',
    url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80',
    defaultName: 'Casual Cotton Shirt',
    badge: 'Catalog',
  },
  {
    id: 'jeans',
    label: 'Denim Jeans',
    category: 'Clothing',
    url: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80',
    defaultName: 'Slim Fit Jeans',
    badge: 'Catalog',
  },
];

/**
 * Compresses an image client-side to a compact base64 JPEG data URL.
 * Used as a 100% resilient fallback if Cloudinary is not configured or offline.
 */
function compressImageToDataUrl(file, maxWidth = 800, maxHeight = 800, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

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
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [imageSourceTab, setImageSourceTab] = useState('preset'); // 'preset' | 'upload' | 'url'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  function handleSelectPreset(preset) {
    setImageFile(null);
    setImagePreview(preset.url);
    setError('');

    // Conveniently auto-fill empty name & category from the selected preset
    if (!name.trim()) {
      setName(preset.defaultName);
    }
    if (!productToEdit && preset.category) {
      setCategory(preset.category);
    }
  }

  function handleApplyCustomUrl(e) {
    if (e) e.preventDefault();
    const trimmed = customUrlInput.trim();
    if (!trimmed) {
      setError('Please paste a valid image URL');
      return;
    }
    setImageFile(null);
    setImagePreview(trimmed);
    setError('');
  }

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
    setCustomUrlInput('');
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
      setError('Please pick a preset photo, enter an image URL, or upload a photo.');
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl = imagePreview || productToEdit?.imageUrl || '';

      // If a local image file was chosen from disk:
      if (imageFile) {
        try {
          // Attempt Cloudinary upload first
          const uploadResult = await uploadToCloudinary(imageFile);
          finalImageUrl = uploadResult.secure_url;
        } catch (cloudErr) {
          console.warn(
            'Cloudinary storage unavailable or unconfigured. Gracefully falling back to compressed local storage:',
            cloudErr
          );
          // Seamless fallback: compress image client-side to base64 so product saving is never blocked
          finalImageUrl = await compressImageToDataUrl(imageFile);
        }
      }

      if (!finalImageUrl) {
        throw new Error('Image URL could not be resolved. Please select or upload a photo.');
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
            placeholder="e.g. Classic Denim Jacket / Modern Cycle / Casual Shirt"
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
              placeholder="1499"
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

        {/* Photo Selection (No Cloudinary Dependency Required) */}
        <div className="form-group">
          <div className="photo-selection-header">
            <label style={{ margin: 0 }}>
              Product Photo {isEditing ? '(Optional to replace)' : '*'}
            </label>
            <span className="photo-selection-sub">
              Cloudinary not required • Local & preset photos supported
            </span>
          </div>

          {/* Source Tabs */}
          <div className="image-source-tabs" role="tablist">
            <button
              type="button"
              className={`image-tab-btn ${imageSourceTab === 'preset' ? 'active' : ''}`}
              onClick={() => setImageSourceTab('preset')}
              disabled={loading}
            >
              <Sparkles size={14} />
              <span>Presets (Denim & Cycle)</span>
            </button>
            <button
              type="button"
              className={`image-tab-btn ${imageSourceTab === 'upload' ? 'active' : ''}`}
              onClick={() => setImageSourceTab('upload')}
              disabled={loading}
            >
              <UploadCloud size={14} />
              <span>Upload File</span>
            </button>
            <button
              type="button"
              className={`image-tab-btn ${imageSourceTab === 'url' ? 'active' : ''}`}
              onClick={() => setImageSourceTab('url')}
              disabled={loading}
            >
              <LinkIcon size={14} />
              <span>Image URL</span>
            </button>
          </div>

          {/* Active Preview */}
          {imagePreview && (
            <div className="image-preview-container">
              <img
                src={imagePreview}
                alt="Product Preview"
                className="image-preview"
              />
              <div className="image-preview-overlay">
                <span className="image-preview-badge">
                  {imageFile
                    ? '📁 Local Upload'
                    : imagePreview.startsWith('/products/')
                    ? '✨ Built-in Local Asset'
                    : '🌐 External Link'}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            </div>
          )}

          {/* TAB 1: Preset Grid */}
          {imageSourceTab === 'preset' && (
            <div className="preset-photos-container">
              <div className="preset-photos-help">
                Click any photo to select it instantly (stored locally in the app, no Cloudinary needed):
              </div>
              <div className="preset-photos-grid">
                {PRESET_IMAGES.map((preset) => {
                  const isSelected = imagePreview === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`preset-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectPreset(preset)}
                      disabled={loading}
                    >
                      <div className="preset-thumb-wrapper">
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="preset-thumb-img"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="preset-selected-badge">
                            <Check size={14} color="#ffffff" strokeWidth={3} />
                          </div>
                        )}
                        <span className="preset-tag-pill">{preset.badge}</span>
                      </div>
                      <div className="preset-card-title">{preset.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: File Upload (Cloudinary + Local Fallback) */}
          {imageSourceTab === 'upload' && !imagePreview && (
            <div
              className="file-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={28} className="dropzone-icon" />
              <span className="dropzone-text">Click to choose a product photo</span>
              <span className="dropzone-subtext">
                PNG, JPG, WEBP • Automatically stored even without Cloudinary
              </span>
            </div>
          )}

          {/* TAB 3: Direct URL */}
          {imageSourceTab === 'url' && (
            <div className="url-input-container">
              <div className="url-input-row">
                <input
                  type="url"
                  className="form-input"
                  placeholder="Paste image URL (e.g. /products/denim-jacket.jpg or https://...)"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="btn btn-secondary url-apply-btn"
                  onClick={handleApplyCustomUrl}
                  disabled={loading || !customUrlInput.trim()}
                >
                  Apply
                </button>
              </div>
              <div className="url-quick-hints">
                <span>Quick local links:</span>
                <button
                  type="button"
                  className="url-hint-pill"
                  onClick={() => {
                    setCustomUrlInput('/products/denim-jacket.jpg');
                    setImagePreview('/products/denim-jacket.jpg');
                  }}
                >
                  /products/denim-jacket.jpg
                </button>
                <button
                  type="button"
                  className="url-hint-pill"
                  onClick={() => {
                    setCustomUrlInput('/products/cycle.jpg');
                    setImagePreview('/products/cycle.jpg');
                  }}
                >
                  /products/cycle.jpg
                </button>
              </div>
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
                {imageFile ? 'Saving Photo…' : 'Saving Product…'}
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
