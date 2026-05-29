import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useARSceneStore } from '../../store/useARSceneStore';
import * as THREE from 'three';

export default function XRPlacedProduct({ item }) {
  const { scene } = useGLTF(item.product.glbModel);
  // Clone the scene so we can place multiple of the same object
  const clone = useMemo(() => scene.clone(true), [scene]);
  
  const activeItemId = useARSceneStore((s) => s.activeItemId);
  const setActiveItemId = useARSceneStore((s) => s.setActiveItemId);
  
  const isSelected = activeItemId === item.id;

  const handleSelect = () => {
    setActiveItemId(item.id);
  };

  return (
    <group position={item.position} rotation={item.rotation} scale={item.scale} onClick={handleSelect} onPointerUp={handleSelect}>
      {/* The actual 3D model */}
      <primitive object={clone} />
      
      {/* Selection Box / Highlight */}
      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshBasicMaterial color="#6c5ce7" wireframe transparent opacity={0.5} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}
