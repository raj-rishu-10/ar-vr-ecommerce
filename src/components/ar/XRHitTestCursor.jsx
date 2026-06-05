import { useFrame, useThree } from '@react-three/fiber';
import { useXRHitTest, useXRInputSourceEvent } from '@react-three/xr';
import { useCallback, useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useARSceneStore } from '../../store/useARSceneStore';

const matrixHelper = new THREE.Matrix4();

// ─── Holographic Preview ──────────────────────────────────────────────────────
// Semi-transparent, gently bobbing preview of the selected product.
// The CursorPreview itself does NOT rotate (the parent ringRef handles facing).
function CursorPreview({ product }) {
  const { scene } = useGLTF(product.glbModel);
  const clone = useMemo(() => {
    const cl = scene.clone(true);
    cl.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.4;
        child.castShadow = false;
      }
    });
    return cl;
  }, [scene]);

  const groupRef = useRef();
  // Gentle bob only — no Y-rotation here, the parent handles orientation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.8) * 0.04 + 0.06;
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

// ─── Exported cursor target (read by XRPlacedProduct in its useFrame loop) ───
export const globalCursorTarget = new THREE.Vector3();

// ─── Main Component ───────────────────────────────────────────────────────────
export default function XRHitTestCursor() {
  // ringRef: the root group — positioned on the floor, oriented to face camera
  const ringRef   = useRef();
  // reticleRef: child group that spins independently on the floor plane
  const reticleRef = useRef();

  const placeItem        = useARSceneStore((s) => s.placeItem);
  const activeProduct    = useARSceneStore((s) => s.activeProduct);
  const interactionMode  = useARSceneStore((s) => s.interactionMode);
  const activeItemId     = useARSceneStore((s) => s.activeItemId);
  const updateTransform  = useARSceneStore((s) => s.updateTransform);
  const setStabilized    = useARSceneStore((s) => s.setStabilized);
  const isStabilized     = useARSceneStore((s) => s.isStabilized);

  const { camera } = useThree();

  // Live refs — updated every frame without triggering React re-renders
  const cameraPosRef    = useRef(new THREE.Vector3());
  const cameraDirRef    = useRef(new THREE.Vector3());
  const targetPosRef    = useRef(new THREE.Vector3());
  const targetYawRef    = useRef(0);            // target facing angle (Y rotation)
  const currentYawRef   = useRef(0);            // smoothly interpolated facing angle
  const isTrackingRef   = useRef(false);
  const lastPlacedTime  = useRef(0);

  // ── Per-frame: lerp ring toward target, spin reticle ─────────────────────
  useFrame((state, delta) => {
    // Track camera every frame
    camera.getWorldPosition(cameraPosRef.current);
    camera.getWorldDirection(cameraDirRef.current);

    if (!ringRef.current) return;

    if (isTrackingRef.current) {
      // Lerp position for smooth glide
      if (!ringRef.current.visible) {
        // First appearance: snap immediately
        ringRef.current.position.copy(targetPosRef.current);
        ringRef.current.visible = true;
        currentYawRef.current = targetYawRef.current;
      } else {
        ringRef.current.position.lerp(targetPosRef.current, delta * 12);
        // Smooth yaw (facing) interpolation — handles wrap-around correctly
        const dy = targetYawRef.current - currentYawRef.current;
        // Normalize to [-PI, PI] to prevent 360° spin
        const normalizedDy = Math.atan2(Math.sin(dy), Math.cos(dy));
        currentYawRef.current += normalizedDy * delta * 8;
      }

      // Apply flat orientation: always horizontal, always facing camera
      ringRef.current.rotation.set(0, currentYawRef.current, 0);

      // Update global cursor target for XRPlacedProduct to read
      globalCursorTarget.copy(ringRef.current.position);
    } else {
      ringRef.current.visible = false;
    }

    // Spin the reticle ring independently on the XZ plane
    if (reticleRef.current && isTrackingRef.current) {
      reticleRef.current.rotation.z -= delta * 0.6;
    }
  });

  // ── WebXR Hit Test ────────────────────────────────────────────────────────
  useXRHitTest((results, getWorldMatrix) => {
    if (!ringRef.current) return;

    if (results.length > 0) {
      if (!isStabilized) setStabilized(true);

      const success = getWorldMatrix(matrixHelper, results[0]);
      if (success) {
        // Extract hit position only (ignore rotation from hit-test — it's jittery)
        const pos = new THREE.Vector3();
        const q   = new THREE.Quaternion();
        const sc  = new THREE.Vector3();
        matrixHelper.decompose(pos, q, sc);

        targetPosRef.current.copy(pos);

        // Calculate the facing angle: make the furniture look toward the camera
        const dx = cameraPosRef.current.x - pos.x;
        const dz = cameraPosRef.current.z - pos.z;
        targetYawRef.current = Math.atan2(dx, dz);

        isTrackingRef.current = true;
      } else {
        isTrackingRef.current = false;
      }
    } else {
      isTrackingRef.current = false;
    }
  }, 'viewer');

  // ── Fallback position in front of camera ─────────────────────────────────
  const getFallbackPosition = useCallback(() => {
    const dir = cameraDirRef.current.clone();
    dir.y = 0;
    if (dir.lengthSq() > 0) dir.normalize(); else dir.set(0, 0, -1);
    const pos = cameraPosRef.current.clone();
    pos.addScaledVector(dir, 1.5);
    pos.y -= 1.0;
    return pos.toArray();
  }, []);

  const getCurrentTargetPosition = useCallback(() => {
    if (ringRef.current && ringRef.current.visible) {
      return ringRef.current.position.toArray();
    }
    return getFallbackPosition();
  }, [getFallbackPosition]);

  // ── Tap-to-Place ──────────────────────────────────────────────────────────
  const handleTapToPlace = useCallback(() => {
    if (!activeProduct) return;

    // Wait 50ms so React Three Fiber's onClick can fire first on existing objects
    setTimeout(() => {
      const now = performance.now();
      if (now - lastPlacedTime.current < 500) return;
      if (window.lastObjectClickTime && now - window.lastObjectClickTime < 150) return;

      lastPlacedTime.current = now;
      const targetPos = getCurrentTargetPosition();

      if (interactionMode === 'place') {
        placeItem(
          activeProduct,
          targetPos,
          [0, currentYawRef.current, 0],   // face camera at drop time
          activeProduct.modelScale || [1, 1, 1]
        );
        if (navigator.vibrate) navigator.vibrate(50);

      } else if (interactionMode === 'move' && activeItemId) {
        updateTransform(activeItemId, { position: globalCursorTarget.toArray() });
        useARSceneStore.getState().setPlacementMode();
        if (navigator.vibrate) navigator.vibrate(40);
      }
    }, 50);
  }, [activeProduct, interactionMode, activeItemId, placeItem, updateTransform, getCurrentTargetPosition]);

  useXRInputSourceEvent('all', 'select', handleTapToPlace, [handleTapToPlace]);

  useEffect(() => {
    const onArTap = () => handleTapToPlace();
    window.addEventListener('ar-tap', onArTap);
    return () => window.removeEventListener('ar-tap', onArTap);
  }, [handleTapToPlace]);

  // ── Reticle color ─────────────────────────────────────────────────────────
  const color = interactionMode === 'place' ? '#00cec9' : '#6c5ce7';
  const showPreview = interactionMode === 'place' && activeProduct;

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    // ringRef: root group — positioned & oriented on the floor
    <group ref={ringRef} visible={false}>

      {/* Holographic furniture preview (faces camera via parent rotation) */}
      {showPreview && (
        <Suspense fallback={null}>
          <CursorPreview product={activeProduct} />
        </Suspense>
      )}

      {/* Reticle: flat on the floor, independently spinning */}
      <group ref={reticleRef} rotation={[-Math.PI / 2, 0, 0]}>
        {/* 4 arc segments forming the IKEA-style crosshair */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (Math.PI / 2) * i]}>
            <ringGeometry args={[0.10, 0.16, 24, 1, 0.2, (Math.PI / 2) - 0.4]} />
            <meshBasicMaterial color={color} transparent opacity={0.85} depthTest={false} />
          </mesh>
        ))}

        {/* Centre dot */}
        <mesh>
          <circleGeometry args={[0.022, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.95} depthTest={false} />
        </mesh>
      </group>
    </group>
  );
}
