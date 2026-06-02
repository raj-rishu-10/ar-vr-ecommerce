import React, { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { useCameraStore } from '../../stores/useCameraStore';
import { useFurnitureStore } from '../../stores/useFurnitureStore';
import RoomCanvas from './RoomCanvas';
import RoomScanner from '../RoomScanner/RoomScanner';
import products from '../../data/products.json';
import { createXRStore } from '@react-three/xr';

import { 
  FiPlus, FiList, FiHeart, FiChevronLeft, FiCamera, FiSave, 
  FiShoppingBag, FiSearch, FiChevronDown, FiEdit2, FiMove, 
  FiRotateCw, FiMaximize2, FiTrash2, FiMousePointer, FiArrowRight 
} from 'react-icons/fi';
import { BiCubeAlt, BiSquare, BiBox, BiPalette } from 'react-icons/bi';

const xrStore = createXRStore();

export default function RoomDesignerLayout() {
  const { setDimensions, wallMaterial, setWallMaterial } = useRoomStore();
  const { activeView, setView } = useCameraStore();
  const { interactionMode, setInteractionMode, clearRoom, addFurniture, placedItems } = useFurnitureStore();
  const [showScanner, setShowScanner] = useState(false);
  const { projects, currentProjectId, saveCurrentProjectData } = useProjectStore();

  const isInitialMount = useRef(true);

  // Initialize room data on mount
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
  }, [currentProjectId]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Header */}
      <header style={{ height: '60px', display: 'flex', borderBottom: '2px solid #e5e5e5', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'space-between', paddingRight: '20px' }}>
        {/* Left Side (Matches Sidebar Width) */}
        <div style={{ width: '340px', minWidth: '340px', display: 'flex', height: '100%', borderRight: '1px solid #e5e5e5' }}>
          <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', background: 'transparent', borderBottom: '3px solid #000', color: '#000', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
            <FiPlus size={16} /> Add
          </button>
          <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', background: 'transparent', color: '#4b5563', fontSize: '14px', cursor: 'pointer' }}>
            <FiList size={16} /> List
          </button>
          <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', background: 'transparent', color: '#4b5563', fontSize: '14px', cursor: 'pointer' }}>
            <FiHeart size={16} /> Favorites
          </button>
        </div>

        {/* Center-Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, paddingLeft: '20px' }}>
          <button style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <FiChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: '600', fontSize: '15px' }}>Untitled Design</span>
        </div>

        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', color: '#111827' }}>
            <FiCamera size={20} style={{ cursor: 'pointer' }} />
            <FiSave size={20} style={{ cursor: 'pointer' }} onClick={() => saveCurrentProjectData(placedItems, { dimensions: useRoomStore.getState().dimensions, wallMaterial: useRoomStore.getState().wallMaterial, floorMaterial: useRoomStore.getState().floorMaterial })} />
            <FiShoppingBag size={20} style={{ cursor: 'pointer' }} />
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Rs.2,990</div>
          <button style={{ background: '#0058a3', color: '#fff', border: 'none', borderRadius: '24px', padding: '10px 24px', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            Summary <FiArrowRight />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Sidebar */}
        <aside style={{ width: '340px', minWidth: '340px', background: '#fff', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e5e5' }}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '18px' }} />
              <input type="text" placeholder="Search..." style={{ width: '100%', padding: '14px 14px 14px 44px', background: '#f3f4f6', border: 'none', borderRadius: '24px', outline: 'none', fontSize: '14px', fontWeight: '500' }} />
            </div>

            <div style={{ fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              Living room <FiChevronDown />
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {['Sofas', 'Coffee & side tables', 'TV unit & media furniture'].map(cat => (
                <div key={cat} style={{ background: '#f3f4f6', color: '#111827', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  {cat}
                </div>
              ))}
            </div>

            <div style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              All categories <FiChevronDown />
            </div>
          </div>

          {/* Product Grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {AR_PRODUCTS.map(product => (
              <div key={product.id} onClick={() => addFurniture(product)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: '#f9fafb', borderRadius: '4px', padding: '16px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={product.image} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.4' }}>
                  <strong style={{ fontSize: '13px', textTransform: 'uppercase', color: '#111827' }}>{product.name}</strong>
                  <span style={{ color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {product.description || 'Furniture item, standard size'}
                  </span>
                  <strong style={{ fontSize: '14px', marginTop: '4px', color: '#111827' }}>Rs.{Math.floor(Math.random() * 50000) + 2990}</strong>
                  
                  <div style={{ color: '#4b5563', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af' }} />
                    Delivery availability un...
                  </div>
                  <div style={{ color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    Stock availability unkn...
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Canvas Area */}
        <section style={{ flex: 1, position: 'relative', background: '#d1d5db', display: 'flex', flexDirection: 'column', padding: '20px' }}>
          
          {/* Main 3D Canvas */}
          <div style={{ flex: 1, borderRadius: '4px', overflow: 'hidden', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            
            {/* Top Interaction Toolbar */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '6px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              {[
                { mode: 'select', icon: <FiMousePointer /> },
                { mode: 'translate', icon: <FiMove /> },
                { mode: 'rotate', icon: <FiRotateCw /> },
                { mode: 'scale', icon: <FiMaximize2 /> }
              ].map(({ mode, icon }) => (
                <button
                  key={mode}
                  title={mode}
                  onClick={() => setInteractionMode(mode)}
                  style={{
                    width: '36px', height: '36px',
                    background: interactionMode === mode ? '#e5e7eb' : 'transparent',
                    color: interactionMode === mode ? '#111827' : '#4b5563',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                  }}
                >
                  {icon}
                </button>
              ))}
              <div style={{ width: '1px', background: '#d1d5db', margin: '4px' }} />
              <button title="Clear Room" onClick={clearRoom} style={{ width: '36px', height: '36px', background: 'transparent', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                <FiTrash2 />
              </button>
              
              <div style={{ width: '1px', background: '#d1d5db', margin: '4px' }} />
              <button title="AI Scan Room" onClick={() => setShowScanner(true)} style={{ padding: '0 16px', background: '#0058a3', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                AI Scan
              </button>
            </div>

            {/* Enter AR Button */}
            <button 
              onClick={() => xrStore.enterAR()}
              style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, padding: '10px 20px', background: 'rgba(0, 88, 163, 0.9)', backdropFilter: 'blur(4px)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
            >
              Enter AR Mode
            </button>

            <RoomCanvas xrStore={xrStore} />
          </div>

          {/* Bottom Floating View Toolbar */}
          <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: '#fff', borderRadius: '30px', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <button onClick={() => setView('perspective')} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'transparent', fontWeight: activeView === 'perspective' ? 'bold' : '600', color: activeView === 'perspective' ? '#111827' : '#4b5563', fontSize: '14px', cursor: 'pointer' }}>
              <BiCubeAlt size={20} /> Dollhouse <FiChevronDown />
            </button>
            <button onClick={() => setView('top')} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'transparent', fontWeight: activeView === 'top' ? 'bold' : '600', color: activeView === 'top' ? '#111827' : '#4b5563', fontSize: '14px', cursor: 'pointer' }}>
              <BiSquare size={20} /> Top view
            </button>
            <button onClick={() => setView('front')} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'transparent', fontWeight: activeView === 'front' ? 'bold' : '600', color: activeView === 'front' ? '#111827' : '#4b5563', fontSize: '14px', cursor: 'pointer' }}>
              <BiBox size={20} /> Side views <FiChevronDown />
            </button>
            
            {/* Wall Color */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '1px solid #e5e5e5', paddingLeft: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: '#111827', fontSize: '14px', cursor: 'pointer' }}>
                <BiPalette size={20} /> Wall color
                <input type="color" value={wallMaterial.color} onChange={(e) => setWallMaterial({ color: e.target.value })} style={{ width: '0', height: '0', opacity: 0, position: 'absolute' }} />
              </label>
              <button style={{ border: 'none', background: 'transparent', color: '#111827', cursor: 'pointer', display: 'flex' }}>
                <FiEdit2 size={18} />
              </button>
            </div>
          </div>

        </section>
      </main>

      {showScanner && <RoomScanner onClose={() => setShowScanner(false)} />}
    </div>
  );
}
