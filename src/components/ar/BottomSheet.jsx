import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BottomSheet({ products, onAdd, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      <motion.div
        className="bottom-sheet-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="bottom-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="bottom-sheet-handle" />
        <div className="px-4 pb-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, margin: 0 }}>Add Product to Scene</h6>
            <button className="btn-icon" style={{ width: 30, height: 30, fontSize: '0.8rem' }} onClick={onClose}>✕</button>
          </div>
          <input
            className="form-control form-aura"
            placeholder="🔍 Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '0.85rem' }}
          />
        </div>
        <div className="bottom-sheet-body">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bottom-sheet-product"
              onClick={() => onAdd(p)}
            >
              <img src={p.image} alt={p.name} className="bottom-sheet-product-img" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.category}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: 'var(--accent-light)', fontSize: '0.9rem' }}>${p.price}</div>
                <button className="btn btn-ar mt-1" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>+ Add</button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
