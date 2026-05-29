import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="aura-footer">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4 col-md-6">
            <h3 className="aura-brand mb-3" style={{ fontSize: '1.4rem' }}>AURA</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              Experience the future of furniture shopping with augmented reality.
            </p>
          </div>
          <div className="col-lg-2 col-md-6">
            <h6 className="footer-title">Explore</h6>
            <Link to="/products" className="footer-link">Shop All</Link>
            <Link to="/ar" className="footer-link">AR Viewer</Link>
            <Link to="/scenes" className="footer-link">My Scenes</Link>
          </div>
          <div className="col-lg-2 col-md-6">
            <h6 className="footer-title">Company</h6>
            <span className="footer-link">About Us</span>
            <span className="footer-link">Careers</span>
            <span className="footer-link">Press</span>
            <span className="footer-link">Blog</span>
          </div>
          <div className="col-lg-2 col-md-6">
            <h6 className="footer-title">Support</h6>
            <span className="footer-link">Help Center</span>
            <span className="footer-link">Returns</span>
            <span className="footer-link">Shipping</span>
            <span className="footer-link">Contact</span>
          </div>
          <div className="col-lg-2 col-md-6">
            <h6 className="footer-title">Legal</h6>
            <span className="footer-link">Privacy</span>
            <span className="footer-link">Terms</span>
            <span className="footer-link">Cookies</span>
          </div>
        </div>
        <hr style={{ borderColor: 'var(--border-subtle)', margin: '2rem 0 1rem' }} />
        <p className="text-center mb-0" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          © 2026 AURA. All rights reserved. Built with React & Three.js
        </p>
      </div>
    </footer>
  );
}
