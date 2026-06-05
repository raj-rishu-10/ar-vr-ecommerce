import React, { Suspense, useRef, useState, useCallback, useEffect } from 'react';

// Demo room photo URL for browser-based testing (bypasses OS file picker)
const DEMO_ROOM_URL = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Clone, Html, OrbitControls } from '@react-three/drei';
import { XR, createXRStore, useXR, XRHitTest } from '@react-three/xr';
import { useNavigate, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import products from '../data/products.json';
import useCartStore from '../store/cartStore';
import { useAIPipeline } from '../hooks/useAIPipeline';
import './ARMultiViewer.scss';

const xrStore = createXRStore({ domOverlay: true });
const AR_PRODUCTS = products.filter(p => p.glbModel);

/* ── Reticle ───────────────────────────────────────────── */
function Reticle({ hitRef }) {
  const meshRef = useRef();
  const { gl } = useThree();

  return (
    <XRHitTest onResults={(results) => {
      if (!results?.length) { if (meshRef.current) meshRef.current.visible = false; return; }
      const rs = gl.xr.getReferenceSpace();
      if (!rs) return;
      const pose = results[0].getPose(rs);
      if (pose && meshRef.current) {
        meshRef.current.visible = true;
        meshRef.current.matrixAutoUpdate = false;
        meshRef.current.matrix.fromArray(pose.transform.matrix);
        hitRef.current = { hit: results[0], refSpace: rs };
      }
    }}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} visible={false} matrixAutoUpdate={false}>
        <ringGeometry args={[0.1, 0.14, 32]} />
        <meshBasicMaterial color="#00e5ff" side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>
    </XRHitTest>
  );
}

/* ── Single placed item ─────────────────────────────────── */
function PlacedItem({ item, isSelected, onSelect, onRemove, onUpdate, onDuplicate, ghost }) {
  const { scene } = useGLTF(item.glbModel || item.product?.glbModel);
  const box = React.useMemo(() => new THREE.Box3().setFromObject(scene), [scene]);
  const sz = new THREE.Vector3(); box.getSize(sz);
  const pos = item.position || [0, 0, 0];
  const rotY = item.rotationY || 0;
  const rot = item.rotation || [0, rotY, 0];
  const scale = item.scale || 1;

  return (
    <group position={pos} rotation={rot} scale={[scale, scale, scale]}
      onClick={e => { e.stopPropagation(); if (!ghost) onSelect(item.instanceId); }}>
      <Clone object={scene} castShadow receiveShadow />
      {ghost && (
        <mesh>
          <boxGeometry args={[sz.x, sz.y, sz.z]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.18} wireframe />
        </mesh>
      )}
      {isSelected && !ghost && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[Math.max(sz.x, sz.z) * 0.55, Math.max(sz.x, sz.z) * 0.65, 32]} />
          <meshBasicMaterial color="#ffcc00" side={THREE.DoubleSide} transparent opacity={0.9} />
        </mesh>
      )}
      {isSelected && !ghost && (
        <Html position={[0, sz.y + 0.4, 0]} center zIndexRange={[200, 0]}>
          <div className="ar-html-toolbar">
            {[
              { icon: '✥', label: 'Move', action: () => onUpdate(item.instanceId, { isRepositioning: true }) },
              { icon: '↺', label: 'Rotate', action: () => onUpdate(item.instanceId, { rotation: [rot[0], rot[1] + Math.PI / 4, rot[2]] }) },
              { icon: '＋', label: 'Scale Up', action: () => onUpdate(item.instanceId, { scale: scale * 1.1 }) },
              { icon: '－', label: 'Scale Dn', action: () => onUpdate(item.instanceId, { scale: scale * 0.9 }) },
              { icon: '⧉', label: 'Copy', action: () => onDuplicate(item.instanceId) },
              { icon: '🗑', label: 'Delete', action: () => onRemove(item.instanceId) }
            ].map(b => (
                <button key={b.label} onClick={e => { e.stopPropagation(); b.action(); }} className="ar-toolbar-btn">
                  <span>{b.icon}</span><span>{b.label}</span>
                </button>
              ))}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ── AR Scene ───────────────────────────────────────────── */
function ARScene({ placed, setPlaced, activeId, setActiveId, pending, suggestions, setIsAR }) {
  const { isPresenting, session } = useXR();
  const hitRef = useRef(null);
  
  useEffect(() => {
    if (setIsAR) setIsAR(isPresenting);
  }, [isPresenting, setIsAR]);
  
  // Track the item currently being repositioned
  const repositioningId = placed.find(i => i.isRepositioning)?.instanceId;

  // Use useFrame to smoothly move the repositioning item with the reticle
  useFrame(() => {
    if (repositioningId && hitRef.current) {
      const { hit, refSpace } = hitRef.current;
      const pose = hit.getPose(refSpace);
      if (pose) {
        const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
        const pos = new THREE.Vector3().setFromMatrixPosition(m);
        const euler = new THREE.Euler().setFromRotationMatrix(m);
        setPlaced(prev => prev.map(i => i.instanceId === repositioningId ? { ...i, position: [pos.x, pos.y, pos.z], rotation: [euler.x, euler.y, euler.z] } : i));
      }
    }
  });

  useEffect(() => {
    if (!session) return;
    
    const onSelect = () => {
      // If we were repositioning an item, drop it here and finish repositioning
      if (repositioningId) {
        setPlaced(prev => prev.map(i => i.instanceId === repositioningId ? { ...i, isRepositioning: false } : i));
        return;
      }
      
      // Otherwise, normal placement of pending item
      if (!hitRef.current || !pending) {
        setActiveId(null);
        return;
      }
      
      const { hit, refSpace } = hitRef.current;
      const pose = hit.getPose(refSpace);
      if (!pose) return;
      
      const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
      const pos = new THREE.Vector3().setFromMatrixPosition(m);
      const euler = new THREE.Euler().setFromRotationMatrix(m);
      
      setPlaced(prev => [...prev, { 
        ...pending, 
        instanceId: crypto.randomUUID(), 
        position: [pos.x, pos.y, pos.z], 
        rotation: [euler.x, euler.y, euler.z], 
        scale: 1 
      }]);
    };

    session.addEventListener('select', onSelect);
    return () => session.removeEventListener('select', onSelect);
  }, [session, pending, repositioningId, setActiveId]);

  const updateItem = (id, updates) => setPlaced(prev => prev.map(i => i.instanceId === id ? { ...i, ...updates } : i));
  const duplicateItem = (id) => setPlaced(prev => {
    const item = prev.find(i => i.instanceId === id);
    if (!item) return prev;
    return [...prev, { ...item, instanceId: crypto.randomUUID(), position: [item.position[0] + 0.3, item.position[1], item.position[2] + 0.3] }];
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      {isPresenting && <Reticle hitRef={hitRef} />}
      <Suspense fallback={null}>
        {placed.map(item => (
          <PlacedItem key={item.instanceId} item={item}
            isSelected={activeId === item.instanceId} ghost={item.isRepositioning}
            onSelect={setActiveId} 
            onRemove={id => { setPlaced(p => p.filter(i => i.instanceId !== id)); setActiveId(null); }}
            onUpdate={updateItem}
            onDuplicate={duplicateItem}
          />
        ))}
        {!isPresenting && suggestions?.map(s => (
          <PlacedItem key={s.instanceId} item={{ ...s.product, instanceId: s.instanceId, position: s.position, rotationY: s.rotationY }}
            isSelected={false} ghost={true} onSelect={() => {}} onRemove={() => {}} />
        ))}
      </Suspense>
    </>
  );
}

/* ── Stage Card ─────────────────────────────────────────── */
const STATUS_COLOR = { idle: '#334155', pending: '#334155', running: '#0ea5e9', done: '#10b981', warn: '#f59e0b', failed: '#ef4444' };
const STATUS_ICON  = { idle: '○', pending: '○', running: '⟳', done: '✓', warn: '⚠', failed: '✗' };

function StageCard({ stage }) {
  const color = STATUS_COLOR[stage.status];
  const spin = stage.status === 'running';
  return (
    <div className="ar-stage-card" style={{ border: `1px solid ${color}40` }}>
      <span className="ar-stage-icon">{stage.icon}</span>
      <div className="ar-stage-info">
        <div className="ar-stage-label">{stage.label}</div>
        <div className="ar-stage-detail">{stage.detail}</div>
      </div>
      <span className={`ar-stage-status ${spin ? 'spin' : ''}`} style={{ color }}>
        {STATUS_ICON[stage.status]}
      </span>
    </div>
  );
}

/* ══ Main Page ══════════════════════════════════════════════ */
export default function ARMultiViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCartStore();

  const init = location.state?.product
    ? AR_PRODUCTS.find(p => p.id === location.state.product.id) || AR_PRODUCTS[0]
    : AR_PRODUCTS[0];

  const [phase, setPhase]       = useState('home'); // home | capture | analyzing | preview | ar
  const [pending, setPending]   = useState(init);
  const [placed, setPlaced]     = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isAR, setIsAR]         = useState(false);
  const [toast, setToast]       = useState('');
  const [roomPhoto, setRoomPhoto] = useState(null);
  const fileRef = useRef();

  const { stages, results, isRunning, runPipeline, reset } = useAIPipeline(AR_PRODUCTS);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handlePhoto = useCallback(file => {
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => { setRoomPhoto(e.target.result); setPhase('capture'); };
    reader.readAsDataURL(file);
  }, []);

  // Load demo room image for testing (fetches via URL, no OS file picker needed)
  const handleDemoImage = useCallback(async () => {
    try {
      const resp = await fetch(DEMO_ROOM_URL);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = e => { setRoomPhoto(e.target.result); setPhase('capture'); };
      reader.readAsDataURL(blob);
    } catch {
      showToast('⚠️ Could not load demo image — upload manually');
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!roomPhoto) return;
    setPhase('analyzing');
    await runPipeline(roomPhoto);
    setPhase('preview');
    showToast('✅ AI analysis complete!');
  }, [roomPhoto, runPipeline]);

  // Auto-accept AI suggestions into preview
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase === 'preview' && results.suggestions?.length > 0) {
      setPlaced(prev => {
        if (prev.length > 0) return prev;
        return results.suggestions.map(s => ({
          ...s.product, instanceId: s.instanceId, position: s.position, rotationY: s.rotationY,
        }));
      });
    }
  }, [phase, results.suggestions]);

  const startAR = async () => {
    try { await xrStore.enterAR(); setIsAR(true); showToast('👆 Tap floor to place'); }
    catch { showToast('⚠️ WebXR AR not supported on this device'); }
  };
  const stopAR = () => { xrStore.getState().session?.end?.(); setIsAR(false); };

  const addAllToCart = () => {
    const unique = [...new Map(placed.map(i => [i.id, i])).values()];
    unique.forEach(p => addItem(p));
    showToast(`✅ ${unique.length} item(s) added to cart`);
  };

  // ── HOME phase ──────────────────────────────────────────────
  if (phase === 'home') {
    return (
      <div className="ar-home-wrapper">
        <button onClick={() => navigate(-1)} className="ar-back-btn-home">←</button>
        <div className="ar-home-container">
          <div className="ar-home-icon">🏠</div>
          <h1 className="ar-home-title">AI Room Designer</h1>
          <p className="ar-home-desc">
            Upload a room photo. Our AI pipeline uses <b className="depth">Depth Anything V2</b>, <b className="seg">SegFormer</b>, and <b className="detr">DETR</b> to detect free space and suggest furniture.
          </p>
          <div className="ar-home-btns">
            <button onClick={() => fileRef.current?.click()} className="ar-btn-scan">
              📷 Scan My Room with AI
            </button>
            <button onClick={handleDemoImage} className="ar-btn-demo">
              🧪 Use Demo Room (Test)
            </button>
            <button onClick={() => setPhase('preview')} className="ar-btn-skip">
              Skip → Browse in 3D
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e.target.files[0])} />
        </div>
      </div>
    );
  }

  // ── CAPTURE phase ────────────────────────────────────────────
  if (phase === 'capture') {
    return (
      <div className="ar-capture-wrapper">
        <div className="ar-capture-header">
          <button onClick={() => setPhase('home')} className="ar-back-btn">←</button>
          <div className="ar-capture-header-info">
            <div className="title">Room Photo</div>
            <div className="subtitle">Review before analysis</div>
          </div>
        </div>
        <div className="ar-capture-img-container">
          {roomPhoto && <img src={roomPhoto} alt="Room" className="ar-capture-img" />}
        </div>
        <div className="ar-capture-footer">
          <button onClick={() => fileRef.current?.click()} className="ar-btn-change">
            Change Photo
          </button>
          <button onClick={handleAnalyze} className="ar-btn-analyze">
            🤖 Analyze with AI
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e.target.files[0])} />
      </div>
    );
  }

  // ── ANALYZING phase ──────────────────────────────────────────
  if (phase === 'analyzing') {
    return (
      <div className="ar-analyzing-wrapper">
        <div className="ar-analyzing-header">
          <div className="ar-analyzing-icon">🧠</div>
          <h2 className="ar-analyzing-title">AI Pipeline Running</h2>
          <p className="ar-analyzing-desc">
            {isRunning ? 'Analyzing your room…' : 'Complete! Redirecting…'}
          </p>
        </div>

        {/* Pipeline diagram */}
        <div className="ar-pipeline-diagram">
          {Object.values(stages).map((s, i) => (
            <React.Fragment key={i}>
              <StageCard stage={s} />
              {i < Object.values(stages).length - 1 && (
                <div className="ar-pipeline-line" />
              )}
            </React.Fragment>
          ))}
        </div>

        {roomPhoto && (
          <div className="ar-analyzing-bg-container">
            <img src={roomPhoto} alt="" className="ar-analyzing-bg-img" />
          </div>
        )}
      </div>
    );
  }

  // ── PREVIEW + AR phase ───────────────────────────────────────
  return (
    <div className={`ar-preview-wrapper ${isAR ? 'bg-transparent' : 'bg-dark'}`}>

      {/* Canvas */}
      <Canvas style={{ flex: 1 }} camera={{ position: [0, 1.5, 4], fov: 60 }} gl={{ antialias: true, alpha: true }}>
        <XR store={xrStore}>
          <ARScene
            placed={placed} setPlaced={setPlaced}
            activeId={activeId}
            setActiveId={id => setActiveId(p => p === id ? null : id)}
            pending={pending}
            suggestions={results.suggestions}
            setIsAR={setIsAR}
          />
          {!isAR && (
            <>
              <ambientLight intensity={0.8} />
              <directionalLight position={[4, 8, 4]} intensity={1.2} castShadow />
              <directionalLight position={[-4, 4, -4]} intensity={0.4} color="#a0c4ff" />
              <hemisphereLight skyColor="#b0c4de" groundColor="#1e1e2e" intensity={0.6} />
              <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.1} />
              {/* Floor plane */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#2a2a3e" roughness={0.9} />
              </mesh>
              {/* Back wall */}
              <mesh position={[0, 2, -5]} receiveShadow>
                <planeGeometry args={[20, 5]} />
                <meshStandardMaterial color="#1a1a2e" roughness={1} />
              </mesh>
            </>
          )}
        </XR>
      </Canvas>

      {/* Top bar */}
      <div className="ar-top-bar">
        <button onClick={() => navigate(-1)} className="ar-top-back-btn">←</button>
        <div className="ar-top-status">
          <span className={`ar-status-dot ${isAR ? 'active' : 'placed'}`} />
          {isAR ? 'AR Live · Tap floor' : `${placed.length} item${placed.length !== 1 ? 's' : ''} placed`}
          {results.suggestions && !isAR && <span className="ar-status-ai">· AI active</span>}
        </div>
        <button onClick={addAllToCart} className="ar-cart-btn">
          🛒 {placed.length > 0 ? `Add ${placed.length}` : 'Cart'}
        </button>
      </div>

      {/* AI Detection badge */}
      {results.detections?.length > 0 && !isAR && (
        <div className="ar-ai-badge">
          🔍 {results.detections.length} existing items detected
        </div>
      )}

      {/* Bottom controls */}
      <div className="ar-bottom-controls">
        <div className="ar-bottom-btns">
          <button onClick={isAR ? stopAR : startAR} className={`ar-btn-view-toggle ${isAR ? 'stop' : 'start'}`}>
            {isAR ? <><span>⏹</span> Stop AR</> : <><span>📱</span> View in Your Room</>}
          </button>
          {placed.length > 0 && (
            <button onClick={() => setPlaced([])} className="ar-btn-clear">Clear</button>
          )}
          {roomPhoto && (
            <button onClick={() => { reset(); setPhase('capture'); }} className="ar-btn-rescan">Re-scan</button>
          )}
        </div>

        {/* Product strip */}
        <div className="ar-product-strip-label">
          Tap to select · {AR_PRODUCTS.length} products
        </div>
        <div className="ar-product-strip">
          {AR_PRODUCTS.map(p => (
            <button key={p.id} onClick={() => { setPending(p); showToast(`Selected: ${p.name}`); }}
              className={`ar-product-btn ${pending?.id === p.id ? 'active' : ''}`}>
              <img src={p.image} alt={p.name} className="ar-product-img" />
              {pending?.id === p.id && (
                <div className="ar-product-badge">ON</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="ar-toast">
          {toast}
        </div>
      )}
    </div>
  );
}
