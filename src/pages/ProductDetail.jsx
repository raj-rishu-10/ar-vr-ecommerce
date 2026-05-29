import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useProductStore from '../store/productStore';
import useCartStore from '../store/cartStore';
import useSceneStore from '../store/sceneStore';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useProductStore((s) => s.getProductById(Number(id)));
  const addItem = useCartStore((s) => s.addItem);
  const addObject = useSceneStore((s) => s.addObject);
  const [selectedColor, setSelectedColor] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  if (!product) {
    return (
      <div className="container py-5 text-center">
        <div className="empty-state">
          <p style={{ fontSize: '3rem' }}>🔍</p>
          <h3>Product not found</h3>
          <Link to="/products" className="btn btn-aura mt-3">Browse Products</Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleViewInAR = () => {
    addObject(product);
    navigate('/ar');
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ minHeight: '100vh' }}>
      <div className="container py-5">
        {/* Breadcrumb */}
        <nav className="mb-4" style={{ fontSize: '0.85rem' }}>
          <Link to="/" className="footer-link d-inline" style={{ marginBottom: 0 }}>Home</Link>
          <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>/</span>
          <Link to="/products" className="footer-link d-inline" style={{ marginBottom: 0 }}>Shop</Link>
          <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{product.name}</span>
        </nav>

        <div className="row g-5">
          {/* Image */}
          <div className="col-lg-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div style={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
                position: 'relative',
              }}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={{ width: '100%', height: '450px', objectFit: 'cover', display: 'block' }}
                />
                {product.badge && (
                  <span className="product-badge" style={{ top: 16, left: 16 }}>{product.badge}</span>
                )}
                {discount > 0 && (
                  <span className="product-badge" style={{ top: 16, right: 16, left: 'auto', background: 'var(--danger)' }}>
                    -{discount}%
                  </span>
                )}
              </div>

              {/* AR Preview Hint */}
              <div className="mt-3 p-3" style={{
                background: 'rgba(108,92,231,0.08)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <span style={{ fontSize: '1.5rem' }}>📱</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>AR Preview Available</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Place this product in your room using augmented reality
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Details */}
          <div className="col-lg-6">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="product-category" style={{ fontSize: '0.8rem' }}>{product.category}</span>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '2rem',
                marginTop: '0.25rem',
                marginBottom: '0.75rem',
              }}>
                {product.name}
              </h1>

              {/* Rating */}
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="product-rating" style={{ fontSize: '1rem' }}>
                  {'★'.repeat(Math.floor(product.rating))}{'☆'.repeat(5 - Math.floor(product.rating))}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {product.rating} ({product.reviews} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="d-flex align-items-baseline gap-3 mb-4">
                <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                  ${product.price.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
                {discount > 0 && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>
                    Save ${(product.originalPrice - product.price).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Description */}
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                {product.description}
              </p>

              {/* Colors */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-4">
                  <label className="form-label-aura mb-2">Color</label>
                  <div className="d-flex gap-2">
                    {product.colors.map((color, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedColor(i)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: color,
                          border: selectedColor === i ? '3px solid var(--accent)' : '2px solid var(--border-subtle)',
                          cursor: 'pointer',
                          transition: 'var(--transition)',
                          boxShadow: selectedColor === i ? 'var(--shadow-glow)' : 'none',
                        }}
                        aria-label={`Color ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Dimensions */}
              <div className="mb-4">
                <label className="form-label-aura mb-2">Dimensions</label>
                <div className="d-flex gap-3">
                  {[
                    ['W', product.dimensions.width],
                    ['H', product.dimensions.height],
                    ['D', product.dimensions.depth],
                  ].map(([label, val]) => (
                    <div key={label} className="text-center px-3 py-2" style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      minWidth: 70,
                    }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{val} cm</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex flex-column gap-3">
                <button
                  className="btn btn-aura w-100 py-3"
                  style={{ fontSize: '1.05rem' }}
                  onClick={handleViewInAR}
                  id="view-in-ar-btn"
                >
                  📱 View In AR
                </button>

                <button
                  className={`btn w-100 py-3 ${addedToCart ? 'btn-ar' : 'btn-aura-outline'}`}
                  style={{ fontSize: '1.05rem' }}
                  onClick={handleAddToCart}
                  id="add-to-cart-btn"
                >
                  {addedToCart ? '✓ Added to Cart' : '🛒 Add to Cart'}
                </button>
              </div>

              {/* Shipping Info */}
              <div className="mt-4 p-3" style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}>
                {[
                  ['🚚', 'Free shipping on orders over $500'],
                  ['↩️', '30-day free returns'],
                  ['🛡️', '2-year warranty included'],
                ].map(([icon, text]) => (
                  <div key={text} className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
