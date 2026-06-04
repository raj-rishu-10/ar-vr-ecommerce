import React, { useRef, useState, useEffect } from 'react';
import { useFurnitureStore } from '../../stores/useFurnitureStore';
import { useRoomStore } from '../../stores/useRoomStore';
import FurnitureItem from './FurnitureItem';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

export default function FurnitureManager() {
  const { 
    placedItems, 
    activeItemId, 
    interactionMode, 
    updateFurnitureTransform, 
    isColliding, 
    setIsColliding 
  } = useFurnitureStore();
  const { dimensions } = useRoomStore();
  const itemRefs = useRef({});
  const [target, setTarget] = useState(null);
  
  const lastValidPosition = useRef([0, 0, 0]);
  const lastValidRotation = useRef([0, 0, 0]);

  useEffect(() => {
    // Small delay to ensure Three.js refs are fully populated
    const timeout = setTimeout(() => {
      const activeObj = itemRefs.current[activeItemId];
      setTarget(activeObj || null);
      if (activeObj) {
        lastValidPosition.current = activeObj.position.toArray();
        lastValidRotation.current = activeObj.rotation.toArray();
      }
    }, 60);
    return () => clearTimeout(timeout);
  }, [activeItemId, placedItems.length]);

  const checkCollision = (obj) => {
    if (!obj) return false;
    
    // 1. Calculate active box
    const activeBox = new THREE.Box3().setFromObject(obj);
    
    // 2. Room wall boundaries check
    const halfW = dimensions.width / 2;
    const halfD = dimensions.depth / 2;
    const wallBuffer = 0.05; // buffer for boundary collision

    if (
      activeBox.min.x < -halfW - wallBuffer || 
      activeBox.max.x > halfW + wallBuffer || 
      activeBox.min.z < -halfD - wallBuffer || 
      activeBox.max.z > halfD + wallBuffer
    ) {
      return true; // Wall collision
    }

    // 3. Object-to-object check
    for (const key of Object.keys(itemRefs.current)) {
      if (key === activeItemId) continue;
      const otherObj = itemRefs.current[key];
      if (otherObj) {
        const otherBox = new THREE.Box3().setFromObject(otherObj);
        if (activeBox.intersectsBox(otherBox)) {
          return true; // Overlap collision
        }
      }
    }

    return false;
  };

  const handleTransformChange = () => {
    if (target) {
      const colliding = checkCollision(target);
      setIsColliding(colliding);
      
      // Snapping to walls
      const pos = target.position;
      const halfW = dimensions.width / 2;
      const halfD = dimensions.depth / 2;
      const snapDist = 0.3; // 30cm snap threshold

      const activeBox = new THREE.Box3().setFromObject(target);
      const size = new THREE.Vector3();
      activeBox.getSize(size);

      // Snap Left (West) Wall
      if (Math.abs((pos.x - size.x / 2) - (-halfW)) < snapDist) {
        pos.x = -halfW + size.x / 2;
      }
      // Snap Right (East) Wall
      if (Math.abs((pos.x + size.x / 2) - halfW) < snapDist) {
        pos.x = halfW - size.x / 2;
      }
      // Snap Back (North) Wall
      if (Math.abs((pos.z - size.z / 2) - (-halfD)) < snapDist) {
        pos.z = -halfD + size.z / 2;
      }
      // Snap Front (South) Wall
      if (Math.abs((pos.z + size.z / 2) - halfD) < snapDist) {
        pos.z = halfD - size.z / 2;
      }

      // Always snap to floor
      pos.y = 0;
      target.position.copy(pos);
    }
  };

  return (
    <group name="furniture-layer">
      {target && interactionMode !== 'select' && (
        <TransformControls 
          object={target}
          mode={interactionMode}
          translationSnap={0.05} // 5cm fine grid snapping
          rotationSnap={Math.PI / 12} // 15 degrees snap
          onChange={handleTransformChange}
          onMouseUp={() => {
            if (target) {
              const collided = checkCollision(target);
              if (collided) {
                // Overlap or boundary violation - snap back to last valid transform
                target.position.fromArray(lastValidPosition.current);
                target.rotation.fromArray(lastValidRotation.current);
                setIsColliding(false);
              } else {
                // Success! Set new valid positions
                lastValidPosition.current = target.position.toArray();
                lastValidRotation.current = target.rotation.toArray();
              }
              
              updateFurnitureTransform(activeItemId, 'position', target.position.toArray());
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
