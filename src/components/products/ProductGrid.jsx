import React from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid({ products }) {
  if (!products.length) {
    return (
      <div className="empty-state">
        <h4>No products found</h4>
        <p>Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="row g-4">
      {products.map((product, i) => (
        <div className="col-lg-3 col-md-4 col-sm-6" key={product.id}>
          <ProductCard product={product} index={i} />
        </div>
      ))}
    </div>
  );
}
