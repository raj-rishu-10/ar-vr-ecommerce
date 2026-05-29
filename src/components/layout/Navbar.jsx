import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useCartStore from '../../store/cartStore';

export default function Navbar() {
  const location = useLocation();
  const { openCart, getItemCount } = useCartStore();
  const count = getItemCount();

  const links = [
    { path: '/', label: 'Home' },
    { path: '/products', label: 'Shop' },
    { path: '/ar', label: 'Quick AR' },
    { path: '/room-builder', label: 'Room Builder' },
    { path: '/scenes', label: 'Scenes' },
  ];

  return (
    <nav className="navbar navbar-expand-lg aura-navbar">
      <div className="container">
        <Link className="navbar-brand aura-brand" to="/">AURA</Link>
        <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#auraNav" style={{ filter: 'invert(1)' }}>
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="auraNav">
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
            {links.map((l) => (
              <li className="nav-item" key={l.path}>
                <Link className={`nav-link aura-nav-link ${location.pathname === l.path ? 'active' : ''}`} to={l.path}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="d-flex align-items-center gap-2">
            <button className="btn-icon position-relative" onClick={openCart} id="cart-toggle-btn" aria-label="Open cart">
              🛒
              {count > 0 && <span className="cart-badge">{count}</span>}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
