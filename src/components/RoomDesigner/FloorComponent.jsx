import React from 'react';
import { useRoomStore } from '../../stores/useRoomStore';

export default function FloorComponent({ width, depth }) {
  const { floorMaterial } = useRoomStore();

  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color={floorMaterial.color} roughness={0.8} />
      {/* TODO: Add GridHelper when in Top View / Planning mode */}
    </mesh>
  );
}
