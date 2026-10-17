import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, MapPin, Package, ArrowRight, ImageOff } from 'lucide-react';

function BrowseProductCard({ product, shopName, shopId, distance }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isInStock =
    product.stockStatus === 'in_stock' || product.inStock === true;

  const formattedPrice =
    typeof product.price === 'number'
      ? `₹${product.price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
      : `₹${product.price}`;

  const hasImage = product.imageUrl && !imageError;

  function formatDistance(km) {
    if (km === null || km === undefined) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
  }

  return (
    <div className="browse-card" id={`browse-card-${product.id}`}>
      <div className="browse-card-media">
        {hasImage ? (
          <>
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
            <Package size={28} className="browse-card-no-image-icon" />
            <span className="browse-card-no-image-text">No photo</span>
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
        <div className="browse-card-category-row">
          <span className="browse-card-category">{product.category || 'General'}</span>
          {distance !== null && distance !== undefined && (
            <span className="browse-card-distance">
              <MapPin size={12} />
              {formatDistance(distance)} away
            </span>
          )}
        </div>

        <h3 className="browse-card-name" title={product.name}>
          {product.name}
        </h3>

        <div className="browse-card-price">{formattedPrice}</div>

        <div className="browse-card-footer">
          {shopName && (
            <Link
              to={`/shop/${shopId}`}
              className="browse-card-shop"
              title={`Visit ${shopName}`}
            >
              <Store size={14} className="shop-icon" />
              <span className="shop-name-text">{shopName}</span>
            </Link>
          )}

          <Link
            to={`/shop/${shopId}`}
            className="browse-card-view-btn"
            title="View product at store"
          >
            <span>View</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default BrowseProductCard;
