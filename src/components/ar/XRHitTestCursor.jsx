import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useXRHitTest, useXRInputSourceEvent } from '@react-three/xr';
import { useARSceneStore } from '../../store/useARSceneStore';
import * as THREE from 'three';

// Reusable Matrix4 to avoid creating a new one every frame
const matrixHelper = new THREE.Matrix4();

export default function XRHitTestCursor() {
  const ringRef = useRef();
  const placeItem = useARSceneStore((s) => s.placeItem);
  const activeProduct = useARSceneStore((s) => s.activeProduct);
  const [isVisible, setIsVisible] = useState(false);

  const handleTapToPlace = useCallback((event) => {
    // Only place if the ring is currently visible (a surface is found)
    if (!ringRef.current || !activeProduct || !isVisible) return;
    placeItem(
      activeProduct,
      ringRef.current.position.toArray(),
      [0, 0, 0],
      activeProduct.modelScale || [1, 1, 1]
    );
  }, [activeProduct, placeItem, isVisible]);

  // Use native WebXR 'select' event instead of DOM events
  useXRInputSourceEvent('all', 'select', handleTapToPlace, [handleTapToPlace]);

  useXRHitTest((results, getWorldMatrix) => {
    if (!ringRef.current) return;

    if (results.length > 0) {
      const success = getWorldMatrix(matrixHelper, results[0]);
      if (success) {
        matrixHelper.decompose(
          ringRef.current.position,
          ringRef.current.quaternion,
          new THREE.Vector3() // throw away scale, hit test scale can be zero
        );
        // Keep the ring flat on the surface and force standard scale
        ringRef.current.quaternion.identity();
        ringRef.current.scale.set(1, 1, 1);
        setIsVisible(true);
      }
    } else {
      setIsVisible(false);
    }
  }, 'viewer');

  return (
    <group ref={ringRef} visible={isVisible}>
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
