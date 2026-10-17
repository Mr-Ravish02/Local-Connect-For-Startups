import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  MapPin,
  Package,
  ArrowRight,
  Sparkles,
  Tag,
  CheckCircle2,
  AlertCircle,
  Navigation,
} from 'lucide-react';

function ShopOfferingCard({ offering, isNearest, isBestPrice, formatDistance }) {
  const { product, shop, distance } = offering;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isInStock =
    product.stockStatus === 'in_stock' || product.inStock === true;

  const formattedPrice =
    typeof product.price === 'number'
      ? `₹${product.price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
      : `₹${product.price || 'N/A'}`;

  const hasImage = product.imageUrl && !imageError;
  const shopName = shop?.shopName || shop?.name || 'Local Shop';
  const shopCategory = shop?.category || product.category || 'General';
  const shopAddress = shop?.address || 'Local area';
  const shopId = product.shopId || shop?.id;

  return (
    <div
      className={`offering-card ${isNearest ? 'is-nearest-card' : ''}`}
      id={`offering-${product.id}`}
    >
      {/* Nearest Shop banner / ribbon */}
      {isNearest && (
        <div className="nearest-shop-banner" id={`nearest-banner-${product.id}`}>
          <Sparkles size={14} className="nearest-icon" />
          <span>Nearest Shop to You</span>
          {distance !== null && (
            <span className="nearest-dist-pill">({formatDistance(distance)})</span>
          )}
        </div>
      )}

      <div className="offering-card-inner">
        {/* Product Media Column */}
        <div className="offering-media">
          {hasImage ? (
            <>
              {!imageLoaded && <div className="offering-shimmer" />}
              <img
                src={product.imageUrl}
                alt={product.name}
                className={`offering-img ${imageLoaded ? 'loaded' : ''}`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </>
          ) : (
            <div className="offering-no-image">
              <Package size={26} className="offering-no-image-icon" />
              <span>No photo</span>
            </div>
          )}

          {/* Badges on image */}
          <div className="offering-floating-badges">
            <span
              className={`stock-badge ${isInStock ? 'in-stock' : 'out-of-stock'}`}
            >
              <span className="badge-dot" />
              {isInStock ? 'In Stock' : 'Out of Stock'}
            </span>
            {isBestPrice && (
              <span className="best-price-badge">
                <Tag size={11} />
                Best Price
              </span>
            )}
          </div>
        </div>

        {/* Content Column */}
        <div className="offering-content">
          {/* Header row: Product name & Price */}
          <div className="offering-header-row">
            <div>
              <div className="offering-product-category">{product.category || shopCategory}</div>
              <h4 className="offering-product-name" title={product.name}>
                {product.name}
              </h4>
            </div>
            <div className="offering-price-box">
              <div className="offering-price">{formattedPrice}</div>
            </div>
          </div>

          {/* Shop information block */}
          <div className="offering-shop-section">
            <div className="offering-shop-top">
              <Link
                to={`/shop/${shopId}`}
                className="offering-shop-title"
                title={`Visit ${shopName}`}
              >
                <Store size={15} className="shop-icon-store" />
                <span className="shop-title-text">{shopName}</span>
              </Link>
              <span className="offering-shop-category-tag">{shopCategory}</span>
            </div>

            <div className="offering-shop-address" title={shopAddress}>
              <MapPin size={13} className="address-icon" />
              <span className="address-text">{shopAddress}</span>
            </div>
          </div>

          {/* Footer row: Distance & Action link */}
          <div className="offering-footer">
            <div className="offering-distance-wrap">
              {distance !== null ? (
                <div className={`offering-distance ${isNearest ? 'nearest-dist' : ''}`}>
                  <Navigation size={13} className="distance-nav-icon" />
                  <span>
                    <strong>{formatDistance(distance)}</strong> away
                  </span>
                </div>
              ) : (
                <span className="offering-distance-unknown">
                  <MapPin size={12} />
                  Distance unavailable
                </span>
              )}
            </div>

            <Link
              to={`/shop/${shopId}`}
              className={`offering-view-btn ${isNearest ? 'btn-primary-action' : ''}`}
              title={`View at ${shopName}`}
            >
              <span>View in Shop</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductGroupCard({ group, formatDistance }) {
  const {
    displayName,
    category,
    offerings,
    shopsCount,
    minPrice,
    maxPrice,
    inStockCount,
    nearestDistance,
  } = group;

  const hasPriceRange =
    minPrice !== null && maxPrice !== null && minPrice !== maxPrice;
  const priceDisplay =
    minPrice !== null
      ? hasPriceRange
        ? `₹${minPrice.toLocaleString('en-IN')} – ₹${maxPrice.toLocaleString('en-IN')}`
        : `₹${minPrice.toLocaleString('en-IN')}`
      : null;

  return (
    <div
      className="product-group-card"
      id={`product-group-${group.key.replace(/\s+/g, '-')}`}
    >
      {/* Group Header Banner */}
      <div className="group-header">
        <div className="group-title-col">
          <div className="group-badge-row">
            <span className="group-category-pill">{category}</span>
            <span
              className="group-shops-badge"
              id={`group-shops-badge-${group.key.replace(/\s+/g, '-')}`}
            >
              <Store size={13} />
              Available at {shopsCount} shop{shopsCount !== 1 ? 's' : ''} nearby
            </span>
            {inStockCount > 0 ? (
              <span className="group-stock-summary in-stock">
                <CheckCircle2 size={12} />
                {inStockCount} in stock
              </span>
            ) : (
              <span className="group-stock-summary out-of-stock">
                <AlertCircle size={12} />
                Out of stock
              </span>
            )}
          </div>
          <h2 className="group-product-name">{displayName}</h2>
        </div>

        <div className="group-meta-col">
          {priceDisplay && (
            <div className="group-price-range">
              <span className="group-price-label">
                {hasPriceRange ? 'Price range' : 'Price'}
              </span>
              <span className="group-price-value">{priceDisplay}</span>
            </div>
          )}
          {nearestDistance !== null && (
            <div className="group-closest-hint">
              <Sparkles size={13} className="sparkle-icon" />
              <span>Closest: <strong>{formatDistance(nearestDistance)}</strong> away</span>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Subheader / Instructions */}
      <div className="group-compare-bar">
        <span className="compare-bar-label">
          Compare <strong>{shopsCount}</strong> shop{shopsCount !== 1 ? 's' : ''} selling this item (sorted by distance, closest first):
        </span>
      </div>

      {/* Offerings Grid */}
      <div className="group-offerings-grid">
        {offerings.map((offering, idx) => {
          // Offering 0 is the closest shop
          const isNearest = idx === 0 && offering.distance !== null;
          const isBestPrice =
            shopsCount > 1 &&
            hasPriceRange &&
            Number(offering.product.price) === minPrice;

          return (
            <ShopOfferingCard
              key={`${offering.product.id}-${offering.product.shopId}-${idx}`}
              offering={offering}
              isNearest={isNearest}
              isBestPrice={isBestPrice}
              formatDistance={formatDistance}
            />
          );
        })}
      </div>
    </div>
  );
}

export default ProductGroupCard;
