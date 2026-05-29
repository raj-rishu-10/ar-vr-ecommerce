import { create } from 'zustand';

const STORAGE_KEY = 'aura_scenes';
const MAX_UNDO = 10;

const loadScenes = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveScenes = (scenes) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
  } catch (e) {
    console.error('Failed to save scenes:', e);
  }
};

const useSceneStore = create((set, get) => ({
  scenes: loadScenes(),
  currentScene: {
    id: null,
    name: '',
    objects: [],
  },
  selectedObjectId: null,
  selectedObjectIds: [],   // multi-select
  undoStack: [],           // array of object-array snapshots
  redoStack: [],

  // ─── History helpers ───
  _snapshot: () => {
    const { undoStack, currentScene } = get();
    const snapshot = JSON.parse(JSON.stringify(currentScene.objects));
    const newUndo = [snapshot, ...undoStack].slice(0, MAX_UNDO);
    set({ undoStack: newUndo, redoStack: [] });
  },

  undo: () => {
    const { undoStack, redoStack, currentScene } = get();
    if (!undoStack.length) return;
    const [prev, ...rest] = undoStack;
    const redoSnap = JSON.parse(JSON.stringify(currentScene.objects));
    set({
      undoStack: rest,
      redoStack: [redoSnap, ...redoStack].slice(0, MAX_UNDO),
      currentScene: { ...currentScene, objects: prev },
      selectedObjectId: null,
      selectedObjectIds: [],
    });
  },

  redo: () => {
    const { redoStack, undoStack, currentScene } = get();
    if (!redoStack.length) return;
    const [next, ...rest] = redoStack;
    const undoSnap = JSON.parse(JSON.stringify(currentScene.objects));
    set({
      redoStack: rest,
      undoStack: [undoSnap, ...undoStack].slice(0, MAX_UNDO),
      currentScene: { ...currentScene, objects: next },
      selectedObjectId: null,
      selectedObjectIds: [],
    });
  },

  // ─── Scene objects ───
  addObject: (product) => {
    get()._snapshot();
    const state = get();
    const existing = state.currentScene.objects;
    if (existing.length >= 20) {
      console.warn('Max 20 objects per scene');
      return null;
    }
    const newObj = {
      uid: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      position: [
        (Math.random() - 0.5) * 2,
        0,
        -2 - Math.random() * 2,
      ],
      rotation: [0, 0, 0],
      scale: product.modelScale || [1, 1, 1],
      color: product.modelColor || '#636E72',
      quantity: 1,
    };
    set((s) => ({
      currentScene: {
        ...s.currentScene,
        objects: [...s.currentScene.objects, newObj],
      },
    }));
    return newObj;
  },

  removeObject: (uid) => {
    get()._snapshot();
    set((s) => ({
      currentScene: {
        ...s.currentScene,
        objects: s.currentScene.objects.filter((obj) => obj.uid !== uid),
      },
      selectedObjectId: s.selectedObjectId === uid ? null : s.selectedObjectId,
      selectedObjectIds: s.selectedObjectIds.filter((id) => id !== uid),
    }));
  },

  removeSelected: () => {
    const { selectedObjectIds, selectedObjectId } = get();
    const toRemove = new Set(selectedObjectIds.length ? selectedObjectIds : selectedObjectId ? [selectedObjectId] : []);
    if (!toRemove.size) return;
    get()._snapshot();
    set((s) => ({
      currentScene: {
        ...s.currentScene,
        objects: s.currentScene.objects.filter((obj) => !toRemove.has(obj.uid)),
      },
      selectedObjectId: null,
      selectedObjectIds: [],
    }));
  },

  duplicateObject: (uid) => {
    const obj = get().currentScene.objects.find((o) => o.uid === uid);
    if (!obj) return;
    get()._snapshot();
    const clone = {
      ...obj,
      uid: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: [obj.position[0] + 1.5, obj.position[1], obj.position[2]],
    };
    set((s) => ({
      currentScene: {
        ...s.currentScene,
        objects: [...s.currentScene.objects, clone],
      },
    }));
  },

  updateObject: (uid, updates) =>
    set((s) => ({
      currentScene: {
        ...s.currentScene,
        objects: s.currentScene.objects.map((obj) =>
          obj.uid === uid ? { ...obj, ...updates } : obj
        ),
      },
    })),

  updateObjectQuantity: (uid, quantity) => {
    if (quantity < 1) return;
    set((s) => ({
      currentScene: {
        ...s.currentScene,
        objects: s.currentScene.objects.map((obj) =>
          obj.uid === uid ? { ...obj, quantity } : obj
        ),
      },
    }));
  },

  // ─── Selection ───
  selectObject: (uid) =>
    set({ selectedObjectId: uid, selectedObjectIds: [] }),

  toggleMultiSelect: (uid) => {
    const { selectedObjectIds } = get();
    if (selectedObjectIds.includes(uid)) {
      set({ selectedObjectIds: selectedObjectIds.filter((id) => id !== uid) });
    } else {
      set({ selectedObjectIds: [...selectedObjectIds, uid], selectedObjectId: null });
    }
  },

  deselectObject: () => set({ selectedObjectId: null, selectedObjectIds: [] }),

  selectAll: () => {
    const uids = get().currentScene.objects.map((o) => o.uid);
    set({ selectedObjectIds: uids, selectedObjectId: null });
  },

  // ─── Scene persistence ───
  saveScene: (name) => {
    const state = get();
    const scene = {
      id: state.currentScene.id || `scene_${Date.now()}`,
      name: name || `Scene ${state.scenes.length + 1}`,
      objects: state.currentScene.objects,
      savedAt: new Date().toISOString(),
    };

    const scenes = state.scenes.filter((s) => s.id !== scene.id);
    scenes.unshift(scene);
    saveScenes(scenes);

    set({
      scenes,
      currentScene: scene,
    });
    return scene;
  },

  loadScene: (sceneId) => {
    const scene = get().scenes.find((s) => s.id === sceneId);
    if (scene) {
      set({
        currentScene: { ...scene },
        selectedObjectId: null,
        selectedObjectIds: [],
        undoStack: [],
        redoStack: [],
      });
    }
  },

  deleteScene: (sceneId) => {
    const scenes = get().scenes.filter((s) => s.id !== sceneId);
    saveScenes(scenes);
    set({ scenes });
  },

  newScene: () =>
    set({
      currentScene: { id: null, name: '', objects: [] },
      selectedObjectId: null,
      selectedObjectIds: [],
      undoStack: [],
      redoStack: [],
    }),

  // ─── AR Cart helpers ───
  getSceneCartTotal: () => {
    const { objects } = get().currentScene;
    return objects.reduce((sum, obj) => sum + (obj.price || 0) * (obj.quantity || 1), 0);
  },

  getSceneCartItems: () => {
    const { objects } = get().currentScene;
    // Group by productId
    const map = {};
    objects.forEach((obj) => {
      if (!map[obj.productId]) {
        map[obj.productId] = {
          productId: obj.productId,
          name: obj.name,
          price: obj.price,
          image: obj.image,
          quantity: obj.quantity || 1,
          uids: [obj.uid],
        };
      } else {
        map[obj.productId].quantity += obj.quantity || 1;
        map[obj.productId].uids.push(obj.uid);
      }
    });
    return Object.values(map);
  },
}));

export default useSceneStore;
