import React from 'react';
import useCartStore from '../../store/cartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();
  const navigate = useNavigate();

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="cart-overlay open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
        )}
      </AnimatePresence>

      <div className={`cart-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h5  className="extracted-ui-40">
            Shopping Cart ({items.length})
          </h5>
          <button className="btn-icon" onClick={closeCart}>✕</button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="empty-state">
              <p  className="extracted-ui-41">🛒</p>
              <p>Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.image} alt={item.name} className="cart-item-img" />
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">${(item.price * item.quantity).toFixed(2)}</div>
                  <div className="cart-qty-controls">
                    <button className="cart-qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                    <span  className="extracted-ui-42">{item.quantity}</span>
                    <button className="cart-qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    <button className="extracted-ui-14 cart-qty-btn"  onClick={() => removeItem(item.id)}>🗑</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total</span>
              <span className="text-gradient">${getTotal().toFixed(2)}</span>
            </div>
            <button className="btn btn-aura w-100 mb-2" onClick={handleCheckout}>Proceed to Checkout</button>
            <button className="extracted-ui-43 btn btn-aura-outline w-100"  onClick={clearCart}>Clear Cart</button>
          </div>
        )}
      </div>
    </>
  );
}
