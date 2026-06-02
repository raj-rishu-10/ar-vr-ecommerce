import React, { useRef, useState, useEffect } from 'react';
import { useFurnitureStore } from '../../stores/useFurnitureStore';
import { useRoomStore } from '../../stores/useRoomStore';
import FurnitureItem from './FurnitureItem';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

export default function FurnitureManager() {
  const { placedItems, activeItemId, interactionMode, updateFurnitureTransform } = useFurnitureStore();
  const { dimensions } = useRoomStore();
  const itemRefs = useRef({});
  const [target, setTarget] = useState(null);

  useEffect(() => {
    // Add small delay so React commits the refs to the DOM/Three before we try to attach TransformControls
    const timeout = setTimeout(() => {
      setTarget(itemRefs.current[activeItemId] || null);
    }, 50);
    return () => clearTimeout(timeout);
  }, [activeItemId, placedItems.length]);

  return (
    <group name="furniture-layer">
      {target && interactionMode !== 'select' && (
        <TransformControls 
          object={target}
          mode={interactionMode}
          translationSnap={0.1}
          rotationSnap={Math.PI / 4}
          onMouseUp={() => {
            if (target) {
              const pos = target.position;
              
              // Recalculate box for collision offsets using actual current scale
              const box = new THREE.Box3().setFromObject(target);
              const size = new THREE.Vector3();
              box.getSize(size);
              
              const halfW = dimensions.width / 2;
              const halfD = dimensions.depth / 2;
              
              // We don't divide size by 2 for padding because setFromObject already accounts for scale
              const paddingX = size.x / 2; 
              const paddingZ = size.z / 2;

              pos.x = THREE.MathUtils.clamp(pos.x, -halfW + paddingX, halfW - paddingX);
              pos.z = THREE.MathUtils.clamp(pos.z, -halfD + paddingZ, halfD - paddingZ);
              pos.y = Math.max(0, pos.y);
              
              target.position.copy(pos);

              updateFurnitureTransform(activeItemId, 'position', pos.toArray());
              updateFurnitureTransform(activeItemId, 'rotation', target.rotation.toArray());
              updateFurnitureTransform(activeItemId, 'scale', target.scale.toArray());
            }
          }}
        />
      )}

      {placedItems.map((item) => (
        <FurnitureItem 
          key={item.instanceId} 
          item={item} 
          setRef={(el) => {
            if (el) itemRefs.current[item.instanceId] = el;
            else delete itemRefs.current[item.instanceId];
          }}
        />
      ))}
    </group>
  );
}
