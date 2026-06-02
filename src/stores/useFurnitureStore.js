import { create } from 'zustand';

export const useFurnitureStore = create((set, get) => ({
  placedItems: [],
  activeItemId: null,
  interactionMode: 'select', // 'select', 'move', 'rotate', 'scale'
  
  addFurniture: (item) => {
    const newItem = {
      ...item,
      instanceId: crypto.randomUUID(),
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    };
    set((state) => ({ 
      placedItems: [...state.placedItems, newItem],
      activeItemId: newItem.instanceId,
      interactionMode: 'move'
    }));
  },
  
  updateFurnitureTransform: (id, transformType, value) => {
    set((state) => ({
      placedItems: state.placedItems.map(item => 
        item.instanceId === id ? { ...item, [transformType]: value } : item
      )
    }));
  },
  
  removeFurniture: (id) => {
    set((state) => ({
      placedItems: state.placedItems.filter(item => item.instanceId !== id),
      activeItemId: state.activeItemId === id ? null : state.activeItemId
    }));
  },
  
  setActiveItem: (id) => set({ activeItemId: id }),
  setInteractionMode: (mode) => set({ interactionMode: mode }),
  
  clearRoom: () => set({ placedItems: [], activeItemId: null })
}));
