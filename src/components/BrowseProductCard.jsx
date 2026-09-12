import { useState } from 'react';
import { Link } from 'react-router-dom';

function BrowseProductCard({ product, shopName, shopId }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isInStock =
    product.stockStatus === 'in_stock' || product.inStock === true;

  const formattedPrice =
    typeof product.price === 'number'
      ? `₹${product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `₹${product.price}`;

  const hasImage = product.imageUrl && !imageError;

  return (
    <div className="browse-card" id={`browse-card-${product.id}`}>
      <div className="browse-card-media">
        {hasImage ? (
          <>
            {/* Shimmer placeholder while loading */}
            {!imageLoaded && <div className="browse-card-shimmer" />}
            <img
              src={product.imageUrl}
              alt={product.name}
              className={`browse-card-img ${imageLoaded ? 'loaded' : ''}`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          </>
        ) : (
          <div className="browse-card-no-image">
            <span className="browse-card-no-image-icon">📷</span>
            <span className="browse-card-no-image-text">No image</span>
          </div>
        )}
        <div className="browse-card-badges">
          <span
            className={`stock-badge ${isInStock ? 'in-stock' : 'out-of-stock'}`}
          >
            <span className="badge-dot"></span>
            {isInStock ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
      </div>

      <div className="browse-card-body">
        <div className="browse-card-category">{product.category}</div>
        <h3 className="browse-card-name" title={product.name}>
          {product.name}
        </h3>
        <div className="browse-card-price">{formattedPrice}</div>
        {shopName && (
          <Link
            to={`/shop/${shopId}`}
            className="browse-card-shop"
            title={`Visit ${shopName}`}
          >
            🏪 {shopName}
          </Link>
        )}
      </div>
    </div>
  );
}

export default BrowseProductCard;
