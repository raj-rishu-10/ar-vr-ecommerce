import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import products from '../data/products.json';
import useCartStore from '../store/cartStore';

const AR_PRODUCTS = products.filter((p) => p.glbModel);

export default function ARViewer() {
  const navigate = useNavigate();
  const { addItem, items } = useCartStore();
  const mvRef = useRef(null);

  const [activeProduct, setActiveProduct] = useState(AR_PRODUCTS[0]);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleSelectProduct = (p) => {
    setActiveProduct(p);
  };

  const handleAddToCart = () => {
    addItem(activeProduct);
    showToast(`✅ ${activeProduct.name} added to cart`);
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const cartCount = items.reduce((s, i) => s + i.qty, 0);

  // Fallback to trigger AR mode manually if native AR button is hidden
  const activateAR = () => {
    if (mvRef.current && mvRef.current.activateAR) {
      mvRef.current.activateAR();
    }
  };

  return (
    <div className="ar-fullscreen-page">
      
      {/* 1. Model Viewer — Renders 3D directly, handles AR Plane tracking on mobile */}
      <model-viewer
        ref={mvRef}
        src={activeProduct.glbModel}
        alt={activeProduct.name}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="auto"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="1"
        environment-image="neutral"
        exposure="1"
        style={{ width: '100%', flex: 1, background: 'linear-gradient(180deg,#1a1a2e 0%,#0a0a0f 100%)' }}
      >
        {/* We use our own customized AR button to match the UI */}
        <button slot="ar-button" style={{ display: 'none' }} id="hidden-ar-btn"></button>
      </model-viewer>

      {/* 2. UI Overlay - Top Bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: 'max(env(safe-area-inset-top), 1rem) 1rem 0.75rem',
        background: 'linear-gradient(to bottom, rgba(10,10,15,0.9) 60%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 20, pointerEvents: 'none'
      }}>
        <div style={{ width: '100%', maxWidth: '600px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              pointerEvents: 'auto',
              width: 40, height: 40, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(26,26,46,0.8)', backdropFilter: 'blur(10px)',
              color: 'white', cursor: 'pointer', fontSize: '1.1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >←</button>

          <div style={{
            background: 'rgba(26,26,46,0.85)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 50, padding: '0.4rem 1rem',
            fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)',
            fontWeight: 600,
          }}>
            🟢 AR View · {cartCount} in cart
          </div>

          {cartCount > 0 && (
            <motion.button
              pointerEvents="auto"
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              onClick={handleCheckout}
              style={{
                pointerEvents: 'auto',
                background: 'linear-gradient(135deg,#00b894,#00cec9)',
                border: 'none', borderRadius: 50,
                padding: '0.4rem 1rem', color: 'white',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              Checkout →
            </motion.button>
          )}
        </div>
      </div>

      {/* 3. UI Overlay - Bottom Panel */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(10,10,15,0.97) 70%, transparent)',
        padding: '1rem 1rem max(env(safe-area-inset-bottom), 1.5rem)',
        zIndex: 20, pointerEvents: 'none', display: 'flex', justifyContent: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: '600px', pointerEvents: 'auto' }}>
          
          {/* Active product info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <img
              src={activeProduct.image}
              alt={activeProduct.name}
              style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(108,92,231,0.4)', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeProduct.name}
              </div>
              <div style={{ color: '#a29bfe', fontWeight: 700, fontSize: '0.95rem' }}>
                ${activeProduct.price.toFixed(2)}
              </div>
            </div>
            {/* AR Launch button (Mobile only, triggers surface detection) */}
            <button
              onClick={activateAR}
              style={{
                background: 'linear-gradient(135deg,#6c5ce7,#a29bfe)',
                border: 'none', borderRadius: 12,
                padding: '0.6rem 1.1rem',
                color: 'white', fontWeight: 700, fontSize: '0.85rem',
                cursor: 'pointer', flexShrink: 0,
                boxShadow: '0 0 20px rgba(108,92,231,0.4)',
              }}
            >📱 Place in Room</button>
          </div>

          {/* Horizontal product carousel */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div className="ar-product-carousel">
              {AR_PRODUCTS.map((p) => (
                <motion.button
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  whileTap={{ scale: 0.93 }}
                  style={{
                    flexShrink: 0,
                    width: 'max(15vw, 60px)', height: 'max(15vw, 60px)',
                    maxWidth: 80, maxHeight: 80,
                    borderRadius: 12,
                    border: `2px solid ${activeProduct.id === p.id ? '#6c5ce7' : 'rgba(255,255,255,0.1)'}`,
                    background: activeProduct.id === p.id ? 'rgba(108,92,231,0.15)' : 'rgba(26,26,46,0.7)',
                    backdropFilter: 'blur(10px)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: 0,
                    position: 'relative',
                    boxShadow: activeProduct.id === p.id ? '0 0 16px rgba(108,92,231,0.5)' : 'none',
                  }}
                >
                  <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {activeProduct.id === p.id && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(108,92,231,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem',
                    }}>✓</div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Main action buttons */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleAddToCart}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg,#00b894,#00cec9)',
              border: 'none', borderRadius: 14,
              padding: '0.9rem 1rem',
              color: 'white', fontWeight: 700, fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(0,184,148,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            🛒 Add {activeProduct.name} to Cart
          </motion.button>
        </div>
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            style={{
              position: 'absolute', bottom: 240, left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(26,26,46,0.95)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(108,92,231,0.4)',
              borderRadius: 50, padding: '0.6rem 1.25rem',
              color: 'white', fontWeight: 600, fontSize: '0.85rem',
              whiteSpace: 'nowrap', zIndex: 30, pointerEvents: 'none',
              boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
