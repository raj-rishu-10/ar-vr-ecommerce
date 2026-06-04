import { create } from 'zustand';

export const useRoomStore = create((set, get) => ({
  dimensions: { width: 5, height: 3, depth: 5 }, // in meters
  wallMaterial: { color: '#f5f5f0', texture: null },
  floorMaterial: { color: '#d4a574', texture: 'wood' }, // Wood color default
  ceilingMaterial: { color: '#ffffff', texture: null },
  accentWallColor: '#183153', // Classic dark blue accent wall (IKEA style)
  curtainColor: '#2d3748', // Dark curtains
  hasCeilingBeams: false,
  hasWindow: false,
  roomTemplate: 'empty',
  
  setDimensions: (width, height, depth) => set({ dimensions: { width, height, depth } }),
  setWallMaterial: (material) => set({ wallMaterial: { ...get().wallMaterial, ...material } }),
  setFloorMaterial: (material) => set({ floorMaterial: { ...get().floorMaterial, ...material } }),
  setCeilingMaterial: (material) => set({ ceilingMaterial: { ...get().ceilingMaterial, ...material } }),
  setAccentWallColor: (color) => set({ accentWallColor: color }),
  setCurtainColor: (color) => set({ curtainColor: color }),
  setHasCeilingBeams: (val) => set({ hasCeilingBeams: val }),
  setHasWindow: (val) => set({ hasWindow: val }),
  setRoomTemplate: (template) => set({ roomTemplate: template }),
  
  generateRoomLayout: (scannedData) => {
    set({ dimensions: scannedData.dimensions });
  }
}));
