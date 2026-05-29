import React, { useState } from 'react';
import { motion } from 'framer-motion';
import useSceneStore from '../../store/sceneStore';

export default function SaveSceneModal({ onClose }) {
  const { currentScene, saveScene } = useSceneStore();
  const [name, setName] = useState(currentScene.name || '');

  const handleSave = () => {
    saveScene(name || `Scene ${Date.now()}`);
    onClose();
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
            <h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, margin: 0 }}>💾 Save Scene</h6>
            <button className="btn-close" style={{ filter: 'invert(1)' }} onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <label className="form-label-aura">Scene Name</label>
            <input
              className="form-control form-aura"
              placeholder="My Living Room Design"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
              {currentScene.objects.length} object{currentScene.objects.length !== 1 ? 's' : ''} in scene · Saved to local storage
            </p>
          </div>
          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button className="btn btn-aura-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-aura" onClick={handleSave}>Save Scene</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
