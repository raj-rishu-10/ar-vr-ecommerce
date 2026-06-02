import React from 'react';
import { useGLTF, Clone } from '@react-three/drei';
import { useFurnitureStore } from '../../stores/useFurnitureStore';

export default function FurnitureItem({ item, setRef }) {
  const { scene } = useGLTF(item.glbModel);
  const { setActiveItem } = useFurnitureStore();

  return (
    <group 
      ref={setRef}
      position={item.position} 
      rotation={item.rotation} 
      scale={item.scale}
      onClick={(e) => {
        e.stopPropagation();
        setActiveItem(item.instanceId);
      }}
    >
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}
