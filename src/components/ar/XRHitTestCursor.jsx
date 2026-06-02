import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useXRInputSourceEvent, useXRHitTest, useXRStore } from '@react-three/xr';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from 'zustand';
import { useARSceneStore } from '../../store/useARSceneStore';
import * as THREE from 'three';

const matrixHelper = new THREE.Matrix4();

export default function XRHitTestCursor() {
  const ringRef = useRef();
  const placeItem = useARSceneStore((s) => s.placeItem);
  const activeProduct = useARSceneStore((s) => s.activeProduct);

  const { camera } = useThree();

  const handleTapToPlace = useCallback((event) => {
    if (!activeProduct) return;

    // If WebXR found a surface, place it exactly on the cyan ring
    if (ringRef.current && ringRef.current.visible) {
      placeItem(
        activeProduct,
        ringRef.current.position.toArray(),
        [0, 0, 0],
        activeProduct.modelScale || [1, 1, 1]
      );
    } else {
      // FALLBACK: If no surface is detected (common on featureless tables or weak ARCore),
      // force place the object 1.5 meters in front of the user's camera on an estimated floor plane.
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0; // flatten to ground plane
      direction.normalize();

      const position = new THREE.Vector3();
      camera.getWorldPosition(position);
      
      // Move 1.5 meters forward, and estimate floor is ~1 meter below the camera lens
      position.add(direction.multiplyScalar(1.5));
      position.y = -1.0; 

      placeItem(
        activeProduct,
        position.toArray(),
        [0, 0, 0],
        activeProduct.modelScale || [1, 1, 1]
      );
    }
  }, [activeProduct, placeItem, camera]);

  // Use native WebXR 'select' event instead of DOM events
  useXRInputSourceEvent('all', 'select', handleTapToPlace, [handleTapToPlace]);

  // Fallback: Listen for custom DOM event from the overlay
  // This bypasses bugs on OnePlus/Oppo phones where dom-overlay swallows the WebXR select event
  useEffect(() => {
    const onArTap = () => handleTapToPlace();
    window.addEventListener('ar-tap', onArTap);
    return () => window.removeEventListener('ar-tap', onArTap);
  }, [handleTapToPlace]);

  const setStabilized = useARSceneStore((s) => s.setStabilized);
  const isStabilized = useARSceneStore((s) => s.isStabilized);

  useXRHitTest((results, getWorldMatrix) => {
    if (!ringRef.current) return;

    if (results.length > 0) {
      if (!isStabilized) {
        setStabilized(true);
      }
      
      const success = getWorldMatrix(matrixHelper, results[0]);
      if (success) {
        matrixHelper.decompose(
          ringRef.current.position,
          ringRef.current.quaternion,
          new THREE.Vector3() // ignore scale
        );
        // Keep the ring flat on the surface and force standard scale
        ringRef.current.quaternion.identity();
        ringRef.current.scale.set(1, 1, 1);
        ringRef.current.visible = true;
      } else {
        ringRef.current.visible = false;
      }
    } else {
      ringRef.current.visible = false;
    }
  }, 'viewer');

  return (
    <group ref={ringRef} visible={false}>
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
