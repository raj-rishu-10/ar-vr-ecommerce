import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useCartStore from '../../store/cartStore';

/* ── Star renderer ── */
function Stars({ rating }) {
  return (
    <span style={{ color: '#e8a400', fontSize: 13, letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, i) =>
        i < Math.floor(rating) ? '★' : i < rating ? '⯨' : '☆'
      )}
    </span>
  );
}

export default function ProductCard({ product, index = 0, checked, onCheck }) {
  const addItem = useCartStore((s) => s.addItem);
  const [wished, setWished]     = useState(false);
  const [selectedColor, setSC]  = useState(0);
  const [added, setAdded]       = useState(false);

  const handleCart = (e) => {
    e.preventDefault();
    addItem({ ...product, modelColor: product.colors?.[selectedColor] ?? product.modelColor });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  /* IKEA-style subtitle: "name, colour, WxD cm (W D")" */
  const { width: W, height: H, depth: D } = product.dimensions ?? {};
  const dimsLabel = W && D ? `${W}x${H}x${D} cm` : '';

  /* Badge logic */
  const badgeLabel = product.badge === 'Bestseller' || product.badge === 'Top Rated'
    ? 'Top seller' : product.badge;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', fontFamily: "'Noto IKEA', 'Inter', system-ui, sans-serif" }}>

      {/* Compare checkbox */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#111', marginBottom: 8, cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onCheck?.(product.id)}
          style={{ width: 14, height: 14, accentColor: '#0058a3', cursor: 'pointer' }}
        />
        Compare
      </label>

      {/* Image */}
      <div style={{ position: 'relative', background: '#f5f5f0', aspectRatio: '1/1', overflow: 'hidden' }}>
        {badgeLabel && (
          <div style={{
            position: 'absolute', top: 0, left: 0, zIndex: 2,
            background: '#cc0008', color: '#fff',
            fontSize: 11, fontWeight: 700, padding: '4px 10px',
            letterSpacing: 0.5,
          }}>
            {badgeLabel}
          </div>
        )}
        <Link to={`/product/${product.id}`}>
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', transition: 'transform 0.3s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        </Link>
      </div>

      {/* Body */}
      <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>

        {/* Name */}
        <Link to={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111', textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.3 }}>
            {product.name}
          </div>
          <div style={{ fontSize: 12, color: '#767676', lineHeight: 1.4, marginTop: 2 }}>
            {product.description?.substring(0, 55)}{product.description?.length > 55 ? '…' : ''}{dimsLabel ? `, ${dimsLabel}` : ''}
          </div>
        </Link>

        {/* Price */}
        <div style={{ marginTop: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#111' }}>
            Rs.<span style={{ fontSize: 22 }}>{Math.round(product.price * 83).toLocaleString('en-IN')}</span>
          </span>
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Stars rating={product.rating} />
          <a href="#" onClick={e => e.preventDefault()} style={{ fontSize: 12, color: '#0058a3', textDecoration: 'underline' }}>
            ({product.reviews.toLocaleString()})
          </a>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          {/* Circular cart button */}
          <button
            onClick={handleCart}
            title="Add to bag"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: added ? '#006a00' : '#0058a3',
              border: 'none', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.2s',
              boxShadow: '0 2px 8px rgba(0,88,163,0.3)',
            }}
          >
            {added ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            )}
          </button>

          {/* Wishlist heart */}
          <button
            onClick={() => setWished(w => !w)}
            title="Add to favourites"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: wished ? '#cc0008' : '#767676', transition: 'color 0.2s', display: 'flex' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
        </div>

        {/* Color options */}
        {product.colors && product.colors.length > 1 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 12, color: '#767676', marginBottom: 4 }}>
              ✓ Additional colours available
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {product.colors.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setSC(i)}
                  title={c}
                  style={{
                    width: 22, height: 22,
                    background: c, border: selectedColor === i ? '2px solid #111' : '1px solid #ccc',
                    borderRadius: 2, cursor: 'pointer', padding: 0,
                    outline: selectedColor === i ? '2px solid #fff' : 'none',
                    outlineOffset: selectedColor === i ? '-3px' : 0,
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#767676', marginTop: 4 }}>More options</div>
          </div>
        )}
      </div>
    </div>
  );
}
