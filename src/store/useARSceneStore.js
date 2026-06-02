import { create } from 'zustand';

export const useARSceneStore = create((set, get) => ({
  placedItems: [],
  history: [], // Stack of placedItems states for Undo
  activeItemId: null,
  activeProduct: null, // The product currently selected in the bottom carousel to be placed
  isStabilized: false, // Whether ARCore has detected a surface
  
  // MODE SYSTEM: 'place' = next tap places a new object, 'move' = next tap moves selected object
  interactionMode: 'place',

  setStabilized: (stabilized) => set({ isStabilized: stabilized }),
  
  setActiveProduct: (product) => set({ activeProduct: product, interactionMode: 'place' }),

  setActiveItemId: (id) => set({ activeItemId: id }),

  // Switch to placement mode (user wants to add a new item)
  setPlacementMode: () => set({ interactionMode: 'place', activeItemId: null }),

  // Switch to move mode (user wants to reposition the selected item)
  setMoveMode: () => set({ interactionMode: 'move' }),

  placeItem: (product, position, rotation, scale) => set((state) => {
    const newItem = { id: crypto.randomUUID(), product, position, rotation, scale };
    const newPlacedItems = [...state.placedItems, newItem];
    return { 
      placedItems: newPlacedItems,
      history: [...state.history, state.placedItems], // push old state to history
      activeItemId: null, // Do not auto-select, allowing them to place another immediately
      interactionMode: 'place' // Stay in place mode to allow continuous tapping for multiple objects
    };
  }),

  updateTransform: (id, newTransform) => set((state) => {
    const newPlacedItems = state.placedItems.map(item => 
      item.id === id ? { ...item, ...newTransform } : item
    );
    // Don't push every tiny transform to history, or it will flood undo
    return { placedItems: newPlacedItems };
  }),

  deleteItem: (id) => set((state) => {
    const newPlacedItems = state.placedItems.filter(item => item.id !== id);
    return {
      placedItems: newPlacedItems,
      history: [...state.history, state.placedItems],
      activeItemId: state.activeItemId === id ? null : state.activeItemId,
      interactionMode: 'place' // Go back to placement mode after deleting
    };
  }),

  duplicateItem: (id) => set((state) => {
    const itemToClone = state.placedItems.find(item => item.id === id);
    if (!itemToClone) return state;

    // Offset position slightly so it doesn't z-fight exactly
    const newPos = [...itemToClone.position];
    newPos[0] += 0.3; // shift X slightly

    const newItem = {
      ...itemToClone,
      id: crypto.randomUUID(),
      position: newPos
    };

    const newPlacedItems = [...state.placedItems, newItem];
    return {
      placedItems: newPlacedItems,
      history: [...state.history, state.placedItems],
      activeItemId: newItem.id,
      interactionMode: 'move'
    };
  }),

  undo: () => set((state) => {
    if (state.history.length === 0) return state;
    const previousState = state.history[state.history.length - 1];
    return {
      placedItems: previousState,
      history: state.history.slice(0, -1),
      activeItemId: null, // clear selection on undo to avoid ghost selection
      interactionMode: 'place'
    };
  }),

  clearScene: () => set((state) => ({
    placedItems: [],
    history: [...state.history, state.placedItems],
    activeItemId: null,
    interactionMode: 'place'
  })),

  // Feature: Save/Load from LocalStorage
  saveScene: () => {
    const { placedItems } = get();
    localStorage.setItem('aura_ar_scene', JSON.stringify(placedItems));
  },

  loadScene: () => set((state) => {
    try {
      const saved = localStorage.getItem('aura_ar_scene');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          placedItems: parsed,
          history: [...state.history, state.placedItems], // push old state before loading
          activeItemId: null,
          interactionMode: 'place'
        };
      }
    } catch (err) {
      console.error("Failed to load scene", err);
    }
    return state;
  })
}));
