import React, { useMemo, useRef } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
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

  const groupRef = useRef();
  // Start at a small non-zero value so the object is visible immediately
  const currentScale = useRef(new THREE.Vector3(0.01, 0.01, 0.01));
  const targetScale = useMemo(() => new THREE.Vector3(...(item.scale || [1, 1, 1])), [item.scale]);

  // Pop-in animation: smoothly scale the object up when it mounts
  useFrame((state, delta) => {
    if (groupRef.current) {
      currentScale.current.lerp(targetScale, Math.min(delta * 10, 1));
      groupRef.current.scale.copy(currentScale.current);
    }
  });

  return (
    <group ref={groupRef} position={item.position} rotation={item.rotation} onClick={handleSelect} onPointerUp={handleSelect}>
      {/* Center the 3D model automatically and align it to the floor (y=0) */}
      <Center bottom>
        <primitive object={clone} />
      </Center>

      {/* Selection Ring on the floor */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.5, 0.55, 32]} />
          <meshBasicMaterial color="#00cec9" transparent opacity={0.8} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}
