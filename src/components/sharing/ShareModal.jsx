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
    <div className="extracted-ui-49 modal d-block"  onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <motion.div
          className="extracted-ui-16 modal-content"
          
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="extracted-ui-50 modal-header" >
            <h6  className="extracted-ui-51">📤 Share Your Design</h6>
            <button className="extracted-ui-52 btn-close"  onClick={onClose}></button>
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
