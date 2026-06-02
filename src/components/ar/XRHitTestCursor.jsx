import { useFrame, useThree } from '@react-three/fiber';
import { useXRHitTest, useXRInputSourceEvent } from '@react-three/xr';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useARSceneStore } from '../../store/useARSceneStore';

const matrixHelper = new THREE.Matrix4();

export default function XRHitTestCursor() {
  const ringRef = useRef();
  const placeItem = useARSceneStore((s) => s.placeItem);
  const activeProduct = useARSceneStore((s) => s.activeProduct);

  const { camera } = useThree();

  const cameraPosRef = useRef(new THREE.Vector3());
  const cameraDirRef = useRef(new THREE.Vector3());

  useFrame(() => {
    camera.getWorldPosition(cameraPosRef.current);
    camera.getWorldDirection(cameraDirRef.current);
  });

  const activeItemId = useARSceneStore((s) => s.activeItemId);
  const updateTransform = useARSceneStore((s) => s.updateTransform);

  const [isDragging, setIsDragging] = useState(false);
  const dragFrames = useRef(0);

  // Track touch events to support drag-to-move for the active object
  useEffect(() => {
    const onTouchStart = () => { setIsDragging(true); dragFrames.current = 0; };
    const onTouchEnd = () => { setIsDragging(false); };
    const onTouchMove = () => { if (isDragging) dragFrames.current += 1; };

    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchmove', onTouchMove);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [isDragging]);

  const handleTapToPlace = useCallback((event) => {
    if (!activeProduct) return;
    
    // If the user was dragging the screen (to move an object), do NOT place a new one!
    if (dragFrames.current > 5) return;

    // If WebXR found a surface, place it exactly on the cyan ring
    if (ringRef.current && ringRef.current.visible) {
      placeItem(
        activeProduct,
        ringRef.current.position.toArray(),
        [0, 0, 0],
        activeProduct.modelScale || [1, 1, 1]
      );
    } else {
      // FALLBACK: Force place 1.5m in front of the tracked camera
      const direction = cameraDirRef.current.clone();
      direction.y = 0; // flatten to ground plane
      if (direction.lengthSq() > 0) {
        direction.normalize();
      } else {
        direction.set(0, 0, -1);
      }

      const position = cameraPosRef.current.clone();
      
      // Move 1.5 meters forward, and estimate floor is ~1 meter below the camera lens
      position.add(direction.multiplyScalar(1.5));
      position.y -= 1.0; 

      placeItem(
        activeProduct,
        position.toArray(),
        [0, 0, 0],
        activeProduct.modelScale || [1, 1, 1]
      );
    }
  }, [activeProduct, placeItem]);

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

        // DRAG-TO-MOVE LOGIC: Update active item position to match hit-test while dragging
        if (isDragging && activeItemId && dragFrames.current > 5) {
          updateTransform(activeItemId, { position: ringRef.current.position.toArray() });
        }
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
