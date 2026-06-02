import React, { Suspense, useCallback, Component, useRef } from 'react';
import { XR, createXRStore, IfInSessionMode, XROrigin } from '@react-three/xr';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF, ContactShadows } from '@react-three/drei';
import XRHitTestCursor from './XRHitTestCursor';
import XRPlacedProduct from './XRPlacedProduct';
import { useARSceneStore } from '../../store/useARSceneStore';
import products from '../../data/products.json';
import { useNavigate } from 'react-router-dom';

const AR_PRODUCTS = products.filter((p) => p.glbModel);

const store = createXRStore({
  sessionInit: {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay', 'light-estimation'],
  },
  hand: false,
  controller: false,
});

// ── Error Boundary ─────────────────────────────────────────────
class CanvasErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(e, i) { console.error('[WebXREditor] Canvas crash:', e, i); }
  render() {
    if (this.state.hasError) return (
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a1a', zIndex:5 }}>
        <div style={{ background:'rgba(255,80,80,0.1)', border:'1px solid rgba(255,80,80,0.4)', borderRadius:20, padding:'28px 36px', textAlign:'center', maxWidth:360, color:'white' }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>⚠️</div>
          <h3 style={{ color:'#ff7675', margin:'0 0 8px' }}>3D Engine Error</h3>
          <p style={{ opacity:0.6, fontSize:'0.85rem', margin:'0 0 16px' }}>WebGL failed to initialize on this device.</p>
          <code style={{ color:'#fab1a0', fontSize:'0.72rem', wordBreak:'break-all', display:'block', marginBottom:16 }}>
            {this.state.error?.message || 'Unknown error'}
          </code>
          <button onClick={() => this.setState({ hasError:false, error:null })}
            style={{ padding:'10px 24px', borderRadius:30, border:'none', background:'linear-gradient(135deg,#e17055,#d63031)', color:'white', cursor:'pointer', fontWeight:600 }}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// ── Floating preview model (spins slowly) ─────────────────────
function PreviewModel({ glbPath }) {
  const { scene } = useGLTF(glbPath);
  const ref = useRef();
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.4; });
  return (
    <group ref={ref} position={[0, -0.5, 0]} scale={0.9}>
      <primitive object={scene} />
    </group>
  );
}

// ── 3D Scene (inside Canvas) ───────────────────────────────────
function ARScene({ previewProduct }) {
  const placedItems = useARSceneStore((s) => s.placedItems);
  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <XROrigin />

      {/* AR session content */}
      <IfInSessionMode allow="immersive-ar">
        <Suspense fallback={null}><XRHitTestCursor /></Suspense>
        {placedItems.map((item) => (
          <Suspense key={item.id} fallback={null}><XRPlacedProduct item={item} /></Suspense>
        ))}
      </IfInSessionMode>

      {/* Pre-AR: show spinning product preview + orbit controls */}
      <IfInSessionMode deny="immersive-ar">
        <Environment preset="apartment" />
        <ContactShadows position={[0, -0.8, 0]} opacity={0.4} scale={4} blur={2} />
        <OrbitControls enablePan={false} enableZoom={false} autoRotate={false} makeDefault />
        {previewProduct?.glbModel && (
          <Suspense fallback={null}>
            <PreviewModel glbPath={previewProduct.glbModel} />
          </Suspense>
        )}
      </IfInSessionMode>
    </>
  );
}

// ── Enter AR button (DOM, outside Canvas) ─────────────────────
function EnterARButtonDOM({ onEnter }) {
  const [supported, setSupported] = React.useState(undefined);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [inSession, setInSession] = React.useState(false);

  React.useEffect(() => {
    if (!('xr' in navigator)) {
      setSupported(false);
      setErrorMsg('navigator.xr unavailable — use Chrome on Android over HTTPS');
      return;
    }
    navigator.xr.isSessionSupported('immersive-ar')
      .then((ok) => { setSupported(ok); if (!ok) setErrorMsg('Device: immersive-ar not supported'); })
      .catch((err) => { setSupported(false); setErrorMsg(err.message || 'Unknown error'); });
  }, []);

  React.useEffect(() => {
    const unsub = store.subscribe((s) => setInSession(s.session != null));
    return unsub;
  }, []);

  if (inSession) return null;

  if (supported === false) return (
    <div style={{ background:'rgba(10,10,20,0.95)', borderRadius:20, padding:'20px 28px', textAlign:'center', border:'1px solid rgba(255,100,100,0.3)', backdropFilter:'blur(16px)', maxWidth:'85vw' }}>
      <div style={{ fontSize:'2rem', marginBottom:8 }}>📱</div>
      <p style={{ color:'#ff7675', margin:'0 0 6px', fontWeight:700 }}>AR Requires Android + Chrome</p>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.8rem', margin:'0 0 10px' }}>
        Open this URL in <strong style={{ color:'#00cec9' }}>Chrome on your Android phone</strong> over HTTPS.
      </p>
      <p style={{ color:'#f3a683', fontSize:'0.7rem', margin:0, fontFamily:'monospace', wordBreak:'break-all' }}>
        {errorMsg}
      </p>
    </div>
  );

  return (
    <button id="btn-enter-ar" onClick={onEnter} disabled={supported === undefined}
      style={{
        padding:'18px 44px', fontSize:'1.1rem', fontWeight:700,
        background: supported ? 'linear-gradient(135deg,#00b894,#00cec9)' : 'rgba(60,60,80,0.7)',
        color:'white', border:'none', borderRadius:40,
        cursor: supported ? 'pointer' : 'wait',
        boxShadow: supported ? '0 12px 40px rgba(0,184,148,0.5)' : 'none',
        transition:'all 0.3s ease', opacity: supported === undefined ? 0.7 : 1,
      }}>
      {supported === undefined ? '⏳ Checking AR…' : '📷 Launch AR Room Builder'}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function WebXREditor() {
  const navigate = useNavigate();
  const activeProduct   = useARSceneStore((s) => s.activeProduct);
  const setActiveProduct= useARSceneStore((s) => s.setActiveProduct);
  const activeItemId    = useARSceneStore((s) => s.activeItemId);
  const deleteItem      = useARSceneStore((s) => s.deleteItem);
  const duplicateItem   = useARSceneStore((s) => s.duplicateItem);
  const undo            = useARSceneStore((s) => s.undo);
  const saveScene       = useARSceneStore((s) => s.saveScene);
  const loadScene       = useARSceneStore((s) => s.loadScene);
  const placedItems     = useARSceneStore((s) => s.placedItems);
  const isStabilized    = useARSceneStore((s) => s.isStabilized);

  const [inSession, setInSession]   = React.useState(false);
  const [canvasReady, setCanvasReady] = React.useState(false);

  React.useEffect(() => store.subscribe((s) => setInSession(s.session != null)), []);
  React.useEffect(() => {
    if (!activeProduct && AR_PRODUCTS.length > 0) setActiveProduct(AR_PRODUCTS[0]);
  }, []); // eslint-disable-line

  const handleEnterAR = useCallback(async () => {
    try {
      const overlay = document.getElementById('ar-ui-overlay');
      // In @react-three/xr v6, pass session init options directly to enterAR()
      // Do NOT mutate store.sessionInit — it is undefined and will crash
      const sessionInit = {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'light-estimation'],
        ...(overlay ? { domOverlay: { root: overlay } } : {}),
      };
      await store.enterAR(sessionInit);
    } catch (err) {
      console.error('enterAR failed:', err);
      alert(`AR failed: ${err.message || err}`);
    }
  }, []);

  return (
    <div style={{ width:'100vw', height:'100dvh', background:'linear-gradient(160deg,#0a0a1a 0%,#0d0d2b 50%,#0a1020 100%)', position:'relative', overflow:'hidden' }}>

      {/* Ambient glow orbs */}
      <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle,rgba(108,92,231,0.14) 0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'absolute', bottom:'-15%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle,rgba(0,206,201,0.1) 0%,transparent 70%)', pointerEvents:'none', zIndex:0 }} />

      {/* 3D Canvas */}
      <CanvasErrorBoundary>
        <Canvas
          style={{ position:'absolute', inset:0, zIndex:1 }}
          gl={{ antialias:true, alpha:false }}
          camera={{ position:[0, 1.2, 2.5], fov:60 }}
          onCreated={() => setCanvasReady(true)}
        >
          <XR store={store}>
            <ARScene previewProduct={activeProduct} />
          </XR>
        </Canvas>
      </CanvasErrorBoundary>

      {/* Loading overlay */}
      {!canvasReady && (
        <div style={{ position:'absolute', inset:0, zIndex:2, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(160deg,#0a0a1a,#0d0d2b)' }}>
          <div style={{ textAlign:'center', color:'white' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', border:'3px solid rgba(0,206,201,0.2)', borderTopColor:'#00cec9', animation:'spin 1s linear infinite', margin:'0 auto 14px' }} />
            <p style={{ opacity:0.6, fontSize:'0.9rem', margin:0 }}>Loading 3D engine…</p>
          </div>
        </div>
      )}

      {/* DOM UI overlay */}
      <div id="ar-ui-overlay" style={{ position:'absolute', inset:0, pointerEvents:'none', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'max(env(safe-area-inset-top,16px),16px) 16px max(env(safe-area-inset-bottom,24px),24px)', zIndex:10 }}>

        {/* Tap hitbox in AR session */}
        {inSession && (
          <div style={{ position:'absolute', inset:0, pointerEvents:'auto', zIndex:-1 }}
            onClick={() => window.dispatchEvent(new Event('ar-tap'))} />
        )}

        {/* Top bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', pointerEvents:'auto' }}>
          <button id="btn-back" onClick={() => navigate(-1)}
            style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.08)', color:'white', border:'1px solid rgba(255,255,255,0.18)', backdropFilter:'blur(10px)', fontSize:'1.2rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            ←
          </button>

          {!inSession && (
            <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', textAlign:'center' }}>
              <div style={{ color:'white', fontWeight:700, fontSize:'1rem', letterSpacing:'0.5px' }}>🛋️ Room Builder</div>
              <div style={{ color:'rgba(0,206,201,0.85)', fontSize:'0.7rem', marginTop:2 }}>AR Furniture Placement</div>
            </div>
          )}

          <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
            <button id="btn-undo"  onClick={undo}      style={tbtn('rgba(255,255,255,0.08)')}>↩ Undo</button>
            <button id="btn-save"  onClick={saveScene}  style={tbtn('rgba(108,92,231,0.75)')}>💾 Save</button>
            <button id="btn-load"  onClick={loadScene}  style={tbtn('rgba(0,184,148,0.75)')}>📂 Load</button>
          </div>
        </div>

        {/* Centre — Enter AR / status */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, pointerEvents:'auto' }}>
          <EnterARButtonDOM onEnter={handleEnterAR} />
          {canvasReady && !inSession && (
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.72rem', margin:0, textAlign:'center' }}>
              Drag to rotate preview · Select a product below
            </p>
          )}
        </div>

        {/* Scan prompt */}
        {inSession && !isStabilized && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'rgba(0,0,0,0.75)', color:'white', padding:'18px 36px', borderRadius:30, backdropFilter:'blur(12px)', textAlign:'center', pointerEvents:'none', border:'1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:8, animation:'spin 2s linear infinite' }}>🔄</div>
            <div style={{ fontWeight:600 }}>Move phone around</div>
            <div style={{ fontSize:'0.82rem', opacity:0.7, marginTop:4 }}>Scan the floor to place items</div>
          </div>
        )}

        {/* Item tools */}
        {activeItemId && (
          <div style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:10, pointerEvents:'auto' }}>
            <button id="btn-duplicate" onClick={() => duplicateItem(activeItemId)} style={ibtn('rgba(0,0,0,0.6)')}>📑</button>
            <button id="btn-delete"    onClick={() => deleteItem(activeItemId)}    style={ibtn('rgba(255,80,80,0.75)')}>🗑️</button>
          </div>
        )}

        {/* Bottom product carousel */}
        <div style={{ pointerEvents:'auto', background:'rgba(10,10,25,0.9)', padding:'14px 16px', borderRadius:20, backdropFilter:'blur(18px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 -4px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <h4 style={{ color:'rgba(255,255,255,0.8)', margin:0, fontSize:'0.82rem', fontWeight:600 }}>Select Furniture</h4>
            <span style={{ color:'#00cec9', fontSize:'0.75rem', background:'rgba(0,206,201,0.12)', padding:'2px 10px', borderRadius:20 }}>
              {placedItems.length} placed
            </span>
          </div>
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
            {AR_PRODUCTS.map((p) => (
              <button key={p.id} id={`product-${p.id}`} onClick={() => setActiveProduct(p)} title={p.name}
                style={{ flexShrink:0, width:64, height:64, borderRadius:14, padding:0, overflow:'hidden', cursor:'pointer',
                  border: activeProduct?.id === p.id ? '2.5px solid #00cec9' : '2.5px solid rgba(255,255,255,0.1)',
                  background:'rgba(255,255,255,0.06)',
                  boxShadow: activeProduct?.id === p.id ? '0 0 16px rgba(0,206,201,0.55)' : 'none',
                  transform: activeProduct?.id === p.id ? 'scale(1.1)' : 'scale(1)',
                  transition:'all 0.2s ease',
                }}>
                <img src={p.image} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const tbtn = (bg) => ({ padding:'8px 14px', borderRadius:20, background:bg, color:'white', border:'1px solid rgba(255,255,255,0.15)', backdropFilter:'blur(10px)', cursor:'pointer', fontSize:'0.8rem', fontWeight:600 });
const ibtn = (bg) => ({ width:50, height:50, borderRadius:'50%', background:bg, color:'white', border:'1px solid rgba(255,255,255,0.2)', backdropFilter:'blur(10px)', fontSize:'1.2rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' });
