import { create } from 'zustand';

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProjectId: null,

  loadProjects: () => {
    try {
      const saved = localStorage.getItem('aura_projects');
      if (saved) set({ projects: JSON.parse(saved) });
    } catch (err) {
      console.error(err);
    }
  },

  createProject: (name, type = 'empty') => {
    const newProject = {
      id: crypto.randomUUID(),
      name,
      type,
      updatedAt: new Date().toISOString(),
      thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', // Default placeholder
      sceneData: [], // Will store the placedItems
      roomData: { dimensions: { width: 5, height: 3, depth: 5 }, wallMaterial: { color: '#ffffff' }, floorMaterial: { color: '#e0e0e0' } }
    };
    
    set((state) => {
      const updated = [newProject, ...state.projects];
      localStorage.setItem('aura_projects', JSON.stringify(updated));
      return { projects: updated, currentProjectId: newProject.id };
    });
    return newProject.id;
  },

  deleteProject: (id) => {
    set((state) => {
      const updated = state.projects.filter(p => p.id !== id);
      localStorage.setItem('aura_projects', JSON.stringify(updated));
      return { projects: updated };
    });
  },

  setCurrentProject: (id) => set({ currentProjectId: id }),

  saveCurrentProjectData: (sceneData, roomData) => {
    const { currentProjectId, projects } = get();
    if (!currentProjectId) return;

    set((state) => {
      const updated = state.projects.map(p => 
        p.id === currentProjectId ? { 
          ...p, 
          sceneData: sceneData || p.sceneData, 
          roomData: roomData || p.roomData,
          updatedAt: new Date().toISOString() 
        } : p
      );
      localStorage.setItem('aura_projects', JSON.stringify(updated));
      return { projects: updated };
    });
  }
}));
