import React from 'react';
import { motion } from 'framer-motion';
import useProductStore from '../store/productStore';
import ProductGrid from '../components/products/ProductGrid';

export default function Products() {
  const { categories, selectedCategory, searchQuery, setCategory, setSearchQuery, getFilteredProducts } = useProductStore();
  const filtered = getFilteredProducts();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ minHeight: '100vh' }}>
      <div className="container py-5">
        <div className="section-header">
          <h1 className="section-title">Our <span className="text-gradient">Collection</span></h1>
          <p className="section-subtitle">Premium furniture designed for modern living. All items support AR preview.</p>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="row align-items-center g-3">
            <div className="col-md-6">
              <div className="position-relative">
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>🔍</span>
                <input
                  type="text"
                  className="form-control search-input"
                  placeholder="Search furniture..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  id="product-search"
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Showing {filtered.length} product{filtered.length !== 1 ? 's' : ''}
        </p>

        <ProductGrid products={filtered} />
      </div>
    </motion.div>
  );
}
