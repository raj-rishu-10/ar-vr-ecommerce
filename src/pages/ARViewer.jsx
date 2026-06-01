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

  const initialProduct = location.state?.product
    ? AR_PRODUCTS.find((p) => p.id === location.state.product.id) || AR_PRODUCTS[0]
    : AR_PRODUCTS[0];

  const [activeProduct, setActiveProduct] = useState(initialProduct);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [toast, setToast] = useState('');
  const [isARMode, setIsARMode] = useState(false);
  const [arSupported, setArSupported] = useState(undefined);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    setArSupported(isAndroid || isIOS);
  }, []);

  useEffect(() => {
    const mv = mvRef.current;
    if (!mv) return;

    const onLoad = () => { setIsLoading(false); setHasError(false); };
    const onError = () => { setIsLoading(false); setHasError(true); };
    const onArStatus = (e) => {
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
  }, [activeProduct]);

  const handleSelectProduct = useCallback((p) => {
    if (p.id === activeProduct.id) return;
    setIsLoading(true);
    setHasError(false);
    setActiveProduct(p);
  }, [activeProduct.id]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const handleAddToCart = useCallback(() => {
    addItem(activeProduct);
    showToast(`✅ ${activeProduct.name} added to cart`);
  }, [activeProduct, addItem, showToast]);

  const handleCheckout = useCallback(() => navigate('/checkout'), [navigate]);

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
    <div className="ar-fullscreen-page" style={{ position: 'fixed', inset: 0, background: '#0a0a0f', zIndex: 1100, display: 'flex', flexDirection: 'column' }}>
      
      {/* ── Top Navigation Bar ───────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        padding: 'max(env(safe-area-inset-top, 16px), 16px) 16px 14px',
        background: 'linear-gradient(to bottom, rgba(10,10,15,0.92) 0%, transparent 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            pointerEvents: 'auto',
            width: 44, height: 44, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(26,26,46,0.85)', backdropFilter: 'blur(12px)',
            color: 'white', cursor: 'pointer', fontSize: '1.2rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >←</button>

        <div style={{
          pointerEvents: 'auto', cursor: 'pointer',
          background: 'rgba(26,26,46,0.85)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 50, padding: '8px 20px',
          fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease',
        }} onClick={() => setShowInfo(!showInfo)}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isLoading ? '#fdcb6e' : '#00b894',
            display: 'inline-block',
          }} />
          {isLoading ? 'Loading 3D...' : '3D Viewer'}
          <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>ℹ️</span>
        </div>

        {cartCount > 0 ? (
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            onClick={handleCheckout}
            style={{
              pointerEvents: 'auto',
              background: 'linear-gradient(135deg, #00b894, #00cec9)',
              border: 'none', borderRadius: 50,
              padding: '10px 18px', color: 'white',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(0,184,148,0.3)',
            }}
          >
            🛒 {cartCount}
          </motion.button>
        ) : <div style={{ width: 44 }} />}
      </div>

      {/* ── Product Info Panel (Toggleable) ────────────────── */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'absolute', top: 'calc(max(env(safe-area-inset-top, 16px), 16px) + 60px)',
              left: '50%', transform: 'translateX(-50%)', zIndex: 19,
              background: 'rgba(26,26,46,0.95)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: '20px', width: '90%', maxWidth: 400,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)', pointerEvents: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>{activeProduct.name}</h3>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#a29bfe' }}>${activeProduct.price}</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.5 }}>
              {activeProduct.description}
            </p>
            <div style={{ display: 'flex', gap: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Dimensions</div>
                <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 500 }}>
                  {activeProduct.dimensions?.width}x{activeProduct.dimensions?.height}x{activeProduct.dimensions?.depth} cm
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Material</div>
                <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 500 }}>Premium Grade</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3D Model Viewer ─────────────────────────────────── */}
      <model-viewer
        ref={mvRef}
        key={activeProduct.id}
        src={activeProduct.glbModel}
        alt={`3D model of ${activeProduct.name}`}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="auto"
        ar-placement="floor"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="1.5"
        shadow-softness="1"
        environment-image="neutral"
        exposure="1.2"
        auto-rotate
        auto-rotate-delay="3000"
        rotation-per-second="15deg"
        interaction-prompt="none"
        style={{
          width: '100%',
          flex: 1,
          background: 'linear-gradient(180deg, #12121a 0%, #0a0a0f 100%)',
          '--poster-color': 'transparent',
          outline: 'none'
        }}
      >
        <button slot="ar-button" style={{ display: 'none' }} />
      </model-viewer>

      {/* ── Overlays ────────────────────────────────────────── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(4px)'
            }}
          >
            <div className="spinner-border" style={{ color: '#6c5ce7', width: '3rem', height: '3rem' }} />
            <div style={{ marginTop: 16, color: 'white', fontWeight: 500, letterSpacing: 1 }}>Loading Premium Model...</div>
          </motion.div>
        )}
        
        {hasError && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 15,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10,10,15,0.95)', padding: '2rem', textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>⚠️</div>
            <h3 style={{ color: 'white' }}>Failed to load model</h3>
            <button onClick={() => { setHasError(false); setIsLoading(true); }} style={{
              marginTop: 24, padding: '12px 32px', borderRadius: 30,
              background: 'var(--gradient-primary)', color: 'white', border: 'none',
              fontWeight: 600, cursor: 'pointer'
            }}>Retry</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Controls ─────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
        background: 'linear-gradient(to top, rgba(10,10,15,0.98) 70%, transparent)',
        padding: '0 16px max(env(safe-area-inset-bottom, 24px), 24px)',
        pointerEvents: 'none',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', pointerEvents: 'auto' }}>
          
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {arSupported !== false && (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={activateAR}
                disabled={isLoading}
                style={{
                  flex: 1, padding: '16px', borderRadius: 16, border: 'none',
                  background: isLoading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                  color: isLoading ? 'rgba(255,255,255,0.4)' : 'white',
                  fontWeight: 700, fontSize: '1.05rem', cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: isLoading ? 'none' : '0 10px 30px rgba(108,92,231,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                }}
              >
                📱 View in Space
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleAddToCart}
              style={{
                flex: 1, padding: '16px', borderRadius: 16, border: 'none',
                background: 'rgba(26,26,46,0.8)', backdropFilter: 'blur(10px)',
                color: 'white', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
              }}
            >
              🛒 Add to Cart
            </motion.button>
          </div>

          <div style={{ background: 'rgba(26,26,46,0.5)', borderRadius: 20, padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              More Products
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
              {AR_PRODUCTS.map((p) => (
                <motion.button
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    flexShrink: 0, width: 72, height: 72, borderRadius: 14, padding: 0,
                    border: activeProduct.id === p.id ? '2px solid #00cec9' : '2px solid transparent',
                    background: 'rgba(255,255,255,0.05)', cursor: 'pointer', overflow: 'hidden',
                    boxShadow: activeProduct.id === p.id ? '0 0 20px rgba(0,206,201,0.3)' : 'none',
                  }}
                >
                  <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast ───────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            style={{
              position: 'absolute', bottom: 'calc(max(env(safe-area-inset-bottom, 24px), 24px) + 240px)', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,184,148,0.95)', backdropFilter: 'blur(10px)',
              padding: '12px 24px', borderRadius: 30, color: 'white', fontWeight: 600,
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 100, pointerEvents: 'none'
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
