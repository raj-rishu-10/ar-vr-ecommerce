import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import useCartStore from '../../store/cartStore';

export default function ProductCard({ product, index = 0 }) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <motion.div
      className="product-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
    >
      <Link to={`/product/${product.id}`} className="text-decoration-none">
        <div className="product-card-img-wrapper">
          <img src={product.image} alt={product.name} className="product-card-img" loading="lazy" />
          {product.badge && <span className="product-badge">{product.badge}</span>}
        </div>
      </Link>
      <div className="product-card-body">
        <span className="product-category">{product.category}</span>
        <Link to={`/product/${product.id}`} className="text-decoration-none">
          <h5 className="product-name">{product.name}</h5>
        </Link>
        <div className="d-flex align-items-center mb-2">
          <span className="product-rating">
            {'★'.repeat(Math.floor(product.rating))}{'☆'.repeat(5 - Math.floor(product.rating))}
          </span>
          <span className="product-reviews">({product.reviews})</span>
        </div>
        <div className="mb-2">
          <span className="product-price">${product.price.toFixed(2)}</span>
          {product.originalPrice && (
            <span className="product-original-price">${product.originalPrice.toFixed(2)}</span>
          )}
        </div>
        <div className="product-actions">
          <button className="btn btn-ar flex-grow-1" onClick={() => addItem(product)} id={`add-cart-${product.id}`}>
            🛒 Add to Cart
          </button>
          <Link to={`/product/${product.id}`} className="btn btn-aura-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            📱 View in AR
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
