import React, { useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, Box, PresentationControls, ContactShadows, Environment, Html, Center } from '@react-three/drei';
import * as THREE from 'three';
import useProductStore from '../store/productStore';
import useCartStore from '../store/cartStore';
import useSceneStore from '../store/sceneStore';

/* ─── Room scene cards ─────────────────────────────────────── */
const SUGGESTED_ROOMS = [
  {
    label: 'Sophisticated bedroom suite',
    img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=380&fit=crop',
  },
  {
    label: 'International modern bedroom',
    img: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&h=380&fit=crop',
  },
  {
    label: 'Scandi living room',
    img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=380&fit=crop',
  },
  {
    label: 'Minimalist home office',
    img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=380&fit=crop',
  },
];

const ROOM_TYPES = ['Bedroom', 'Dining Room', 'Generic', 'Living Room', 'Office'];

/* ─── 3D Product placeholder / GLB loader ─────────────────── */
function ProductModel({ product }) {
  try {
    const { scene } = useGLTF(product.glbModel);
    
    const box = useMemo(() => new THREE.Box3().setFromObject(scene), [scene]);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    
    // Scale normalization
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;

    return (
      <group scale={scale}>
        <primitive object={scene} />
        
        {/* Dynamic 3D Annotations (Apple AR Style) */}
        <Html position={[0, size.y, 0]} center distanceFactor={8} zIndexRange={[100, 0]}>
          <div style={{ background: 'rgba(255,255,255,0.95)', padding: '4px 10px', borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 700, color: '#111', whiteSpace: 'nowrap', border: '1px solid #e5e5e5' }}>
            {product.dimensions.width}cm W
          </div>
        </Html>
        <Html position={[size.x / 2 + 0.1, size.y / 2, 0]} center distanceFactor={8} zIndexRange={[100, 0]}>
          <div style={{ background: 'rgba(255,255,255,0.95)', padding: '4px 10px', borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 13, fontWeight: 700, color: '#111', whiteSpace: 'nowrap', border: '1px solid #e5e5e5' }}>
            {product.dimensions.height}cm H
          </div>
        </Html>
      </group>
    );
  } catch {
    return (
      <Box args={[1.2, 0.8, 0.6]}>
        <meshStandardMaterial color={product.modelColor || '#b0a090'} />
      </Box>
    );
  }
}

/* ─── Stars ────────────────────────────────────────────────── */
function Stars({ rating }) {
  return (
    <span style={{ color: '#e8a400', fontSize: 15, letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, i) => i < Math.floor(rating) ? '★' : '☆')}
    </span>
  );
}

/* ═══ Main component ═══════════════════════════════════════ */
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useProductStore(s => s.getProductById(Number(id)));
  const addItem = useCartStore(s => s.addItem);
  const addObject = useSceneStore(s => s.addObject);

  const [selectedColor, setSelectedColor] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wished, setWished] = useState(false);
  const [arOpen, setArOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(true);
  const [activeRoomType, setActiveRoomType] = useState('Bedroom');
  const [slideIdx, setSlideIdx] = useState(0);

  if (!product) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <h3 style={{ marginTop: 16 }}>Product not found</h3>
        <Link to="/products" style={{ color: '#0058a3', fontSize: 14 }}>← Browse products</Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem({ ...product, modelColor: product.colors?.[selectedColor] ?? product.modelColor });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleViewInAR = () => { addObject(product); navigate('/ar', { state: { product } }); };
  const { width: W, height: H, depth: D } = product.dimensions;

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

  const visibleSlides = 2;
  const maxSlide = Math.max(0, SUGGESTED_ROOMS.length - visibleSlides);

  return (
    <div style={{ fontFamily: "'Noto IKEA', 'Inter', system-ui, sans-serif", background: '#fff', minHeight: '100vh' }}>

      {/* ── Breadcrumb ── */}
      <div style={{ padding: '14px 40px', fontSize: 13, color: '#767676', borderBottom: '1px solid #dfdfdf', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link to="/" style={{ color: '#0058a3', textDecoration: 'none' }}>Home</Link>
        <span>/</span>
        <Link to="/products" style={{ color: '#0058a3', textDecoration: 'none' }}>Furniture</Link>
        <span>/</span>
        <span style={{ color: '#111', textTransform: 'uppercase', fontWeight: 700 }}>{product.name}</span>
      </div>

      {/* ── Responsive Two-column layout ── */}
      <div className="product-layout-container" style={{ display: 'flex', flexWrap: 'wrap', minHeight: 'calc(100vh - 50px)' }}>

        {/* LEFT — 3D viewer + suggested rooms */}
        <div className="product-layout-left" style={{ flex: '1 1 60%', minWidth: 320, background: '#f5f5f0', display: 'flex', flexDirection: 'column' }}>

          {/* 3D viewer pane */}
          <div style={{ position: 'relative', width: '100%', height: '65vh', minHeight: 400, background: 'radial-gradient(circle at center, #ffffff 0%, #f5f5f0 100%)' }}>
            
            {/* 3D Canvas */}
            <Canvas camera={{ position: [0, 1.5, 4], fov: 45 }} style={{ width: '100%', height: '100%' }}>
              <Environment preset="city" />
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
              
              <PresentationControls 
                global 
                config={{ mass: 2, tension: 500 }} 
                snap={{ mass: 4, tension: 1500 }} 
                rotation={[0, -Math.PI / 8, 0]} 
                polar={[-Math.PI / 3, Math.PI / 3]} 
                azimuth={[-Math.PI / 1.4, Math.PI / 2]}
              >
                <Center position={[0, -0.5, 0]}>
                  <ProductModel product={product} />
                </Center>
              </PresentationControls>
              <ContactShadows position={[0, -0.6, 0]} opacity={0.6} scale={10} blur={2.5} far={4} />
            </Canvas>

            {/* Premium Badges */}
            <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', gap: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: 24, fontSize: 13, fontWeight: 700, color: '#111', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                3D Interactive View
              </div>
            </div>
            
            <button onClick={handleViewInAR} style={{ position: 'absolute', bottom: 24, right: 24, background: '#111', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: 32, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10, transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M3 12h18M6 6l12 12M6 18L18 6"/></svg>
              View in AR
            </button>
          </div>

          {/* ── Suggested Rooms ── */}
          <div style={{ padding: '48px 40px', background: '#fff', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>Inspiration for your home</h2>
            </div>

            {/* Carousel */}
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{
                display: 'flex', gap: 20,
                transform: `translateX(-${slideIdx * (320 + 20)}px)`,
                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                {SUGGESTED_ROOMS.map((room, i) => (
                  <div key={i} style={{ flexShrink: 0, width: 320, position: 'relative', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                    <img src={room.img} alt={room.label} style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block', transition: 'transform 0.5s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                    
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 50%)', pointerEvents: 'none' }} />
                    
                    <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                        {room.label}
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: 20, color: '#fff', fontSize: 12, fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => navigate('/room-builder')}>
                        Try in room ↗
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              {slideIdx < maxSlide && (
                <button onClick={() => setSlideIdx(i => Math.min(maxSlide, i + 1))} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>›</button>
              )}
              {slideIdx > 0 && (
                <button onClick={() => setSlideIdx(i => Math.max(0, i - 1))} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>‹</button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Product Details Sidebar */}
        <div className="product-layout-right" style={{
          flex: '1 1 40%', minWidth: 320, maxWidth: 500,
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.03)',
          zIndex: 10
        }}>
          <div style={{ padding: '40px 48px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            {/* Header: Title & Category */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#767676', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                {product.category || 'Furniture'}
              </div>
              <h1 style={{ margin: 0, fontSize: 42, fontWeight: 900, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {product.name}
              </h1>
              <p style={{ fontSize: 15, color: '#444', marginTop: 12, lineHeight: 1.6 }}>
                {product.description}
              </p>
            </div>

            {/* Price & Rating */}
            <div style={{ paddingBottom: 32, borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 36, color: '#111', letterSpacing: '-0.02em' }}>
                  Rs.{Math.round(product.price * 83).toLocaleString('en-IN')}
                </div>
                {product.originalPrice && (
                  <div style={{ fontSize: 18, color: '#999', textDecoration: 'line-through', fontWeight: 600 }}>
                    Rs.{Math.round(product.originalPrice * 83).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <Stars rating={product.rating} />
                <span style={{ fontSize: 14, color: '#111', fontWeight: 600 }}>
                  {product.rating} <span style={{ color: '#767676', fontWeight: 400 }}>({product.reviews.toLocaleString()} reviews)</span>
                </span>
              </div>
            </div>

            {/* Colors */}
            {product.colors?.length > 0 && (
              <div style={{ padding: '32px 0', borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>Select Color</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {product.colors.map((c, i) => (
                    <button key={i} onClick={() => setSelectedColor(i)} title={c} style={{
                      width: 44, height: 44, background: c, borderRadius: '50%', cursor: 'pointer', padding: 0,
                      border: selectedColor === i ? '2px solid #111' : '1px solid #dfdfdf',
                      outline: selectedColor === i ? '3px solid #fff' : 'none', outlineOffset: -4,
                      boxShadow: selectedColor === i ? '0 0 0 1px #111' : 'none',
                      transition: 'all 0.2s'
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Dimensions */}
            <div style={{ padding: '32px 0', borderBottom: '1px solid #eee' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>Dimensions</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[['Width', W], ['Height', H], ['Depth', D]].map(([l, v]) => (
                  <div key={l} style={{ background: '#f9f9f9', padding: '16px', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 20, color: '#111' }}>{v}<span style={{ fontSize: 12, color: '#767676', fontWeight: 600, marginLeft: 2 }}>cm</span></div>
                    <div style={{ fontSize: 13, color: '#767676', marginTop: 4, fontWeight: 500 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add to Cart Actions */}
            <div style={{ paddingTop: 32, display: 'flex', gap: 16, marginTop: 'auto' }}>
              <button
                onClick={handleAddToCart}
                style={{
                  flex: 1, padding: '18px 0',
                  background: addedToCart ? '#00B894' : '#111',
                  color: '#fff', border: 'none', borderRadius: 32,
                  fontWeight: 800, fontSize: 16, cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: addedToCart ? '0 8px 20px rgba(0,184,148,0.3)' : '0 8px 24px rgba(0,0,0,0.15)'
                }}
              >
                {addedToCart ? '✓ Added to Bag' : 'Add to Bag'}
              </button>
              <button
                onClick={() => setWished(w => !w)}
                style={{
                  width: 56, height: 56, background: wished ? '#fff0f0' : '#f9f9f9', border: wished ? '1px solid #ffd0d0' : '1px solid #eee',
                  borderRadius: '50%', cursor: 'pointer', color: wished ? '#cc0008' : '#111',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </button>
            </div>
            
            {/* Trust Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 32, borderTop: '1px solid #eee' }}>
              {[
                { icon: '🚚', text: 'Free Delivery' },
                { icon: '↩️', text: '365 Days Return' },
                { icon: '🛡️', text: '2-Year Warranty' }
              ].map(badge => (
                <div key={badge.text} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                  <div style={{ fontSize: 24 }}>{badge.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#767676', textAlign: 'center' }}>{badge.text}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
