import React, { useRef } from 'react';
import { useGLTF, TransformControls } from '@react-three/drei';
import { useFurnitureStore } from '../../stores/useFurnitureStore';
import { useRoomStore } from '../../stores/useRoomStore';
import * as THREE from 'three';

export default function FurnitureItem({ item }) {
  const { scene } = useGLTF(item.glbModel);
  const { activeItemId, interactionMode, setActiveItem, updateFurnitureTransform } = useFurnitureStore();
  const { dimensions } = useRoomStore();
  const [target, setTarget] = React.useState(null);

  const isActive = activeItemId === item.instanceId;

  // Clone the scene so multiple instances of same model have separate materials/state
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);

  // Compute a rough bounding box for collision offsets
  const boundingBox = React.useMemo(() => new THREE.Box3().setFromObject(clonedScene), [clonedScene]);
  const size = boundingBox.getSize(new THREE.Vector3());

  return (
    <group>
      {isActive && interactionMode !== 'select' && target && (
        <TransformControls 
          object={target}
          mode={interactionMode}
          translationSnap={0.1} // Snap to 10cm grid
          rotationSnap={Math.PI / 4} // Snap to 45 degrees
          onMouseUp={() => {
            if (target) {
              const pos = target.position;
              
              // Prevent clipping through walls (bounding box approach)
              const halfW = dimensions.width / 2;
              const halfD = dimensions.depth / 2;
              const paddingX = (size.x * target.scale.x) / 2;
              const paddingZ = (size.z * target.scale.z) / 2;

              pos.x = THREE.MathUtils.clamp(pos.x, -halfW + paddingX, halfW - paddingX);
              pos.z = THREE.MathUtils.clamp(pos.z, -halfD + paddingZ, halfD - paddingZ);
              pos.y = Math.max(0, pos.y); // Snap to floor or above
              
              // Apply clamping back to the ref immediately
              target.position.copy(pos);

              updateFurnitureTransform(item.instanceId, 'position', pos.toArray());
              updateFurnitureTransform(item.instanceId, 'rotation', target.rotation.toArray());
              updateFurnitureTransform(item.instanceId, 'scale', target.scale.toArray());
            }
          }}
        />
      )}

      <group 
        ref={setTarget}
        position={item.position} 
        rotation={item.rotation} 
        scale={item.scale}
        onClick={(e) => {
          e.stopPropagation();
          setActiveItem(item.instanceId);
        }}
      >
        <primitive object={clonedScene} castShadow receiveShadow />
      </group>
    </group>
  );
}
