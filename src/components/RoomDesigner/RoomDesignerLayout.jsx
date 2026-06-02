import React, { useEffect, useRef } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { useCameraStore } from '../../stores/useCameraStore';
import { useFurnitureStore } from '../../stores/useFurnitureStore';
import RoomCanvas from './RoomCanvas';
import RoomScanner from '../RoomScanner/RoomScanner';
import products from '../../data/products.json';
import { ARButton } from '@react-three/xr';

export default function RoomDesignerLayout() {
  const { setDimensions, wallMaterial, setWallMaterial } = useRoomStore();
  const { activeView, setView } = useCameraStore();
  const { interactionMode, setInteractionMode, clearRoom, addFurniture, placedItems } = useFurnitureStore();
  const [showScanner, setShowScanner] = React.useState(false);
  const { projects, currentProjectId, saveCurrentProjectData } = useProjectStore();

  const isInitialMount = useRef(true);

  // Initialize room data on mount
  useEffect(() => {
    if (!currentProjectId) return;
    const project = projects.find(p => p.id === currentProjectId);
    if (project) {
      if (project.roomData) {
        useRoomStore.setState({ 
          dimensions: project.roomData.dimensions,
          wallMaterial: project.roomData.wallMaterial,
          floorMaterial: project.roomData.floorMaterial
        });
      }
      if (project.sceneData) {
        useFurnitureStore.setState({ placedItems: project.sceneData });
      }
    }
  }, [currentProjectId]);

  // Auto-save when room or furniture changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (currentProjectId) {
      const roomData = {
        dimensions: useRoomStore.getState().dimensions,
        wallMaterial: useRoomStore.getState().wallMaterial,
        floorMaterial: useRoomStore.getState().floorMaterial
      };
      saveCurrentProjectData(placedItems, roomData);
    }
  }, [placedItems, useRoomStore.getState().dimensions, useRoomStore.getState().wallMaterial, useRoomStore.getState().floorMaterial]);

  const AR_PRODUCTS = products.filter((p) => p.glbModel);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Sidebar: Room Settings */}
      <aside style={{ width: '300px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 10 }}>
        <h2>Room Settings</h2>
        
        <button 
          onClick={() => setShowScanner(true)}
          style={{ width: '100%', padding: '12px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          ✨ AI Scan Room
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label>Width (m)</label>
          <input type="number" value={useRoomStore.getState().dimensions.width} onChange={(e) => setDimensions(parseFloat(e.target.value) || 5, useRoomStore.getState().dimensions.height, useRoomStore.getState().dimensions.depth)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label>Depth (m)</label>
          <input type="number" value={useRoomStore.getState().dimensions.depth} onChange={(e) => setDimensions(useRoomStore.getState().dimensions.width, useRoomStore.getState().dimensions.height, parseFloat(e.target.value) || 5)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label>Wall Color</label>
          <input type="color" value={wallMaterial.color} onChange={(e) => setWallMaterial({ color: e.target.value })} />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

        <h3>Camera View</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['perspective', 'top', 'front', 'dollhouse'].map(view => (
            <button 
              key={view} 
              onClick={() => setView(view)}
              style={{
                padding: '8px 12px',
                background: activeView === view ? '#0f172a' : '#fff',
                color: activeView === view ? '#fff' : '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {view}
            </button>
          ))}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

        <h3>Add Furniture</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', overflowY: 'auto', paddingBottom: '20px' }}>
          {AR_PRODUCTS.map(product => (
            <div 
              key={product.id}
              onClick={() => addFurniture(product)}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                overflow: 'hidden',
                background: '#fff'
              }}
            >
              <img src={product.image} alt={product.name} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
              <div style={{ padding: '6px', fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center', color: '#0f172a' }}>
                {product.name}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main style={{ flex: 1, position: 'relative' }}>
        
        {/* Top Toolbar (Furniture Interactions) */}
        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '10px', background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {['select', 'translate', 'rotate', 'scale'].map(mode => (
            <button
              key={mode}
              onClick={() => setInteractionMode(mode)}
              style={{
                padding: '8px 16px',
                background: interactionMode === mode ? '#0058a3' : '#f1f5f9',
                color: interactionMode === mode ? '#fff' : '#0f172a',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontWeight: 'bold'
              }}
            >
              {mode}
            </button>
          ))}
          <div style={{ width: '1px', background: '#cbd5e1', margin: '0 10px' }} />
          <button onClick={clearRoom} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Clear Room
          </button>
        </div>

        {/* WebXR AR Button Overlay */}
        <ARButton 
          style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 10, padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
          sessionInit={{ requiredFeatures: ['hit-test'] }}
        />

        <RoomCanvas />
      </main>

      {showScanner && <RoomScanner onClose={() => setShowScanner(false)} />}
    </div>
  );
}
