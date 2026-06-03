import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Box, ContactShadows, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { 
  FiMaximize2, 
  FiMinimize2, 
  FiCamera, 
  FiFileText, 
  FiRotateCcw, 
  FiShoppingCart, 
  FiHeart, 
  FiCheck, 
  FiCompass, 
  FiTruck, 
  FiShield, 
  FiActivity,
  FiInfo,
  FiMoon,
  FiSun,
  FiX,
  FiExternalLink
} from 'react-icons/fi';
import useProductStore from '../store/productStore';
import useCartStore from '../store/cartStore';
import useSceneStore from '../store/sceneStore';
import useProductDetailStore from '../store/productDetailStore';

// Helper to convert centimeters to fraction of inches e.g. "47 1/4\""
const getInchesString = (cm) => {
  const totalInches = cm / 2.54;
  const inches = Math.round(totalInches * 8) / 8; // round to nearest 1/8
  const whole = Math.floor(inches);
  const eighths = Math.round((inches - whole) * 8);
  
  if (eighths === 0) return `${whole}"`;
  if (eighths === 8) return `${whole + 1}"`;
  
  let num = eighths;
  let den = 8;
  if (num % 4 === 0) { num /= 4; den /= 4; }
  else if (num % 2 === 0) { num /= 2; den /= 2; }
  
  return `${whole} ${num}/${den}"`;
};

// Helper to get formatted dynamic labels
const getDimensionLabel = (cm) => {
  return `${cm} cm (${getInchesString(cm)})`;
};

// Helper to map color hex codes to human-readable names
const getColorName = (hex) => {
  const map = {
    '#2D3436': 'Charcoal Black',
    '#636E72': 'Steel Grey',
    '#DFE6E9': 'Classic White',
    '#B2BEC3': 'Slate Grey',
    '#00B894': 'Emerald Teal',
    '#6C5CE7': 'Aura Purple',
    '#FDCB6E': 'Warm Oak Finish',
    '#D4A574': 'Natural Oak',
    '#5C4033': 'Dark Walnut Finish',
    '#ffffff': 'Pipmakare White',
    '#FFFFFF': 'Pipmakare White',
    '#111111': 'Midnight Black'
  };
  return map[hex] || 'Custom Option';
};

/* ─── CAD Dimension Arrow Component (IKEA Pill Badge style) ─── */
function CADArrow({ start, end, label, color = '#0058a3', extensionOffset = [0, 0, 0], axis = 'x' }) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end]);

  const offset = useMemo(() => new THREE.Vector3(...extensionOffset), [extensionOffset]);
  
  const mainStart = useMemo(() => points[0].clone().add(offset), [points, offset]);
  const mainEnd = useMemo(() => points[1].clone().add(offset), [points, offset]);
  
  const midPoint = useMemo(() => {
    return new THREE.Vector3().addVectors(mainStart, mainEnd).multiplyScalar(0.5);
  }, [mainStart, mainEnd]);

  // Rotations for the arrowheads
  const coneRotations = useMemo(() => {
    if (axis === 'x') {
      return { r1: [0, 0, Math.PI / 2], r2: [0, 0, -Math.PI / 2] };
    } else if (axis === 'y') {
      return { r1: [Math.PI, 0, 0], r2: [0, 0, 0] };
    } else { // 'z'
      return { r1: [-Math.PI / 2, 0, 0], r2: [Math.PI / 2, 0, 0] };
    }
  }, [axis]);

  return (
    <group>
      {/* Extension Line 1 */}
      <line>
        <bufferGeometry attach="geometry">
          <float32BufferAttribute
            attach="attributes-position"
            args={[new Float32Array([
              points[0].x, points[0].y, points[0].z,
              mainStart.x, mainStart.y, mainStart.z
            ]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial attach="material" color="rgba(0, 88, 163, 0.3)" linewidth={1} />
      </line>

      {/* Extension Line 2 */}
      <line>
        <bufferGeometry attach="geometry">
          <float32BufferAttribute
            attach="attributes-position"
            args={[new Float32Array([
              points[1].x, points[1].y, points[1].z,
              mainEnd.x, mainEnd.y, mainEnd.z
            ]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial attach="material" color="rgba(0, 88, 163, 0.3)" linewidth={1} />
      </line>

      {/* Main Dimension Line */}
      <line>
        <bufferGeometry attach="geometry">
          <float32BufferAttribute
            attach="attributes-position"
            args={[new Float32Array([
              mainStart.x, mainStart.y, mainStart.z,
              mainEnd.x, mainEnd.y, mainEnd.z
            ]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial attach="material" color={color} linewidth={1.5} />
      </line>

      {/* Arrow Head 1 */}
      <mesh position={mainStart} rotation={coneRotations.r1}>
        <coneGeometry args={[0.012, 0.04, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Arrow Head 2 */}
      <mesh position={mainEnd} rotation={coneRotations.r2}>
        <coneGeometry args={[0.012, 0.04, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Pill-shaped Floating Label */}
      <Html position={midPoint} center distanceFactor={6}>
        <div style={{
          background: '#ffffff',
          border: `1.5px solid ${color}`,
          color: '#111111',
          padding: '4px 12px',
          borderRadius: '24px',
          fontSize: '11px',
          fontWeight: '700',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          pointerEvents: 'none',
          userSelect: 'none',
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

/* ─── Detailed Dimensions Box Overlay Component ────────────── */
function DetailedDimensions({ subComponents, color = '#ff7675' }) {
  if (!subComponents || subComponents.length === 0) return null;

  return (
    <group>
      {subComponents.map((comp, idx) => {
        const { center, size, name } = comp;
        return (
          <group key={idx}>
            <Box args={[size.width / 100, size.height / 100, size.depth / 100]} position={[center.x, center.y, center.z]}>
              <meshBasicMaterial wireframe color={color} transparent opacity={0.35} />
            </Box>
            
            <Html position={[center.x, center.y + size.height / 200 + 0.03, center.z]} center distanceFactor={6}>
              <div style={{
                background: '#ffffff',
                border: `1.5px solid ${color}`,
                color: '#111111',
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}>
                {comp.type} ({name}): {size.width}×{size.height}×{size.depth} cm
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/* ─── Custom Measurement Tool Overlay Component ─────────────── */
function CustomMeasurement({ points, color = '#00b894' }) {
  if (!points || points.length === 0) return null;

  const p1 = points[0];
  const p2 = points[1];

  if (!p2) {
    return (
      <mesh position={p1}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    );
  }

  const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const distanceCm = (p1.distanceTo(p2) * 100).toFixed(1);

  return (
    <group>
      <mesh position={p1}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={p2}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      <line>
        <bufferGeometry attach="geometry">
          <float32BufferAttribute
            attach="attributes-position"
            args={[new Float32Array([
              p1.x, p1.y, p1.z,
              p2.x, p2.y, p2.z
            ]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial attach="material" color={color} linewidth={2} />
      </line>

      <Html position={midPoint} center distanceFactor={6}>
        <div style={{
          background: '#ffffff',
          border: `1.5px solid ${color}`,
          color: '#111111',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: '700',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {distanceCm} cm ({getInchesString(Number(distanceCm))})
        </div>
      </Html>
    </group>
  );
}

/* ─── Three.js Helper to Auto-fit Camera ───────────────────── */
function CameraFitter({ modelBounds }) {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (!modelBounds) return;
    const { size } = modelBounds;

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    const radius = (maxDim / 2) * scale;
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(radius / Math.sin(fov / 2));
    
    cameraZ *= 1.45;

    camera.position.set(cameraZ * 0.7, cameraZ * 0.5, cameraZ * 1.1);
    camera.lookAt(0, -0.1, 0);
    
    if (controls) {
      controls.target.set(0, -0.1, 0);
      controls.update();
    }
  }, [modelBounds, camera, controls]);

  return null;
}

/* ─── Interactive Product Model Loader & Decorator ──────────── */
function ProductModel({
  glbModel,
  selectedColor,
  selectedMaterial,
  setModelBounds,
  measurementMode,
  addCustomPoint,
  innerGroupRef
}) {
  const { scene } = useGLTF(glbModel);

  useEffect(() => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    setModelBounds({ box, size, center });
  }, [scene, setModelBounds, glbModel]);

  useEffect(() => {
    if (!scene) return;
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.color.set(selectedColor);
        
        if (selectedMaterial === 'Metal') {
          child.material.metalness = 0.85;
          child.material.roughness = 0.15;
          child.material.transparent = false;
          child.material.opacity = 1.0;
        } else if (selectedMaterial === 'Glass') {
          child.material.transparent = true;
          child.material.opacity = 0.35;
          child.material.metalness = 0.1;
          child.material.roughness = 0.05;
        } else if (selectedMaterial === 'Plastic') {
          child.material.metalness = 0.1;
          child.material.roughness = 0.55;
          child.material.transparent = false;
          child.material.opacity = 1.0;
        } else { // Wood
          child.material.metalness = 0.05;
          child.material.roughness = 0.8;
          child.material.transparent = false;
          child.material.opacity = 1.0;
        }
        child.material.needsUpdate = true;
      }
    });
  }, [scene, selectedColor, selectedMaterial]);

  return (
    <primitive 
      object={scene} 
      onPointerDown={(e) => {
        if (measurementMode === 'custom') {
          e.stopPropagation();
          const localPt = e.point.clone();
          if (innerGroupRef.current) {
            innerGroupRef.current.worldToLocal(localPt);
            addCustomPoint(localPt);
          }
        }
      }}
    />
  );
}

/* ─── Collapsible Accordion Box Helper ──────────────────────── */
function Accordion({ title, isOpen, onToggle, children, isDarkTheme }) {
  return (
    <div style={{
      borderBottom: isDarkTheme ? '1px solid var(--border-subtle)' : '1px solid #e5e5e5',
      backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.02)' : '#f8f9fa',
      borderRadius: '12px',
      marginBottom: '8px',
      overflow: 'hidden',
      transition: 'all 0.25s'
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '14px',
          fontWeight: '700',
          color: 'inherit'
        }}
      >
        <span>{title}</span>
        <span style={{ 
          fontSize: '10px', 
          transition: 'transform 0.2s', 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
          color: isDarkTheme ? 'var(--text-secondary)' : '#767676'
        }}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div style={{ 
          padding: '0 20px 20px 20px', 
          fontSize: '13px', 
          lineHeight: '1.6', 
          color: isDarkTheme ? 'var(--text-secondary)' : '#484848' 
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ═══ Main Product Detail Page ══════════════════════════════ */
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useProductStore(s => s.getProductById(Number(id)));
  const addItem = useCartStore(s => s.addItem);
  const addObject = useSceneStore(s => s.addObject);

  // Zustand Store selectors
  const selectedColor = useProductDetailStore(s => s.selectedColor);
  const selectedMaterial = useProductDetailStore(s => s.selectedMaterial);
  const measurementMode = useProductDetailStore(s => s.measurementMode);
  const customPoints = useProductDetailStore(s => s.customPoints);
  const setSelectedColor = useProductDetailStore(s => s.setSelectedColor);
  const setSelectedMaterial = useProductDetailStore(s => s.setSelectedMaterial);
  const setMeasurementMode = useProductDetailStore(s => s.setMeasurementMode);
  const addCustomPoint = useProductDetailStore(s => s.addCustomPoint);
  const clearCustomPoints = useProductDetailStore(s => s.clearCustomPoints);
  const resetStore = useProductDetailStore(s => s.resetStore);

  // UI state
  const [modelBounds, setModelBounds] = useState(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wished, setWished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false); // Default to clean light IKEA theme
  const [activeAccordion, setActiveAccordion] = useState('ar');

  const viewerContainerRef = useRef();
  const innerGroupRef = useRef();
  const controlsRef = useRef();

  // Reset store on mount/product change
  useEffect(() => {
    resetStore();
    if (product) {
      setSelectedColor(product.colors?.[0] || '#2D3436');
    }
  }, [product, resetStore, setSelectedColor]);

  if (!product) {
    return (
      <div style={{ padding: '120px 24px', textAlign: 'center', background: 'var(--bg-primary)', minHeight: '100vh' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Product Not Found</h3>
        <Link to="/products" style={{ color: 'var(--accent-light)', fontSize: 14, textDecoration: 'none' }}>
          ← Back to Collections
        </Link>
      </div>
    );
  }

  // Dimension scaling calculation
  const scale = useMemo(() => {
    if (!modelBounds) return 1;
    const maxDim = Math.max(modelBounds.size.x, modelBounds.size.y, modelBounds.size.z);
    return 2 / maxDim;
  }, [modelBounds]);

  const groupPosition = useMemo(() => {
    if (!modelBounds) return [0, 0, 0];
    const { center } = modelBounds;
    return [
      -center.x * scale,
      -center.y * scale - 0.5,
      -center.z * scale
    ];
  }, [modelBounds, scale]);

  // Dynamic bounds sizes in cm
  const detectedDims = useMemo(() => {
    if (!modelBounds) return { width: 0, height: 0, depth: 0 };
    const { size } = modelBounds;
    const multiplier = Math.max(size.x, size.y, size.z) < 10 ? 100 : 1;
    return {
      width: Math.round(size.x * multiplier),
      height: Math.round(size.y * multiplier),
      depth: Math.round(size.z * multiplier)
    };
  }, [modelBounds]);

  // Detected Subcomponents (Shelves, Drawers, etc.)
  const detectedSubComponents = useMemo(() => {
    if (!modelBounds) return [];
    const list = [];
    const { width: w, height: h, depth: d } = detectedDims;

    if (product.category === 'tables') {
      list.push({
        name: 'Worktop',
        type: 'Surface',
        size: { width: w, height: Math.round(h * 0.08), depth: d },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y + modelBounds.size.y * 0.42, modelBounds.center.z)
      });
      list.push({
        name: 'Under Rack',
        type: 'Shelf',
        size: { width: Math.round(w * 0.86), height: 3, depth: Math.round(d * 0.8) },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y - modelBounds.size.y * 0.18, modelBounds.center.z)
      });
    } else if (product.category === 'storage' || product.category === 'sofas') {
      list.push({
        name: 'Mid Shelf',
        type: 'Shelf',
        size: { width: Math.round(w * 0.88), height: 4, depth: Math.round(d * 0.8) },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y + modelBounds.size.y * 0.15, modelBounds.center.z)
      });
      list.push({
        name: 'Base Drawer',
        type: 'Drawer',
        size: { width: Math.round(w * 0.44), height: Math.round(h * 0.28), depth: Math.round(d * 0.85) },
        center: new THREE.Vector3(modelBounds.center.x - modelBounds.size.x * 0.2, modelBounds.center.y - modelBounds.size.y * 0.26, modelBounds.center.z)
      });
    } else if (product.category === 'chairs') {
      list.push({
        name: 'Seat Cushion',
        type: 'Seat',
        size: { width: Math.round(w * 0.9), height: Math.round(h * 0.12), depth: Math.round(d * 0.88) },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y - modelBounds.size.y * 0.05, modelBounds.center.z)
      });
      list.push({
        name: 'Back Support',
        type: 'Support',
        size: { width: Math.round(w * 0.82), height: Math.round(h * 0.42), depth: Math.round(d * 0.08) },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y + modelBounds.size.y * 0.28, modelBounds.center.z - modelBounds.size.z * 0.22)
      });
    } else {
      list.push({
        name: 'Compartment A',
        type: 'Compartment',
        size: { width: Math.round(w * 0.95), height: Math.round(h * 0.8), depth: Math.round(d * 0.95) },
        center: modelBounds.center.clone()
      });
    }
    return list;
  }, [modelBounds, detectedDims, product.category]);

  const handleAddToCart = () => {
    addItem({ ...product, modelColor: selectedColor });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleViewInAR = () => { 
    addObject(product); 
    navigate('/ar', { state: { product } }); 
  };

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const toggleFullscreen = () => {
    if (!viewerContainerRef.current) return;
    if (!document.fullscreenElement) {
      viewerContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error enabling fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${product.name.replace(/\s+/g, '_')}_3D_View.png`;
      link.href = dataURL;
      link.click();
    }
  };

  const handlePDFExport = async () => {
    const { jsPDF } = await import('jspdf');
    const canvas = document.querySelector('canvas');
    let imgData = null;
    if (canvas) {
      imgData = canvas.toDataURL('image/png');
    }

    const doc = new jsPDF();
    doc.setFillColor(18, 18, 26);
    doc.rect(0, 0, 210, 42, 'F');
    
    doc.setTextColor(162, 155, 254);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('IKEA Product Specifications', 15, 24);
    
    doc.setTextColor(136, 136, 160);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Product: ${product.name}`, 15, 33);
    
    doc.setTextColor(17, 17, 17);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(product.name, 15, 56);
    
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Category: ${product.category.toUpperCase()}`, 15, 64);
    doc.text(`Price: Rs. ${Math.round(product.price * 83).toLocaleString('en-IN')}`, 15, 71);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(product.description || '', 15, 79, { maxWidth: 180 });
    
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 91, 195, 91);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 88, 163);
    doc.text('Configuration Details & Model Bounds', 15, 100);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(50, 50, 50);
    doc.text(`Material Finish: ${selectedMaterial}`, 15, 110);
    doc.text(`Color Shade (Hex): ${selectedColor} (${getColorName(selectedColor)})`, 15, 117);
    doc.text(`Width: ${detectedDims.width} cm (${getInchesString(detectedDims.width)})`, 15, 124);
    doc.text(`Height: ${detectedDims.height} cm (${getInchesString(detectedDims.height)})`, 15, 131);
    doc.text(`Depth: ${detectedDims.depth} cm (${getInchesString(detectedDims.depth)})`, 15, 138);

    if (imgData) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 88, 163);
      doc.text('Interactive 3D Viewport Capture:', 15, 155);
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(15, 160, 140, 95);
      doc.addImage(imgData, 'PNG', 16, 161, 138, 93);
    }
    
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 270, 195, 270);
    
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text('Generated dynamically from interactive 3D Web Viewer.', 15, 278);
    
    doc.save(`${product.name.replace(/\s+/g, '_')}_specifications.pdf`);
  };

  // Standard Theme mapping values
  const theme = {
    bgPrimary: isDarkTheme ? 'var(--bg-primary)' : '#ffffff',
    bgSidebar: isDarkTheme ? 'var(--bg-secondary)' : '#ffffff',
    bgViewport: isDarkTheme ? '#0f0f18' : '#f5f5f5',
    textPrimary: isDarkTheme ? 'var(--text-primary)' : '#111111',
    textSecondary: isDarkTheme ? 'var(--text-secondary)' : '#484848',
    border: isDarkTheme ? 'var(--border-subtle)' : '#e5e5e5',
    cardBg: isDarkTheme ? 'var(--bg-card)' : '#f5f5f5',
    btnPrimaryBg: '#0058a3', // IKEA Blue
    btnPrimaryText: '#ffffff'
  };

  return (
    <div style={{ background: theme.bgPrimary, minHeight: '100vh', color: theme.textPrimary, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      
      {/* Dynamic Styling Overlays */}
      <style>{`
        .product-detail-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 0px;
          min-height: calc(100vh - 60px);
        }
        @media (max-width: 992px) {
          .product-detail-grid {
            grid-template-columns: 1fr;
          }
        }
        .config-color-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          padding: 0;
        }
        .config-color-btn:hover {
          transform: scale(1.1);
        }
        .config-material-btn {
          padding: 12px 16px;
          background: ${isDarkTheme ? 'rgba(255, 255, 255, 0.03)' : '#f8f9fa'};
          color: ${isDarkTheme ? 'var(--text-secondary)' : '#484848'};
          border: 1px solid ${isDarkTheme ? 'var(--border-subtle)' : '#ddd'};
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .config-material-btn:hover {
          background: ${isDarkTheme ? 'rgba(255, 255, 255, 0.07)' : '#e9ecef'};
          border-color: ${isDarkTheme ? 'var(--text-muted)' : '#ccc'};
        }
        .config-material-btn.active {
          background: #0058a3;
          color: white;
          border: none;
          box-shadow: 0 4px 12px rgba(0, 88, 163, 0.25);
        }
        .action-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 28px;
          background: #0058a3;
          color: white;
          border: none;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 4px 12px rgba(0, 88, 163, 0.2);
        }
        .action-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0, 88, 163, 0.35);
        }
        .action-btn-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          background: ${isDarkTheme ? 'var(--gradient-accent)' : '#111'};
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn-secondary:hover {
          transform: translateY(-1px);
        }
        .action-btn-outline {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          background: transparent;
          color: #0058a3;
          border: 1.5px solid #0058a3;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn-outline:hover {
          background: rgba(0, 88, 163, 0.05);
        }
      `}</style>

      {/* ── Main Layout Grid ── */}
      <div className="product-detail-grid">
        
        {/* LEFT COLUMN: 3D Viewport Box */}
        <div ref={viewerContainerRef} style={{
          background: theme.bgViewport,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 480,
          transition: 'background 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          
          {/* Breadcrumbs inside Viewport */}
          <div style={{ position: 'absolute', top: 20, left: 30, zIndex: 10, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
            <Link to="/" style={{ color: '#0058a3', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
            <span style={{ color: '#767676' }}>/</span>
            <Link to="/products" style={{ color: '#0058a3', textDecoration: 'none', fontWeight: 600 }}>Furniture</Link>
            <span style={{ color: '#767676' }}>/</span>
            <span style={{ color: theme.textPrimary, fontWeight: 700 }}>{product.name.toUpperCase()}</span>
          </div>

          {/* Mode Toggles directly on Viewport */}
          <div style={{ position: 'absolute', top: 60, left: 30, zIndex: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setMeasurementMode('overall')}
              style={{
                background: measurementMode === 'overall' ? '#0058a3' : 'rgba(255, 255, 255, 0.85)',
                color: measurementMode === 'overall' ? '#ffffff' : '#111111',
                border: '1px solid rgba(0,0,0,0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'all 0.2s'
              }}
            >
              📐 Overall Dims
            </button>
            <button
              onClick={() => setMeasurementMode('detailed')}
              style={{
                background: measurementMode === 'detailed' ? '#ff7675' : 'rgba(255, 255, 255, 0.85)',
                color: measurementMode === 'detailed' ? '#ffffff' : '#111111',
                border: '1px solid rgba(0,0,0,0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'all 0.2s'
              }}
            >
              📥 Inside Parts
            </button>
            <button
              onClick={() => setMeasurementMode('custom')}
              style={{
                background: measurementMode === 'custom' ? '#00b894' : 'rgba(255, 255, 255, 0.85)',
                color: measurementMode === 'custom' ? '#ffffff' : '#111111',
                border: '1px solid rgba(0,0,0,0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'all 0.2s'
              }}
            >
              📍 Point Measure
            </button>
          </div>

          {/* Custom mode banner */}
          {measurementMode === 'custom' && (
            <div style={{
              position: 'absolute',
              top: 110,
              left: 30,
              right: 30,
              zIndex: 10,
              background: 'rgba(0, 184, 148, 0.1)',
              border: '1px solid #00b894',
              color: '#008a68',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backdropFilter: 'blur(10px)'
            }}>
              <span>Select any 2 points on the 3D surface to measure distance.</span>
              {customPoints.length > 0 && (
                <button 
                  onClick={clearCustomPoints}
                  style={{
                    background: '#00b894',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* UTILITY BAR FOR EXPORTS */}
          <div style={{ position: 'absolute', bottom: 30, right: 30, zIndex: 10, display: 'flex', gap: 8 }}>
            <button onClick={handleResetCamera} title="Reset camera zoom" style={{ background: '#ffffff', border: '1px solid #ddd', color: '#111', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <FiRotateCcw size={18} />
            </button>
            <button onClick={toggleFullscreen} title="Toggle fullscreen" style={{ background: '#ffffff', border: '1px solid #ddd', color: '#111', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              {isFullscreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
            </button>
            <button onClick={handleScreenshot} title="Save 3D screenshot" style={{ background: '#ffffff', border: '1px solid #ddd', color: '#111', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <FiCamera size={18} />
            </button>
            <button onClick={handlePDFExport} title="Download Spec PDF" style={{ background: '#ffffff', border: '1px solid #ddd', color: '#111', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <FiFileText size={18} />
            </button>
          </div>

          {/* THEME TOGGLER (Bottom-left corner, matches user image) */}
          <div style={{ position: 'absolute', bottom: 30, left: 30, zIndex: 10 }}>
            <button 
              onClick={() => setIsDarkTheme(!isDarkTheme)} 
              title="Toggle design theme mode" 
              style={{ 
                background: '#ffffff', 
                border: '1px solid #ddd', 
                color: '#111', 
                width: 44, 
                height: 44, 
                borderRadius: '50%', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)' 
              }}
            >
              {isDarkTheme ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>
          </div>

          {/* CANVAS */}
          <Canvas
            gl={{ preserveDrawingBuffer: true }}
            camera={{ position: [0, 1.5, 4], fov: 45 }}
            style={{ width: '100%', height: '100%', cursor: measurementMode === 'custom' ? 'crosshair' : 'grab' }}
          >
            <color attach="background" args={[theme.bgViewport]} />
            <Environment preset="city" />
            <ambientLight intensity={0.6} />
            <directionalLight position={[8, 12, 8]} intensity={1.1} castShadow />
            
            <Suspense fallback={
              <Html center>
                <div style={{ background: '#ffffff', border: '1px solid #ddd', padding: '12px 24px', borderRadius: '30px', fontWeight: 700 }}>
                  Generating model...
                </div>
              </Html>
            }>
              <group scale={scale} position={[0, -0.5, 0]}>
                <group ref={innerGroupRef} position={modelBounds ? [-modelBounds.center.x, -modelBounds.center.y, -modelBounds.center.z] : [0, 0, 0]}>
                  
                  <ProductModel
                    glbModel={product.glbModel}
                    selectedColor={selectedColor}
                    selectedMaterial={selectedMaterial}
                    setModelBounds={setModelBounds}
                    measurementMode={measurementMode}
                    addCustomPoint={addCustomPoint}
                    innerGroupRef={innerGroupRef}
                  />

                  {/* Mode 1: Dimension arrows placed exactly along front edges */}
                  {measurementMode === 'overall' && modelBounds && (
                    <group>
                      {/* Width Arrow (Bottom Front Edge) */}
                      <CADArrow
                        start={[modelBounds.center.x - modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                        end={[modelBounds.center.x + modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                        label={getDimensionLabel(detectedDims.width)}
                        extensionOffset={[0, -0.12, 0.05]}
                        axis="x"
                        color="#0058a3"
                      />

                      {/* Height Arrow (Left Front Edge) */}
                      <CADArrow
                        start={[modelBounds.center.x - modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                        end={[modelBounds.center.x - modelBounds.size.x / 2, modelBounds.center.y + modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                        label={getDimensionLabel(detectedDims.height)}
                        extensionOffset={[-0.12, 0, 0.05]}
                        axis="y"
                        color="#0058a3"
                      />

                      {/* Depth Arrow (Left Top Edge) */}
                      <CADArrow
                        start={[modelBounds.center.x - modelBounds.size.x / 2, modelBounds.center.y + modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                        end={[modelBounds.center.x - modelBounds.size.x / 2, modelBounds.center.y + modelBounds.size.y / 2, modelBounds.center.z - modelBounds.size.z / 2]}
                        label={getDimensionLabel(detectedDims.depth)}
                        extensionOffset={[-0.12, 0.12, 0]}
                        axis="z"
                        color="#0058a3"
                      />
                    </group>
                  )}

                  {/* Mode 2: Shelf, Cushion detailed parts overlays */}
                  {measurementMode === 'detailed' && (
                    <DetailedDimensions subComponents={detectedSubComponents} color="#ff7675" />
                  )}

                  {/* Mode 3: Custom click points */}
                  {measurementMode === 'custom' && (
                    <CustomMeasurement points={customPoints} color="#00b894" />
                  )}

                </group>
              </group>

              <CameraFitter modelBounds={modelBounds} />
              <ContactShadows position={[0, -0.52, 0]} opacity={0.35} scale={6} blur={2.0} far={2.5} />
            </Suspense>

            <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} makeDefault />
          </Canvas>
        </div>

        {/* RIGHT COLUMN: IKEA Product Configuration Panel */}
        <div style={{
          background: theme.bgSidebar,
          borderLeft: `1px solid ${theme.border}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          maxHeight: '100vh',
          overflowY: 'auto'
        }}>
          
          {/* Main Top panel container */}
          <div style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
            
            {/* Header info row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', fontFamily: 'system-ui, -apple-system', letterSpacing: '-0.3px' }}>
                  {product.name.toUpperCase()}
                </h1>
                <FiInfo size={16} style={{ color: '#767676', cursor: 'pointer' }} />
              </div>
              <button 
                onClick={() => navigate('/products')} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: '#111' }}
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Selected variant details */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#767676', marginBottom: 12 }}>
                {getColorName(selectedColor)}
              </div>
              
              {/* Variant circles with double border rings */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {(product.colors || ['#2D3436']).map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setSelectedColor(hex)}
                    title={getColorName(hex)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      backgroundColor: hex,
                      border: selectedColor === hex ? '3px solid #0058a3' : '1px solid #ccc',
                      padding: 0,
                      cursor: 'pointer',
                      boxShadow: selectedColor === hex ? '0 0 0 2px #fff, 0 0 0 4px #0058a3' : 'none',
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Material Texture */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#767676', textTransform: 'uppercase', marginBottom: 12 }}>
                Material Finish
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {CONFIG_MATERIALS.map((mat) => (
                  <button
                    key={mat}
                    onClick={() => setSelectedMaterial(mat)}
                    className={`config-material-btn ${selectedMaterial === mat ? 'active' : ''}`}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: '1px', background: theme.border }} />

            {/* Collapsible Accordions (Matches user image exactly) */}
            <div>
              <Accordion 
                title="Preview in AR" 
                isOpen={activeAccordion === 'ar'} 
                onToggle={() => setActiveAccordion(activeAccordion === 'ar' ? '' : 'ar')}
                isDarkTheme={isDarkTheme}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>Scan this QR code to view in your home or open it directly in WebXR mode.</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ background: '#fff', padding: 8, borderRadius: 8, border: '1px solid #ddd' }}>
                      {/* Simple QR Code placeholder */}
                      <div style={{ width: 80, height: 80, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 'bold', borderRadius: '4px' }}>
                        QR CODE
                      </div>
                    </div>
                    <button onClick={handleViewInAR} className="action-btn-secondary" style={{ flex: 1 }}>
                      Launch AR View
                    </button>
                  </div>
                </div>
              </Accordion>

              <Accordion 
                title={`Design it yourself`} 
                isOpen={activeAccordion === 'design'} 
                onToggle={() => setActiveAccordion(activeAccordion === 'design' ? '' : 'design')}
                isDarkTheme={isDarkTheme}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>Customise {product.name} inside our 3D room planner layout. Add multiple furniture components and see them live!</div>
                  <button onClick={() => navigate('/room-builder')} className="action-btn-outline">
                    Launch Planning Tool
                  </button>
                </div>
              </Accordion>

              <Accordion 
                title={`Try ${product.name} in a room`} 
                isOpen={activeAccordion === 'tryroom'} 
                onToggle={() => setActiveAccordion(activeAccordion === 'tryroom' ? '' : 'tryroom')}
                isDarkTheme={isDarkTheme}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>Get inspiration from our interactive virtual showrooms, test placement coordinates, and plans.</div>
                  <Link to="/scenes" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0058a3', fontWeight: 'bold', textDecoration: 'none' }}>
                    Browse Saved Rooms <FiExternalLink />
                  </Link>
                </div>
              </Accordion>
            </div>

          </div>

          {/* Sticky E-Commerce Footer inside Sidebar (Matches user image exactly) */}
          <div style={{
            background: theme.bgSidebar,
            borderTop: `1px solid ${theme.border}`,
            padding: '24px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            bottom: 0,
            zIndex: 10
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '11px', color: '#767676', fontWeight: 600 }}>Total Price</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: theme.textPrimary, letterSpacing: '-0.5px' }}>
                Rs. {Math.round(product.price * 83).toLocaleString('en-IN')}
              </div>
            </div>
            
            <button onClick={handleAddToCart} className="action-btn-primary">
              <FiShoppingCart size={16} />
              {addedToCart ? 'Added!' : 'Add to basket'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
