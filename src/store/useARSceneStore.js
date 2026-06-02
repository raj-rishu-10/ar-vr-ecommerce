import { create } from 'zustand';
import { useProjectStore } from './useProjectStore';

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
      activeItemId: newItem.id, // Auto-select the newly placed item
      interactionMode: 'move' // After placing, switch to move mode so next tap moves it
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

  // Feature: Save/Load to Project Store
  saveScene: () => {
    const { placedItems } = get();
    // Use the global project store to save this scene data into the active project
    useProjectStore.getState().saveCurrentProjectData(placedItems);
    alert('Project saved successfully!');
  },

  loadScene: () => set((state) => {
    try {
      // Load from the currently active project
      const currentId = useProjectStore.getState().currentProjectId;
      if (!currentId) return state;

      const project = useProjectStore.getState().projects.find(p => p.id === currentId);
      
      if (project && project.sceneData) {
        return {
          placedItems: project.sceneData,
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
