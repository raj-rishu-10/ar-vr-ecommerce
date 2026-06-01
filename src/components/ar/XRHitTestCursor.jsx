import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useXRInputSourceEvent, useXRStore } from '@react-three/xr';
import { useFrame } from '@react-three/fiber';
import { useStore } from 'zustand';
import { useARSceneStore } from '../../store/useARSceneStore';
import * as THREE from 'three';

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

  const store = useXRStore();
  const session = useStore(store, (s) => s.session);
  const hitTestSourceRef = useRef(null);
  const localSpaceRef = useRef(null);

  // Setup raw WebXR hit testing directly from the Codelab
  useEffect(() => {
    if (!session) return;
    
    let active = true;
    (async () => {
      try {
        const viewerSpace = await session.requestReferenceSpace('viewer');
        const localSpace = await session.requestReferenceSpace('local');
        if (!active) return;
        localSpaceRef.current = localSpace;
        
        const source = await session.requestHitTestSource({ space: viewerSpace });
        if (!active) return;
        hitTestSourceRef.current = source;
      } catch (err) {
        console.error("Failed to setup hit test source", err);
      }
    })();

    return () => {
      active = false;
      if (hitTestSourceRef.current) {
        hitTestSourceRef.current.cancel();
        hitTestSourceRef.current = null;
      }
    };
  }, [session]);

  // Execute raw WebXR hit test every frame
  useFrame((state, delta, frame) => {
    if (!ringRef.current) return;
    
    if (!frame || !hitTestSourceRef.current || !localSpaceRef.current) {
      ringRef.current.visible = false;
      return;
    }

    const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
    
    if (hitTestResults.length > 0) {
      if (!isStabilized) {
        setStabilized(true);
      }
      
      const hitPose = hitTestResults[0].getPose(localSpaceRef.current);
      if (hitPose) {
        ringRef.current.visible = true;
        ringRef.current.position.set(
          hitPose.transform.position.x,
          hitPose.transform.position.y,
          hitPose.transform.position.z
        );
        // We keep it flat on the floor (identity rotation) for furniture
        ringRef.current.quaternion.identity(); 
      } else {
        ringRef.current.visible = false;
      }
    } else {
      ringRef.current.visible = false;
    }
  });

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
