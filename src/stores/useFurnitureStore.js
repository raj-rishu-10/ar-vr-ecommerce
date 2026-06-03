import { create } from 'zustand';

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
    
    history: [[]],
    historyIndex: 0,
    
    addFurniture: (item) => {
      set((state) => {
        const newItem = {
          ...item,
          instanceId: crypto.randomUUID(),
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1]
        };
        const newItems = [...state.placedItems, newItem];
        return { 
          placedItems: newItems,
          activeItemId: newItem.instanceId,
          interactionMode: 'translate',
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
