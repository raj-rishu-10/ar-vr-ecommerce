import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './NotFound.scss';

export default function NotFound() {
  return (
    <motion.div 
      className="not-found-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Oops! Looks like you're lost in space.</h2>
        <p className="not-found-text">
          The page or 3D scene you are looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn btn-primary not-found-btn">
          Back to Home
        </Link>
      </div>
    </motion.div>
  );
}
