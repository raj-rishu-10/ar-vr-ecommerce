import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Confirmation() {
  const orderNum = `AURA-${Date.now().toString(36).toUpperCase()}`;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="extracted-ui-68 container py-5 text-center" >
      <div  className="extracted-ui-69">
        <div className="confirmation-icon">✓</div>
        <h2  className="extracted-ui-70">Order Confirmed!</h2>
        <p  className="extracted-ui-26">Thank you for your purchase. Your order <strong  className="extracted-ui-27">{orderNum}</strong> has been placed successfully.</p>
        <div className="extracted-ui-71 checkout-card text-start mb-4" >
          <div className="d-flex justify-content-between mb-2"><span  className="extracted-ui-28">Status</span><span  className="extracted-ui-29">Processing</span></div>
          <div className="d-flex justify-content-between mb-2"><span  className="extracted-ui-30">Delivery</span><span>3-5 business days</span></div>
          <div className="d-flex justify-content-between"><span  className="extracted-ui-31">Tracking</span><span  className="extracted-ui-32">Email sent</span></div>
        </div>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
          <Link to="/products" className="btn btn-aura">Continue Shopping</Link>
          <Link to="/ar" className="btn btn-aura-outline">Try AR View</Link>
        </div>
      </div>
    </motion.div>
  );
}
