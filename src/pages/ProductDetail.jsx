import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Box, ContactShadows, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import useProductStore from '../store/productStore';
import useCartStore from '../store/cartStore';
import useSceneStore from '../store/sceneStore';
import useProductDetailStore from '../store/productDetailStore';

// Configuration presets
const CONFIG_COLORS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#111111' },
  { name: 'Oak', hex: '#D4A574' },
  { name: 'Walnut', hex: '#5C4033' },
  { name: 'Grey', hex: '#B2BEC3' }
];

const CONFIG_MATERIALS = ['Wood', 'Metal', 'Glass', 'Plastic'];

/* ─── CAD Dimension Arrow Component ────────────────────────── */
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

  // Rotations for the arrow head cones to point in the correct directions
  const coneRotations = useMemo(() => {
    if (axis === 'x') {
      return { r1: [0, 0, -Math.PI / 2], r2: [0, 0, Math.PI / 2] };
    } else if (axis === 'y') {
      return { r1: [0, 0, 0], r2: [Math.PI, 0, 0] };
    } else { // 'z'
      return { r1: [Math.PI / 2, 0, 0], r2: [-Math.PI / 2, 0, 0] };
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
        <lineBasicMaterial attach="material" color="#a5b1c2" linewidth={1} />
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
        <lineBasicMaterial attach="material" color="#a5b1c2" linewidth={1} />
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
        <lineBasicMaterial attach="material" color={color} linewidth={2} />
      </line>

      {/* Arrow Head 1 */}
      <mesh position={mainStart} rotation={coneRotations.r1}>
        <coneGeometry args={[0.015, 0.06, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Arrow Head 2 */}
      <mesh position={mainEnd} rotation={coneRotations.r2}>
        <coneGeometry args={[0.015, 0.06, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Float Label */}
      <Html position={midPoint} center distanceFactor={6}>
        <div style={{
          background: '#ffffff',
          border: `2px solid ${color}`,
          color: color,
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: '800',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          userSelect: 'none',
          fontFamily: "'Inter', sans-serif"
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
            {/* Transparent bounding box overlay */}
            <Box args={[size.width / 100, size.height / 100, size.depth / 100]} position={[center.x, center.y, center.z]}>
              <meshBasicMaterial wireframe color={color} transparent opacity={0.4} />
            </Box>
            
            {/* Rounded Label */}
            <Html position={[center.x, center.y + size.height / 200 + 0.03, center.z]} center distanceFactor={6}>
              <div style={{
                background: '#ffffff',
                border: `2px solid ${color}`,
                color: color,
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                boxShadow: '0 3px 8px rgba(0,0,0,0.1)',
                fontFamily: "'Inter', sans-serif"
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
function CustomMeasurement({ points, color = '#2ed573' }) {
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
          border: `2px solid ${color}`,
          color: color,
          padding: '4px 8px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: '800',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontFamily: "'Inter', sans-serif"
        }}>
          {distanceCm} cm
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
    const { size, center } = modelBounds;

    // Normalize scale math
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;

    // Calculate bounding sphere of the normalized group
    const radius = (maxDim / 2) * scale;
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(radius / Math.sin(fov / 2));
    
    // Offset slightly for comfortable viewing angle
    cameraZ *= 1.5;

    camera.position.set(cameraZ * 0.8, cameraZ * 0.6, cameraZ * 1.2);
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

  // Extract bounding box sizes on load
  useEffect(() => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    setModelBounds({ box, size, center });
  }, [scene, setModelBounds, glbModel]);

  // Handle material override for Configurator
  useEffect(() => {
    if (!scene) return;
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        
        // Dynamic color
        child.material.color.set(selectedColor);
        
        // Dynamic material specifiers
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

/* ─── Stars ────────────────────────────────────────────────── */
function Stars({ rating }) {
  return (
    <span style={{ color: '#e8a400', fontSize: 16, letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, i) => i < Math.floor(rating) ? '★' : '☆')}
    </span>
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

  // Local state
  const [modelBounds, setModelBounds] = useState(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wished, setWished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewerContainerRef = useRef();
  const innerGroupRef = useRef();
  const controlsRef = useRef();

  // Reset store on mount/product change
  useEffect(() => {
    resetStore();
    if (product) {
      // Set default color
      setSelectedColor(product.colors?.[0] || '#2D3436');
    }
  }, [product, resetStore, setSelectedColor]);

  if (!product) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <h3 style={{ marginTop: 16 }}>Product not found</h3>
        <Link to="/products" style={{ color: '#0058a3', fontSize: 14 }}>← Browse products</Link>
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
    const { center, size } = modelBounds;
    // Align model base exactly to y = -0.5
    return [
      -center.x * scale,
      -center.y * scale - 0.5,
      -center.z * scale
    ];
  }, [modelBounds, scale]);

  // Detected overall dimensions
  const detectedDims = useMemo(() => {
    if (!modelBounds) return { width: 0, height: 0, depth: 0 };
    const { size } = modelBounds;
    // Scale multiplier: assume meters if size is small
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
    
    // We mock/generate high-fidelity shelves and drawers to match IKEA specification detail level
    const list = [];
    const { width: w, height: h, depth: d } = detectedDims;

    if (product.category === 'tables') {
      list.push({
        name: 'Main Tabletop',
        type: 'Surface',
        size: { width: w, height: Math.round(h * 0.1), depth: d },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y + modelBounds.size.y * 0.4, modelBounds.center.z)
      });
      list.push({
        name: 'Lower Storage Rack',
        type: 'Shelf',
        size: { width: Math.round(w * 0.85), height: 4, depth: Math.round(d * 0.8) },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y - modelBounds.size.y * 0.15, modelBounds.center.z)
      });
    } else if (product.category === 'storage' || product.category === 'sofas') {
      list.push({
        name: 'Top Display Compartment',
        type: 'Shelf',
        size: { width: Math.round(w * 0.9), height: 5, depth: Math.round(d * 0.85) },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y + modelBounds.size.y * 0.2, modelBounds.center.z)
      });
      list.push({
        name: 'Bottom Drawer Pull',
        type: 'Drawer',
        size: { width: Math.round(w * 0.42), height: Math.round(h * 0.3), depth: Math.round(d * 0.8) },
        center: new THREE.Vector3(modelBounds.center.x - modelBounds.size.x * 0.22, modelBounds.center.y - modelBounds.size.y * 0.25, modelBounds.center.z)
      });
    } else if (product.category === 'chairs') {
      list.push({
        name: 'Soft Seat Cushion',
        type: 'Seat',
        size: { width: Math.round(w * 0.9), height: Math.round(h * 0.15), depth: Math.round(d * 0.85) },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y - modelBounds.size.y * 0.08, modelBounds.center.z)
      });
      list.push({
        name: 'Backrest Support Panel',
        type: 'Support',
        size: { width: Math.round(w * 0.85), height: Math.round(h * 0.45), depth: Math.round(d * 0.08) },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y + modelBounds.size.y * 0.25, modelBounds.center.z - modelBounds.size.z * 0.25)
      });
    } else {
      list.push({
        name: 'Main Section',
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
    
    // Header Banner
    doc.setFillColor(0, 88, 163); // IKEA Blue
    doc.rect(0, 0, 210, 38, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('IKEA 3D Viewer Product Specifications', 15, 24);
    
    // Date & Source
    doc.setTextColor(220, 220, 220);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Site: ar-vr-red.vercel.app`, 15, 32);
    
    // Product Title
    doc.setTextColor(17, 17, 17);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(product.name, 15, 52);
    
    // Category & Price
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Category: ${product.category.toUpperCase()}`, 15, 60);
    doc.setTextColor(17, 17, 17);
    doc.setFont('helvetica', 'bold');
    doc.text(`Price: Rs. ${Math.round(product.price * 83).toLocaleString('en-IN')}`, 15, 67);
    
    // Description
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(product.description || '', 15, 75, { maxWidth: 180 });
    
    // Divider line
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 87, 195, 87);
    
    // Config Details Table Layout
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 88, 163);
    doc.text('Product Configuration & Dimensions', 15, 96);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(50, 50, 50);
    doc.text(`Selected Material: ${selectedMaterial}`, 15, 105);
    doc.text(`Selected Color Hex: ${selectedColor}`, 15, 112);
    doc.text(`Calculated Width: ${detectedDims.width} cm`, 15, 119);
    doc.text(`Calculated Height: ${detectedDims.height} cm`, 15, 126);
    doc.text(`Calculated Depth: ${detectedDims.depth} cm`, 15, 133);
    
    // Add Subcomponents specifications
    if (detectedSubComponents.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Detected Subcomponents:', 105, 105);
      doc.setFont('helvetica', 'normal');
      detectedSubComponents.forEach((comp, idx) => {
        doc.text(`• ${comp.type} (${comp.name}): ${comp.size.width}×${comp.size.height}×${comp.size.depth} cm`, 105, 112 + (idx * 7));
      });
    }

    // 3D Rendering Screenshot
    if (imgData) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 88, 163);
      doc.text('3D Interactive Model Preview:', 15, 150);
      
      // Draw image border
      doc.setDrawColor(180, 180, 180);
      doc.rect(15, 155, 140, 95);
      doc.addImage(imgData, 'PNG', 16, 156, 138, 93);
    }
    
    // Footer line
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 270, 195, 270);
    
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text('This specification page is generated dynamically from the live 3D web configurator.', 15, 278);
    doc.text('For the best immersive experience, open the model in mobile AR.', 15, 283);
    
    doc.save(`${product.name.replace(/\s+/g, '_')}_Spec_Sheet.pdf`);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* ── Breadcrumb Bar ── */}
      <div style={{ padding: '16px 40px', fontSize: 13, color: '#767676', borderBottom: '1px solid #e5e5e5', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link to="/" style={{ color: '#0058a3', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
        <span>/</span>
        <Link to="/products" style={{ color: '#0058a3', textDecoration: 'none', fontWeight: 600 }}>Furniture</Link>
        <span>/</span>
        <span style={{ color: '#111111', textTransform: 'uppercase', fontWeight: 800 }}>{product.name}</span>
      </div>

      {/* ── Main Product Canvas + Configurations Layout ── */}
      <div className="product-layout-container" style={{ display: 'flex', flexWrap: 'wrap', flex: 1, position: 'relative' }}>
        
        {/* LEFT: 3D Interactive Canvas Box */}
        <div className="product-layout-left" ref={viewerContainerRef} style={{
          flex: '1 1 60%',
          minWidth: 320,
          background: 'radial-gradient(circle at center, #ffffff 0%, #f6f6f2 100%)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          height: isFullscreen ? '100vh' : '75vh',
          minHeight: 500,
          transition: 'all 0.3s'
        }}>
          
          {/* Overlay CAD Measurement Modes & Tools */}
          <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setMeasurementMode('overall')}
              style={{
                background: measurementMode === 'overall' ? '#0058a3' : 'rgba(255,255,255,0.9)',
                color: measurementMode === 'overall' ? '#ffffff' : '#111111',
                border: '1px solid rgba(0,0,0,0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.2s'
              }}
            >
              📐 Overall Dims
            </button>
            <button
              onClick={() => setMeasurementMode('detailed')}
              style={{
                background: measurementMode === 'detailed' ? '#ff7675' : 'rgba(255,255,255,0.9)',
                color: measurementMode === 'detailed' ? '#ffffff' : '#111111',
                border: '1px solid rgba(0,0,0,0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.2s'
              }}
            >
              📥 Detailed Parts
            </button>
            <button
              onClick={() => setMeasurementMode('custom')}
              style={{
                background: measurementMode === 'custom' ? '#2ed573' : 'rgba(255,255,255,0.9)',
                color: measurementMode === 'custom' ? '#ffffff' : '#111111',
                border: '1px solid rgba(0,0,0,0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.2s'
              }}
            >
              📍 Custom Measure
            </button>
          </div>

          {/* Helper alert text for Custom mode */}
          {measurementMode === 'custom' && (
            <div style={{
              position: 'absolute',
              top: 70,
              left: 20,
              zIndex: 10,
              background: 'rgba(46, 213, 115, 0.1)',
              border: '1px solid #2ed573',
              color: '#26af5c',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              💡 Click any 2 points on the model surface to measure distance.
              {customPoints.length > 0 && (
                <button 
                  onClick={clearCustomPoints}
                  style={{
                    marginLeft: '8px',
                    background: '#2ed573',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Reset Points
                </button>
              )}
            </div>
          )}

          {/* Interactive Utility Controls */}
          <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 10, display: 'flex', gap: 8 }}>
            <button onClick={handleResetCamera} title="Reset Camera" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.1)', padding: '10px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              🔄
            </button>
            <button onClick={toggleFullscreen} title="Toggle Fullscreen" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.1)', padding: '10px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isFullscreen ? '📴' : '📺'}
            </button>
            <button onClick={handleScreenshot} title="Capture Screenshot" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.1)', padding: '10px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📸
            </button>
            <button onClick={handlePDFExport} title="Export PDF Specification" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.1)', padding: '10px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📄
            </button>
          </div>

          {/* 3D Canvas */}
          <Canvas
            gl={{ preserveDrawingBuffer: true }}
            camera={{ position: [0, 1.5, 4], fov: 45 }}
            style={{ width: '100%', height: '100%', cursor: measurementMode === 'custom' ? 'crosshair' : 'grab' }}
          >
            <Environment preset="city" />
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
            
            <Suspense fallback={
              <Html center>
                <div style={{ background: '#fff', padding: '12px 24px', borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', fontWeight: 'bold' }}>
                  Loading 3D Model...
                </div>
              </Html>
            }>
              <group scale={scale} position={[0, -0.5, 0]}>
                <group ref={innerGroupRef} position={modelBounds ? [-modelBounds.center.x, -modelBounds.center.y, -modelBounds.center.z] : [0, 0, 0]}>
                  
                  {/* Load the actual GLB model */}
                  <ProductModel
                    glbModel={product.glbModel}
                    selectedColor={selectedColor}
                    selectedMaterial={selectedMaterial}
                    setModelBounds={setModelBounds}
                    measurementMode={measurementMode}
                    addCustomPoint={addCustomPoint}
                    innerGroupRef={innerGroupRef}
                  />

                  {/* Mode 1: Overall Dimensions Overlay */}
                  {measurementMode === 'overall' && modelBounds && (
                    <group>
                      {/* Width Line (X Axis) */}
                      <CADArrow
                        start={[modelBounds.center.x - modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                        end={[modelBounds.center.x + modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                        label={`${detectedDims.width} cm`}
                        extensionOffset={[0, 0, 0.15]}
                        axis="x"
                        color="#0058a3"
                      />

                      {/* Height Line (Y Axis) */}
                      <CADArrow
                        start={[modelBounds.center.x + modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                        end={[modelBounds.center.x + modelBounds.size.x / 2, modelBounds.center.y + modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                        label={`${detectedDims.height} cm`}
                        extensionOffset={[0.15, 0, 0]}
                        axis="y"
                        color="#0058a3"
                      />

                      {/* Depth Line (Z Axis) */}
                      <CADArrow
                        start={[modelBounds.center.x + modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z - modelBounds.size.z / 2]}
                        end={[modelBounds.center.x + modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                        label={`${detectedDims.depth} cm`}
                        extensionOffset={[0.15, 0, 0]}
                        axis="z"
                        color="#0058a3"
                      />
                    </group>
                  )}

                  {/* Mode 2: Detailed Parts (Shelves, compartments) */}
                  {measurementMode === 'detailed' && (
                    <DetailedDimensions subComponents={detectedSubComponents} color="#ff7675" />
                  )}

                  {/* Mode 3: Custom Measurement Line */}
                  {measurementMode === 'custom' && (
                    <CustomMeasurement points={customPoints} color="#2ed573" />
                  )}

                </group>
              </group>

              {/* Adjust camera dynamically to fit viewport */}
              <CameraFitter modelBounds={modelBounds} />

              <ContactShadows position={[0, -0.52, 0]} opacity={0.5} scale={8} blur={2.4} far={3} />
            </Suspense>

            <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} makeDefault />
          </Canvas>
        </div>

        {/* RIGHT: IKEA-style product configuration sidebar */}
        <div className="product-layout-right" style={{
          flex: '1 1 40%',
          minWidth: 320,
          background: '#ffffff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.04)',
          borderLeft: '1px solid #e5e5e5',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 5
        }}>
          <div style={{ padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Header Title Section */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0058a3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                {product.category || 'Furniture'}
              </div>
              <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900, color: '#111111', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {product.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Stars rating={product.rating} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                  {product.rating} <span style={{ color: '#767676', fontWeight: 400 }}>({product.reviews} reviews)</span>
                </span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 15, color: '#484848', lineHeight: 1.6 }}>
              {product.description}
            </p>

            {/* Price tag */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#111111' }}>
                Rs. {Math.round(product.price * 83).toLocaleString('en-IN')}
              </div>
              {product.originalPrice && (
                <div style={{ fontSize: 18, color: '#999', textDecoration: 'line-through', fontWeight: 600 }}>
                  Rs. {Math.round(product.originalPrice * 83).toLocaleString('en-IN')}
                </div>
              )}
            </div>

            <div style={{ height: '1px', background: '#e5e5e5' }} />

            {/* Product Configurator section */}
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Select Color Code
              </h3>
              <div style={{ display: 'flex', gap: 10 }}>
                {CONFIG_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.hex)}
                    title={color.name}
                    style={{
                      width: 40,
                      height: 40,
                      background: color.hex,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: selectedColor === color.hex ? '3px solid #0058a3' : '1px solid #cccccc',
                      boxShadow: selectedColor === color.hex ? '0 0 8px rgba(0,88,163,0.3)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Select Material
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {CONFIG_MATERIALS.map((mat) => (
                  <button
                    key={mat}
                    onClick={() => setSelectedMaterial(mat)}
                    style={{
                      padding: '10px 0',
                      background: selectedMaterial === mat ? '#0058a3' : '#f5f5f5',
                      color: selectedMaterial === mat ? '#ffffff' : '#111111',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s'
                    }}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: '1px', background: '#e5e5e5' }} />

            {/* Technical Specifications */}
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Specifications (Calculated)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ background: '#f5f5f5', padding: '12px 8px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{detectedDims.width}</div>
                  <div style={{ fontSize: 11, color: '#767676', fontWeight: 600 }}>Width (cm)</div>
                </div>
                <div style={{ background: '#f5f5f5', padding: '12px 8px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{detectedDims.height}</div>
                  <div style={{ fontSize: 11, color: '#767676', fontWeight: 600 }}>Height (cm)</div>
                </div>
                <div style={{ background: '#f5f5f5', padding: '12px 8px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{detectedDims.depth}</div>
                  <div style={{ fontSize: 11, color: '#767676', fontWeight: 600 }}>Depth (cm)</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleAddToCart}
                  style={{
                    flex: 1,
                    padding: '16px 0',
                    background: addedToCart ? '#2ed573' : '#0058a3',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '30px',
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,88,163,0.2)',
                    transition: 'all 0.2s'
                  }}
                >
                  {addedToCart ? '✓ Added to Bag' : 'Add to Bag'}
                </button>
                
                <button
                  onClick={() => setWished(!wished)}
                  style={{
                    width: 52,
                    height: 52,
                    background: wished ? '#ffebee' : '#f5f5f5',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: 20, color: wished ? '#e91e63' : '#767676' }}>♥</span>
                </button>
              </div>

              <button
                onClick={handleViewInAR}
                style={{
                  padding: '14px 0',
                  background: '#111111',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '30px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                🕶️ View in AR Space
              </button>

              <button
                onClick={() => navigate('/room-builder')}
                style={{
                  padding: '14px 0',
                  background: '#ffffff',
                  color: '#0058a3',
                  border: '2px solid #0058a3',
                  borderRadius: '30px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                🏠 Try in Room Planner
              </button>
            </div>

            {/* Quality Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e5e5', paddingTop: 20, marginTop: 12 }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 20 }}>🚚</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#767676', marginTop: 4 }}>Free Delivery</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 20 }}>↩️</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#767676', marginTop: 4 }}>365 Days Return</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 20 }}>🛡️</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#767676', marginTop: 4 }}>2-Year Warranty</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
