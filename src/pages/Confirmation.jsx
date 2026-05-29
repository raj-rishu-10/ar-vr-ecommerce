import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Confirmation() {
  const orderNum = `AURA-${Date.now().toString(36).toUpperCase()}`;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container py-5 text-center" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 500 }}>
        <div className="confirmation-icon">✓</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Order Confirmed!</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>Thank you for your purchase. Your order <strong style={{ color: 'var(--accent-light)' }}>{orderNum}</strong> has been placed successfully.</p>
        <div className="checkout-card text-start mb-4" style={{ background: 'var(--bg-card)' }}>
          <div className="d-flex justify-content-between mb-2"><span style={{ color: 'var(--text-muted)' }}>Status</span><span style={{ color: 'var(--success)' }}>Processing</span></div>
          <div className="d-flex justify-content-between mb-2"><span style={{ color: 'var(--text-muted)' }}>Delivery</span><span>3-5 business days</span></div>
          <div className="d-flex justify-content-between"><span style={{ color: 'var(--text-muted)' }}>Tracking</span><span style={{ color: 'var(--accent-light)' }}>Email sent</span></div>
        </div>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
          <Link to="/products" className="btn btn-aura">Continue Shopping</Link>
          <Link to="/ar" className="btn btn-aura-outline">Try AR View</Link>
        </div>
      </div>
    </motion.div>
  );
}
