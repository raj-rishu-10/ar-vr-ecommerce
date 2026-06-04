import { create } from 'zustand';
import { safeUUID } from '../utils/uuid';

export const useFurnitureStore = create((set, get) => {
  const saveHistory = (items, state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(items))); // deep clone
    
    // Keep max 15 steps
    if (newHistory.length > 15) newHistory.shift();
    
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  };

  return {
    placedItems: [],
    activeItemId: null,
    interactionMode: 'select', // 'select', 'translate', 'rotate', 'scale'
    isColliding: false,
    
    history: [[]],
    historyIndex: 0,
    
    setIsColliding: (isColliding) => set({ isColliding }),
    
    addFurniture: (item, customProps = {}) => {
      set((state) => {
        const newItem = {
          ...item,
          instanceId: safeUUID(),
          position: customProps.position || [0, 0, 0],
          rotation: customProps.rotation || [0, 0, 0],
          scale: customProps.scale || item.modelScale || [1, 1, 1],
          customColor: customProps.customColor || item.modelColor || null,
          customMaterial: customProps.customMaterial || null
        };
        const newItems = [...state.placedItems, newItem];
        return { 
          placedItems: newItems,
          activeItemId: newItem.instanceId,
          interactionMode: 'select',
          ...saveHistory(newItems, state)
        };
      });
    },
    
    updateFurnitureTransform: (id, transformType, value) => {
      set((state) => {
        const newItems = state.placedItems.map(item => 
          item.instanceId === id ? { ...item, [transformType]: value } : item
        );
        return {
          placedItems: newItems,
          ...saveHistory(newItems, state)
        };
      });
    },

    updateFurnitureProps: (id, props) => {
      set((state) => {
        const newItems = state.placedItems.map(item => 
          item.instanceId === id ? { ...item, ...props } : item
        );
        return {
          placedItems: newItems,
          ...saveHistory(newItems, state)
        };
      });
    },
    
    removeFurniture: (id) => {
      set((state) => {
        const newItems = state.placedItems.filter(item => item.instanceId !== id);
        return {
          placedItems: newItems,
          activeItemId: state.activeItemId === id ? null : state.activeItemId,
          ...saveHistory(newItems, state)
        };
      });
    },

    duplicateFurniture: (id) => {
      set((state) => {
        const original = state.placedItems.find(item => item.instanceId === id);
        if (!original) return state;

        const duplicated = {
          ...original,
          instanceId: safeUUID(),
          // Offset slightly from original
          position: [original.position[0] + 0.4, original.position[1], original.position[2] + 0.4]
        };

        const newItems = [...state.placedItems, duplicated];
        return {
          placedItems: newItems,
          activeItemId: duplicated.instanceId,
          interactionMode: 'select',
          ...saveHistory(newItems, state)
        };
      });
    },

    replaceFurniture: (id, newProduct) => {
      set((state) => {
        const original = state.placedItems.find(item => item.instanceId === id);
        if (!original) return state;

        const replaced = {
          ...newProduct,
          instanceId: id, // preserve same selection ID
          position: [...original.position],
          rotation: [...original.rotation],
          scale: newProduct.modelScale || [...original.scale],
          customColor: newProduct.modelColor || null,
          customMaterial: null
        };

        const newItems = state.placedItems.map(item => 
          item.instanceId === id ? replaced : item
        );
        return {
          placedItems: newItems,
          activeItemId: id,
          ...saveHistory(newItems, state)
        };
      });
    },

    rotateFurnitureIncremental: (id, angleDegrees) => {
      set((state) => {
        const item = state.placedItems.find(i => i.instanceId === id);
        if (!item) return state;

        const rad = (angleDegrees * Math.PI) / 180;
        const currentRot = [...item.rotation];
        currentRot[1] = (currentRot[1] + rad) % (Math.PI * 2);

        const newItems = state.placedItems.map(i => 
          i.instanceId === id ? { ...i, rotation: currentRot } : i
        );
        return {
          placedItems: newItems,
          ...saveHistory(newItems, state)
        };
      });
    },
    
    setActiveItem: (id) => set({ activeItemId: id }),
    setInteractionMode: (mode) => set({ interactionMode: mode }),
    
    clearRoom: () => {
      set((state) => ({ 
        placedItems: [], 
        activeItemId: null,
        ...saveHistory([], state)
      }));
    },
    
    undo: () => set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          historyIndex: newIndex,
          placedItems: JSON.parse(JSON.stringify(state.history[newIndex])),
          activeItemId: null
        };
      }
      return state;
    }),
    
    redo: () => set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          historyIndex: newIndex,
          placedItems: JSON.parse(JSON.stringify(state.history[newIndex])),
          activeItemId: null
        };
      }
      return state;
    })
  };
});
