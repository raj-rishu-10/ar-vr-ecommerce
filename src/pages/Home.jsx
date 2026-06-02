import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProjectStore } from '../store/useProjectStore';
import './Dashboard.scss';

const TEMPLATES = [
  { id: 'empty', name: 'Empty Room', icon: '⬜', desc: 'Start from scratch' },
  { id: 'living', name: 'Living Room', icon: '🛋️', desc: 'Standard 4x5m living area' },
  { id: 'bedroom', name: 'Bedroom', icon: '🛏️', desc: 'Standard 3x4m bedroom' },
  { id: 'office', name: 'Home Office', icon: '💻', desc: 'Standard 3x3m office' }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, loadProjects, createProject, deleteProject, setCurrentProject } = useProjectStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = (type) => {
    const name = prompt("Enter project name:", "My New Room");
    if (!name) return;
    const id = createProject(name, type);
    navigate('/ar'); // Directs to the room builder
  };

  const handleOpenProject = (id) => {
    setCurrentProject(id);
    navigate('/ar');
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">📐</div>
          <h2>AURA Planner</h2>
        </div>
        
        <nav className="sidebar-nav">
          <button className="nav-item active">
            <span className="icon">🏠</span> Dashboard
          </button>
          <button className="nav-item">
            <span className="icon">📁</span> My Projects
          </button>
          <button className="nav-item">
            <span className="icon">🪑</span> Furniture Catalog
          </button>
          <button className="nav-item">
            <span className="icon">⚙️</span> Settings
          </button>
        </nav>

        <div className="sidebar-profile">
          <div className="avatar">JD</div>
          <div className="info">
            <div className="name">John Doe</div>
            <div className="plan">Pro Plan</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Welcome back, John 👋</h1>
          <div className="header-actions">
            <div className="search-box">
              <span className="icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search projects..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={() => handleCreateProject('empty')}>
              + New Project
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          
          {/* Templates Section */}
          <section className="dashboard-section">
            <h2>Start from a Template</h2>
            <div className="template-grid">
              {TEMPLATES.map((tpl) => (
                <motion.div 
                  key={tpl.id} 
                  className="template-card"
                  whileHover={{ y: -5 }}
                  onClick={() => handleCreateProject(tpl.id)}
                >
                  <div className="template-icon">{tpl.icon}</div>
                  <div className="template-info">
                    <h3>{tpl.name}</h3>
                    <p>{tpl.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Recent Projects Section */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Recent Projects</h2>
              <span className="badge">{projects.length}</span>
            </div>
            
            {projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <h3>No projects yet</h3>
                <p>Create a new project or select a template above to get started.</p>
              </div>
            ) : (
              <div className="project-grid">
                {filteredProjects.map((project) => (
                  <motion.div 
                    key={project.id} 
                    className="project-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="project-thumb" onClick={() => handleOpenProject(project.id)}>
                      <img src={project.thumbnail} alt={project.name} />
                      <div className="thumb-overlay">
                        <span className="open-btn">Open Editor</span>
                      </div>
                    </div>
                    <div className="project-details">
                      <div className="project-meta">
                        <h3>{project.name}</h3>
                        <p>Last edited: {new Date(project.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <button 
                        className="btn-icon-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this project?')) deleteProject(project.id);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
