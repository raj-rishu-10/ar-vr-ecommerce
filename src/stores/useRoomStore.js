import { create } from 'zustand';

export const useRoomStore = create((set, get) => ({
  dimensions: { width: 5, height: 3, depth: 5 }, // in meters
  wallMaterial: { color: '#ffffff', texture: null },
  floorMaterial: { color: '#e0e0e0', texture: 'wood' },
  ceilingMaterial: { color: '#ffffff', texture: null },
  
  setDimensions: (width, height, depth) => set({ dimensions: { width, height, depth } }),
  setWallMaterial: (material) => set({ wallMaterial: { ...get().wallMaterial, ...material } }),
  setFloorMaterial: (material) => set({ floorMaterial: { ...get().floorMaterial, ...material } }),
  setCeilingMaterial: (material) => set({ ceilingMaterial: { ...get().ceilingMaterial, ...material } }),
  
  generateRoomLayout: (scannedData) => {
    // Will be populated by OpenCV / Depth models
    set({ dimensions: scannedData.dimensions });
  }
}));
