import React, { useState } from 'react';
import { motion } from 'framer-motion';
import useSceneStore from '../../store/sceneStore';
import './SaveSceneModal.scss';

export default function SaveSceneModal({ onClose }) {
  const { currentScene, saveScene } = useSceneStore();
  const [name, setName] = useState(currentScene.name || '');

  const handleSave = () => {
    saveScene(name || `Scene ${Date.now()}`);
    onClose();
  };

  return (
    <div className="modal d-block save-scene-modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <motion.div
          className="modal-content save-scene-modal-content"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="modal-header save-scene-modal-header">
            <h6 className="save-scene-modal-title">💾 Save Scene</h6>
            <button className="btn-close save-scene-modal-close-btn" onClick={onClose}></button>
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
            <p className="save-scene-modal-info-text">
              {currentScene.objects.length} object{currentScene.objects.length !== 1 ? 's' : ''} in scene · Saved to local storage
            </p>
          </div>
          <div className="modal-footer save-scene-modal-footer">
            <button className="btn btn-aura-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-aura" onClick={handleSave}>Save Scene</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
