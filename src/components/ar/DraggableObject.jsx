import React, { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import useSceneStore from '../../store/sceneStore';

export default function DraggableObject({ obj, isSelected, isMultiSelected, onSelect, onMultiSelect }) {
  const meshRef = useRef();
  const groupRef = useRef();
  const updateObject = useSceneStore((s) => s.updateObject);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { camera } = useThree();

  const isActive = isSelected || isMultiSelected;

  // Gentle hover float for selected objects
  useFrame((state) => {
    if (meshRef.current && isSelected && !dragging) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.02;
    } else if (meshRef.current) {
      meshRef.current.position.y = 0;
    }
  });

  // Generate geometry based on scale proportions
  const getGeometry = () => {
    const [w, h, d] = obj.scale;
    const ratio = h / Math.max(w, d);

    if (ratio > 3) {
      return <cylinderGeometry args={[w * 0.3, w * 0.5, h, 16]} />;
    } else if (ratio < 0.4) {
      // Flat — likely a rug/table
      return <boxGeometry args={[w, h, d]} />;
    } else {
      return <boxGeometry args={[w, h, d]} />;
    }
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.shiftKey) {
      // Shift+click = multi-select
      onMultiSelect?.();
    } else {
      onSelect();
      setDragging(true);
      document.body.style.cursor = 'grabbing';
    }
  };

  const handlePointerUp = () => {
    setDragging(false);
    document.body.style.cursor = hovered ? 'grab' : 'auto';
  };

  const handlePointerMove = (e) => {
    if (dragging && isSelected) {
      e.stopPropagation();
      const { point } = e;
      updateObject(obj.uid, {
        position: [point.x, obj.position[1], point.z],
      });
    }
  };

  // Scroll wheel to scale (desktop)
  const handleWheel = useCallback((e) => {
    if (!isActive) return;
    e.stopPropagation();
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    const [sx, sy, sz] = obj.scale;
    updateObject(obj.uid, {
      scale: [
        Math.max(0.1, sx * factor),
        Math.max(0.1, sy * factor),
        Math.max(0.1, sz * factor),
      ],
    });
  }, [isActive, obj.scale, obj.uid, updateObject]);

  // Double click to rotate 45°
  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    const [rx, ry, rz] = obj.rotation;
    updateObject(obj.uid, {
      rotation: [rx, ry + Math.PI / 4, rz],
    });
  }, [obj.rotation, obj.uid, updateObject]);

  const maxScale = Math.max(...obj.scale);

  // Color theming for selection states
  const emissive = isSelected
    ? '#6c5ce7'
    : isMultiSelected
    ? '#00b894'
    : hovered
    ? '#3a3a6a'
    : '#000000';

  const emissiveIntensity = isSelected ? 0.35 : isMultiSelected ? 0.25 : hovered ? 0.15 : 0;

  return (
    <group ref={groupRef} position={obj.position}>
      <mesh
        ref={meshRef}
        rotation={obj.rotation}
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'grab'; }}
        onPointerOut={() => { setHovered(false); if (!dragging) document.body.style.cursor = 'auto'; }}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        {getGeometry()}
        <meshStandardMaterial
          color={obj.color}
          roughness={0.3}
          metalness={0.1}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Selection ring — purple for single, green for multi */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[maxScale * 0.8, maxScale * 0.88, 64]} />
          <meshBasicMaterial
            color={isMultiSelected ? '#00b894' : '#6c5ce7'}
            transparent
            opacity={0.55}
          />
        </mesh>
      )}

      {/* Object name label */}
      {(isActive || hovered) && (
        <Text
          position={[0, Math.max(obj.scale[1], 0.5) + 0.35, 0]}
          fontSize={0.14}
          color={isSelected ? '#a29bfe' : isMultiSelected ? '#00b894' : '#8888a0'}
          anchorX="center"
          anchorY="bottom"
        >
          {obj.name}{obj.quantity > 1 ? ` ×${obj.quantity}` : ''}
        </Text>
      )}

      {/* Controls hint */}
      {isSelected && (
        <Text
          position={[0, -0.15, maxScale * 0.9]}
          fontSize={0.07}
          color="#44446a"
          anchorX="center"
          anchorY="top"
        >
          {'Drag:Move | Scroll:Scale | DblClick:Rotate | Shift+Click:Multi'}
        </Text>
      )}
    </group>
  );
}
