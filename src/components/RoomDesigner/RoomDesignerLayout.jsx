import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useProjectStore } from '../../store/useProjectStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { useCameraStore } from '../../stores/useCameraStore';
import { useFurnitureStore } from '../../stores/useFurnitureStore';
import RoomCanvas from './RoomCanvas';
import RoomScanner from '../RoomScanner/RoomScanner';
import ItemOptionsPanel from './ItemOptionsPanel';
import products from '../../data/products.json';
import { createXRStore } from '@react-three/xr';

import { 
  FiPlus, FiList, FiHeart, FiChevronLeft, FiCamera, FiSave, 
  FiShoppingBag, FiSearch, FiChevronDown, FiMaximize2, FiTrash2, FiMousePointer, FiArrowRight,
  FiVideo, FiShare2, FiCornerUpLeft, FiCornerUpRight
} from 'react-icons/fi';
import { BiCubeAlt, BiSquare, BiBox, BiPalette } from 'react-icons/bi';

const xrStore = createXRStore();

const WALL_COLORS = [
  '#f5f5f0', // off-white
  '#e5e7eb', // light grey
  '#d1d5db', // grey
  '#9ca3af', // medium grey
  '#4b5563', // dark grey
  '#111827', // charcoal
  '#a3b8c2', // light blue
  '#6b8a9c', // slate blue
  '#a8b3a0', // sage green
  '#6e7f69', // olive green
  '#d4a574', // tan
  '#8b5a41', // rust
];

export default function RoomDesignerLayout() {
  const location = useLocation();
  const presetData = location.state;
  const { setDimensions, wallMaterial, setWallMaterial } = useRoomStore();
  const { activeView, setView } = useCameraStore();
  const { activeItemId, placedItems, interactionMode, setInteractionMode, clearRoom, addFurniture, removeFurniture, undo, redo, history, historyIndex } = useFurnitureStore();
  const [showScanner, setShowScanner] = useState(false);
  const { projects, currentProjectId, saveCurrentProjectData, loadProjects } = useProjectStore();
  
  const [leftTab, setLeftTab] = useState('add'); // 'add' | 'list' | 'favorites'
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [viewPicker, setViewPicker] = useState(null); // 'dollhouse' | 'side'
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'ar-room-screenshot.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        chunksRef.current = [];
        recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'ar-room-recording.webm';
          link.click();
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My AR Room Design',
          text: 'Check out my new room design created in AR!',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      alert('Sharing is not supported on this browser. You can copy the URL instead.');
    }
  };

  const activeItem = placedItems.find(i => i.instanceId === activeItemId);

  const isInitialMount = useRef(true);

  // Load projects from localStorage on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Initialize room data on mount or when preset is passed
  useEffect(() => {
    if (presetData?.presetRoom) {
      const existing = projects.find(p => p.name === presetData.presetRoom);
      if (existing) {
        useProjectStore.getState().setCurrentProject(existing.id);
      } else {
        const name = presetData.presetRoom;
        const type = presetData.presetCategory || 'Bedroom';
        
        let dimensions = { width: 5, height: 3, depth: 5 };
        let wallColor = '#ffffff';
        let floorColor = '#e0e0e0';
        
        if (name.includes('Sophisticated')) {
          dimensions = { width: 6, height: 3, depth: 5 };
          wallColor = '#2b3e50';
        } else if (name.includes('Nordic')) {
          dimensions = { width: 6, height: 3, depth: 4 };
          wallColor = '#d2dbd6';
        } else if (name.includes('International')) {
          dimensions = { width: 5, height: 3, depth: 6 };
          wallColor = '#f5f5f0';
        } else if (name.includes('Playfully')) {
          dimensions = { width: 5, height: 3, depth: 5 };
          wallColor = '#f0e5d8';
        }

        const initialSceneData = [];
        let newActiveId = null;
        if (presetData.addProduct) {
          newActiveId = crypto.randomUUID();
          initialSceneData.push({
            ...presetData.addProduct,
            instanceId: newActiveId,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: presetData.addProduct.modelScale || [1, 1, 1]
          });
        }
        
        const newProjId = crypto.randomUUID();
        const newProject = {
          id: newProjId,
          name,
          type,
          updatedAt: new Date().toISOString(),
          thumbnail: presetData.addProduct?.image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
          sceneData: initialSceneData,
          roomData: { dimensions, wallMaterial: { color: wallColor }, floorMaterial: { color: floorColor, texture: 'wood' } }
        };
        
        // Update projects store
        useProjectStore.setState((state) => {
          const updated = [newProject, ...state.projects];
          localStorage.setItem('aura_projects', JSON.stringify(updated));
          return { projects: updated, currentProjectId: newProjId };
        });

        if (newActiveId) {
          useFurnitureStore.setState({ activeItemId: newActiveId, interactionMode: 'translate' });
        }
      }
    }
  }, [presetData, projects.length]);

  useEffect(() => {
    if (!currentProjectId) return;
    const project = projects.find(p => p.id === currentProjectId);
    if (project) {
      if (project.roomData) {
        useRoomStore.setState({ 
          dimensions: project.roomData.dimensions,
          wallMaterial: project.roomData.wallMaterial,
          floorMaterial: project.roomData.floorMaterial
        });
      }
      if (project.sceneData) {
        useFurnitureStore.setState({ placedItems: project.sceneData });
      }
    }
  }, [currentProjectId, projects]);

  // Auto-save when room or furniture changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (currentProjectId) {
      const roomData = {
        dimensions: useRoomStore.getState().dimensions,
        wallMaterial: useRoomStore.getState().wallMaterial,
        floorMaterial: useRoomStore.getState().floorMaterial
      };
      saveCurrentProjectData(placedItems, roomData);
    }
  }, [placedItems, useRoomStore.getState().dimensions, useRoomStore.getState().wallMaterial, useRoomStore.getState().floorMaterial]);

  const AR_PRODUCTS = products.filter((p) => p.glbModel);
  const totalPrice = placedItems.reduce((acc, item) => acc + (item.price || 0), 0);
  const priceRs = Math.round(totalPrice * 83);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── Top Header ── */}
      <header className="room-header" style={{ height: 60, display: 'flex', borderBottom: '1px solid #e5e5e5', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}>
        
        {/* Left Side (Matches Sidebar Width) */}
        <div className="room-header-left" style={{ width: 340, minWidth: 340, display: 'flex', height: '100%', borderRight: '1px solid #e5e5e5' }}>
          {[
            { id: 'add', icon: <FiPlus size={16} />, label: 'Add' },
            { id: 'list', icon: <FiList size={16} />, label: 'List' },
            { id: 'favorites', icon: <FiHeart size={16} />, label: 'Favorites' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setLeftTab(tab.id); useFurnitureStore.setState({ activeItemId: null }); }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                border: 'none', background: 'transparent', cursor: 'pointer',
                borderBottom: leftTab === tab.id && !activeItem ? '3px solid #111' : '3px solid transparent',
                color: leftTab === tab.id && !activeItem ? '#111' : '#767676',
                fontWeight: leftTab === tab.id && !activeItem ? 700 : 500, fontSize: 13,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Center-Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, paddingLeft: 20 }}>
          <button style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#111' }}>
            <FiChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>Untitled Design</span>
        </div>

        {/* Right Side */}
        <div className="room-header-right" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', gap: 16, color: '#111' }}>
            <FiCamera size={20} style={{ cursor: 'pointer' }} onClick={handleScreenshot} title="Take screenshot" />
            <FiVideo size={20} style={{ cursor: 'pointer', color: isRecording ? '#cc0008' : '#111' }} onClick={toggleRecording} title={isRecording ? "Stop Recording" : "Record Video"} />
            <FiShare2 size={20} style={{ cursor: 'pointer' }} onClick={handleShare} title="Share Design" />
            <FiSave size={20} style={{ cursor: 'pointer' }} onClick={() => saveCurrentProjectData(placedItems, { dimensions: useRoomStore.getState().dimensions, wallMaterial: useRoomStore.getState().wallMaterial, floorMaterial: useRoomStore.getState().floorMaterial })} title="Save project" />
            <FiShoppingBag size={20} style={{ cursor: 'pointer' }} title="Shopping bag" />
          </div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#111' }}>Rs.{priceRs.toLocaleString('en-IN')}</div>
          <button style={{ background: '#0058a3', color: '#fff', border: 'none', borderRadius: 24, padding: '8px 20px', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            Summary <FiArrowRight size={16} />
          </button>
        </div>
      </header>

      {/* ── Main Body ── */}
      <main className="room-main" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ── Left Sidebar ── */}
        <aside className="room-sidebar" style={{ width: 340, minWidth: 340, background: '#fff', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e5e5', zIndex: 10 }}>
          
          {/* Active Item Options Panel */}
          {activeItem ? (
            <ItemOptionsPanel item={activeItem} onClose={() => useFurnitureStore.setState({ activeItemId: null })} />
          ) : leftTab === 'add' ? (
            /* Add Products View */
            <>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <FiSearch style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#767676', fontSize: 16 }} />
                  <input type="text" placeholder="Search..." style={{ width: '100%', padding: '12px 14px 12px 40px', background: '#f5f5f0', border: 'none', borderRadius: 24, outline: 'none', fontSize: 14, fontWeight: 500 }} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#111' }}>
                  Bedroom <FiChevronDown size={18} />
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                  {['Beds', 'Wardrobes', 'Chest of drawers'].map(cat => (
                    <div key={cat} style={{ background: '#f5f5f0', color: '#111', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      {cat}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#111' }}>
                  All categories <FiChevronDown size={16} />
                </div>
              </div>

              {/* Product List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {AR_PRODUCTS.map(product => (
                  <div key={product.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ position: 'relative', background: '#f5f5f0', borderRadius: 4, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={product.image} alt={product.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      
                      {/* Hover Add Button (like IKEA) */}
                      <button 
                        onClick={() => addFurniture(product)}
                        style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.05)',
                          border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                          cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                      >
                        <div style={{ width: 36, height: 36, background: '#111', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>+</div>
                        <div style={{ background: '#111', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 4 }}>Add to room</div>
                      </button>
                    </div>
                    <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.4 }}>
                      <strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#111' }}>{product.name}</strong>
                      <span style={{ color: '#767676' }}>{product.description?.substring(0, 40)}...</span>
                      <strong style={{ fontSize: 13, color: '#111' }}>Rs.{Math.round(product.price * 83).toLocaleString('en-IN')}</strong>
                      
                      <div style={{ color: '#767676', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0058a3' }} />
                        Available for delivery
                      </div>
                      <div style={{ color: '#767676', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                        Limited stock in store
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : leftTab === 'list' ? (
            /* List View */
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#111', marginBottom: 16 }}>Items in room ({placedItems.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {placedItems.map(item => (
                  <div key={item.instanceId} style={{ display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid #e5e5e5', paddingBottom: 16 }}>
                    <div style={{ width: 64, height: 64, background: '#f5f5f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={item.image} alt={item.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: '#111' }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: '#767676' }}>{item.description?.substring(0, 30)}...</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginTop: 2 }}>Rs.{Math.round(item.price * 83).toLocaleString('en-IN')}</div>
                    </div>
                    <button onClick={() => removeFurniture(item.instanceId)} style={{ background: 'none', border: 'none', color: '#767676', cursor: 'pointer' }}><FiTrash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Favorites View */
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#111', marginBottom: 16 }}>Saved for later</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {AR_PRODUCTS.slice(2, 4).map(product => (
                  <div key={product.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ position: 'relative', background: '#f5f5f0', borderRadius: 4, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={product.image} alt={product.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      <button 
                        onClick={() => addFurniture(product)}
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                      >
                        <div style={{ width: 36, height: 36, background: '#111', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>+</div>
                        <div style={{ background: '#111', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 4 }}>Add to room</div>
                      </button>
                    </div>
                    <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.4 }}>
                      <strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#111' }}>{product.name}</strong>
                      <strong style={{ fontSize: 13, color: '#111' }}>Rs.{Math.round(product.price * 83).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── Main Canvas Area ── */}
        <section className="room-canvas-container" style={{ flex: 1, position: 'relative', background: '#d1d5db' }}>
          
          <div style={{ width: '100%', height: '100%' }}>
            {/* Top Toolbar */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', gap: 8 }}>
              <button title="Magic Erase & Scan Room" onClick={() => setShowScanner(true)} style={{ padding: '8px 16px', background: '#fff', color: '#111', border: 'none', borderRadius: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                ✨ Magic Erase
              </button>
              <button title="Undo" onClick={undo} disabled={historyIndex === 0} style={{ width: 36, height: 36, background: '#fff', color: historyIndex === 0 ? '#ccc' : '#111', border: 'none', borderRadius: '50%', cursor: historyIndex === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <FiCornerUpLeft />
              </button>
              <button title="Redo" onClick={redo} disabled={historyIndex === history.length - 1} style={{ width: 36, height: 36, background: '#fff', color: historyIndex === history.length - 1 ? '#ccc' : '#111', border: 'none', borderRadius: '50%', cursor: historyIndex === history.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <FiCornerUpRight />
              </button>
              <button title="Clear Room" onClick={clearRoom} style={{ width: 36, height: 36, background: '#fff', color: '#111', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <FiTrash2 />
              </button>
            </div>

            <button 
              onClick={() => xrStore.enterAR()}
              style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, padding: '8px 16px', background: '#0058a3', color: '#fff', border: 'none', borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              Enter AR Mode
            </button>

            {/* 3D Scene */}
            <RoomCanvas xrStore={xrStore} />



            {/* Wall Color Picker Floating Panel */}
            {showColorPicker && (
              <div style={{ position: 'absolute', bottom: 90, right: 30, zIndex: 15, background: '#fff', borderRadius: 24, padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {WALL_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setWallMaterial({ color })}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: color, cursor: 'pointer',
                      border: wallMaterial.color === color ? '2px solid #111' : '1px solid #ccc',
                      outline: wallMaterial.color === color ? '2px solid #fff' : 'none', outlineOffset: -3,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Bottom View Switcher */}
            <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: '#fff', borderRadius: 30, padding: 6, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              
              {/* Dollhouse */}
              <button 
                onClick={() => { setView('perspective'); setViewPicker(null); }} 
                style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: activeView === 'perspective' ? '#f5f5f0' : 'transparent', borderRadius: 20, padding: '10px 16px', fontWeight: 700, color: '#111', fontSize: 13, cursor: 'pointer' }}
              >
                <BiCubeAlt size={18} /> Dollhouse <FiChevronDown />
              </button>

              {/* Top view */}
              <button onClick={() => { setView('top'); setViewPicker(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: activeView === 'top' ? '#f5f5f0' : 'transparent', borderRadius: 20, padding: '10px 16px', fontWeight: 700, color: '#111', fontSize: 13, cursor: 'pointer' }}>
                <BiSquare size={18} /> Top view
              </button>

              {/* Side views with Popup */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => { setViewPicker(viewPicker === 'side' ? null : 'side'); }} 
                  style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: ['front','left','right'].includes(activeView) || viewPicker === 'side' ? '#f5f5f0' : 'transparent', borderRadius: 20, padding: '10px 16px', fontWeight: 700, color: '#111', fontSize: 13, cursor: 'pointer' }}
                >
                  <BiBox size={18} /> Side views <FiChevronDown />
                </button>
                
                {viewPicker === 'side' && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 16, background: '#fff', padding: 8, borderRadius: 16, border: '1px solid #dfdfdf', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', display: 'flex', gap: 12 }}>
                    
                    {/* View Option 1 (Top/Side hybrid) */}
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="view-btn-container">
                      <button 
                        onClick={() => { setView('left'); setViewPicker(null); }}
                        style={{ width: 100, height: 70, background: '#e5e5e5', border: '1px solid #ccc', borderRadius: 12, cursor: 'pointer', overflow: 'hidden', padding: 0 }}
                      >
                        {/* Placeholder for the isometric/top view thumbnail */}
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #f0f0f0 50%, #dcdcdc 50%)' }}></div>
                      </button>
                      <div className="view-tooltip" style={{ background: '#111', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, position: 'absolute', bottom: -12, whiteSpace: 'nowrap', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>Switch to top view</div>
                    </div>

                    {/* View Option 2 (Back/Side) */}
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="view-btn-container">
                      <button 
                        onClick={() => { setView('front'); setViewPicker(null); }}
                        style={{ width: 100, height: 70, background: '#fff', border: '2px solid #111', borderRadius: 12, cursor: 'pointer', overflow: 'hidden', padding: 0 }}
                      >
                         {/* Placeholder for the back view thumbnail */}
                         <div style={{ width: '100%', height: '100%', background: 'linear-gradient(225deg, #f0f0f0 50%, #dcdcdc 50%)' }}></div>
                      </button>
                      <div className="view-tooltip" style={{ background: '#111', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, position: 'absolute', bottom: -12, whiteSpace: 'nowrap', opacity: 1, pointerEvents: 'none' }}>Back</div>
                    </div>

                    <style>{`
                      .view-btn-container:hover .view-tooltip { opacity: 1 !important; z-index: 20; }
                    `}</style>
                  </div>
                )}
              </div>

              <div style={{ width: 1, height: 24, background: '#e5e5e5', margin: '0 4px' }} />
              
              {/* Wall color toggle */}
              <button 
                onClick={() => setShowColorPicker(v => !v)} 
                style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: showColorPicker ? '#f5f5f0' : 'transparent', borderRadius: 20, padding: '10px 16px', fontWeight: 700, color: '#111', fontSize: 13, cursor: 'pointer' }}
              >
                <BiPalette size={18} /> Wall color
              </button>
            </div>
          </div>
        </section>
      </main>

      {showScanner && <RoomScanner onClose={() => setShowScanner(false)} />}
    </div>
  );
}
