import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useSceneStore from '../../store/sceneStore';
import useCartStore from '../../store/cartStore';
import useProductStore from '../../store/productStore';

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
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1050,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          style={{
            width: '100%',
            maxWidth: 520,
            background: 'var(--bg-secondary)',
            borderRadius: '24px 24px 0 0',
            border: '1px solid var(--border-subtle)',
            borderBottom: 'none',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div style={{ width: 40, height: 4, background: 'var(--text-muted)', borderRadius: 2, margin: '12px auto' }} />

          {/* Header */}
          <div style={{
            padding: '0 1.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <div>
              <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0 }}>
                🛒 Scene Cart
              </h5>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
                {currentScene.objects.length} item{currentScene.objects.length !== 1 ? 's' : ''} placed in scene
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '0.9rem',
              }}
            >✕</button>
          </div>

          {/* Items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '2.5rem' }}>🛋</p>
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
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '0.85rem',
                    marginBottom: '0.5rem',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    alignItems: 'center',
                  }}
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{item.name}</div>
                    <div style={{ color: 'var(--accent-light)', fontWeight: 700, fontSize: '0.9rem' }}>
                      ${((item.price || 0) * item.quantity).toFixed(2)}
                    </div>
                  </div>

                  {/* Qty Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      onClick={() => item.uids.forEach((uid) => updateObjectQuantity(uid, 
                        (useSceneStore.getState().currentScene.objects.find(o => o.uid === uid)?.quantity || 1) - 1
                      ))}
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem',
                      }}
                    >−</button>
                    <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                    <button
                      onClick={() => item.uids.forEach((uid) => updateObjectQuantity(uid,
                        (useSceneStore.getState().currentScene.objects.find(o => o.uid === uid)?.quantity || 1) + 1
                      ))}
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem',
                      }}
                    >+</button>
                  </div>

                  <button
                    onClick={() => handleRemoveItem(item.uids)}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      border: '1px solid rgba(225,112,85,0.3)',
                      background: 'rgba(225,112,85,0.1)', color: 'var(--danger)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem',
                    }}
                  >🗑</button>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Total ({items.reduce((s, i) => s + i.quantity, 0)} items)
                </span>
                <span style={{
                  fontSize: '1.4rem', fontWeight: 800,
                  background: 'var(--gradient-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  ${total.toFixed(2)}
                </span>
              </div>
              <motion.button
                className="btn btn-aura w-100"
                style={{ padding: '0.85rem', fontSize: '1rem', borderRadius: 'var(--radius-md)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBuyEverything}
                id="ar-buy-everything-btn"
              >
                🛍 Buy Everything — ${total.toFixed(2)}
              </motion.button>
              <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>
                All items added to cart · Proceed to checkout
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
