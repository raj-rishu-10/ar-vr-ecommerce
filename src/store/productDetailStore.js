import { create } from 'zustand';

const useProductDetailStore = create((set) => ({
  selectedColor: '#2D3436', // default color
  selectedMaterial: 'Wood', // default material
  measurementMode: 'overall', // 'overall' | 'detailed' | 'custom'
  customPoints: [], // array of THREE.Vector3 for distance measurement
  arState: {
    active: false,
    supported: true,
  },
  cameraState: {
    position: [0, 1.5, 4],
    target: [0, 0, 0],
  },
  resetStore: () => set({
    selectedColor: '#2D3436',
    selectedMaterial: 'Wood',
    measurementMode: 'overall',
    customPoints: [],
    arState: { active: false, supported: true }
  }),
  setSelectedColor: (color) => set({ selectedColor: color }),
  setSelectedMaterial: (material) => set({ selectedMaterial: material }),
  setMeasurementMode: (mode) => set({ measurementMode: mode, customPoints: [] }), // Reset custom points when changing modes
  addCustomPoint: (point) => set((state) => {
    if (state.customPoints.length >= 2) {
      return { customPoints: [point] }; // Start over with the new point
    }
    return { customPoints: [...state.customPoints, point] };
  }),
  clearCustomPoints: () => set({ customPoints: [] }),
  setARState: (arState) => set({ arState }),
  setCameraState: (cameraState) => set({ cameraState }),
}));

export default useProductDetailStore;
