import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useXRHitTest } from '@react-three/xr';
import { useARSceneStore } from '../../store/useARSceneStore';
import * as THREE from 'three';

// Reusable Matrix4 to avoid creating a new one every frame
const matrixHelper = new THREE.Matrix4();

export default function XRHitTestCursor() {
  const ringRef = useRef();
  const placeItem = useARSceneStore((s) => s.placeItem);
  const activeProduct = useARSceneStore((s) => s.activeProduct);
  const [isVisible, setIsVisible] = useState(false);

  const handleTapToPlace = useCallback(() => {
    if (!ringRef.current || !activeProduct) return;
    placeItem(
      activeProduct,
      ringRef.current.position.toArray(),
      [0, 0, 0],
      activeProduct.modelScale || [1, 1, 1]
    );
  }, [activeProduct, placeItem]);

  useEffect(() => {
    window.addEventListener('ar-tap', handleTapToPlace);
    return () => window.removeEventListener('ar-tap', handleTapToPlace);
  }, [handleTapToPlace]);

  // Correct v6 API: useXRHitTest(fn, relativeTo)
  // getWorldMatrix(target: Matrix4, result: XRHitTestResult) => boolean
  useXRHitTest((results, getWorldMatrix) => {
    if (!ringRef.current) return;

    if (results.length > 0) {
      const success = getWorldMatrix(matrixHelper, results[0]);
      if (success) {
        matrixHelper.decompose(
          ringRef.current.position,
          ringRef.current.quaternion,
          ringRef.current.scale
        );
        // Keep the ring flat on the surface
        ringRef.current.quaternion.identity();
        setIsVisible(true);
      }
    } else {
      setIsVisible(false);
    }
  }, 'viewer');

  return (
    <group ref={ringRef} visible={isVisible}>
      {/* Invisible hit box — large cylinder to catch screen taps */}
      <mesh onPointerDown={handleTapToPlace}>
        <cylinderGeometry args={[5, 5, 0.1, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.2, 32]} />
        <meshBasicMaterial color="#00cec9" transparent opacity={0.8} depthTest={false} />
      </mesh>

      {/* Inner dot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.03, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthTest={false} />
      </mesh>
    </group>
  );
}
