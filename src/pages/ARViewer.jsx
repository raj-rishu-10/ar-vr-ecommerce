import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import products from '../data/products.json';
import useCartStore from '../store/cartStore';

const AR_PRODUCTS = products.filter((p) => p.glbModel);

export default function ARViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem, items } = useCartStore();
  const mvRef = useRef(null);

  // If ProductDetail passed a product via state, use it; else default to first
  const initialProduct = location.state?.product
    ? AR_PRODUCTS.find((p) => p.id === location.state.product.id) || AR_PRODUCTS[0]
    : AR_PRODUCTS[0];

  const [activeProduct, setActiveProduct] = useState(initialProduct);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [toast, setToast] = useState('');
  const [isARMode, setIsARMode] = useState(false);
  const [arSupported, setArSupported] = useState(undefined); // undefined = checking

  // ── Check AR support ──────────────────────────────────────
  useEffect(() => {
    // model-viewer handles AR via Scene Viewer (Android) / Quick Look (iOS)
    // Check if either is likely available
    const ua = navigator.userAgent;
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    setArSupported(isAndroid || isIOS);
  }, []);

  // ── model-viewer event listeners ──────────────────────────
  useEffect(() => {
    const mv = mvRef.current;
    if (!mv) return;

    const onLoad = () => { setIsLoading(false); setHasError(false); };
    const onError = () => { setIsLoading(false); setHasError(true); };
    const onArStatus = (e) => {
      // ar-status values: 'not-presenting' | 'session-started' | 'object-placed' | 'failed'
      setIsARMode(e.detail.status === 'session-started' || e.detail.status === 'object-placed');
    };

    mv.addEventListener('load', onLoad);
    mv.addEventListener('error', onError);
    mv.addEventListener('ar-status', onArStatus);

    return () => {
      mv.removeEventListener('load', onLoad);
      mv.removeEventListener('error', onError);
      mv.removeEventListener('ar-status', onArStatus);
    };
  }, [activeProduct]); // re-attach when product changes (new model-viewer load cycle)

  // ── Switch product — reset loading state ──────────────────
  const handleSelectProduct = useCallback((p) => {
    if (p.id === activeProduct.id) return;
    setIsLoading(true);
    setHasError(false);
    setActiveProduct(p);
  }, [activeProduct.id]);

  // ── Cart actions ──────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const handleAddToCart = useCallback(() => {
    addItem(activeProduct);
    showToast(`✅ ${activeProduct.name} added to cart`);
  }, [activeProduct, addItem, showToast]);

  const handleCheckout = useCallback(() => navigate('/checkout'), [navigate]);

  // ── Trigger native AR ─────────────────────────────────────
  const activateAR = useCallback(() => {
    const mv = mvRef.current;
    if (!mv) return;
    if (typeof mv.activateAR === 'function') {
      mv.activateAR();
    } else {
      showToast('⚠️ AR not supported on this device/browser');
    }
  }, [showToast]);

  const cartCount = items.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="ar-fullscreen-page">

      {/* ── model-viewer: full-height 3D viewer ──────────── */}
      <model-viewer
        ref={mvRef}
        key={activeProduct.id}           /* force remount on product change */
        src={activeProduct.glbModel}
        alt={`3D model of ${activeProduct.name}`}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="auto"
        ar-placement="floor"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="1.2"
        shadow-softness="0.8"
        environment-image="neutral"
        exposure="1.1"
        auto-rotate
        auto-rotate-delay="3000"
        rotation-per-second="20deg"
        interaction-prompt="none"
        style={{
          width: '100%',
          flex: 1,
          background: 'linear-gradient(160deg, #1a1a2e 0%, #0a0a0f 60%)',
          '--poster-color': 'transparent',
        }}
      >
        {/* Hidden native AR button — we use our own */}
        <button slot="ar-button" style={{ display: 'none' }} aria-hidden="true" />
      </model-viewer>

      {/* ── Loading overlay ───────────────────────────────── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 50,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(160deg, #1a1a2e 0%, #0a0a0f 100%)',
              pointerEvents: 'none',
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              border: '3px solid rgba(108,92,231,0.2)',
              borderTopColor: '#6c5ce7',
              animation: 'spin 0.8s linear infinite',
              marginBottom: 20,
            }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>
              Loading 3D model…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 50,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10,10,15,0.95)', textAlign: 'center', padding: '2rem',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
            <h3 style={{ color: 'white', marginBottom: 8 }}>Model failed to load</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              Could not load the 3D model for {activeProduct.name}
            </p>
            <button
              onClick={() => { setHasError(false); setIsLoading(true); }}
              style={{
                padding: '10px 24px', borderRadius: 20,
                background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top bar ───────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        padding: 'max(env(safe-area-inset-top, 16px), 16px) 16px 14px',
        background: 'linear-gradient(to bottom, rgba(10,10,15,0.92) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{
            pointerEvents: 'auto',
            width: 42, height: 42, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(26,26,46,0.85)', backdropFilter: 'blur(12px)',
            color: 'white', cursor: 'pointer', fontSize: '1.1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >←</button>

        {/* Center badge */}
        <div style={{
          pointerEvents: 'none',
          background: 'rgba(26,26,46,0.85)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 50, padding: '6px 16px',
          fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isLoading ? '#fdcb6e' : '#00b894',
            display: 'inline-block', flexShrink: 0,
          }} />
          {isLoading ? 'Loading…' : `AR Viewer · ${activeProduct.name}`}
        </div>

        {/* Cart / Checkout */}
        {cartCount > 0 ? (
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            onClick={handleCheckout}
            style={{
              pointerEvents: 'auto',
              background: 'linear-gradient(135deg, #00b894, #00cec9)',
              border: 'none', borderRadius: 50,
              padding: '7px 14px', color: 'white',
              fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            🛒 {cartCount} · Checkout
          </motion.button>
        ) : (
          <div style={{ width: 42 }} />  /* spacer to keep layout balanced */
        )}
      </div>

      {/* ── Bottom panel ──────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
        background: 'linear-gradient(to top, rgba(10,10,15,0.98) 70%, transparent)',
        padding: '0 16px max(env(safe-area-inset-bottom, 20px), 20px)',
        pointerEvents: 'none',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', pointerEvents: 'auto' }}>

          {/* Active product info + AR button */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 14, paddingTop: 16,
          }}>
            <img
              src={activeProduct.image}
              alt={activeProduct.name}
              style={{
                width: 54, height: 54, borderRadius: 12, objectFit: 'cover',
                border: '2px solid rgba(108,92,231,0.5)', flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 700, fontSize: '0.95rem', color: 'white',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                marginBottom: 2,
              }}>
                {activeProduct.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#a29bfe', fontWeight: 700, fontSize: '1rem' }}>
                  ${activeProduct.price.toFixed(2)}
                </span>
                {activeProduct.originalPrice && (
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textDecoration: 'line-through' }}>
                    ${activeProduct.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* AR launch button — only shown on mobile */}
            {arSupported !== false && (
              <button
                onClick={activateAR}
                disabled={isLoading}
                style={{
                  background: isLoading
                    ? 'rgba(60,60,60,0.7)'
                    : 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                  border: 'none', borderRadius: 14,
                  padding: '10px 16px',
                  color: 'white', fontWeight: 700, fontSize: '0.82rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer', flexShrink: 0,
                  boxShadow: isLoading ? 'none' : '0 0 20px rgba(108,92,231,0.4)',
                  transition: 'all 0.3s ease',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                📱 Place in Room
              </button>
            )}
          </div>

          {/* Product carousel */}
          <div style={{ marginBottom: 14 }}>
            <div className="ar-product-carousel">
              {AR_PRODUCTS.map((p) => (
                <motion.button
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    flexShrink: 0,
                    width: 64, height: 64,
                    borderRadius: 12, padding: 0, overflow: 'hidden',
                    border: activeProduct.id === p.id
                      ? '2.5px solid #6c5ce7'
                      : '2px solid rgba(255,255,255,0.1)',
                    background: 'rgba(26,26,46,0.7)',
                    cursor: 'pointer', position: 'relative',
                    boxShadow: activeProduct.id === p.id
                      ? '0 0 16px rgba(108,92,231,0.5)' : 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                >
                  <img
                    src={p.image} alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {activeProduct.id === p.id && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(108,92,231,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem',
                    }}>✓</div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Add to cart CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleAddToCart}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #00b894, #00cec9)',
              border: 'none', borderRadius: 16,
              padding: '14px 16px',
              color: 'white', fontWeight: 700, fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(0,184,148,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            🛒 Add {activeProduct.name} to Cart
          </motion.button>
        </div>
      </div>

      {/* ── Toast notification ────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.9 }}
            style={{
              position: 'absolute', bottom: 200, left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(26,26,46,0.95)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(108,92,231,0.4)',
              borderRadius: 50, padding: '10px 20px',
              color: 'white', fontWeight: 600, fontSize: '0.85rem',
              whiteSpace: 'nowrap', zIndex: 30, pointerEvents: 'none',
              boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CSS for spinner ───────────────────────────────── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
