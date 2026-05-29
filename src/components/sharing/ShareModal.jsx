import React from 'react';
import { motion } from 'framer-motion';

export default function ShareModal({ onClose }) {
  const socials = [
    { name: 'Instagram', icon: '📷', color: '#E4405F' },
    { name: 'TikTok', icon: '🎵', color: '#00F2EA' },
    { name: 'Facebook', icon: '📘', color: '#1877F2' },
    { name: 'Twitter', icon: '🐦', color: '#1DA1F2' },
    { name: 'Pinterest', icon: '📌', color: '#BD081C' },
    { name: 'WhatsApp', icon: '💬', color: '#25D366' },
    { name: 'Copy Link', icon: '🔗', color: '#6c5ce7' },
    { name: 'Download', icon: '⬇️', color: '#00b894' },
  ];

  const handleShare = (platform) => {
    if (platform === 'Copy Link') {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied!');
    } else if (platform === 'Download') {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `aura-share-${Date.now()}.png`;
        a.click();
      }
    } else {
      alert(`Sharing to ${platform} — social integration simulation`);
    }
  };

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.7)', zIndex: 1070 }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <motion.div
          className="modal-content"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="modal-header" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, margin: 0 }}>📤 Share Your Design</h6>
            <button className="btn-close" style={{ filter: 'invert(1)' }} onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="share-grid">
              {socials.map((s) => (
                <button key={s.name} className="share-btn" onClick={() => handleShare(s.name)}>
                  <span className="share-icon">{s.icon}</span>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
