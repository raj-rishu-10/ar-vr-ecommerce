import { create } from 'zustand';

export const useCameraStore = create((set) => ({
  activeView: 'perspective', // 'perspective', 'top', 'left', 'right', 'front', 'dollhouse'
  isOrthographic: false,
  
  setView: (viewName) => {
    const isOrtho = ['top', 'left', 'right', 'front'].includes(viewName);
    set({ activeView: viewName, isOrthographic: isOrtho });
  }
}));
