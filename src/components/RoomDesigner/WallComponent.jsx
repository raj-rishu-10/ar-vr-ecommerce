import React from 'react';
import { useRoomStore } from '../../stores/useRoomStore';
import { Edges } from '@react-three/drei';

export default function WallComponent({ width, height, depth }) {
  const { wallMaterial } = useRoomStore();
  
  const thickness = 0.1;
  const halfW = width / 2;
  const halfD = depth / 2;
  const halfH = height / 2;

  // We build 4 walls: North, South, East, West
  return (
    <group>
      {/* Back Wall (North) */}
      <mesh position={[0, halfH, -halfD]} castShadow receiveShadow>
        <boxGeometry args={[width, height, thickness]} />
        <meshStandardMaterial color={wallMaterial.color} />
        <Edges scale={1.001} threshold={15} color="white" />
      </mesh>
      
      {/* Front Wall (South) - Typically transparent or hidden for interior viewing, but kept for Dollhouse */}
      <mesh position={[0, halfH, halfD]} castShadow receiveShadow>
        <boxGeometry args={[width, height, thickness]} />
        <meshStandardMaterial color={wallMaterial.color} transparent opacity={0.1} />
      </mesh>

      {/* Left Wall (West) */}
      <mesh position={[-halfW, halfH, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, height, depth]} />
        <meshStandardMaterial color={wallMaterial.color} />
        <Edges scale={1.001} threshold={15} color="white" />
      </mesh>

      {/* Right Wall (East) */}
      <mesh position={[halfW, halfH, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, height, depth]} />
        <meshStandardMaterial color={wallMaterial.color} transparent opacity={0.1} />
      </mesh>
    </group>
  );
}
