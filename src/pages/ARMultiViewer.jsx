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

const xrStore = createXRStore();
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
  const scale = item.scale || 1;

  return (
    <group position={pos} rotation={[0, rotY, 0]} scale={[scale, scale, scale]}
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
          <div style={{ display: 'flex', gap: 6, background: 'rgba(10,10,20,0.9)', backdropFilter: 'blur(12px)', borderRadius: 32, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {[
              { icon: '✥', label: 'Move', action: () => onUpdate(item.instanceId, { isRepositioning: true }) },
              { icon: '↺', label: 'Rotate', action: () => onUpdate(item.instanceId, { rotationY: rotY + Math.PI / 4 }) },
              { icon: '＋', label: 'Scale Up', action: () => onUpdate(item.instanceId, { scale: scale * 1.1 }) },
              { icon: '－', label: 'Scale Dn', action: () => onUpdate(item.instanceId, { scale: scale * 0.9 }) },
              { icon: '⧉', label: 'Copy', action: () => onDuplicate(item.instanceId) },
              { icon: '🗑', label: 'Delete', action: () => onRemove(item.instanceId) }
            ].map(b => (
                <button key={b.label} onClick={e => { e.stopPropagation(); b.action(); }}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 6px', fontSize: 16 }}>
                  <span>{b.icon}</span><span style={{ fontSize: 8, fontWeight: 700, whiteSpace: 'nowrap' }}>{b.label}</span>
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
  const { isPresenting } = useXR();
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
        setPlaced(prev => prev.map(i => i.instanceId === repositioningId ? { ...i, position: [pos.x, pos.y, pos.z] } : i));
      }
    }
  });

  const handleTap = useCallback(() => {
    if (!isPresenting) return;
    
    // If we were repositioning an item, drop it here and finish repositioning
    if (repositioningId) {
      setPlaced(prev => prev.map(i => i.instanceId === repositioningId ? { ...i, isRepositioning: false } : i));
      return;
    }
    
    // Otherwise, normal placement of pending item
    if (!hitRef.current || !pending) {
      // If tapped empty space without reticle, just deselect
      setActiveId(null);
      return;
    }
    
    const { hit, refSpace } = hitRef.current;
    const pose = hit.getPose(refSpace);
    if (!pose) return;
    const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    
    setPlaced(prev => [...prev, { ...pending, instanceId: crypto.randomUUID(), position: [pos.x, pos.y, pos.z], rotationY: 0, scale: 1 }]);
  }, [isPresenting, pending, setPlaced, repositioningId, setActiveId]);

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
      {isPresenting && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} onClick={handleTap}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
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
    <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}40`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 180 }}>
      <span style={{ fontSize: 22 }}>{stage.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{stage.label}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{stage.detail}</div>
      </div>
      <span style={{ color, fontSize: 16, fontWeight: 900, display: 'inline-block', animation: spin ? 'spin 0.8s linear infinite' : 'none' }}>
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
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg,#0a0a1a,#0f172a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',system-ui,sans-serif", zIndex: 1100, padding: 24 }}>
        <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: 20, left: 20, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 20, cursor: 'pointer' }}>←</button>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏠</div>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: '0 0 12px', background: 'linear-gradient(135deg,#00e5ff,#0070f3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Room Designer</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.7, margin: '0 0 36px' }}>
            Upload a room photo. Our AI pipeline uses <b style={{ color: '#00e5ff' }}>Depth Anything V2</b>, <b style={{ color: '#a78bfa' }}>SegFormer</b>, and <b style={{ color: '#34d399' }}>DETR</b> to detect free space and suggest furniture.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => fileRef.current?.click()} style={{ padding: '16px 32px', borderRadius: 16, background: 'linear-gradient(135deg,#00e5ff,#0070f3)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,229,255,0.3)' }}>
              📷 Scan My Room with AI
            </button>
            <button onClick={handleDemoImage} style={{ padding: '14px 32px', borderRadius: 16, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              🧪 Use Demo Room (Test)
            </button>
            <button onClick={() => setPhase('preview')} style={{ padding: '14px 32px', borderRadius: 16, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Skip → Browse in 3D
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhoto(e.target.files[0])} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── CAPTURE phase ────────────────────────────────────────────
  if (phase === 'capture') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0a1a', display: 'flex', flexDirection: 'column', fontFamily: "'Inter',system-ui,sans-serif", zIndex: 1100 }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setPhase('home')} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 18, cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Room Photo</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Review before analysis</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {roomPhoto && <img src={roomPhoto} alt="Room" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} />}
        </div>
        <div style={{ padding: '16px 24px 36px', display: 'flex', gap: 12 }}>
          <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Change Photo
          </button>
          <button onClick={handleAnalyze} style={{ flex: 2, padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg,#00e5ff,#0070f3)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,229,255,0.3)' }}>
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
      <div style={{ position: 'fixed', inset: 0, background: '#0a0a1a', display: 'flex', flexDirection: 'column', fontFamily: "'Inter',system-ui,sans-serif", zIndex: 1100, padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 900, margin: 0 }}>AI Pipeline Running</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '8px 0 0' }}>
            {isRunning ? 'Analyzing your room…' : 'Complete! Redirecting…'}
          </p>
        </div>

        {/* Pipeline diagram */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480, margin: '0 auto', width: '100%' }}>
          {Object.values(stages).map((s, i) => (
            <React.Fragment key={i}>
              <StageCard stage={s} />
              {i < Object.values(stages).length - 1 && (
                <div style={{ width: 2, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 auto' }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {roomPhoto && (
          <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, borderRadius: 12, overflow: 'hidden', maxHeight: 120, opacity: 0.4 }}>
            <img src={roomPhoto} alt="" style={{ width: '100%', objectFit: 'cover', filter: 'blur(2px)' }} />
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── PREVIEW + AR phase ───────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: isAR ? 'transparent' : '#0a0a0f', display: 'flex', flexDirection: 'column', fontFamily: "'Inter',system-ui,sans-serif", zIndex: 1100 }}>

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
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'linear-gradient(to bottom,rgba(0,0,0,0.75),transparent)', pointerEvents: 'none', zIndex: 30 }}>
        <button onClick={() => navigate(-1)} style={{ pointerEvents: 'auto', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 24, padding: '7px 16px', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: isAR ? '#00e5ff' : '#4ade80', display: 'inline-block' }} />
          {isAR ? 'AR Live · Tap floor' : `${placed.length} item${placed.length !== 1 ? 's' : ''} placed`}
          {results.suggestions && !isAR && <span style={{ marginLeft: 4, color: '#a78bfa', fontSize: 10 }}>· AI active</span>}
        </div>
        <button onClick={addAllToCart} style={{ pointerEvents: 'auto', background: '#fff', border: 'none', borderRadius: 24, padding: '9px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#0a0a0f' }}>
          🛒 {placed.length > 0 ? `Add ${placed.length}` : 'Cart'}
        </button>
      </div>

      {/* AI Detection badge */}
      {results.detections?.length > 0 && !isAR && (
        <div style={{ position: 'absolute', top: 76, left: '50%', transform: 'translateX(-50%)', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)', borderRadius: 20, padding: '5px 14px', color: '#a78bfa', fontSize: 11, fontWeight: 700, zIndex: 30, pointerEvents: 'none' }}>
          🔍 {results.detections.length} existing items detected
        </div>
      )}

      {/* Bottom controls */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.92),transparent)', padding: '28px 20px 36px', zIndex: 30 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <button onClick={isAR ? stopAR : startAR} style={{ flex: 1, padding: '15px', borderRadius: 16, background: isAR ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#00e5ff,#0070f3)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,229,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {isAR ? <><span>⏹</span> Stop AR</> : <><span>📱</span> View in Your Room</>}
          </button>
          {placed.length > 0 && (
            <button onClick={() => setPlaced([])} style={{ padding: '15px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Clear</button>
          )}
          {roomPhoto && (
            <button onClick={() => { reset(); setPhase('capture'); }} style={{ padding: '15px 16px', borderRadius: 16, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Re-scan</button>
          )}
        </div>

        {/* Product strip */}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          Tap to select · {AR_PRODUCTS.length} products
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {AR_PRODUCTS.map(p => (
            <button key={p.id} onClick={() => { setPending(p); showToast(`Selected: ${p.name}`); }}
              style={{ flexShrink: 0, width: 72, height: 72, borderRadius: 14, padding: 0, overflow: 'hidden', border: pending?.id === p.id ? '2.5px solid #00e5ff' : '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', boxShadow: pending?.id === p.id ? '0 0 16px rgba(0,229,255,0.45)' : 'none', transition: 'all 0.2s', position: 'relative' }}>
              <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {pending?.id === p.id && (
                <div style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', background: '#00e5ff', borderRadius: 6, padding: '1px 5px', fontSize: 7, fontWeight: 800, color: '#000', whiteSpace: 'nowrap' }}>ON</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'absolute', bottom: 230, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', padding: '10px 22px', borderRadius: 28, color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.12)', zIndex: 50, pointerEvents: 'none', animation: 'fadeUp 0.25s ease' }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
