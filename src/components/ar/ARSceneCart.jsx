import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useSceneStore from '../../store/sceneStore';
import useCartStore from '../../store/cartStore';
import useProductStore from '../../store/productStore';
import './ARSceneCart.scss';

export default function ARSceneCart({ onClose }) {
  const { getSceneCartItems, getSceneCartTotal, currentScene, updateObjectQuantity, removeObject } = useSceneStore();
  const { addItem, openCart } = useCartStore();
  const getProductById = useProductStore((s) => s.getProductById);
  const navigate = useNavigate();

  const items = getSceneCartItems();
  const total = getSceneCartTotal();

  const handleBuyEverything = () => {
    items.forEach((item) => {
      const product = getProductById(item.productId);
      if (product) {
        for (let i = 0; i < item.quantity; i++) {
          addItem(product);
        }
      }
    });
    onClose();
    navigate('/checkout');
  };

  const handleRemoveItem = (uids) => {
    uids.forEach((uid) => removeObject(uid));
  };

  return (
    <AnimatePresence>
      <motion.div
        className="scene-cart-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="scene-cart-modal"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="scene-cart-handle" />

          {/* Header */}
          <div className="scene-cart-header">
            <div>
              <h5 className="scene-cart-title">
                🛒 Scene Cart
              </h5>
              <p className="scene-cart-subtitle">
                {currentScene.objects.length} item{currentScene.objects.length !== 1 ? 's' : ''} placed in scene
              </p>
            </div>
            <button onClick={onClose} className="scene-cart-close">✕</button>
          </div>

          {/* Items */}
          <div className="scene-cart-body">
            {items.length === 0 ? (
              <div className="scene-cart-empty">
                <p className="fs-3">🛋</p>
                <p>No products in your scene yet.<br />Tap ➕ to add products.</p>
              </div>
            ) : (
              items.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="scene-cart-item"
                >
                  {item.image && (
                    <img src={item.image} alt={item.name} className="scene-cart-item-img" />
                  )}
                  <div className="scene-cart-item-info">
                    <div className="scene-cart-item-name">{item.name}</div>
                    <div className="scene-cart-item-price">
                      ${((item.price || 0) * item.quantity).toFixed(2)}
                    </div>
                  </div>

                  {/* Qty Controls */}
                  <div className="scene-cart-qty-ctrl">
                    <button
                      className="scene-cart-qty-btn"
                      onClick={() => item.uids.forEach((uid) => updateObjectQuantity(uid, 
                        (useSceneStore.getState().currentScene.objects.find(o => o.uid === uid)?.quantity || 1) - 1
                      ))}
                    >−</button>
                    <span className="scene-cart-qty-val">{item.quantity}</span>
                    <button
                      className="scene-cart-qty-btn"
                      onClick={() => item.uids.forEach((uid) => updateObjectQuantity(uid,
                        (useSceneStore.getState().currentScene.objects.find(o => o.uid === uid)?.quantity || 1) + 1
                      ))}
                    >+</button>
                  </div>

                  <button className="scene-cart-del-btn" onClick={() => handleRemoveItem(item.uids)}>🗑</button>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="scene-cart-footer">
              <div className="scene-cart-total-row">
                <span className="scene-cart-total-label">
                  Total ({items.reduce((s, i) => s + i.quantity, 0)} items)
                </span>
                <span className="scene-cart-total-val">
                  ${total.toFixed(2)}
                </span>
              </div>
              <motion.button
                className="btn btn-aura w-100 scene-cart-buy-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBuyEverything}
                id="ar-buy-everything-btn"
              >
                🛍 Buy Everything — ${total.toFixed(2)}
              </motion.button>
              <p className="scene-cart-footer-note">
                All items added to cart · Proceed to checkout
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
