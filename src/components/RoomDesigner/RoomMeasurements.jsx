import React from 'react';
import { Html } from '@react-three/drei';
import { useRoomStore } from '../../stores/useRoomStore';

export default function RoomMeasurements() {
  const { dimensions } = useRoomStore();
  const { width, height, depth } = dimensions;

  const halfW = width / 2;
  const halfD = depth / 2;
  
  // Format to cm
  const wCm = Math.round(width * 100);
  const hCm = Math.round(height * 100);
  const dCm = Math.round(depth * 100);

  return (
    <group>
      {/* ── Width Measurement (Front Floor Edge) ── */}
      <group position={[0, 0.02, halfD + 0.25]}>
        {/* Draw a subtle guide line */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.005, width]} />
          <meshBasicMaterial color="#0058a3" opacity={0.4} transparent />
        </mesh>
        
        <Html center distanceFactor={10}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0058a3',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: '11px',
            fontWeight: 800,
            background: '#ffffff',
            padding: '3px 8px',
            borderRadius: '20px',
            border: '1.5px solid #0058a3',
            whiteSpace: 'nowrap',
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.08)',
            userSelect: 'none'
          }}>
            ← {wCm} cm →
          </div>
        </Html>
      </group>

      {/* ── Depth Measurement (Right Floor Edge) ── */}
      <group position={[halfW + 0.25, 0.02, 0]}>
        {/* Draw guide line */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, depth]} />
          <meshBasicMaterial color="#0058a3" opacity={0.4} transparent />
        </mesh>
        
        <Html center distanceFactor={10}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0058a3',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: '11px',
            fontWeight: 800,
            background: '#ffffff',
            padding: '3px 8px',
            borderRadius: '20px',
            border: '1.5px solid #0058a3',
            whiteSpace: 'nowrap',
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.08)',
            transform: 'rotate(-90deg)',
            userSelect: 'none'
          }}>
            ← {dCm} cm →
          </div>
        </Html>
      </group>

      {/* ── Height Measurement (Left Back Vertical Edge) ── */}
      <group position={[-halfW - 0.25, height / 2, -halfD]}>
        {/* Draw vertical line */}
        <mesh>
          <cylinderGeometry args={[0.005, 0.005, height]} />
          <meshBasicMaterial color="#0058a3" opacity={0.4} transparent />
        </mesh>
        
        <Html center distanceFactor={10}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#0058a3',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: '10px',
            fontWeight: 800,
            background: '#ffffff',
            padding: '4px 6px',
            borderRadius: '12px',
            border: '1.5px solid #0058a3',
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.08)',
            userSelect: 'none'
          }}>
            <span>↑</span>
            <span style={{ margin: '1px 0' }}>{hCm} cm</span>
            <span>↓</span>
          </div>
        </Html>
      </group>
    </group>
  );
}
