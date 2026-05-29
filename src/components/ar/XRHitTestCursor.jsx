import React, { useRef, useState } from 'react';
import { useXRHitTest } from '@react-three/xr';
import { useARSceneStore } from '../../store/useARSceneStore';

export default function XRHitTestCursor() {
  const ringRef = useRef();
  const placeItem = useARSceneStore((s) => s.placeItem);
  const activeProduct = useARSceneStore((s) => s.activeProduct);
  const [isVisible, setIsVisible] = useState(false);

  // useXRHitTest runs on every frame where the hit test returns data
  useXRHitTest((hitResults, getWorldMatrix) => {
    if (ringRef.current && hitResults.length > 0) {
      const hit = hitResults[0];
      const hitMatrix = getWorldMatrix(hit);
      hitMatrix.decompose(
        ringRef.current.position,
        ringRef.current.quaternion,
        ringRef.current.scale
      );
      // Optional: keep it flat on the floor (Y-up) if you only want floor placement
      // ringRef.current.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    }
    if (!isVisible) setIsVisible(true);
  });

  const handleTapToPlace = () => {
    if (!ringRef.current || !activeProduct) return;
    placeItem(
      activeProduct,
      ringRef.current.position.toArray(),
      [0, 0, 0], // default rotation
      activeProduct.modelScale || [1, 1, 1] // default scale
    );
  };

  return (
    <group ref={ringRef} visible={isVisible} onClick={handleTapToPlace} onPointerUp={handleTapToPlace}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.2, 32]} />
        <meshBasicMaterial color="#00cec9" transparent opacity={0.8} depthTest={false} />
      </mesh>
      {/* Inner dot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.02, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} depthTest={false} />
      </mesh>
    </group>
  );
}
