import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';

export default function Checkout() {
  const { items, getTotal, clearCart } = useCartStore();
  const navigate = useNavigate();
  const [promo, setPromo] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const subtotal = getTotal();
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const shipping = subtotal > 500 ? 0 : 29.99;
  const total = subtotal - discount + shipping;

  const handleSubmit = (e) => {
    e.preventDefault();
    clearCart();
    navigate('/confirmation');
  };

  const applyPromo = () => {
    if (promo.toLowerCase() === 'aura10') {
      setPromoApplied(true);
    }
  };

  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container py-5 text-center">
        <div className="empty-state">
          <p style={{ fontSize: '3rem' }}>🛒</p>
          <h3>Your cart is empty</h3>
          <p style={{ color: 'var(--text-muted)' }}>Add some products before checking out.</p>
          <button className="btn btn-aura mt-3" onClick={() => navigate('/products')}>Browse Products</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="checkout-page">
      <div className="container">
        <h1 className="section-title text-center mb-4">Checkout</h1>
        <form onSubmit={handleSubmit}>
          <div className="row g-4">
            {/* Left - Forms */}
            <div className="col-lg-7">
              {/* Shipping */}
              <div className="checkout-card mb-4">
                <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '1.5rem' }}>📦 Shipping Information</h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label-aura">First Name</label>
                    <input className="form-control form-aura" placeholder="John" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label-aura">Last Name</label>
                    <input className="form-control form-aura" placeholder="Doe" required />
                  </div>
                  <div className="col-12">
                    <label className="form-label-aura">Email</label>
                    <input type="email" className="form-control form-aura" placeholder="john@example.com" required />
                  </div>
                  <div className="col-12">
                    <label className="form-label-aura">Address</label>
                    <input className="form-control form-aura" placeholder="123 Main Street" required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label-aura">City</label>
                    <input className="form-control form-aura" placeholder="New York" required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label-aura">State</label>
                    <input className="form-control form-aura" placeholder="NY" required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label-aura">ZIP</label>
                    <input className="form-control form-aura" placeholder="10001" required />
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="checkout-card">
                <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '1.5rem' }}>💳 Payment Details</h5>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label-aura">Card Number</label>
                    <input className="form-control form-aura" placeholder="4242 4242 4242 4242" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label-aura">Expiry</label>
                    <input className="form-control form-aura" placeholder="MM/YY" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label-aura">CVC</label>
                    <input className="form-control form-aura" placeholder="123" required />
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Summary */}
            <div className="col-lg-5">
              <div className="checkout-card" style={{ position: 'sticky', top: '100px' }}>
                <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '1.5rem' }}>🧾 Order Summary</h5>
                {items.map((item) => (
                  <div key={item.id} className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <img src={item.image} alt={item.name} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Qty: {item.quantity}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}

                <hr style={{ borderColor: 'var(--border-subtle)' }} />

                {/* Promo */}
                <div className="d-flex gap-2 mb-3">
                  <input className="form-control form-aura" placeholder="Promo code (try AURA10)" value={promo} onChange={(e) => setPromo(e.target.value)} style={{ fontSize: '0.85rem' }} />
                  <button type="button" className="btn btn-aura-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }} onClick={applyPromo}>Apply</button>
                </div>
                {promoApplied && <p style={{ color: 'var(--success)', fontSize: '0.8rem' }}>✓ 10% discount applied!</p>}

                <div className="d-flex justify-content-between mb-2" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="d-flex justify-content-between mb-2" style={{ fontSize: '0.9rem', color: 'var(--success)' }}>
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between mb-3" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                </div>
                <hr style={{ borderColor: 'var(--border-subtle)' }} />
                <div className="d-flex justify-content-between mb-4" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  <span>Total</span>
                  <span className="text-gradient">${total.toFixed(2)}</span>
                </div>

                <button type="submit" className="btn btn-aura w-100" id="place-order-btn">
                  Place Order — ${total.toFixed(2)}
                </button>
                <p className="text-center mt-2 mb-0" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  🔒 Secure checkout — no real payment processed
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
