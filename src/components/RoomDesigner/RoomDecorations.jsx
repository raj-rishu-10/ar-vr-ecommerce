import React from 'react';
import { useRoomStore } from '../../stores/useRoomStore';

export default function RoomDecorations() {
  const { dimensions, hasCeilingBeams, hasWindow, curtainColor } = useRoomStore();
  const { width, height, depth } = dimensions;

  const halfW = width / 2;
  const halfD = depth / 2;
  
  return (
    <group>
      {/* ── Ceiling Beams ── */}
      {hasCeilingBeams && (
        <group position={[0, height - 0.1, 0]}>
          {/* Render 5 wooden beams across the ceiling along the depth */}
          {Array.from({ length: 6 }).map((_, idx) => {
            const zPos = -halfD + (idx * depth) / 5;
            return (
              <mesh key={idx} position={[0, 0, zPos]} castShadow>
                <boxGeometry args={[width - 0.05, 0.15, 0.15]} />
                <meshStandardMaterial color="#8b5a41" roughness={0.9} metalness={0.1} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* ── Window and Curtains (On Back North Wall) ── */}
      {hasWindow && (
        <group position={[0, 0, -halfD + 0.05]}>
          {/* Glass Pane */}
          <mesh position={[0, height / 2, 0]}>
            <planeGeometry args={[3, 1.8]} />
            <meshStandardMaterial 
              color="#a5f3fc" 
              roughness={0.1} 
              metalness={0.9} 
              transparent 
              opacity={0.3} 
            />
          </mesh>

          {/* Window Frame */}
          <mesh position={[0, height / 2, -0.01]}>
            <boxGeometry args={[3.2, 2.0, 0.05]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </mesh>
          
          {/* Horizontal and vertical dividers */}
          <mesh position={[0, height / 2, 0.01]}>
            <boxGeometry args={[3.0, 0.04, 0.03]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, height / 2, 0.01]}>
            <boxGeometry args={[0.04, 1.8, 0.03]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>

          {/* Curtain Rod */}
          <mesh position={[0, height - 0.4, 0.15]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 3.8]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Left Curtain */}
          <mesh position={[-1.7, height / 2 - 0.1, 0.16]} castShadow>
            <boxGeometry args={[0.3, 2.2, 0.08]} />
            <meshStandardMaterial color={curtainColor} roughness={0.95} />
          </mesh>

          {/* Right Curtain */}
          <mesh position={[1.7, height / 2 - 0.1, 0.16]} castShadow>
            <boxGeometry args={[0.3, 2.2, 0.08]} />
            <meshStandardMaterial color={curtainColor} roughness={0.95} />
          </mesh>
        </group>
      )}

      {/* ── Pendant Lights ── */}
      {hasCeilingBeams && (
        <group>
          {/* Pendant Light Left */}
          <group position={[-1.5, height - 0.7, -1]}>
            {/* Cable */}
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.7]} />
              <meshStandardMaterial color="#111111" />
            </mesh>
            {/* Lamp Shade */}
            <mesh position={[0, 0, 0]}>
              <coneGeometry args={[0.15, 0.18, 16]} />
              <meshStandardMaterial color="#333333" roughness={0.4} />
            </mesh>
            {/* Warm Bulb Glow */}
            <pointLight intensity={2.5} distance={6} color="#ffa500" decay={2} castShadow />
            <mesh position={[0, -0.09, 0]}>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshBasicMaterial color="#ffeedd" />
            </mesh>
          </group>

          {/* Pendant Light Right */}
          <group position={[1.5, height - 0.7, -1]}>
            {/* Cable */}
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.7]} />
              <meshStandardMaterial color="#111111" />
            </mesh>
            {/* Lamp Shade */}
            <mesh position={[0, 0, 0]}>
              <coneGeometry args={[0.15, 0.18, 16]} />
              <meshStandardMaterial color="#333333" roughness={0.4} />
            </mesh>
            {/* Warm Bulb Glow */}
            <pointLight intensity={2.5} distance={6} color="#ffa500" decay={2} castShadow />
            <mesh position={[0, -0.09, 0]}>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshBasicMaterial color="#ffeedd" />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}
