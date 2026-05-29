import React, { Suspense, useEffect, useRef, useState } from 'react';
import { XR, createXRStore, XRDomOverlay } from '@react-three/xr';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import XRHitTestCursor from './XRHitTestCursor';
import XRPlacedProduct from './XRPlacedProduct';
import { useARSceneStore } from '../../store/useARSceneStore';
import products from '../../data/products.json';
import { useNavigate } from 'react-router-dom';

const AR_PRODUCTS = products.filter((p) => p.glbModel);

const store = createXRStore({
  sessionInit: {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
  }
});

export default function WebXREditor() {
  const navigate = useNavigate();
  const placedItems = useARSceneStore((s) => s.placedItems);
  const activeProduct = useARSceneStore((s) => s.activeProduct);
  const setActiveProduct = useARSceneStore((s) => s.setActiveProduct);
  const activeItemId = useARSceneStore((s) => s.activeItemId);
  const deleteItem = useARSceneStore((s) => s.deleteItem);
  const duplicateItem = useARSceneStore((s) => s.duplicateItem);
  const undo = useARSceneStore((s) => s.undo);
  const saveScene = useARSceneStore((s) => s.saveScene);
  const loadScene = useARSceneStore((s) => s.loadScene);
  
  const [isSupported, setIsSupported] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    // Check if WebXR is supported
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        setIsSupported(supported);
      });
    }
    
    // Set initial product
    if (!activeProduct) {
      setActiveProduct(AR_PRODUCTS[0]);
    }
  }, [activeProduct, setActiveProduct]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f', position: 'relative' }}>
      
      {!isSupported && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: '#0a0a0f', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <h2>WebXR Not Supported</h2>
          <p>Your browser or device does not support WebXR Immersive AR (Requires Android Chrome).</p>
          <button onClick={() => navigate(-1)} style={{ padding: '10px 20px', marginTop: '20px', borderRadius: '8px', background: '#6c5ce7', color: 'white', border: 'none', cursor: 'pointer' }}>
            Go Back
          </button>
        </div>
      )}

      {/* AR Start Button */}
      <button 
        onClick={() => store.enterAR()}
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          padding: '16px 32px', fontSize: '1.2rem', fontWeight: 'bold',
          background: 'linear-gradient(135deg, #00b894, #00cec9)', color: 'white',
          border: 'none', borderRadius: '30px', cursor: 'pointer', zIndex: 50,
          boxShadow: '0 10px 30px rgba(0, 184, 148, 0.4)'
        }}
      >
        Start AR Room Builder
      </button>

      {/* R3F Canvas */}
      <Canvas style={{ position: 'absolute', inset: 0 }} onPointerDownMissed={() => window.dispatchEvent(new Event('ar-tap'))}>
        <XR store={store}>
          <ambientLight intensity={1} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
          <Environment preset="city" />
          
          <Suspense fallback={null}>
            <XRHitTestCursor />
            {placedItems.map(item => (
              <XRPlacedProduct key={item.id} item={item} />
            ))}
          </Suspense>

          {/* DOM Overlay UI Layer */}
          <XRDomOverlay>
            <div 
              style={{ 
                position: 'absolute', inset: 0, pointerEvents: 'none', 
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                padding: 'max(env(safe-area-inset-top), 1rem) 1rem max(env(safe-area-inset-bottom), 1.5rem)'
              }}
            >
              
              {/* TOP BAR */}
              <div style={{ display: 'flex', justifyContent: 'space-between', pointerEvents: 'auto' }}>
                <button 
                  onClick={() => navigate(-1)}
                  style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
                >←</button>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={undo} style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>↩ Undo</button>
                  <button onClick={saveScene} style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(108,92,231,0.8)', color: 'white', border: 'none' }}>💾 Save</button>
                  <button onClick={loadScene} style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(0,184,148,0.8)', color: 'white', border: 'none' }}>📂 Load</button>
                </div>
              </div>

              {/* MIDDLE RIGHT: Tools for active item */}
              {activeItemId && (
                <div style={{ alignSelf: 'flex-end', display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'auto' }}>
                  <button 
                    onClick={() => duplicateItem(activeItemId)}
                    style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontSize: '1.2rem', backdropFilter: 'blur(10px)' }}
                  >📑</button>
                  <button 
                    onClick={() => deleteItem(activeItemId)}
                    style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,118,117,0.8)', color: 'white', border: 'none', fontSize: '1.2rem', backdropFilter: 'blur(10px)' }}
                  >🗑️</button>
                </div>
              )}

              {/* BOTTOM PANEL: Product Carousel */}
              <div style={{ pointerEvents: 'auto', background: 'rgba(10,10,15,0.8)', padding: '1rem', borderRadius: '16px', backdropFilter: 'blur(15px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h4 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '0.9rem' }}>Select Product to Place:</h4>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth: 'none' }}>
                  {AR_PRODUCTS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setActiveProduct(p)}
                      style={{
                        flexShrink: 0, width: 60, height: 60, borderRadius: '10px', padding: 0, overflow: 'hidden',
                        border: activeProduct?.id === p.id ? '2px solid #00cec9' : '2px solid transparent',
                        background: 'transparent'
                      }}
                    >
                      <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </XRDomOverlay>
        </XR>
      </Canvas>
    </div>
  );
}
