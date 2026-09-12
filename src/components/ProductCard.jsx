function ProductCard({ product, onEdit, onDelete }) {
  const isInStock = product.stockStatus === 'in_stock' || product.inStock === true;

  const formattedPrice = typeof product.price === 'number' 
    ? `$${product.price.toFixed(2)}`
    : `$${product.price}`;

  return (
    <div className="product-card" id={`product-card-${product.id}`}>
      <div className="product-card-media">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="product-card-img"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&auto=format&fit=crop&q=60';
          }}
        />
        <div className="product-card-badges">
          <span className={`stock-badge ${isInStock ? 'in-stock' : 'out-of-stock'}`}>
            <span className="badge-dot"></span>
            {isInStock ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
      </div>

      <div className="product-card-body">
        <div className="product-card-category">{product.category}</div>
        <h3 className="product-card-name" title={product.name}>
          {product.name}
        </h3>
        <div className="product-card-price">{formattedPrice}</div>
      </div>

      <div className="product-card-footer">
        <button
          className="card-action-btn edit-btn"
          onClick={() => onEdit(product)}
          id={`edit-product-btn-${product.id}`}
          title="Edit product"
        >
          ✏️ Edit
        </button>
        <button
          className="card-action-btn delete-btn"
          onClick={() => onDelete(product)}
          id={`delete-product-btn-${product.id}`}
          title="Delete product"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
}

export default ProductCard;
