import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductCard from '../components/products/ProductCard';
import products from '../data/products.json';

const features = [
  { icon: '📱', title: 'AR Placement', desc: 'Place furniture in your room using augmented reality' },
  { icon: '🎯', title: 'Gesture Controls', desc: 'Move, rotate and scale objects with intuitive gestures' },
  { icon: '📸', title: 'Capture & Share', desc: 'Screenshot your designs and share on social media' },
  { icon: '🛒', title: 'Scene Shopping', desc: 'Buy all placed items with one tap from your AR scene' },
];

export default function Home() {
  const featured = products.slice(0, 4);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Hero */}
      <section className="hero-section">
        <div className="container position-relative" style={{ zIndex: 2 }}>
          <div className="row align-items-center">
            <div className="col-lg-6">
              <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                <span className="d-inline-block mb-3 px-3 py-1 rounded-pill" style={{ background: 'rgba(108,92,231,0.15)', color: 'var(--accent-light)', fontSize: '0.85rem', fontWeight: 600 }}>
                  ✨ New AR Experience Available
                </span>
                <h1 className="hero-title">
                  Design Your Space in <span className="gradient-text">Augmented Reality</span>
                </h1>
                <p className="hero-subtitle">
                  Place furniture in your room before you buy. Use AR to visualise, arrange, and shop with confidence.
                </p>
                <div className="d-flex gap-3 flex-wrap">
                  <Link to="/ar" className="btn btn-aura">Try AR Experience →</Link>
                  <Link to="/products" className="btn btn-aura-outline">Browse Products</Link>
                </div>
              </motion.div>
            </div>
            <div className="col-lg-6 text-center mt-5 mt-lg-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                style={{
                  width: '100%',
                  maxWidth: '450px',
                  height: '350px',
                  margin: '0 auto',
                  borderRadius: 'var(--radius-xl)',
                  background: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(0,184,148,0.1))',
                  border: '1px solid var(--border-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '6rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 40%, rgba(108,92,231,0.15) 0%, transparent 60%)' }} />
                🛋️
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-5" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container py-4">
          <div className="section-header">
            <h2 className="section-title">Why Choose <span className="text-gradient">AURA</span></h2>
            <p className="section-subtitle">Cutting-edge technology meets premium furniture design</p>
          </div>
          <div className="row g-4">
            {features.map((f, i) => (
              <div className="col-lg-3 col-md-6" key={i}>
                <motion.div className="feature-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                  <div className="feature-icon">{f.icon}</div>
                  <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.1rem' }}>{f.title}</h5>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{f.desc}</p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-5">
        <div className="container py-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="section-title mb-1" style={{ textAlign: 'left' }}>Featured Products</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Handpicked for your home</p>
            </div>
            <Link to="/products" className="btn btn-aura-outline" style={{ fontSize: '0.85rem', padding: '0.5rem 1.5rem' }}>View All →</Link>
          </div>
          <div className="row g-4">
            {featured.map((p, i) => (
              <div className="col-lg-3 col-md-6" key={p.id}>
                <ProductCard product={p} index={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-5" style={{ background: 'var(--bg-secondary)' }}>
        <div className="container text-center py-5">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="section-title">Ready to Transform Your Space?</h2>
            <p className="section-subtitle mx-auto mb-4">Try our AR viewer to see how furniture looks in your room before purchasing.</p>
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <Link to="/ar" className="btn btn-aura">Launch AR Viewer 📱</Link>
              <Link to="/products" className="btn btn-aura-outline">Browse Products →</Link>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
