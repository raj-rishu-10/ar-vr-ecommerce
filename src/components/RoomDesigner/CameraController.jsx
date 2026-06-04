import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCameraStore } from '../../stores/useCameraStore';
import { useRoomStore } from '../../stores/useRoomStore';
import * as THREE from 'three';

export default function CameraController({ controlsRef }) {
  const { activeView } = useCameraStore();
  const { dimensions } = useRoomStore();
  const targetPos = useRef(new THREE.Vector3(5, 5, 5));
  const targetLookAt = useRef(new THREE.Vector3(0, 1, 0));
  const isMoving = useRef(true);

  useEffect(() => {
    const { width, height, depth } = dimensions;
    const maxDim = Math.max(width, depth);

    switch (activeView) {
      case 'top':
        targetPos.current.set(0, maxDim * 1.5, 0.01); // tiny offset to prevent singularity
        targetLookAt.current.set(0, 0, 0);
        break;
      case 'front':
        targetPos.current.set(0, height / 2 + 0.5, depth * 1.1);
        targetLookAt.current.set(0, height / 2, 0);
        break;
      case 'left':
        targetPos.current.set(-width * 1.1, height / 2 + 0.5, 0);
        targetLookAt.current.set(0, height / 2, 0);
        break;
      case 'right':
        targetPos.current.set(width * 1.1, height / 2 + 0.5, 0);
        targetLookAt.current.set(0, height / 2, 0);
        break;
      case 'isometric':
        targetPos.current.set(width * 1.0, height * 1.5, depth * 1.0);
        targetLookAt.current.set(0, height / 3, 0);
        break;
      case 'perspective':
      default:
        targetPos.current.set(width * 0.9, height * 1.2, depth * 0.9);
        targetLookAt.current.set(0, height / 3, 0);
        break;
    }
    
    // Enable automated camera transition
    isMoving.current = true;
  }, [activeView, dimensions]);

  // Disable automated transitions immediately when the user interacts manually
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleStart = () => {
      isMoving.current = false;
    };

    controls.addEventListener('start', handleStart);
    return () => {
      controls.removeEventListener('start', handleStart);
    };
  }, [controlsRef]);

  useFrame((state) => {
    if (!isMoving.current) return;

    // Lerp camera position smoothly
    state.camera.position.lerp(targetPos.current, 0.08);

    // Lerp controls target look-at
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, 0.08);
      controlsRef.current.update();
    }

    // Terminate automated transition once camera is close to the target
    const distPos = state.camera.position.distanceTo(targetPos.current);
    const distLook = controlsRef.current 
      ? controlsRef.current.target.distanceTo(targetLookAt.current) 
      : 0;

    if (distPos < 0.03 && distLook < 0.03) {
      isMoving.current = false;
    }
  });

  return null;
}
