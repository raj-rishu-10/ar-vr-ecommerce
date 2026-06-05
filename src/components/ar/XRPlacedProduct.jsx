import React, { useMemo, useRef } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useARSceneStore } from '../../store/useARSceneStore';
import * as THREE from 'three';
import { globalCursorTarget } from './XRHitTestCursor';

export default function XRPlacedProduct({ item }) {
  const { scene } = useGLTF(item.product.glbModel);
  // Clone the scene so we can place multiple of the same object
  const clone = useMemo(() => {
    const cl = scene.clone(true);
    // Enable shadows and independent materials on all meshes in the model
    cl.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material) {
          node.material = node.material.clone();
        }
      }
    });
    return cl;
  }, [scene]);
  
  const activeItemId = useARSceneStore((s) => s.activeItemId);
  const setActiveItemId = useARSceneStore((s) => s.setActiveItemId);
  const setMoveMode = useARSceneStore((s) => s.setMoveMode);
  
  const isSelected = activeItemId === item.id;

  const handleSelect = (e) => {
    e.stopPropagation(); // Stop React Three Fiber from bubbling
    window.lastObjectClickTime = performance.now();
    setActiveItemId(item.id);
    setMoveMode(); // Switch to move mode when user taps on an existing object
  };

  const groupRef = useRef();
  const currentScale = useRef(new THREE.Vector3(0.01, 0.01, 0.01));
  const targetScale = useMemo(() => new THREE.Vector3(...(item.scale || [1, 1, 1])), [item.scale]);
  const currentRotation = useRef(new THREE.Euler().fromArray(item.rotation));
  
  // Create a single animated material state for the clone
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Smooth Scale
      currentScale.current.lerp(targetScale, Math.min(delta * 10, 1));
      groupRef.current.scale.copy(currentScale.current);

      // Smooth Rotation
      const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...item.rotation));
      groupRef.current.quaternion.slerp(targetQuat, Math.min(delta * 10, 1));

      // Drag without React re-renders!
      const isDragging = isSelected && useARSceneStore.getState().interactionMode === 'move';
      if (isDragging) {
        groupRef.current.position.lerp(globalCursorTarget, delta * 15);
      }

      // Ghosting effect
      clone.traverse((node) => {
        if (node.isMesh && node.material) {
          node.material.transparent = true;
          // Smoothly lerp opacity down to 0.5 when dragging
          const targetOpacity = isDragging ? 0.5 : 1.0;
          node.material.opacity += (targetOpacity - node.material.opacity) * delta * 10;
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={item.position} rotation={item.rotation} onClick={handleSelect} onPointerUp={handleSelect}>
      <Center bottom>
        <primitive object={clone} />
      </Center>

      {/* Shadow Catcher Plane: invisible except for shadows cast upon it */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.005, 0]}>
        <planeGeometry args={[3, 3]} />
        <shadowMaterial transparent opacity={0.4} />
      </mesh>

      {/* Small selection indicator ring on the floor */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.18, 0.22, 32]} />
          <meshBasicMaterial color="#6c5ce7" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}
