import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useXRInputSourceEvent, useXRHitTest, useXRStore } from '@react-three/xr';
import { useFrame } from '@react-three/fiber';
import { useStore } from 'zustand';
import { useARSceneStore } from '../../store/useARSceneStore';
import * as THREE from 'three';

const matrixHelper = new THREE.Matrix4();

export default function XRHitTestCursor() {
  const ringRef = useRef();
  const placeItem = useARSceneStore((s) => s.placeItem);
  const activeProduct = useARSceneStore((s) => s.activeProduct);

  const handleTapToPlace = useCallback((event) => {
    // Only place if the ring is currently visible (a surface is found)
    if (!ringRef.current || !activeProduct || !ringRef.current.visible) return;
    placeItem(
      activeProduct,
      ringRef.current.position.toArray(),
      [0, 0, 0], // ARCore often provides weird rotations, we keep objects upright
      activeProduct.modelScale || [1, 1, 1]
    );
  }, [activeProduct, placeItem]);

  // Use native WebXR 'select' event instead of DOM events
  useXRInputSourceEvent('all', 'select', handleTapToPlace, [handleTapToPlace]);

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
