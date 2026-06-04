import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRoomStore } from '../../stores/useRoomStore';
import { useCameraStore } from '../../stores/useCameraStore';
import { useFurnitureStore } from '../../stores/useFurnitureStore';
import { useProjectStore } from '../../store/useProjectStore';
import RoomCanvas from './RoomCanvas';
import RoomScanner from '../RoomScanner/RoomScanner';
import ItemOptionsPanel from './ItemOptionsPanel';
import products from '../../data/products.json';
import { 
  FiChevronLeft, FiPlus, FiList, FiHeart, FiSearch, 
  FiChevronDown, FiTrash2, FiCamera, FiVideo, FiShare2, 
  FiSave, FiShoppingBag, FiArrowRight, FiCornerUpLeft, 
  FiCornerUpRight, FiDownload, FiLayout
} from 'react-icons/fi';
import { BiCubeAlt, BiSquare, BiBox, BiPalette, BiImage } from 'react-icons/bi';

const WALL_COLORS = [
  '#f5f5f0', '#ffffff', '#e5e7eb', '#183153', '#708090', 
  '#4a5d4e', '#d2dbd6', '#f3e5ab', '#e6c280', '#e0d8b0'
];

const FLOOR_MATERIALS = [
  { id: 'wood_light', name: 'Light Oak Wood', color: '#d4a574', texture: 'wood' },
  { id: 'wood_dark', name: 'Dark Walnut Wood', color: '#5c4033', texture: 'wood' },
  { id: 'carpet_grey', name: 'Grey Cozy Carpet', color: '#a1a1aa', texture: 'carpet' },
  { id: 'tile_modern', name: 'White Marble Tile', color: '#f3f4f6', texture: 'tile' },
];

const TEMPLATES = [
  {
    id: 'bedroom',
    name: 'Modern Bedroom Showroom',
    desc: 'Spacious layout with wooden flooring, dark blue accent wall, large wardrobe, vanity area, and a ceiling light.',
    img: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80',
    dimensions: { width: 7, height: 3, depth: 9 }
  },
  {
    id: 'living',
    name: 'Cozy Living Room',
    desc: 'Perfect family space with grey carpet, velvet sofa, coffee table, and an industrial lamp.',
    img: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&q=80',
    dimensions: { width: 6, height: 2.8, depth: 7 }
  },
  {
    id: 'kitchen',
    name: 'Minimalist Kitchen',
    desc: 'Modern kitchen space ready for countertops and modular island tables.',
    img: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&q=80',
    dimensions: { width: 5, height: 3, depth: 5 }
  },
  {
    id: 'dining',
    name: 'Scandinavian Dining',
    desc: 'Sleek dining room optimized for long oak tables and matching chairs.',
    img: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80',
    dimensions: { width: 6, height: 2.8, depth: 5 }
  },
  {
    id: 'office',
    name: 'Ergonomic Home Office',
    desc: 'Bright workspace focusing on desk comfort, shelving storage, and high-back seating.',
    img: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&q=80',
    dimensions: { width: 4, height: 2.8, depth: 4 }
  },
  {
    id: 'kids',
    name: 'Playful Kids Room',
    desc: 'Colorful space designed with toy boxes, desks, and safety wall-snapped shelves.',
    img: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80',
    dimensions: { width: 4, height: 2.8, depth: 5 }
  },
  {
    id: 'bathroom',
    name: 'Compact Bathroom',
    desc: 'Water-resistant tile floor, compact cabinets, and modern lighting.',
    img: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80',
    dimensions: { width: 3, height: 2.8, depth: 4 }
  }
];

const IKEA_CATEGORIES = [
  { id: 'sofas', label: 'Sofas' },
  { id: 'beds', label: 'Beds' },
  { id: 'wardrobes', label: 'Wardrobes' },
  { id: 'tables', label: 'Tables' },
  { id: 'chairs', label: 'Chairs' },
  { id: 'tv_units', label: 'TV Units' },
  { id: 'storage', label: 'Storage' },
  { id: 'office', label: 'Office' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'decor', label: 'Decor' }
];

export default function RoomDesignerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const presetData = location.state;

  const { 
    setDimensions, wallMaterial, setWallMaterial, 
    floorMaterial, setFloorMaterial, setAccentWallColor, 
    setCurtainColor, setHasCeilingBeams, setHasWindow, setRoomTemplate 
  } = useRoomStore();

  const { activeView, setView } = useCameraStore();
  const { 
    activeItemId, placedItems, interactionMode, setInteractionMode, 
    clearRoom, addFurniture, removeFurniture, undo, redo, 
    history, historyIndex, replaceFurniture 
  } = useFurnitureStore();

  const { projects, currentProjectId, saveCurrentProjectData, loadProjects, createProject } = useProjectStore();

  const [showScanner, setShowScanner] = useState(false);
  const [leftTab, setLeftTab] = useState('add'); 
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFloorPicker, setShowFloorPicker] = useState(false);
  const [viewPicker, setViewPicker] = useState(null); 
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Room Template Landing Page state
  const [showTemplatesLanding, setShowTemplatesLanding] = useState(!presetData);
  const [customWidth, setCustomWidth] = useState(500); // in cm
  const [customDepth, setCustomDepth] = useState(500); // in cm
  const [customHeight, setCustomHeight] = useState(280); // in cm
  
  // Selected category in Add sidebar
  const [selectedCategory, setSelectedCategory] = useState('beds');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportDropdown, setExportDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize projects
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Listen to replace event from FurnitureItem toolbar
  useEffect(() => {
    const handleReplaceEvent = (e) => {
      const item = e.detail;
      setLeftTab('add');
      setSelectedCategory(item.category || 'beds');
      // Briefly flash selector
      const elem = document.getElementById('catalog-sidebar-title');
      if (elem) elem.scrollIntoView({ behavior: 'smooth' });
    };
    window.addEventListener('ikea-replace-furniture', handleReplaceEvent);
    return () => window.removeEventListener('ikea-replace-furniture', handleReplaceEvent);
  }, []);

  // Initialize room data when preset is passed
  useEffect(() => {
    if (presetData?.presetRoom) {
      const existing = projects.find(p => p.name === presetData.presetRoom);
      if (existing) {
        useProjectStore.getState().setCurrentProject(existing.id);
      } else {
        const name = presetData.presetRoom;
        const type = presetData.presetCategory || 'Bedroom';
        
        let dims = { width: 5, height: 3, depth: 5 };
        let wColor = '#f5f5f0';
        let fColor = '#d4a574';
        
        if (name.includes('Sophisticated')) {
          dims = { width: 6, height: 3, depth: 5 };
          wColor = '#183153';
        } else if (name.includes('Nordic')) {
          dims = { width: 6, height: 3, depth: 4 };
          wColor = '#d2dbd6';
        }
        
        const newProj = createProject(name);
        useRoomStore.setState({ 
          dimensions: dims,
          wallMaterial: { color: wColor },
          floorMaterial: { color: fColor }
        });
        
        // Add default product
        if (presetData.presetProduct) {
          addFurniture(presetData.presetProduct, { position: [0, 0, 0] });
        }
      }
    }
  }, [presetData, projects.length]);

  // Auto-save logic
  const isInitialMount = useRef(true);
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

  // Product helper mapped to 10 IKEA categories
  const getProductsByCategory = (catId) => {
    const rawProducts = products.filter(p => p.glbModel);
    
    switch (catId) {
      case 'sofas':
        return rawProducts.filter(p => p.category === 'sofas' && !p.name.includes('Bed'));
      case 'beds':
        return rawProducts.filter(p => p.name.includes('Bed') || p.category === 'sofas' && p.name.includes('Frame'));
      case 'wardrobes':
        return rawProducts.filter(p => p.category === 'storage').map(p => ({
          ...p,
          id: p.id + 100,
          name: 'PAX Wardrobe System',
          description: 'Spacious wardrobe with custom wood shelves.',
          price: 649.99,
          category: 'wardrobes',
          glbModel: '/models/ToyTrain.glb',
          modelScale: [1.5, 2.2, 0.6],
          dimensions: { width: 150, height: 220, depth: 60 }
        }));
      case 'tables':
        return rawProducts.filter(p => p.category === 'tables');
      case 'chairs':
        return rawProducts.filter(p => p.category === 'chairs');
      case 'tv_units':
        return rawProducts.filter(p => p.category === 'storage').slice(0, 1).map(p => ({
          ...p,
          id: p.id + 200,
          name: 'BESTÅ TV Console',
          description: 'Sleek storage console for media appliances.',
          price: 289.99,
          category: 'tv_units',
          glbModel: '/models/GeoPlanter.glb',
          modelScale: [1.6, 0.5, 0.45],
          dimensions: { width: 160, height: 50, depth: 45 }
        }));
      case 'storage':
        return rawProducts.filter(p => p.category === 'storage');
      case 'office':
        return rawProducts.filter(p => p.name.includes('Office') || p.category === 'chairs').map(p => ({
          ...p,
          category: 'office'
        }));
      case 'lighting':
        return rawProducts.filter(p => p.category === 'lighting');
      case 'decor':
        return rawProducts.filter(p => p.category === 'tables' || p.category === 'lighting').map(p => ({
          ...p,
          id: p.id + 300,
          name: 'STOCKHOLM Round Rug',
          description: 'Flatwoven cozy jute rug, perfect under tables.',
          price: 129.99,
          category: 'decor',
          image: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=400&h=400&fit=crop',
          glbModel: '/models/GeoPlanter.glb',
          modelScale: [2.5, 0.01, 2.5],
          dimensions: { width: 250, height: 1, depth: 250 }
        }));
      default:
        return rawProducts;
    }
  };

  const filteredProducts = (searchQuery.trim() !== ''
    ? products.filter(p => p.glbModel)
    : getProductsByCategory(selectedCategory)
  ).filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeItem = placedItems.find(i => i.instanceId === activeItemId);
  const totalPrice = placedItems.reduce((acc, item) => acc + (item.price || 0), 0);
  const priceRs = Math.round(totalPrice * 83);

  // Template initialisation
  const handleSelectTemplate = (templateId) => {
    const name = `${templateId.charAt(0).toUpperCase() + templateId.slice(1)} Layout`;
    createProject(name);
    
    clearRoom();
    
    if (templateId === 'bedroom') {
      setDimensions(7, 3, 9);
      setWallMaterial({ color: '#f5f5f0' });
      setFloorMaterial({ color: '#d4a574', texture: 'wood' });
      setHasWindow(true);
      setHasCeilingBeams(true);
      setAccentWallColor('#183153');
      setCurtainColor('#2d3748');
      setRoomTemplate('bedroom');
      
      // Load modern Bedroom presets
      addFurniture({
        id: 901, name: 'PAX Wardrobe System', price: 649.99, 
        image: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&h=400&fit=crop', 
        category: 'wardrobes', glbModel: '/models/ToyTrain.glb', modelScale: [1.5, 2.2, 0.6],
        dimensions: { width: 150, height: 220, depth: 60 }
      }, { position: [-3.2, 0, -2], rotation: [0, Math.PI / 2, 0] });
      
      addFurniture({
        id: 902, name: 'MALM Vanity Table', price: 199.99, 
        image: 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=400&h=400&fit=crop', 
        category: 'tables', glbModel: '/models/GeoPlanter.glb', modelScale: [1.2, 0.75, 0.45],
        dimensions: { width: 120, height: 75, depth: 45 }
      }, { position: [3.2, 0, 0.5], rotation: [0, -Math.PI / 2, 0] });
      
      addFurniture({
        id: 903, name: 'EKOLN Chair', price: 79.99, 
        image: 'https://images.unsplash.com/photo-1567538096621-38d2284b23ff?w=400&h=400&fit=crop', 
        category: 'chairs', glbModel: '/models/Chair.glb', modelScale: [1, 1, 1],
        dimensions: { width: 60, height: 80, depth: 60 }
      }, { position: [2.3, 0, 0.5], rotation: [0, Math.PI / 2, 0] });
      
      addFurniture({
        id: 904, name: 'STOCKHOLM Round Rug', price: 129.99, 
        image: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=400&h=400&fit=crop', 
        category: 'decor', glbModel: '/models/GeoPlanter.glb', modelScale: [2.5, 0.01, 2.5],
        dimensions: { width: 250, height: 1, depth: 250 }
      }, { position: [0, 0, 0], rotation: [0, 0, 0] });

    } else if (templateId === 'living') {
      setDimensions(6, 2.8, 7);
      setWallMaterial({ color: '#f3f4f6' });
      setFloorMaterial({ color: '#a1a1aa', texture: 'carpet' });
      setHasWindow(true);
      setHasCeilingBeams(false);
      setRoomTemplate('living');
      
      addFurniture({
        id: 911, name: 'LANDSKRONA Velvet Sofa', price: 1299.99,
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
        category: 'sofas', glbModel: '/models/Canoe.glb', modelScale: [2.1, 0.85, 0.95],
        dimensions: { width: 210, height: 85, depth: 95 }
      }, { position: [0, 0, 1.5], rotation: [0, 0, 0] });
      
      addFurniture({
        id: 912, name: 'LACK Coffee Table', price: 349.99,
        image: 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=400&h=400&fit=crop',
        category: 'tables', glbModel: '/models/GeoPlanter.glb', modelScale: [1.2, 0.45, 0.6],
        dimensions: { width: 120, height: 45, depth: 60 }
      }, { position: [0, 0, 0], rotation: [0, 0, 0] });

      addFurniture({
        id: 913, name: 'HEKTAR Floor Lamp', price: 189.99,
        image: 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400&h=400&fit=crop',
        category: 'lighting', glbModel: '/models/Mixer.glb', modelScale: [0.3, 1.65, 0.3],
        dimensions: { width: 30, height: 165, depth: 30 }
      }, { position: [-2, 0, -2], rotation: [0, 0, 0] });
    } else {
      // Empty / Custom
      setDimensions(5, 3, 5);
      setWallMaterial({ color: '#f5f5f0' });
      setFloorMaterial({ color: '#d4a574', texture: 'wood' });
      setHasWindow(false);
      setHasCeilingBeams(false);
      setRoomTemplate(templateId);
    }
    
    setShowTemplatesLanding(false);
    setView('perspective');
  };

  const handleSelectCustomRoom = () => {
    createProject('Custom Layout');
    clearRoom();
    
    // Scale inputs from cm to meters
    setDimensions(customWidth / 100, customHeight / 100, customDepth / 100);
    setWallMaterial({ color: '#f5f5f0' });
    setFloorMaterial({ color: '#d4a574', texture: 'wood' });
    setHasWindow(false);
    setHasCeilingBeams(false);
    setRoomTemplate('custom');
    
    setShowTemplatesLanding(false);
    setView('perspective');
  };

  // Exporters
  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'ikea-room-snapshot.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleExportJSON = () => {
    const data = {
      exporter: 'IKEA Room Planner Clone',
      timestamp: new Date().toISOString(),
      room: {
        dimensions: useRoomStore.getState().dimensions,
        wallMaterial: useRoomStore.getState().wallMaterial,
        floorMaterial: useRoomStore.getState().floorMaterial
      },
      furniture: placedItems
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ikea-room-layout.json';
    link.click();
    setExportDropdown(false);
  };

  const handleExportPDF = () => {
    // Generate printer report and open print panel
    window.print();
    setExportDropdown(false);
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
          link.download = 'ikea-room-recording.webm';
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
          title: 'My IKEA Room Design Showroom',
          text: 'Design custom 3D showrooms online!',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      alert('Sharing is not supported on this browser. Copy the URL to share.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* Printable Report Overlay */}
      <div className="print-only-report" style={{ display: 'none' }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", borderBottom: '2px solid #0058a3', paddingBottom: 10 }}>
          IKEA Room Layout Summary
        </h1>
        <p>Generated on: {new Date().toLocaleString()}</p>
        <h3>Room Specifications</h3>
        <ul>
          <li>Width: {Math.round(useRoomStore.getState().dimensions.width * 100)} cm</li>
          <li>Depth/Length: {Math.round(useRoomStore.getState().dimensions.depth * 100)} cm</li>
          <li>Height: {Math.round(useRoomStore.getState().dimensions.height * 100)} cm</li>
        </ul>
        <h3>Placed Furniture List ({placedItems.length} items)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 15 }}>
          <thead>
            <tr style={{ background: '#f5f5f0', textAlign: 'left' }}>
              <th style={{ padding: 8, border: '1px solid #ccc' }}>Name</th>
              <th style={{ padding: 8, border: '1px solid #ccc' }}>Category</th>
              <th style={{ padding: 8, border: '1px solid #ccc' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {placedItems.map(item => (
              <tr key={item.instanceId}>
                <td style={{ padding: 8, border: '1px solid #ccc' }}>{item.name}</td>
                <td style={{ padding: 8, border: '1px solid #ccc' }}>{item.category}</td>
                <td style={{ padding: 8, border: '1px solid #ccc' }}>Rs.{Math.round(item.price * 83).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 style={{ marginTop: 20 }}>Total Showroom Value: Rs.{priceRs.toLocaleString('en-IN')}</h3>
      </div>

      {/* Styled print rules helper */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-only-report, .print-only-report * { visibility: visible; }
          .print-only-report { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* ── Initial Room Templates Selector Page (Landing Screen Overlay) ── */}
      {showTemplatesLanding && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(255, 255, 255, 0.98)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflowY: 'auto',
          padding: '40px 20px',
          fontFamily: "'Outfit', 'Inter', sans-serif"
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40, maxWidth: 640 }}>
            <div style={{ background: '#ffcc00', color: '#0058a3', display: 'inline-block', fontWeight: 900, fontSize: 13, padding: '4px 12px', borderRadius: 20, letterSpacing: 2, marginBottom: 12 }}>AURA X IKEA</div>
            <h1 style={{ fontWeight: 900, fontSize: '38px', color: '#111', margin: 0 }}>Start designing your room</h1>
            <p style={{ color: '#555', fontSize: '15px', marginTop: 10 }}>Select one of our preset showrooms to see smart layouts in action, or start completely from scratch with a custom room.</p>
          </div>

          {/* Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            width: '100%',
            maxWidth: 1200,
            marginBottom: 50
          }}>
            {TEMPLATES.map(t => (
              <div 
                key={t.id}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  border: '1px solid #eee',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                onClick={() => handleSelectTemplate(t.id)}
              >
                <div style={{ height: 180, position: 'relative', overflow: 'hidden' }}>
                  <img src={t.img} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute', top: 12, left: 12,
                    background: '#0058a3', color: '#fff', fontSize: '11px',
                    fontWeight: 700, padding: '4px 8px', borderRadius: 4
                  }}>
                    {t.dimensions.width}m x {t.dimensions.depth}m
                  </div>
                </div>
                <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111' }}>{t.name}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#666', lineHeight: 1.5, flex: 1 }}>{t.desc}</p>
                  <button 
                    style={{
                      background: '#111', color: '#fff', border: 'none',
                      borderRadius: 24, padding: '10px 16px', fontWeight: 700,
                      fontSize: 13, cursor: 'pointer', marginTop: 12, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    Start Designing <FiArrowRight />
                  </button>
                </div>
              </div>
            ))}

            {/* Custom Room Input Card */}
            <div style={{
              background: '#f8f8f8',
              borderRadius: 16,
              padding: 24,
              border: '2px dashed #ccc',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 16
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiLayout /> Custom Dimensions
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#666', lineHeight: 1.4 }}>Configure your own room length, width, and ceiling height (cm):</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#333' }}>
                  Width:
                  <input 
                    type="number" 
                    value={customWidth} 
                    onChange={e => setCustomWidth(Math.max(200, parseInt(e.target.value) || 0))}
                    style={{ width: 80, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }} 
                  />
                  cm
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#333' }}>
                  Length / Depth:
                  <input 
                    type="number" 
                    value={customDepth} 
                    onChange={e => setCustomDepth(Math.max(200, parseInt(e.target.value) || 0))}
                    style={{ width: 80, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }} 
                  />
                  cm
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#333' }}>
                  Ceiling Height:
                  <input 
                    type="number" 
                    value={customHeight} 
                    onChange={e => setCustomHeight(Math.max(150, parseInt(e.target.value) || 0))}
                    style={{ width: 80, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 12 }} 
                  />
                  cm
                </label>
              </div>

              <button 
                onClick={handleSelectCustomRoom}
                style={{
                  background: '#0058a3', color: '#fff', border: 'none',
                  borderRadius: 24, padding: '12px 16px', fontWeight: 700,
                  fontSize: 13, cursor: 'pointer', marginTop: 8, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                Create Custom Room <FiPlus />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Header ── */}
      <header className="room-header" style={{
        minHeight: isMobile ? 'auto' : 60,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        borderBottom: '1px solid #e5e5e5',
        backgroundColor: '#fff',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        paddingRight: isMobile ? 12 : 20,
        paddingLeft: isMobile ? 12 : 0,
        paddingTop: isMobile ? 8 : 0,
        paddingBottom: isMobile ? 8 : 0,
        gap: isMobile ? 8 : 0
      }}>
        
        {/* Left Side Tab Navigation */}
        <div className="room-header-left" style={{
          width: isMobile ? '100%' : 340,
          minWidth: isMobile ? 'auto' : 340,
          display: 'flex',
          height: isMobile ? 40 : '100%',
          borderRight: isMobile ? 'none' : '1px solid #e5e5e5',
          borderBottom: isMobile ? '1px solid #e5e5e5' : 'none'
        }}>
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

        {/* Project Name and Back Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flex: 1,
          paddingLeft: isMobile ? 0 : 20,
          justifyContent: isMobile ? 'space-between' : 'flex-start',
          width: isMobile ? '100%' : 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              onClick={() => navigate(-1)}
              style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#111' }}
            >
              <FiChevronLeft size={18} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>
              {projects.find(p => p.id === currentProjectId)?.name || 'Untitled Design'}
            </span>
          </div>
          <button 
            onClick={() => setShowTemplatesLanding(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f5f5f0', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', color: '#0058a3' }}
          >
            Change Template
          </button>
        </div>

        {/* Toolbar Exporters and Pricing */}
        <div className="room-header-right" style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 12 : 20,
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'flex-end',
          paddingBottom: isMobile ? 4 : 0
        }}>
          <div style={{ display: 'flex', gap: 16, color: '#111', alignItems: 'center', position: 'relative' }}>
            
            <FiCamera size={20} style={{ cursor: 'pointer' }} onClick={handleScreenshot} title="Take screenshot" />
            <FiVideo size={20} style={{ cursor: 'pointer', color: isRecording ? '#cc0008' : '#111' }} onClick={toggleRecording} title={isRecording ? "Stop Recording" : "Record Video"} />
            <FiShare2 size={20} style={{ cursor: 'pointer' }} onClick={handleShare} title="Share Design" />
            <FiSave size={20} style={{ cursor: 'pointer' }} onClick={() => saveCurrentProjectData(placedItems, { dimensions: useRoomStore.getState().dimensions, wallMaterial: useRoomStore.getState().wallMaterial, floorMaterial: useRoomStore.getState().floorMaterial })} title="Save project" />
            
            {/* Export Dropdown */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FiDownload size={20} style={{ cursor: 'pointer' }} onClick={() => setExportDropdown(!exportDropdown)} title="Export design options" />
              {exportDropdown && (
                <div style={{
                  position: 'absolute', top: 30, right: 0, zIndex: 99,
                  background: '#fff', border: '1px solid #ddd', borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160, display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}>
                  <button onClick={handleExportJSON} style={{ padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#111' }}>
                    Export as JSON
                  </button>
                  <button onClick={handleScreenshot} style={{ padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#111' }}>
                    Export as PNG
                  </button>
                  <button onClick={handleExportPDF} style={{ padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#111' }}>
                    Export to PDF Report
                  </button>
                </div>
              )}
            </div>

            <FiShoppingBag size={20} style={{ cursor: 'pointer' }} title="Shopping bag" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#111', whiteSpace: 'nowrap' }}>Rs.{priceRs.toLocaleString('en-IN')}</div>
            <button style={{ background: '#0058a3', color: '#fff', border: 'none', borderRadius: 24, padding: isMobile ? '6px 14px' : '8px 20px', fontWeight: 700, fontSize: isMobile ? 11 : 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              Summary <FiArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Workspace Body ── */}
      <main className="room-main" style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
        
        {/* ── Left Sidebar ── */}
        <aside className="room-sidebar" style={{
          width: isMobile ? '100%' : 340,
          minWidth: isMobile ? 'auto' : 340,
          height: isMobile ? '40vh' : '100%',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          borderRight: isMobile ? 'none' : '1px solid #e5e5e5',
          borderTop: isMobile ? '1px solid #e5e5e5' : 'none',
          zIndex: 10
        }}>
          
          {/* Active Item Options Panel */}
          {activeItem ? (
            <ItemOptionsPanel 
              item={activeItem} 
              onClose={() => useFurnitureStore.setState({ activeItemId: null })} 
            />
          ) : leftTab === 'add' ? (
            /* Add Products View */
            <>
              <div style={{ padding: '20px 20px 10px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <FiSearch style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#767676', fontSize: 16 }} />
                  <input 
                    type="text" 
                    placeholder="Search furniture..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px 12px 40px', background: '#f5f5f0', border: 'none', borderRadius: 24, outline: 'none', fontSize: 13, fontWeight: 500 }} 
                  />
                </div>

                <div id="catalog-sidebar-title" style={{ fontWeight: 800, fontSize: 14, color: '#111', marginTop: 4 }}>
                  IKEA Catalog Categories
                </div>
                
                {/* Horizontal Category Pill Selector */}
                <div style={{ 
                  display: 'flex', 
                  gap: 8, 
                  overflowX: 'auto', 
                  paddingBottom: 6,
                  msOverflowStyle: 'none', 
                  scrollbarWidth: 'none' 
                }}>
                  {IKEA_CATEGORIES.map(cat => (
                    <button 
                      key={cat.id} 
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{ 
                        background: selectedCategory === cat.id ? '#0058a3' : '#f5f5f0', 
                        color: selectedCategory === cat.id ? '#ffffff' : '#111111', 
                        border: 'none',
                        padding: '6px 14px', 
                        borderRadius: 20, 
                        fontSize: 11, 
                        fontWeight: 700, 
                        whiteSpace: 'nowrap', 
                        cursor: 'pointer' 
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mapped Catalog Product Grid */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {filteredProducts.length > 0 ? filteredProducts.map(product => (
                  <div 
                    key={product.id} 
                    onClick={() => addFurniture(product)}
                    style={{ display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }}
                  >
                    <div style={{ position: 'relative', background: '#f5f5f0', borderRadius: 4, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <img src={product.image} alt={product.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      
                      {/* Hover Add to Canvas Button */}
                      <button 
                        style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.06)',
                          border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                          cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                      >
                        <div style={{ width: 32, height: 32, background: '#0058a3', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>+</div>
                        <div style={{ background: '#111', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '4px 8px', borderRadius: 4 }}>Add to room</div>
                      </button>
                    </div>
                    <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.3 }}>
                      <strong style={{ fontSize: 11, textTransform: 'uppercase', color: '#111' }}>{product.name}</strong>
                      <span style={{ color: '#767676', fontSize: '10px' }}>{product.description?.substring(0, 32)}...</span>
                      <strong style={{ fontSize: 12, color: '#111' }}>Rs.{Math.round(product.price * 83).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                )) : (
                  <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '20px 0', color: '#767676', fontSize: 12 }}>
                    No products found in this category.
                  </div>
                )}
              </div>
            </>
          ) : leftTab === 'list' ? (
            /* Items in Room List */
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#111', marginBottom: 16 }}>Items in room ({placedItems.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {placedItems.map(item => (
                  <div key={item.instanceId} style={{ display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid #e5e5e5', paddingBottom: 16 }}>
                    <div style={{ width: 56, height: 56, background: '#f5f5f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={item.image} alt={item.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: '#111' }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: '#767676', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.description}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginTop: 2 }}>Rs.{Math.round(item.price * 83).toLocaleString('en-IN')}</div>
                    </div>
                    <button onClick={() => removeFurniture(item.instanceId)} style={{ background: 'none', border: 'none', color: '#767676', cursor: 'pointer' }}><FiTrash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Favorites list */
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#111', marginBottom: 16 }}>Favorites / Saved</div>
              <div style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: 16 }}>
                {products.filter(p => p.glbModel).slice(0, 3).map(product => (
                  <div key={product.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ position: 'relative', background: '#f5f5f0', borderRadius: 4, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={product.image} alt={product.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      <button 
                        onClick={() => addFurniture(product)}
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                      >
                        <div style={{ width: 32, height: 32, background: '#111', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>+</div>
                      </button>
                    </div>
                    <div style={{ fontSize: 11 }}>
                      <strong>{product.name}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── Main Canvas Viewport ── */}
        <section className="room-canvas-container" style={{
          flex: 1,
          position: 'relative',
          background: '#d1d5db',
          height: isMobile ? '60vh' : '100%'
        }}>
          
          <div style={{ width: '100%', height: '100%' }}>
            {/* Top Scene Control Bar */}
            <div style={{
              position: 'absolute',
              top: isMobile ? 10 : 20,
              left: isMobile ? 10 : 20,
              zIndex: 10,
              display: 'flex',
              gap: isMobile ? 4 : 8
            }}>
              <button 
                title="Magic Erase & Scan Room" 
                onClick={() => setShowScanner(true)} 
                style={{
                  padding: isMobile ? '6px 12px' : '8px 16px',
                  background: '#fff',
                  color: '#111',
                  border: 'none',
                  borderRadius: 20,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: isMobile ? 11 : 13,
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                ✨ {isMobile ? 'Erase' : 'Magic Erase'}
              </button>
              <button title="Undo" onClick={undo} disabled={historyIndex === 0} style={{ width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, background: '#fff', color: historyIndex === 0 ? '#ccc' : '#111', border: 'none', borderRadius: '50%', cursor: historyIndex === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 14 : 16, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <FiCornerUpLeft />
              </button>
              <button title="Redo" onClick={redo} disabled={historyIndex === history.length - 1} style={{ width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, background: '#fff', color: historyIndex === history.length - 1 ? '#ccc' : '#111', border: 'none', borderRadius: '50%', cursor: historyIndex === history.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 14 : 16, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <FiCornerUpRight />
              </button>
              <button title="Clear Room" onClick={clearRoom} style={{ width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, background: '#fff', color: '#111', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 14 : 16, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <FiTrash2 />
              </button>
            </div>

            <button 
              onClick={() => navigate('/ar')}
              style={{
                position: 'absolute',
                top: isMobile ? 10 : 20,
                right: isMobile ? 10 : 20,
                zIndex: 10,
                padding: isMobile ? '6px 12px' : '8px 16px',
                background: '#0058a3',
                color: '#fff',
                border: 'none',
                borderRadius: 20,
                fontWeight: 700,
                fontSize: isMobile ? 11 : 13,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              {isMobile ? 'AR Mode' : 'Enter AR Mode'}
            </button>

            {/* 3D Scene */}
            <RoomCanvas />

            {/* Wall Color Selection Overlay */}
            {showColorPicker && (
              <div style={{
                position: 'absolute',
                bottom: isMobile ? 80 : 90,
                right: isMobile ? 'auto' : 180,
                left: isMobile ? '50%' : 'auto',
                transform: isMobile ? 'translateX(-50%)' : 'none',
                width: isMobile ? '90%' : 'auto',
                zIndex: 15,
                background: '#fff',
                borderRadius: 24,
                padding: '12px 16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 8
              }}>
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

            {/* Floor Material Selection Overlay */}
            {showFloorPicker && (
              <div style={{
                position: 'absolute',
                bottom: isMobile ? 80 : 90,
                right: isMobile ? 'auto' : 30,
                left: isMobile ? '50%' : 'auto',
                transform: isMobile ? 'translateX(-50%)' : 'none',
                width: isMobile ? '90%' : 'auto',
                zIndex: 15,
                background: '#fff',
                borderRadius: 16,
                padding: '8px 12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                overflowX: isMobile ? 'auto' : 'visible',
                gap: 6
              }}>
                {FLOOR_MATERIALS.map(mat => (
                  <button
                    key={mat.id}
                    onClick={() => setFloorMaterial({ color: mat.color, texture: mat.texture })}
                    style={{
                      padding: '8px 12px', background: floorMaterial.color === mat.color ? '#0058a3' : 'transparent',
                      color: floorMaterial.color === mat.color ? '#fff' : '#111', border: 'none', borderRadius: 8,
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap'
                    }}
                  >
                    {mat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Bottom View Switcher Panel */}
            <div style={{
              position: 'absolute',
              bottom: isMobile ? 20 : 30,
              left: '50%',
              transform: 'translateX(-50%)',
              width: isMobile ? '92%' : 'auto',
              maxWidth: '600px',
              zIndex: 10,
              background: '#fff',
              borderRadius: 30,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: isMobile ? 2 : 6,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              overflowX: 'auto',
              scrollbarWidth: 'none'
            }}>
              
              {/* Dollhouse perspective view button */}
              <button 
                onClick={() => { setView('perspective'); setViewPicker(null); }} 
                style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, border: 'none', background: activeView === 'perspective' ? '#f5f5f0' : 'transparent', borderRadius: 20, padding: isMobile ? '8px 10px' : '10px 16px', fontWeight: 700, color: '#111', fontSize: isMobile ? 11 : 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                <BiCubeAlt size={isMobile ? 16 : 18} /> {!isMobile && 'Dollhouse'}
              </button>

              {/* Top View button */}
              <button onClick={() => { setView('top'); setViewPicker(null); }} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, border: 'none', background: activeView === 'top' ? '#f5f5f0' : 'transparent', borderRadius: 20, padding: isMobile ? '8px 10px' : '10px 16px', fontWeight: 700, color: '#111', fontSize: isMobile ? 11 : 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <BiSquare size={isMobile ? 16 : 18} /> {!isMobile && 'Top view'}
              </button>

              {/* Side view submenu selector */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => { setViewPicker(viewPicker === 'side' ? null : 'side'); }} 
                  style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, border: 'none', background: ['front','left','right','isometric'].includes(activeView) || viewPicker === 'side' ? '#f5f5f0' : 'transparent', borderRadius: 20, padding: isMobile ? '8px 10px' : '10px 16px', fontWeight: 700, color: '#111', fontSize: isMobile ? 11 : 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <BiBox size={isMobile ? 16 : 18} /> {!isMobile && 'Side views'} <FiChevronDown size={isMobile ? 12 : 14} />
                </button>
                
                {viewPicker === 'side' && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 16, background: '#fff', padding: 8, borderRadius: 16, border: '1px solid #dfdfdf', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', display: 'flex', gap: 12, zIndex: 20 }}>
                    {[
                      { id: 'front', label: 'Front' },
                      { id: 'left', label: 'Left' },
                      { id: 'right', label: 'Right' },
                      { id: 'isometric', label: 'Isometric' }
                    ].map(v => (
                      <button 
                        key={v.id}
                        onClick={() => { setView(v.id); setViewPicker(null); }}
                        style={{ padding: '8px 12px', background: activeView === v.id ? '#111' : '#f5f5f0', color: activeView === v.id ? '#fff' : '#111', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ width: 1, height: 24, background: '#e5e5e5', margin: '0 2px' }} />
              
              {/* Wall color select button */}
              <button 
                onClick={() => { setShowColorPicker(v => !v); setShowFloorPicker(false); }} 
                style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, border: 'none', background: showColorPicker ? '#f5f5f0' : 'transparent', borderRadius: 20, padding: isMobile ? '8px 10px' : '10px 16px', fontWeight: 700, color: '#111', fontSize: isMobile ? 11 : 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                <BiPalette size={isMobile ? 16 : 18} /> {!isMobile && 'Wall color'}
              </button>

              {/* Floor material select button */}
              <button 
                onClick={() => { setShowFloorPicker(v => !v); setShowColorPicker(false); }} 
                style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, border: 'none', background: showFloorPicker ? '#f5f5f0' : 'transparent', borderRadius: 20, padding: isMobile ? '8px 10px' : '10px 16px', fontWeight: 700, color: '#111', fontSize: isMobile ? 11 : 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                <BiImage size={isMobile ? 16 : 18} /> {!isMobile && 'Floor material'}
              </button>
            </div>
          </div>
        </section>
      </main>

      {showScanner && <RoomScanner onClose={() => setShowScanner(false)} />}
    </div>
  );
}
