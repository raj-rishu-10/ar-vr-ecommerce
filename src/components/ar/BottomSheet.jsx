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
            <h6  className="extracted-ui-1">Add Product to Scene</h6>
            <button className="extracted-ui-2 btn-icon"  onClick={onClose}>✕</button>
          </div>
          <input
            className="form-control form-aura fs-85"
            placeholder="🔍 Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              <div  className="extracted-ui-3">
                <div  className="extracted-ui-4">{p.name}</div>
                <div  className="extracted-ui-5">{p.category}</div>
              </div>
              <div  className="extracted-ui-6">
                <div  className="extracted-ui-7">${p.price}</div>
                <button className="extracted-ui-8 btn btn-ar mt-1" >+ Add</button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
