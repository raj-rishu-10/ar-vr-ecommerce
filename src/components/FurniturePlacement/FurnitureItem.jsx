import React, { useMemo, useState } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import { Select } from '@react-three/postprocessing';
import { useFurnitureStore } from '../../stores/useFurnitureStore';
import useCartStore from '../../store/cartStore';
import * as THREE from 'three';

export default function FurnitureItem({ item, setRef }) {
  const { scene } = useGLTF(item.glbModel);
  const { 
    activeItemId, 
    setActiveItem, 
    interactionMode, 
    setInteractionMode, 
    removeFurniture,
    duplicateFurniture,
    rotateFurnitureIncremental
  } = useFurnitureStore();
  
  const addItem = useCartStore(s => s.addItem);
  const [showRotationSubmenu, setShowRotationSubmenu] = useState(false);
  const isSelected = activeItemId === item.instanceId;

  // Clone scene inside useMemo to keep mesh references stable
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  const box = useMemo(() => {
    return new THREE.Box3().setFromObject(clonedScene);
  }, [clonedScene]);

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const priceRs = Math.round((item.price || 0) * 83);

  return (
    <group 
      ref={setRef}
      position={item.position} 
      rotation={item.rotation} 
      scale={item.scale}
      onClick={(e) => {
        e.stopPropagation();
        setActiveItem(item.instanceId);
      }}
    >
      <Select enabled={isSelected}>
        <primitive object={clonedScene} />
      </Select>
      
      {/* ── Bounding Dimension Lines and Labels ── */}
      {isSelected && (
        <group>
          {/* Bounding outline */}
          <boxHelper args={[clonedScene, '#ffcc00']} />

          {/* Width Label (Front Floor Edge) */}
          <group position={[0, -0.01, size.z / 2 + 0.15]}>
            <Html center>
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #ffcc00',
                color: '#111111',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: "'Inter', sans-serif",
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}>
                W: {item.dimensions?.width || Math.round(size.x * 100)} cm
              </div>
            </Html>
          </group>

          {/* Height Label (Side Vertical) */}
          <group position={[-size.x / 2 - 0.15, size.y / 2, 0]}>
            <Html center>
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #ffcc00',
                color: '#111111',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: "'Inter', sans-serif",
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}>
                H: {item.dimensions?.height || Math.round(size.y * 100)} cm
              </div>
            </Html>
          </group>

          {/* Depth Label (Side Floor Edge) */}
          <group position={[size.x / 2 + 0.15, -0.01, 0]}>
            <Html center>
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #ffcc00',
                color: '#111111',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: "'Inter', sans-serif",
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}>
                D: {item.dimensions?.depth || Math.round(size.z * 100)} cm
              </div>
            </Html>
          </group>
        </group>
      )}

      {/* ── Floating IKEA Action Toolbar ── */}
      {isSelected && (
        <Html position={[0, size.y + 0.5, 0]} center zIndexRange={[1000, 0]}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            fontFamily: "'Inter', system-ui, sans-serif"
          }}>
            {/* Main Action Bar */}
            <div style={{
              background: 'rgba(17, 17, 17, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              padding: '6px 8px',
              display: 'flex',
              gap: 4,
              boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
              border: '1px solid rgba(255,255,255,0.12)'
            }}>
              {[
                { 
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>, 
                  label: 'Add to bag', 
                  action: () => addItem(item) 
                },
                { 
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.87-11.1l5-3"/></svg>, 
                  label: 'Rotate', 
                  action: () => setShowRotationSubmenu(s => !s) 
                },
                { 
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3l4 4-4 4M3 9h18M7 21l-4-4 4-4M21 15H3"/></svg>, 
                  label: 'Replace', 
                  action: () => {
                    // Triggers replace state by opening similar products in the options panel on the left sidebar
                    const customEvent = new CustomEvent('ikea-replace-furniture', { detail: item });
                    window.dispatchEvent(customEvent);
                  }
                },
                { 
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>, 
                  label: 'Make copy', 
                  action: () => duplicateFurniture(item.instanceId) 
                },
                { 
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>, 
                  label: 'Remove', 
                  action: () => removeFurniture(item.instanceId) 
                },
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={(e) => { e.stopPropagation(); btn.action(); }}
                  style={{
                    background: (btn.label === 'Rotate' && showRotationSubmenu) ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    border: 'none', 
                    color: '#ffffff', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: 4,
                    padding: '8px 10px', 
                    borderRadius: 12,
                    transition: 'background 0.2s',
                    minWidth: 64
                  }}
                  onMouseEnter={e => {
                    if (!(btn.label === 'Rotate' && showRotationSubmenu)) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!(btn.label === 'Rotate' && showRotationSubmenu)) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>{btn.icon}</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, whiteSpace: 'nowrap', opacity: 0.9 }}>{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Incremental Rotation Angle Panel */}
            {showRotationSubmenu && (
              <div style={{
                background: 'rgba(17, 17, 17, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: 12,
                padding: '4px 6px',
                display: 'flex',
                gap: 4,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {[15, 30, 45, 90].map(angle => (
                  <button
                    key={angle}
                    onClick={(e) => {
                      e.stopPropagation();
                      rotateFurnitureIncremental(item.instanceId, angle);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ffcc00', // IKEA Yellow highlight
                      fontWeight: 800,
                      fontSize: '11px',
                      padding: '6px 8px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    +{angle}°
                  </button>
                ))}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
