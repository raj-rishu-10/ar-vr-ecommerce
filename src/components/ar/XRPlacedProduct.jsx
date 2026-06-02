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
  const setMoveMode = useARSceneStore((s) => s.setMoveMode);
  
  const isSelected = activeItemId === item.id;

  const handleSelect = () => {
    setActiveItemId(item.id);
    setMoveMode(); // Switch to move mode when user taps on an existing object
  };

  const groupRef = useRef();
  const currentScale = useRef(new THREE.Vector3(0.01, 0.01, 0.01));
  const targetScale = useMemo(() => new THREE.Vector3(...(item.scale || [1, 1, 1])), [item.scale]);

  // Pop-in animation
  useFrame((state, delta) => {
    if (groupRef.current) {
      currentScale.current.lerp(targetScale, Math.min(delta * 10, 1));
      groupRef.current.scale.copy(currentScale.current);
    }
  });

  return (
    <group ref={groupRef} position={item.position} rotation={item.rotation} onClick={handleSelect} onPointerUp={handleSelect}>
      <Center bottom>
        <primitive object={clone} />
      </Center>

      {/* Small selection indicator ring on the floor */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.18, 0.22, 32]} />
          <meshBasicMaterial color="#6c5ce7" transparent opacity={0.9} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}
