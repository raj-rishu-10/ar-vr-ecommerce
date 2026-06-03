import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useProductStore from '../store/productStore';
import ProductCard from '../components/products/ProductCard';

const CATEGORY_ORDER = ['All', 'chairs', 'sofas', 'tables', 'lighting', 'storage'];

export default function Products() {
  const { categories, selectedCategory, searchQuery, setCategory, setSearchQuery, getFilteredProducts } = useProductStore();
  const filtered = getFilteredProducts();
  const [compared, setCompared] = useState(new Set());

  const toggleCompare = (id) => {
    setCompared(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.size < 4 && next.add(id);
      return next;
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Noto IKEA', 'Inter', system-ui, sans-serif" }}>

      {/* Page header */}
      <div style={{ borderBottom: '1px solid #dfdfdf', padding: '32px 40px 0' }}>
        <nav style={{ fontSize: 13, color: '#767676', marginBottom: 12 }}>
          <Link to="/" style={{ color: '#0058a3', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 6px' }}>/</span>
          <span>Furniture</span>
        </nav>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111', margin: 0, lineHeight: 1.2 }}>
          Our Collection
        </h1>
        <p style={{ color: '#767676', fontSize: 14, margin: '8px 0 0' }}>
          Premium furniture designed for modern living · All items support AR preview
        </p>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 24, overflowX: 'auto' }}>
          {CATEGORY_ORDER.filter(c => c === 'All' || categories.includes(c)).map(cat => {
            const active = (cat === 'All' && !selectedCategory) ||
                           (cat !== 'All' && selectedCategory === cat);
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat === 'All' ? '' : cat)}
                style={{
                  padding: '12px 20px',
                  background: 'none', border: 'none',
                  borderBottom: active ? '3px solid #111' : '3px solid transparent',
                  fontSize: 14, fontWeight: active ? 700 : 500,
                  color: active ? '#111' : '#767676',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '24px 40px' }}>

        {/* Filter / sort bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search furniture…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                id="product-search"
                style={{
                  padding: '10px 14px 10px 38px',
                  border: '1px solid #dfdfdf', borderRadius: 24,
                  fontSize: 14, outline: 'none', width: 260,
                  fontFamily: 'inherit',
                }}
              />
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#767676' }}>🔍</span>
            </div>
            <span style={{ fontSize: 13, color: '#767676' }}>
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ padding: '10px 14px', border: '1px solid #dfdfdf', borderRadius: 4, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Top Rated</option>
              <option>Newest</option>
            </select>
          </div>
        </div>

        {/* Compare bar */}
        {compared.size > 0 && (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#111', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 40px', zIndex: 100,
          }}>
            <span style={{ fontSize: 14 }}>{compared.size} items selected for comparison</span>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setCompared(new Set())} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>Clear</button>
              <button style={{ background: '#0058a3', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Compare ({compared.size})</button>
            </div>
          </div>
        )}

        {/* Product grid — 4 columns like IKEA */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '40px 24px',
          paddingBottom: compared.size > 0 ? 80 : 0,
        }}>
          {filtered.map((product, i) => (
            <React.Fragment key={product.id}>
              <ProductCard
                product={product}
                index={i}
                checked={compared.has(product.id)}
                onCheck={toggleCompare}
              />
            </React.Fragment>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#767676' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>No products found</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>Try different keywords or clear the search.</div>
          </div>
        )}
      </div>
    </div>
  );
}
