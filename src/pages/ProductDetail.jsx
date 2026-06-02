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
          <p  className="extracted-ui-80">🔍</p>
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
    navigate('/ar', { state: { product } });
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}  className="extracted-ui-81">
      <div className="container py-5">
        {/* Breadcrumb */}
        <nav className="extracted-ui-82 mb-4" >
          <Link to="/" className="extracted-ui-83 footer-link d-inline" >Home</Link>
          <span  className="extracted-ui-36">/</span>
          <Link to="/products" className="extracted-ui-84 footer-link d-inline" >Shop</Link>
          <span  className="extracted-ui-37">/</span>
          <span  className="extracted-ui-38">{product.name}</span>
        </nav>

        <div className="row g-5">
          {/* Image */}
          <div className="col-lg-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div  className="extracted-ui-85">
                <img
                  src={product.image}
                  alt={product.name}
                  
                 className="extracted-ui-86"/>
                {product.badge && (
                  <span className="extracted-ui-87 product-badge" >{product.badge}</span>
                )}
                {discount > 0 && (
                  <span className="extracted-ui-88 product-badge" >
                    -{discount}%
                  </span>
                )}
              </div>

              {/* AR Preview Hint */}
              <div className="extracted-ui-89 mt-3 p-3" >
                <span  className="extracted-ui-90">📱</span>
                <div>
                  <div  className="extracted-ui-91">AR Preview Available</div>
                  <div  className="extracted-ui-39">
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
              <span className="extracted-ui-92 product-category" >{product.category}</span>
              <h1  className="extracted-ui-93">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="extracted-ui-94 product-rating" >
                  {'★'.repeat(Math.floor(product.rating))}{'☆'.repeat(5 - Math.floor(product.rating))}
                </span>
                <span  className="extracted-ui-40">
                  {product.rating} ({product.reviews} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="d-flex align-items-baseline gap-3 mb-4">
                <span  className="extracted-ui-95">
                  ${product.price.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <span  className="extracted-ui-41">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
                {discount > 0 && (
                  <span  className="extracted-ui-42">
                    Save ${(product.originalPrice - product.price).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Description */}
              <p  className="extracted-ui-43">
                {product.description}
              </p>

              {/* Colors */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-4">
                  <label className="form-label-aura mb-2">Color</label>
                  <style>
                    {product.colors.map(c => `.bg-${c.replace('#', '')} { background-color: ${c} !important; }`).join('\n')}
                  </style>
                  <div className="d-flex gap-2">
                    {product.colors.map((color, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedColor(i)}
                        className={`color-swatch-btn bg-${color.replace('#', '')} ${selectedColor === i ? 'active' : ''}`}
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
                    <div key={label} className="extracted-ui-96 text-center px-3 py-2" >
                      <div  className="extracted-ui-44">{label}</div>
                      <div  className="extracted-ui-97">{val} cm</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex flex-column gap-3">
                <button
                  className="extracted-ui-98 btn btn-aura w-100 py-3"
                  
                  onClick={handleViewInAR}
                  id="view-in-ar-btn"
                >
                  📱 View In AR
                </button>

                <button
                  className={`extracted-ui-99 btn w-100 py-3 ${addedToCart ? 'btn-ar' : 'btn-aura-outline'}`}
                  
                  onClick={handleAddToCart}
                  id="add-to-cart-btn"
                >
                  {addedToCart ? '✓ Added to Cart' : '🛒 Add to Cart'}
                </button>
              </div>

              {/* Shipping Info */}
              <div className="extracted-ui-100 mt-4 p-3" >
                {[
                  ['🚚', 'Free shipping on orders over $500'],
                  ['↩️', '30-day free returns'],
                  ['🛡️', '2-year warranty included'],
                ].map(([icon, text]) => (
                  <div key={text} className="extracted-ui-45 d-flex align-items-center gap-2 mb-2" >
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
