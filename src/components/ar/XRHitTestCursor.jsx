import { useFrame, useThree } from '@react-three/fiber';
import { useXRHitTest, useXRInputSourceEvent } from '@react-three/xr';
import { useCallback, useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useARSceneStore } from '../../store/useARSceneStore';

const matrixHelper = new THREE.Matrix4();

// Holographic preview of the selected furniture shown on the cursor
function CursorPreview({ product }) {
  const { scene } = useGLTF(product.glbModel);
  const clone = useMemo(() => {
    const cl = scene.clone(true);
    // Make the preview semi-transparent / holographic
    cl.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.35;
      }
    });
    return cl;
  }, [scene]);

  const groupRef = useRef();
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05 + 0.05;
      groupRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      <Center bottom>
        <primitive object={clone} scale={product.modelScale || [1, 1, 1]} />
      </Center>
    </group>
  );
}

export const globalCursorTarget = new THREE.Vector3();

export default function XRHitTestCursor() {
  const ringRef = useRef();
  const placeItem = useARSceneStore((s) => s.placeItem);
  const activeProduct = useARSceneStore((s) => s.activeProduct);
  const interactionMode = useARSceneStore((s) => s.interactionMode);
  const activeItemId = useARSceneStore((s) => s.activeItemId);
  const updateTransform = useARSceneStore((s) => s.updateTransform);

  const { camera } = useThree();

  const cameraPosRef = useRef(new THREE.Vector3());
  const cameraDirRef = useRef(new THREE.Vector3());

  const targetPosRef = useRef(new THREE.Vector3());
  const isTrackingRef = useRef(false);

  useFrame((state, delta) => {
    camera.getWorldPosition(cameraPosRef.current);
    camera.getWorldDirection(cameraDirRef.current);

    if (ringRef.current) {
      if (isTrackingRef.current) {
        if (!ringRef.current.visible) {
          ringRef.current.position.copy(targetPosRef.current);
          ringRef.current.visible = true;
        } else {
          ringRef.current.position.lerp(targetPosRef.current, delta * 15);
        }
        
        // Expose the raw position for XRPlacedProduct to read directly without triggering React re-renders!
        globalCursorTarget.copy(ringRef.current.position);
      } else {
        ringRef.current.visible = false;
      }
    }
  });

  const lastPlacedTime = useRef(0);

  // Calculate a position in front of the camera (fallback when no surface detected)
  const getFallbackPosition = useCallback(() => {
    const direction = cameraDirRef.current.clone();
    direction.y = 0;
    if (direction.lengthSq() > 0) {
      direction.normalize();
    } else {
      direction.set(0, 0, -1);
    }
    const position = cameraPosRef.current.clone();
    position.add(direction.multiplyScalar(1.5));
    position.y -= 1.0;
    return position.toArray();
  }, []);

  // Get the current ring position or fallback
  const getCurrentTargetPosition = useCallback(() => {
    if (ringRef.current && ringRef.current.visible) {
      return ringRef.current.position.toArray();
    }
    return getFallbackPosition();
  }, [getFallbackPosition]);

  const handleTapToPlace = useCallback(() => {
    if (!activeProduct) return;

    // Wait a brief moment (50ms) to see if an object was clicked.
    // Native WebXR 'select' fires BEFORE React Three Fiber's 'onClick'.
    setTimeout(() => {
      // Debounce: prevent double-fire
      const now = performance.now();
      if (now - lastPlacedTime.current < 500) return;
      
      // Prevent environment tap if an object was just clicked (within 150ms)
      if (window.lastObjectClickTime && now - window.lastObjectClickTime < 150) {
        return; 
      }

      lastPlacedTime.current = now;

      const targetPos = getCurrentTargetPosition();

      if (interactionMode === 'place') {
        // PLACE MODE: Create a new object at the cursor position
        placeItem(
          activeProduct,
          targetPos,
          [0, 0, 0],
          activeProduct.modelScale || [1, 1, 1]
        );
        if (navigator.vibrate) navigator.vibrate(50);
        // placeItem() automatically switches to 'move' mode in the store
      } else if (interactionMode === 'move' && activeItemId) {
        // DROP MODE: The object is currently following the cursor. Tap to drop it in place!
        // Save the final dropped position to the React store so it persists.
        updateTransform(activeItemId, { position: globalCursorTarget.toArray() });
        
        // Lock it in by deselecting it and returning to placement mode.
        const setPlacementMode = useARSceneStore.getState().setPlacementMode;
        setPlacementMode();
        if (navigator.vibrate) navigator.vibrate(40);
      }
    }, 50);
  }, [activeProduct, interactionMode, activeItemId, placeItem, updateTransform, getCurrentTargetPosition]);

  // Use native WebXR 'select' event
  useXRInputSourceEvent('all', 'select', handleTapToPlace, [handleTapToPlace]);

  // Fallback: Listen for custom DOM event from the overlay
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
          targetPosRef.current,
          ringRef.current.quaternion,
          new THREE.Vector3()
        );
        // Force the reticle to be flat. HitTest rotations are notoriously jittery on the Y-axis.
        ringRef.current.quaternion.identity();
        ringRef.current.scale.set(1, 1, 1);
        isTrackingRef.current = true;
      } else {
        isTrackingRef.current = false;
      }
    } else {
      isTrackingRef.current = false;
    }
  }, 'viewer');

  // Show holographic preview only in placement mode
  const showPreview = interactionMode === 'place' && activeProduct;

  return (
    <group ref={ringRef} visible={false}>
      {/* 3D Holographic Preview — only visible in placement mode */}
      {showPreview && (
        <Suspense fallback={null}>
          <CursorPreview product={activeProduct} />
        </Suspense>
      )}

      {/* 4-Segmented Outer Ring (Crosshair style) */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, (Math.PI / 2) * i]}>
          <ringGeometry args={[0.1, 0.15, 16, 1, 0.15, (Math.PI / 2) - 0.3]} />
          <meshBasicMaterial 
            color={interactionMode === 'place' ? '#00cec9' : '#6c5ce7'} 
            transparent opacity={0.8} depthTest={false} 
          />
        </mesh>
      ))}

      {/* Inner dot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.025, 32]} />
        <meshBasicMaterial 
          color={interactionMode === 'place' ? '#00cec9' : '#6c5ce7'} 
          transparent opacity={0.9} depthTest={false} 
        />
      </mesh>
    </group>
  );
}
