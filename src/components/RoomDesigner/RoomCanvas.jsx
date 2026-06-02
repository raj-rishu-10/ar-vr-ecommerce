import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { XR } from '@react-three/xr';
import { useRoomStore } from '../../stores/useRoomStore';
import { useCameraStore } from '../../stores/useCameraStore';
import FloorComponent from './FloorComponent';
import WallComponent from './WallComponent';
import FurnitureManager from '../FurniturePlacement/FurnitureManager';

export default function RoomCanvas({ xrStore }) {
  const { dimensions } = useRoomStore();
  const { activeView, isOrthographic } = useCameraStore();

  return (
    <div className="room-canvas-container" style={{ width: '100%', height: '100%', position: 'relative', background: '#f0f0f0' }}>
      <Canvas
        orthographic={isOrthographic}
        camera={{
          position: activeView === 'top' ? [0, 10, 0] : [5, 5, 5],
          fov: 50,
          zoom: isOrthographic ? 50 : 1
        }}
        shadows
      >
        <Suspense fallback={null}>
          <XR store={xrStore}>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <directionalLight castShadow position={[5, 10, 5]} intensity={1} shadow-mapSize={[1024, 1024]} />
            
            <group position={[0, 0, 0]}>
              <FloorComponent width={dimensions.width} depth={dimensions.depth} />
              {activeView === 'top' && (
                <gridHelper args={[Math.max(dimensions.width, dimensions.depth), Math.max(dimensions.width, dimensions.depth) * 10, '#000000', '#cccccc']} position={[0, 0.01, 0]} />
              )}
              <WallComponent width={dimensions.width} height={dimensions.height} depth={dimensions.depth} />
              
              <FurnitureManager />
            </group>

            <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={20} blur={2} far={10} />
            
            <OrbitControls 
              makeDefault 
              enableRotate={activeView !== 'top'} 
              enablePan={true}
              maxPolarAngle={Math.PI / 2 - 0.05} // Don't go below floor
            />
          </XR>
        </Suspense>
      </Canvas>
    </div>
  );
}
