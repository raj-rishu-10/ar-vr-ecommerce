import React from 'react';
import { useFurnitureStore } from '../../stores/useFurnitureStore';
import FurnitureItem from './FurnitureItem';

export default function FurnitureManager() {
  const { placedItems } = useFurnitureStore();

  return (
    <group name="furniture-layer">
      {placedItems.map((item) => (
        <FurnitureItem key={item.instanceId} item={item} />
      ))}
    </group>
  );
}
