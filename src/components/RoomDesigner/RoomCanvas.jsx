import React, { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Selection, EffectComposer, Outline } from '@react-three/postprocessing';
import { useRoomStore } from '../../stores/useRoomStore';
import { useCameraStore } from '../../stores/useCameraStore';
import { useFurnitureStore } from '../../stores/useFurnitureStore';
import FloorComponent from './FloorComponent';
import WallComponent from './WallComponent';
import RoomDecorations from './RoomDecorations';
import CameraController from './CameraController';
import RoomMeasurements from './RoomMeasurements';
import FurnitureManager from '../FurniturePlacement/FurnitureManager';

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

export default function RoomCanvas({ xrStore }) {
  const { dimensions, roomTemplate } = useRoomStore();
  const { activeView, isOrthographic } = useCameraStore();
  const { placedItems, activeItemId, setActiveItem, removeFurniture } = useFurnitureStore();
  const isColliding = useFurnitureStore((s) => s.isColliding);
  const controlsRef = useRef();
  const [webglAvailable] = useState(isWebGLAvailable());

  // If WebGL is not supported (e.g. headless tests), display a gorgeous 2D Interactive Blueprint Fallback
  if (!webglAvailable) {
    const wCm = Math.round(dimensions.width * 100);
    const dCm = Math.round(dimensions.depth * 100);
    
    return (
      <div 
        className="room-canvas-container" 
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative', 
          background: '#f4f4f0', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          fontFamily: "'Inter', sans-serif",
          padding: 20
        }}
      >
        <div style={{
          textAlign: 'center',
          marginBottom: 20,
          maxWidth: 400
        }}>
          <div style={{ display: 'inline-block', background: '#0058a3', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: 12, marginBottom: 8 }}>
            2D BLUEPRINT VIEW ACTIVE
          </div>
          <h4 style={{ margin: 0, fontWeight: 800, color: '#111' }}>WebGL Context Offline</h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
            Showing interactive blueprint fallback. You can still list, place, select, and delete showroom items.
          </p>
        </div>

        {/* Blueprint Grid Canvas */}
        <div style={{
          width: '100%',
          maxWidth: 500,
          height: 380,
          background: '#ffffff',
          border: '3px solid #0058a3',
          borderRadius: 16,
          position: 'relative',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Blueprint Grid Lines */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(#0058a3 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            opacity: 0.08
          }} />

          {/* Room Borders */}
          <div style={{
            width: '85%',
            height: '80%',
            border: '2px solid #111111',
            position: 'relative',
            background: 'rgba(0, 88, 163, 0.02)'
          }}>
            {/* Dimensions labels */}
            <div style={{ position: 'absolute', bottom: -24, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontWeight: 700, color: '#0058a3' }}>
              ← Width: {wCm} cm →
            </div>
            <div style={{ position: 'absolute', right: -65, top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: 11, fontWeight: 700, color: '#0058a3' }}>
              ← Length: {dCm} cm →
            </div>

            {/* Placed Items as selectable HTML cards in 2D space */}
            {placedItems.map((item, idx) => {
              // Convert 3D position [-3.2 to 3.2] to percentage coordinate
              const xPos = 50 + (item.position[0] / (dimensions.width / 2)) * 42;
              const yPos = 50 + (item.position[2] / (dimensions.depth / 2)) * 42;
              const isSelected = activeItemId === item.instanceId;

              return (
                <div
                  key={item.instanceId || idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveItem(item.instanceId);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${xPos}%`,
                    top: `${yPos}%`,
                    transform: 'translate(-50%, -50%)',
                    width: Math.max(60, (item.dimensions?.width || 80) * 0.7),
                    height: Math.max(50, (item.dimensions?.depth || 80) * 0.7),
                    background: isSelected ? '#ffcc00' : '#ffffff',
                    border: isSelected ? '2px solid #0058a3' : '1.5px solid #111',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    boxShadow: isSelected ? '0 4px 12px rgba(0,88,163,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
                    zIndex: isSelected ? 10 : 2,
                    userSelect: 'none'
                  }}
                >
                  <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#111', textAlign: 'center', lineHeight: 1.1 }}>
                    {item.name.split(' ')[0]}
                  </span>
                  <span style={{ fontSize: '8px', color: '#666', marginTop: 2 }}>
                    {item.dimensions?.width}x{item.dimensions?.depth}cm
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected toolbar clone for 2D mode */}
        {activeItemId && (
          <div style={{
            marginTop: 15,
            background: '#111',
            borderRadius: 20,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>
              Selected: {placedItems.find(i => i.instanceId === activeItemId)?.name}
            </span>
            <button 
              onClick={() => removeFurniture(activeItemId)}
              style={{ background: '#ff3333', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              Remove
            </button>
            <button 
              onClick={() => setActiveItem(null)}
              style={{ background: '#444', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              Deselect
            </button>
          </div>
        )}
      </div>
    );
  }

  // WebGL is supported, load Canvas
  return (
    <div className="room-canvas-container" style={{ width: '100%', height: '100%', position: 'relative', background: '#f5f5f0' }}>
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        orthographic={isOrthographic}
        camera={{
          position: [5, 5, 5],
          fov: 50,
          zoom: isOrthographic ? 50 : 1
        }}
        shadows
      >
        <Suspense fallback={null}>
          <Selection>
            <EffectComposer autoClear={false}>
              <Outline 
                blur 
                visibleEdgeColor={isColliding ? "#ff3333" : "#ffcc00"} 
                hiddenEdgeColor={isColliding ? "#ff3333" : "#ffcc00"} 
                edgeStrength={8} 
                width={1000} 
              />
            </EffectComposer>
            <group>
              <Environment preset="apartment" />
              
              {/* Studio Lights */}
              <ambientLight intensity={0.4} />
              
              {/* Soft directional light simulating window light */}
              <directionalLight 
                castShadow 
                position={[8, 12, 5]} 
                intensity={1.2} 
                shadow-mapSize={[2048, 2048]} 
                shadow-bias={-0.0001}
              />
              
              {/* Ceiling light for cozy warm ambient lighting */}
              <pointLight 
                position={[0, dimensions.height - 0.2, 0]} 
                intensity={0.8} 
                color="#fff6e0" 
                castShadow 
                distance={15}
              />

              <group position={[0, 0, 0]}>
                <FloorComponent width={dimensions.width} depth={dimensions.depth} />
                
                {activeView === 'top' && (
                  <gridHelper 
                    args={[
                      Math.max(dimensions.width, dimensions.depth), 
                      Math.max(dimensions.width, dimensions.depth) * 2, 
                      '#0058a3', 
                      '#dddddd'
                    ]} 
                    position={[0, 0.01, 0]} 
                  />
                )}
                
                <WallComponent width={dimensions.width} height={dimensions.height} depth={dimensions.depth} />
                <RoomDecorations />
                <RoomMeasurements />
                <FurnitureManager />
              </group>

              <ContactShadows 
                position={[0, 0.01, 0]} 
                opacity={0.5} 
                scale={Math.max(dimensions.width, dimensions.depth) * 1.5} 
                blur={2.5} 
                far={10} 
              />
              
              <OrbitControls 
                ref={controlsRef}
                makeDefault 
                enableRotate={activeView !== 'top'} 
                enablePan={true}
                enableDamping={true}
                dampingFactor={0.05}
                minDistance={1.5}
                maxDistance={25}
                minPolarAngle={Math.PI / 6}
                maxPolarAngle={Math.PI / 2.05}
              />

              <CameraController controlsRef={controlsRef} />
            </group>
          </Selection>
        </Suspense>
      </Canvas>
    </div>
  );
}
