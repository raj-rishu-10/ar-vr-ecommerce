import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import products from '../data/products.json';
import useCartStore from '../store/cartStore';
import './ARViewer.scss';

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
  const [show3DScale, setShow3DScale] = useState(false);
  const [modelDims, setModelDims] = useState(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    setArSupported(isAndroid || isIOS);
  }, []);

  const svgRef = useRef(null);
  const lineWRef = useRef(null);
  const lineHRef = useRef(null);
  const lineDRef = useRef(null);

  useEffect(() => {
    const mv = mvRef.current;
    if (!mv) return;

    const onLoad = () => { 
      setIsLoading(false); 
      setHasError(false);
      // Capture 3D bounding box for scale lines
      if (mv.getBoundingBoxExtents && mv.getBoundingBoxCenter) {
        setModelDims({
          extents: mv.getBoundingBoxExtents(),
          center: mv.getBoundingBoxCenter()
        });
      }
    };
    const onError = () => { setIsLoading(false); setHasError(true); };
    const onArStatus = (e) => {
      setIsARMode(e.detail.status === 'session-started' || e.detail.status === 'object-placed');
    };

    const updateSvgLines = () => {
      if (!show3DScale || !mv) return;
      
      const getPos = (slotName) => {
        const el = mv.querySelector(`[slot="${slotName}"]`);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const mvRect = mv.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2 - mvRect.left,
          y: rect.top + rect.height / 2 - mvRect.top
        };
      };

      const pA = getPos('dot-A');
      const pB = getPos('dot-B');
      const pD = getPos('dot-D');
      const pF = getPos('dot-F');

      if (lineWRef.current && pA && pB) {
        lineWRef.current.setAttribute('x1', pA.x); lineWRef.current.setAttribute('y1', pA.y);
        lineWRef.current.setAttribute('x2', pB.x); lineWRef.current.setAttribute('y2', pB.y);
      }
      if (lineHRef.current && pA && pD) {
        lineHRef.current.setAttribute('x1', pA.x); lineHRef.current.setAttribute('y1', pA.y);
        lineHRef.current.setAttribute('x2', pD.x); lineHRef.current.setAttribute('y2', pD.y);
      }
      if (lineDRef.current && pB && pF) {
        lineDRef.current.setAttribute('x1', pB.x); lineDRef.current.setAttribute('y1', pB.y);
        lineDRef.current.setAttribute('x2', pF.x); lineDRef.current.setAttribute('y2', pF.y);
      }
    };

    mv.addEventListener('load', onLoad);
    mv.addEventListener('error', onError);
    mv.addEventListener('ar-status', onArStatus);
    mv.addEventListener('camera-change', updateSvgLines);
    window.addEventListener('resize', updateSvgLines);

    return () => {
      mv.removeEventListener('load', onLoad);
      mv.removeEventListener('error', onError);
      mv.removeEventListener('ar-status', onArStatus);
      mv.removeEventListener('camera-change', updateSvgLines);
      window.removeEventListener('resize', updateSvgLines);
    };
  }, [activeProduct, show3DScale]);

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
    <div className="ar-fullscreen-page">
      
      {/* ── Top Navigation Bar ───────────────────────────────── */}
      <div className="ar-top-nav">
        <button
          onClick={() => navigate(-1)}
          className="ar-btn-back"
        >←</button>

        <div className="ar-status-indicator">
          <span className={`ar-status-dot ${isLoading ? 'loading' : 'ready'}`} />
          {isLoading ? 'Loading 3D...' : 'Interactive 3D Viewer'}
        </div>

        {cartCount > 0 ? (
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            onClick={handleCheckout}
            className="ar-btn-cart"
          >
            🛒 {cartCount}
          </motion.button>
        ) : <div />}
      </div>

      {/* ── Persistent Product Info & Dimensions ────────────────── */}
      <div className="ar-persistent-info">
        <h3 className="ar-info-title">{activeProduct.name}</h3>
        <span className="ar-info-price">${activeProduct.price}</span>
        
        <div className="ar-dimensions-box">
          <div className="dim-label">DIMENSIONS (W×H×D)</div>
          <div className="dim-value">
            {activeProduct.dimensions?.width} × {activeProduct.dimensions?.height} × {activeProduct.dimensions?.depth} cm
          </div>
        </div>

        <button 
          className={`ar-btn-toggle-scale ${show3DScale ? 'active' : ''}`}
          onClick={() => setShow3DScale(!show3DScale)}
        >
          {show3DScale ? 'Hide 3D Scale' : '📏 Show 3D Scale'}
        </button>
      </div>

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
        className="ar-model-viewer"
      >
        <button slot="ar-button"   className="extracted-ui-55"/>

        {show3DScale && modelDims && (
          <>
            {/* SVG Overlay for Lines */}
            <svg className="dim-svg-overlay" xmlns="http://www.w3.org/2000/svg" ref={svgRef}>
              <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#0058a3" />
                </marker>
                <marker id="arrowtail" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M 6 0 L 0 3 L 6 6 z" fill="#0058a3" />
                </marker>
              </defs>
              <line ref={lineWRef} className="dim-svg-line" markerStart="url(#arrowtail)" markerEnd="url(#arrowhead)" />
              <line ref={lineHRef} className="dim-svg-line" markerStart="url(#arrowtail)" markerEnd="url(#arrowhead)" />
              <line ref={lineDRef} className="dim-svg-line" markerStart="url(#arrowtail)" markerEnd="url(#arrowhead)" />
            </svg>

            {/* Endpoints (Invisible, used to get screen coords) */}
            <div slot="dot-A" className="hotspot-dot" data-position={`${modelDims.center.x - modelDims.extents.x / 2} ${modelDims.center.y - modelDims.extents.y / 2} ${modelDims.center.z + modelDims.extents.z / 2}`}></div>
            <div slot="dot-B" className="hotspot-dot" data-position={`${modelDims.center.x + modelDims.extents.x / 2} ${modelDims.center.y - modelDims.extents.y / 2} ${modelDims.center.z + modelDims.extents.z / 2}`}></div>
            <div slot="dot-D" className="hotspot-dot" data-position={`${modelDims.center.x - modelDims.extents.x / 2} ${modelDims.center.y + modelDims.extents.y / 2} ${modelDims.center.z + modelDims.extents.z / 2}`}></div>
            <div slot="dot-F" className="hotspot-dot" data-position={`${modelDims.center.x + modelDims.extents.x / 2} ${modelDims.center.y - modelDims.extents.y / 2} ${modelDims.center.z - modelDims.extents.z / 2}`}></div>

            {/* Width (X-axis) - Midpoint */}
            <div 
              slot="hotspot-width" 
              className="hotspot-dim" 
              data-position={`${modelDims.center.x} ${modelDims.center.y - modelDims.extents.y / 2} ${modelDims.center.z + modelDims.extents.z / 2}`}
            >
              <div className="hotspot-label">{activeProduct.dimensions?.width} cm</div>
            </div>
            
            {/* Height (Y-axis) - Midpoint */}
            <div 
              slot="hotspot-height" 
              className="hotspot-dim" 
              data-position={`${modelDims.center.x - modelDims.extents.x / 2} ${modelDims.center.y} ${modelDims.center.z + modelDims.extents.z / 2}`}
            >
              <div className="hotspot-label">{activeProduct.dimensions?.height} cm</div>
            </div>

            {/* Depth (Z-axis) - Midpoint */}
            <div 
              slot="hotspot-depth" 
              className="hotspot-dim" 
              data-position={`${modelDims.center.x + modelDims.extents.x / 2} ${modelDims.center.y - modelDims.extents.y / 2} ${modelDims.center.z}`}
            >
              <div className="hotspot-label">{activeProduct.dimensions?.depth} cm</div>
            </div>
          </>
        )}
      </model-viewer>

      {/* ── Overlays ────────────────────────────────────────── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="ar-loading-overlay"
          >
            <div className="spinner-border ar-spinner" />
            <div className="ar-loading-text">Loading Premium Model...</div>
          </motion.div>
        )}
        
        {hasError && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="ar-error-overlay"
          >
            <div className="ar-error-icon">⚠️</div>
            <h3 className="ar-error-title">Failed to load model</h3>
            <button onClick={() => { setHasError(false); setIsLoading(true); }} className="ar-btn-retry">Retry</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Controls ─────────────────────────────────── */}
      <div className="ar-bottom-controls">
        <div className="ar-controls-container">
          
          <div className="ar-actions-row">
            {arSupported !== false && (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={activateAR}
                disabled={isLoading}
                className={`ar-btn-action view-space ${isLoading ? 'disabled' : ''}`}
              >
                📱 View in Space
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleAddToCart}
              className="ar-btn-action add-cart"
            >
              🛒 Add to Cart
            </motion.button>
          </div>

          <div className="ar-more-products">
            <div className="ar-more-title">
              More Products
            </div>
            <div className="ar-carousel">
              {AR_PRODUCTS.map((p) => (
                <motion.button
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  whileTap={{ scale: 0.95 }}
                  className={`ar-carousel-item ${activeProduct.id === p.id ? 'active' : ''}`}
                >
                  <img src={p.image} alt={p.name} className="ar-carousel-img" />
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
            className="ar-toast"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
