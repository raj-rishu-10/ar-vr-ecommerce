import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useSceneStore from '../store/sceneStore';

export default function SavedScenes() {
  const { scenes, loadScene, deleteScene, newScene } = useSceneStore();
  const navigate = useNavigate();

  const handleLoad = (id) => {
    loadScene(id);
    navigate('/ar');
  };

  const handleNew = () => {
    newScene();
    navigate('/ar');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ minHeight: '100vh' }}>
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="section-title mb-1" style={{ textAlign: 'left' }}>Saved <span className="text-gradient">Scenes</span></h1>
            <p style={{ color: 'var(--text-secondary)' }}>Your AR scene designs saved locally</p>
          </div>
          <button className="btn btn-aura" onClick={handleNew}>+ New Scene</button>
        </div>

        {scenes.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: '3rem' }}>🎨</p>
            <h4>No saved scenes yet</h4>
            <p style={{ color: 'var(--text-muted)' }}>Create a new AR scene and save it to see it here.</p>
            <button className="btn btn-aura mt-3" onClick={handleNew}>Create First Scene</button>
          </div>
        ) : (
          <div className="row g-3">
            {scenes.map((scene, i) => (
              <div className="col-md-4" key={scene.id}>
                <motion.div
                  className="scene-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, margin: 0 }}>{scene.name}</h6>
                    <button className="btn-icon" style={{ width: 28, height: 28, fontSize: '0.7rem' }} onClick={() => deleteScene(scene.id)}>🗑</button>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    {scene.objects.length} object{scene.objects.length !== 1 ? 's' : ''} · {new Date(scene.savedAt).toLocaleDateString()}
                  </p>
                  <div className="d-flex gap-2 flex-wrap mb-3">
                    {scene.objects.slice(0, 3).map((obj) => (
                      <span key={obj.uid} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{obj.name}</span>
                    ))}
                    {scene.objects.length > 3 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{scene.objects.length - 3} more</span>}
                  </div>
                  <button className="btn btn-ar w-100" onClick={() => handleLoad(scene.id)}>Open in AR Viewer →</button>
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
