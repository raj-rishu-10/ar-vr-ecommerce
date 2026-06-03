import React, { useMemo } from 'react';
import { useGLTF, Clone, Html } from '@react-three/drei';
import { Select } from '@react-three/postprocessing';
import { useFurnitureStore } from '../../stores/useFurnitureStore';
import * as THREE from 'three';

export default function FurnitureItem({ item, setRef }) {
  const { scene } = useGLTF(item.glbModel);
  const { activeItemId, setActiveItem, interactionMode, setInteractionMode, removeFurniture } = useFurnitureStore();
  
  const isSelected = activeItemId === item.instanceId;

  const box = useMemo(() => {
    return new THREE.Box3().setFromObject(scene);
  }, [scene]);

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

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
        <Clone object={scene} castShadow receiveShadow />
      </Select>
      
      {isSelected && (
        <Html position={[0, size.y + 0.6, 0]} center zIndexRange={[100, 0]}>
            <div style={{
              background: '#222', borderRadius: 30, padding: '8px 12px', display: 'flex', gap: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontFamily: "'Inter', system-ui, sans-serif"
            }}>
              {[
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>, label: 'Add to bag' },
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.87-11.1l5-3"/></svg>, label: 'Rotate', action: () => setInteractionMode(interactionMode === 'rotate' ? 'translate' : 'rotate') },
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3l4 4-4 4M3 9h18M7 21l-4-4 4-4M21 15H3"/></svg>, label: 'Replace' },
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, label: 'Goes with' },
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>, label: 'Make copy', action: () => {
                  const cloned = { ...item, instanceId: crypto.randomUUID(), position: [item.position[0] + 0.5, item.position[1], item.position[2] + 0.5] };
                  useFurnitureStore.setState(s => ({ placedItems: [...s.placedItems, cloned] }));
                }},
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>, label: 'Remove', action: () => removeFurniture(item.instanceId) },
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={(e) => { e.stopPropagation(); if(btn.action) btn.action(); }}
                  style={{
                    background: interactionMode === 'rotate' && btn.label === 'Rotate' ? '#444' : 'transparent',
                    border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '8px 12px', borderRadius: 8
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#444'}
                  onMouseLeave={e => e.currentTarget.style.background = (interactionMode === 'rotate' && btn.label === 'Rotate') ? '#444' : 'transparent'}
                >
                  <span style={{ fontSize: 18 }}>{btn.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>{btn.label}</span>
                </button>
              ))}
            </div>
          </Html>
      )}
    </group>
  );
}
