import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/index.css';
import App from './App';

// Suppress known Three.js deprecation warnings from R3F internals
// These come from @react-three/fiber and @react-three/drei, not our code
const _warn = console.warn;
console.warn = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('THREE.Clock') ||
    msg.includes('PCFSoftShadowMap') ||
    msg.includes('Multiple instances of Three.js')
  ) return;
  _warn.apply(console, args);
};

// Note: StrictMode is removed because it double-mounts components,
// which causes R3F to create/destroy/recreate WebGL contexts → "Context Lost"
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
