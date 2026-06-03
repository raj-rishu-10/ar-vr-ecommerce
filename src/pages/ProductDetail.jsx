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
  FiLayers, 
  FiCompass, 
  FiTruck, 
  FiShield, 
  FiActivity,
  FiHelpCircle
} from 'react-icons/fi';
import useProductStore from '../store/productStore';
import useCartStore from '../store/cartStore';
import useSceneStore from '../store/sceneStore';
import useProductDetailStore from '../store/productDetailStore';

// Configuration presets for materials
const CONFIG_MATERIALS = ['Wood', 'Metal', 'Glass', 'Plastic'];

// Helper to map color hex codes to human-readable names
const getColorName = (hex) => {
  const map = {
    '#2D3436': 'Charcoal Black',
    '#636E72': 'Steel Grey',
    '#DFE6E9': 'Classic White',
    '#B2BEC3': 'Slate Grey',
    '#00B894': 'Emerald Teal',
    '#6C5CE7': 'Aura Purple',
    '#FDCB6E': 'Warm Amber',
    '#D4A574': 'Natural Wood',
    '#5C4033': 'Dark Walnut',
    '#ffffff': 'Pure White',
    '#FFFFFF': 'Pure White',
    '#111111': 'Midnight Black'
  };
  return map[hex] || 'Custom Finish';
};

/* ─── CAD Dimension Arrow Component (Holographic Glass style) ─── */
function CADArrow({ start, end, label, color = 'var(--accent)', extensionOffset = [0, 0, 0], axis = 'x' }) {
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
        <lineBasicMaterial attach="material" color="rgba(255,255,255,0.25)" linewidth={1} />
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
        <lineBasicMaterial attach="material" color="rgba(255,255,255,0.25)" linewidth={1} />
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

      {/* Holographic Float Label */}
      <Html position={midPoint} center distanceFactor={6}>
        <div className="holographic-badge" style={{ border: `2px solid ${color}` }}>
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
              <meshBasicMaterial wireframe color={color} transparent opacity={0.35} />
            </Box>
            
            {/* Holographic Label */}
            <Html position={[center.x, center.y + size.height / 200 + 0.03, center.z]} center distanceFactor={6}>
              <div className="holographic-badge" style={{ border: `2px solid ${color}`, fontSize: '10px', padding: '3px 8px', borderRadius: '8px' }}>
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
        <div className="holographic-badge" style={{ border: `2px solid ${color}` }}>
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

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    const radius = (maxDim / 2) * scale;
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(radius / Math.sin(fov / 2));
    
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

/* ─── Stars Rendering Helper ───────────────────────────────── */
function Stars({ rating }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span 
          key={i} 
          style={{ 
            color: i < Math.floor(rating) ? 'var(--warning)' : 'var(--text-muted)', 
            fontSize: 16 
          }}
        >
          ★
        </span>
      ))}
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

  // Local UI states
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
      setSelectedColor(product.colors?.[0] || '#2D3436');
    }
  }, [product, resetStore, setSelectedColor]);

  if (!product) {
    return (
      <div style={{ padding: '120px 24px', textAlign: 'center', background: 'var(--bg-primary)', minHeight: '100vh' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
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

  // Calculated overall dimensions
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
        name: 'Upper Worktop',
        type: 'Surface',
        size: { width: w, height: Math.round(h * 0.08), depth: d },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y + modelBounds.size.y * 0.42, modelBounds.center.z)
      });
      list.push({
        name: 'Lower Storage Rack',
        type: 'Shelf',
        size: { width: Math.round(w * 0.86), height: 3, depth: Math.round(d * 0.8) },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y - modelBounds.size.y * 0.18, modelBounds.center.z)
      });
    } else if (product.category === 'storage' || product.category === 'sofas') {
      list.push({
        name: 'Internal Shelf Unit',
        type: 'Shelf',
        size: { width: Math.round(w * 0.88), height: 4, depth: Math.round(d * 0.8) },
        center: new THREE.Vector3(modelBounds.center.x, modelBounds.center.y + modelBounds.size.y * 0.15, modelBounds.center.z)
      });
      list.push({
        name: 'Base Drawer Unit',
        type: 'Drawer',
        size: { width: Math.round(w * 0.44), height: Math.round(h * 0.28), depth: Math.round(d * 0.85) },
        center: new THREE.Vector3(modelBounds.center.x - modelBounds.size.x * 0.2, modelBounds.center.y - modelBounds.size.y * 0.26, modelBounds.center.z)
      });
    } else if (product.category === 'chairs') {
      list.push({
        name: 'Seat Board',
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
        name: 'Main Space',
        type: 'Compartment',
        size: { width: Math.round(w * 0.9), height: Math.round(h * 0.75), depth: Math.round(d * 0.9) },
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
    
    // Spec Sheet Header
    doc.setFillColor(18, 18, 26); // Aura Dark Purple-Gray
    doc.rect(0, 0, 210, 42, 'F');
    
    doc.setTextColor(162, 155, 254); // Aura accent-light
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('AURA Interactive Spec Sheet', 15, 24);
    
    doc.setTextColor(136, 136, 160);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Model: ${product.name}`, 15, 33);
    
    // Product details
    doc.setTextColor(17, 17, 17);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(product.name, 15, 56);
    
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Collection category: ${product.category.toUpperCase()}`, 15, 64);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Price Tag: Rs. ${Math.round(product.price * 83).toLocaleString('en-IN')}`, 15, 71);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(product.description || '', 15, 79, { maxWidth: 180 });
    
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 91, 195, 91);
    
    // Spec Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(108, 92, 231); // Aura Accent Purple
    doc.text('Configuration Details & Model Bounds', 15, 100);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(50, 50, 50);
    doc.text(`Finish Material: ${selectedMaterial}`, 15, 110);
    doc.text(`Color Code (Hex): ${selectedColor} (${getColorName(selectedColor)})`, 15, 117);
    doc.text(`Calculated Width: ${detectedDims.width} cm`, 15, 124);
    doc.text(`Calculated Height: ${detectedDims.height} cm`, 15, 131);
    doc.text(`Calculated Depth: ${detectedDims.depth} cm`, 15, 138);
    
    if (detectedSubComponents.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Key Subcomponents:', 110, 110);
      doc.setFont('helvetica', 'normal');
      detectedSubComponents.forEach((comp, idx) => {
        doc.text(`• ${comp.type}: ${comp.size.width}×${comp.size.height}×${comp.size.depth} cm`, 110, 117 + (idx * 7));
      });
    }

    // Capture Viewport Rendering
    if (imgData) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(108, 92, 231);
      doc.text('Interactive 3D Viewport Capture:', 15, 155);
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(15, 160, 140, 95);
      doc.addImage(imgData, 'PNG', 16, 161, 138, 93);
    }
    
    // Footer
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 270, 195, 270);
    
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text('This specification page is generated dynamically from the live 3D web configurator.', 15, 278);
    doc.text('To place this model in your space, scan the product with a WebXR-compatible mobile browser.', 15, 283);
    
    doc.save(`${product.name.replace(/\s+/g, '_')}_Spec_Sheet.pdf`);
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      
      {/* Dynamic styles to handle page layouts cleanly */}
      <style>{`
        .product-detail-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 32px;
          margin-bottom: 40px;
        }
        @media (max-width: 992px) {
          .product-detail-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }
        .config-color-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .config-color-btn:hover {
          transform: scale(1.15);
        }
        .config-material-btn {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .config-material-btn:hover {
          background: rgba(255, 255, 255, 0.07);
          color: var(--text-primary);
          border-color: var(--text-muted);
        }
        .config-material-btn.active {
          background: var(--gradient-primary);
          color: white;
          border: none;
          box-shadow: var(--shadow-glow);
        }
        .action-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 16px 24px;
          background: var(--gradient-primary);
          color: white;
          border: none;
          border-radius: 30px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: var(--shadow-glow);
        }
        .action-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(108, 92, 231, 0.4);
        }
        .action-btn-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          background: var(--gradient-accent);
          color: white;
          border: none;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 184, 148, 0.3);
        }
        .action-btn-outline {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          background: transparent;
          color: var(--accent-light);
          border: 1.5px solid var(--border-accent);
          border-radius: 30px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn-outline:hover {
          background: rgba(108, 92, 231, 0.08);
          color: white;
          border-color: var(--accent);
          transform: translateY(-2px);
        }
        .holographic-badge {
          background: rgba(10, 10, 15, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          user-select: none;
          font-family: var(--font-primary);
          color: var(--text-primary);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease-in-out;
        }
      `}</style>

      {/* ── Breadcrumb Bar ── */}
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 24px 0 24px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/" style={{ color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
          <span>/</span>
          <Link to="/products" style={{ color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 500 }}>Collection</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.name}</span>
        </div>
      </div>

      {/* ── Main Layout Grid ── */}
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '24px' }}>
        <div className="product-detail-grid">
          
          {/* LEFT: 3D Viewport Box */}
          <div ref={viewerContainerRef} style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            position: 'relative',
            height: isFullscreen ? '100vh' : '65vh',
            minHeight: 480,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-md)',
            transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            
            {/* 3D Scene Background Gradient layer */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, rgba(108, 92, 231, 0.05) 0%, rgba(10, 10, 15, 0) 70%)',
              pointerEvents: 'none'
            }} />

            {/* TOP BAR: Measurement Modes Toggles */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setMeasurementMode('overall')}
                style={{
                  background: measurementMode === 'overall' ? 'var(--accent)' : 'rgba(26, 26, 46, 0.8)',
                  color: '#ffffff',
                  border: measurementMode === 'overall' ? 'none' : '1px solid var(--border-subtle)',
                  backdropFilter: 'blur(10px)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: measurementMode === 'overall' ? 'var(--shadow-glow)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                📐 Dimensions
              </button>
              <button
                onClick={() => setMeasurementMode('detailed')}
                style={{
                  background: measurementMode === 'detailed' ? '#ff7675' : 'rgba(26, 26, 46, 0.8)',
                  color: '#ffffff',
                  border: measurementMode === 'detailed' ? 'none' : '1px solid var(--border-subtle)',
                  backdropFilter: 'blur(10px)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: measurementMode === 'detailed' ? '0 0 15px rgba(255, 118, 117, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                📥 Key Sections
              </button>
              <button
                onClick={() => setMeasurementMode('custom')}
                style={{
                  background: measurementMode === 'custom' ? '#00b894' : 'rgba(26, 26, 46, 0.8)',
                  color: '#ffffff',
                  border: measurementMode === 'custom' ? 'none' : '1px solid var(--border-subtle)',
                  backdropFilter: 'blur(10px)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: measurementMode === 'custom' ? '0 0 15px rgba(0, 184, 148, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                📍 Live Measure
              </button>
            </div>

            {/* Custom Mode Helper Banner */}
            {measurementMode === 'custom' && (
              <div style={{
                position: 'absolute',
                top: 70,
                left: 20,
                right: 20,
                zIndex: 10,
                background: 'rgba(0, 184, 148, 0.12)',
                border: '1px solid rgba(0, 184, 148, 0.3)',
                color: '#55efc4',
                padding: '10px 16px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backdropFilter: 'blur(12px)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiActivity /> Select any two points on the model grid to inspect distance.
                </span>
                {customPoints.length > 0 && (
                  <button 
                    onClick={clearCustomPoints}
                    style={{
                      background: '#00b894',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Clear Points
                  </button>
                )}
              </div>
            )}

            {/* FLOATING ACTION OVERLAY CONTROLS */}
            <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 10, display: 'flex', gap: 10 }}>
              <button 
                onClick={handleResetCamera} 
                title="Reset camera zoom" 
                style={{ 
                  background: 'rgba(26,26,46,0.85)', 
                  border: '1px solid var(--border-subtle)', 
                  color: 'var(--text-primary)', 
                  width: 44, 
                  height: 44, 
                  borderRadius: '50%', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s'
                }}
              >
                <FiRotateCcw size={18} />
              </button>
              <button 
                onClick={toggleFullscreen} 
                title="Toggle fullscreen view" 
                style={{ 
                  background: 'rgba(26,26,46,0.85)', 
                  border: '1px solid var(--border-subtle)', 
                  color: 'var(--text-primary)', 
                  width: 44, 
                  height: 44, 
                  borderRadius: '50%', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s'
                }}
              >
                {isFullscreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
              </button>
              <button 
                onClick={handleScreenshot} 
                title="Download viewport screenshot" 
                style={{ 
                  background: 'rgba(26,26,46,0.85)', 
                  border: '1px solid var(--border-subtle)', 
                  color: 'var(--text-primary)', 
                  width: 44, 
                  height: 44, 
                  borderRadius: '50%', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s'
                }}
              >
                <FiCamera size={18} />
              </button>
              <button 
                onClick={handlePDFExport} 
                title="Export Spec sheet PDF" 
                style={{ 
                  background: 'rgba(26,26,46,0.85)', 
                  border: '1px solid var(--border-subtle)', 
                  color: 'var(--text-primary)', 
                  width: 44, 
                  height: 44, 
                  borderRadius: '50%', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s'
                }}
              >
                <FiFileText size={18} />
              </button>
            </div>

            {/* THREE.JS CANVAS */}
            <Canvas
              gl={{ preserveDrawingBuffer: true }}
              camera={{ position: [0, 1.5, 4], fov: 45 }}
              style={{ width: '100%', height: '100%', cursor: measurementMode === 'custom' ? 'crosshair' : 'grab' }}
            >
              <Environment preset="city" />
              <ambientLight intensity={0.55} />
              <directionalLight position={[10, 12, 10]} intensity={1.1} castShadow />
              
              <Suspense fallback={
                <Html center>
                  <div style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '16px 32px', borderRadius: '30px', border: '1px solid var(--border-accent)', fontWeight: 700, boxShadow: 'var(--shadow-glow)' }}>
                    Generating 3D assets...
                  </div>
                </Html>
              }>
                <group scale={scale} position={[0, -0.5, 0]}>
                  <group ref={innerGroupRef} position={modelBounds ? [-modelBounds.center.x, -modelBounds.center.y, -modelBounds.center.z] : [0, 0, 0]}>
                    
                    {/* The GLB Mesh primitive */}
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
                        {/* Width Arrow */}
                        <CADArrow
                          start={[modelBounds.center.x - modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                          end={[modelBounds.center.x + modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                          label={`${detectedDims.width} cm`}
                          extensionOffset={[0, 0, 0.15]}
                          axis="x"
                          color="var(--accent)"
                        />

                        {/* Height Arrow */}
                        <CADArrow
                          start={[modelBounds.center.x + modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                          end={[modelBounds.center.x + modelBounds.size.x / 2, modelBounds.center.y + modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                          label={`${detectedDims.height} cm`}
                          extensionOffset={[0.15, 0, 0]}
                          axis="y"
                          color="var(--accent)"
                        />

                        {/* Depth Arrow */}
                        <CADArrow
                          start={[modelBounds.center.x + modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z - modelBounds.size.z / 2]}
                          end={[modelBounds.center.x + modelBounds.size.x / 2, modelBounds.center.y - modelBounds.size.y / 2, modelBounds.center.z + modelBounds.size.z / 2]}
                          label={`${detectedDims.depth} cm`}
                          extensionOffset={[0.15, 0, 0]}
                          axis="z"
                          color="var(--accent)"
                        />
                      </group>
                    )}

                    {/* Mode 2: Detailed Parts (Shelves, panels) */}
                    {measurementMode === 'detailed' && (
                      <DetailedDimensions subComponents={detectedSubComponents} color="#ff7675" />
                    )}

                    {/* Mode 3: Custom Point measuring */}
                    {measurementMode === 'custom' && (
                      <CustomMeasurement points={customPoints} color="#00b894" />
                    )}

                  </group>
                </group>

                <CameraFitter modelBounds={modelBounds} />
                <ContactShadows position={[0, -0.52, 0]} opacity={0.4} scale={6} blur={2.0} far={2.5} />
              </Suspense>

              <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} makeDefault />
            </Canvas>
          </div>

          {/* RIGHT: AURA configuration sidebar */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            position: 'sticky',
            top: '100px',
            height: 'fit-content'
          }}>
            <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Product Header */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 4 }}>
                  {product.category || 'Collection'}
                </div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: 28, 
                  fontWeight: 800, 
                  color: 'var(--text-primary)', 
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1.2 
                }}>
                  {product.name}
                </h1>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <Stars rating={product.rating} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {product.rating} <span style={{ color: 'var(--text-muted)' }}>({product.reviews} reviews)</span>
                  </span>
                </div>
              </div>

              {/* Price Details */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Rs. {Math.round(product.price * 83).toLocaleString('en-IN')}
                </div>
                {product.originalPrice && (
                  <div style={{ fontSize: 16, color: 'var(--text-muted)', textDecoration: 'line-through', fontWeight: 600 }}>
                    Rs. {Math.round(product.originalPrice * 83).toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {product.description}
              </p>

              <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

              {/* Configurator 1: Colors selection (uses product colors) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                    Standard Finishes
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--accent-light)', fontWeight: 600 }}>
                    {getColorName(selectedColor)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: 12 }}>
                  {(product.colors || ['#2D3436']).map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setSelectedColor(hex)}
                      title={getColorName(hex)}
                      className="config-color-btn"
                      style={{
                        background: hex,
                        border: selectedColor === hex ? '3px solid var(--accent)' : '1px solid var(--border-subtle)',
                        boxShadow: selectedColor === hex ? 'var(--shadow-glow)' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Configurator 2: Material selections */}
              <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                  Material Texture
                </h3>
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

              {/* Bounding box sizes grid */}
              <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                  Dynamic Dimensions
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', padding: '12px 8px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{detectedDims.width}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>Width (cm)</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', padding: '12px 8px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{detectedDims.height}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>Height (cm)</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', padding: '12px 8px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{detectedDims.depth}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>Depth (cm)</div>
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

              {/* Interactive buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={handleAddToCart}
                    className="action-btn-primary"
                    style={{
                      background: addedToCart ? 'var(--success)' : 'var(--gradient-primary)',
                      boxShadow: addedToCart ? '0 0 15px rgba(0, 184, 148, 0.3)' : 'var(--shadow-glow)',
                    }}
                  >
                    <FiShoppingCart />
                    {addedToCart ? 'Added to Bag' : 'Add to Bag'}
                  </button>
                  
                  <button
                    onClick={() => setWished(!wished)}
                    style={{
                      width: 52,
                      height: 52,
                      background: wished ? 'rgba(225, 112, 85, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: wished ? '1px solid rgba(225, 112, 85, 0.3)' : '1px solid var(--border-subtle)',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      color: wished ? '#e17055' : 'var(--text-secondary)'
                    }}
                  >
                    <FiHeart size={20} fill={wished ? '#e17055' : 'none'} />
                  </button>
                </div>

                <button
                  onClick={handleViewInAR}
                  className="action-btn-secondary"
                >
                  🕶️ View in AR Space
                </button>

                <button
                  onClick={() => navigate('/room-builder')}
                  className="action-btn-outline"
                >
                  <FiCompass /> Try in Room Planner
                </button>
              </div>

              {/* Service features footer badges */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                borderTop: '1px solid var(--border-subtle)', 
                paddingTop: 20, 
                marginTop: 8 
              }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <FiTruck size={20} style={{ color: 'var(--accent-light)' }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 6, textTransform: 'uppercase' }}>Free Delivery</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <FiRotateCcw size={20} style={{ color: 'var(--accent-light)' }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 6, textTransform: 'uppercase' }}>365d Returns</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <FiShield size={20} style={{ color: 'var(--accent-light)' }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 6, textTransform: 'uppercase' }}>2y Warranty</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
