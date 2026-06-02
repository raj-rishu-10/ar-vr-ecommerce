import React, { useRef } from 'react';
import { useGLTF, TransformControls } from '@react-three/drei';
import { useFurnitureStore } from '../../stores/useFurnitureStore';

export default function FurnitureItem({ item }) {
  const { scene } = useGLTF(item.glbModel);
  const { activeItemId, interactionMode, setActiveItem, updateFurnitureTransform } = useFurnitureStore();
  const groupRef = useRef();

  const isActive = activeItemId === item.instanceId;

  // Clone the scene so multiple instances of same model have separate materials/state
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);

  return (
    <group 
      position={item.position} 
      rotation={item.rotation} 
      scale={item.scale}
      onClick={(e) => {
        e.stopPropagation();
        setActiveItem(item.instanceId);
      }}
    >
      {isActive && interactionMode !== 'select' ? (
        <TransformControls 
          mode={interactionMode}
          onMouseUp={() => {
            if (groupRef.current) {
              updateFurnitureTransform(item.instanceId, 'position', groupRef.current.position.toArray());
              updateFurnitureTransform(item.instanceId, 'rotation', groupRef.current.rotation.toArray());
              updateFurnitureTransform(item.instanceId, 'scale', groupRef.current.scale.toArray());
            }
          }}
        >
          <primitive object={clonedScene} ref={groupRef} castShadow receiveShadow />
        </TransformControls>
      ) : (
        <primitive object={clonedScene} castShadow receiveShadow />
      )}
    </group>
  );
}
