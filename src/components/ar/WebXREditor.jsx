import React, { Suspense, useCallback, Component, useRef } from 'react';
import { XR, createXRStore, IfInSessionMode, XROrigin } from '@react-three/xr';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF, ContactShadows } from '@react-three/drei';
import XRHitTestCursor from './XRHitTestCursor';
import XRPlacedProduct from './XRPlacedProduct';
import { useARSceneStore } from '../../store/useARSceneStore';
import { useProjectStore } from '../../store/useProjectStore';
import products from '../../data/products.json';
import { useNavigate } from 'react-router-dom';
import './WebXREditor.scss';

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
      <div className="error-boundary">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">3D Engine Error</h3>
          <p className="error-desc">WebGL failed to initialize on this device.</p>
          <code className="error-code">
            {this.state.error?.message || 'Unknown error'}
          </code>
          <button className="btn-retry" onClick={() => this.setState({ hasError:false, error:null })}>
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
      <directionalLight 
        position={[2, 5, 2]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize-width={1024} 
        shadow-mapSize-height={1024} 
        shadow-bias={-0.0001}
      />
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
    <div className="ar-not-supported">
      <div className="ar-not-supported-icon">📱</div>
      <p className="ar-not-supported-title">AR Requires Android + Chrome</p>
      <p className="ar-not-supported-desc">
        Open this URL in <strong className="ar-not-supported-strong">Chrome on your Android phone</strong> over HTTPS.
      </p>
      <p className="ar-not-supported-error">
        {errorMsg}
      </p>
    </div>
  );

  return (
    <button 
      id="btn-enter-ar" 
      onClick={onEnter} 
      disabled={supported === undefined}
      className={`btn-enter-ar ${supported === undefined ? 'checking' : supported ? 'supported' : ''}`}
    >
      {supported === undefined ? '⏳ Checking AR…' : '📷 Launch AR Room Builder'}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function WebXREditor() {
  const navigate = useNavigate();
  const activeProduct    = useARSceneStore((s) => s.activeProduct);
  const setActiveProduct = useARSceneStore((s) => s.setActiveProduct);
  const activeItemId     = useARSceneStore((s) => s.activeItemId);
  const deleteItem       = useARSceneStore((s) => s.deleteItem);
  const clearScene       = useARSceneStore((s) => s.clearScene);
  const duplicateItem    = useARSceneStore((s) => s.duplicateItem);
  const undo             = useARSceneStore((s) => s.undo);
  const saveScene        = useARSceneStore((s) => s.saveScene);
  const loadScene        = useARSceneStore((s) => s.loadScene);
  const placedItems      = useARSceneStore((s) => s.placedItems);
  const isStabilized     = useARSceneStore((s) => s.isStabilized);
  const interactionMode  = useARSceneStore((s) => s.interactionMode);
  const setPlacementMode = useARSceneStore((s) => s.setPlacementMode);

  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const currentProject = useProjectStore((s) => s.projects.find(p => p.id === currentProjectId));

  const [inSession, setInSession]   = React.useState(false);
  const [canvasReady, setCanvasReady] = React.useState(false);

  React.useEffect(() => store.subscribe((s) => setInSession(s.session != null)), []);
  
  React.useEffect(() => {
    if (!activeProduct && AR_PRODUCTS.length > 0) setActiveProduct(AR_PRODUCTS[0]);
    // Auto-load the active project on mount
    loadScene();
  }, []); // eslint-disable-line

  const handleEnterAR = useCallback(async () => {
    try {
      const overlay = document.getElementById('ar-ui-overlay');
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
    <div className="webxr-editor-container">
      {/* Ambient glow orbs */}
      <div className="glow-orb-1" />
      <div className="glow-orb-2" />

      {/* 3D Canvas */}
      <CanvasErrorBoundary>
        <Canvas
          className="canvas-container"
          shadows
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
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner" />
            <p className="loading-text">Loading 3D engine…</p>
          </div>
        </div>
      )}

      {/* DOM UI overlay */}
      <div id="ar-ui-overlay" className="ui-overlay">
        {/* Tap hitbox in AR session */}
        {inSession && (
          <div className="tap-hitbox" onClick={() => window.dispatchEvent(new Event('ar-tap'))} />
        )}

        {/* Top bar */}
        <div className="top-bar">
          <button id="btn-back" className="btn-back" onClick={() => navigate(-1)}>
            ←
          </button>

          {!inSession && (
            <div className="title-container">
              <div className="title-main">{currentProject ? currentProject.name : '🛋️ Room Builder'}</div>
              <div className="title-sub">AR Furniture Placement</div>
            </div>
          )}

          <div className="toolbar">
            <button id="btn-undo" className="btn-tool undo" onClick={undo}>↩ Undo</button>
            <button className="btn-tool clear" onClick={() => {
              if (window.confirm("Are you sure you want to clear all objects?")) clearScene();
            }}>🧹 Clear</button>
            <button id="btn-save" className="btn-tool save" onClick={saveScene}>💾 Save</button>
            <button id="btn-load" className="btn-tool load" onClick={loadScene}>📂 Load</button>
          </div>
        </div>

        {/* Centre — Enter AR / status */}
        <div className="center-container">
          <EnterARButtonDOM onEnter={handleEnterAR} />
          {canvasReady && !inSession && (
            <p className="hint-text">
              Drag to rotate preview · Select a product below
            </p>
          )}
        </div>

        {/* Scan prompt */}
        {inSession && !isStabilized && (
          <div className="scan-prompt">
            <div className="scan-icon">🔄</div>
            <div className="scan-title">Move phone around</div>
            <div className="scan-desc">Scan the floor to place items</div>
          </div>
        )}

        {/* Mode indicator badge — shows in AR session */}
        {inSession && isStabilized && (
          <div className="mode-indicator">
            {interactionMode === 'place' ? '📍 Tap to Place' : '✋ Tap to Move'}
          </div>
        )}

        {/* Item tools */}
        {activeItemId && (
          <div className="item-tools">
            <button className="btn-icon add-new" onClick={setPlacementMode}>➕</button>
            <button id="btn-duplicate" className="btn-icon duplicate" onClick={() => duplicateItem(activeItemId)}>📑</button>
            <button id="btn-delete" className="btn-icon delete" onClick={() => deleteItem(activeItemId)}>🗑️</button>
            <button className="btn-icon rotate" onClick={() => {
              const item = placedItems.find(i => i.id === activeItemId);
              if (item) useARSceneStore.getState().updateTransform(activeItemId, { rotation: [item.rotation[0], item.rotation[1] - Math.PI / 8, item.rotation[2]] });
            }}>↺</button>
            <button className="btn-icon rotate" onClick={() => {
              const item = placedItems.find(i => i.id === activeItemId);
              if (item) useARSceneStore.getState().updateTransform(activeItemId, { rotation: [item.rotation[0], item.rotation[1] + Math.PI / 8, item.rotation[2]] });
            }}>↻</button>
            <button className="btn-icon scale" onClick={() => {
              const item = placedItems.find(i => i.id === activeItemId);
              if (item) useARSceneStore.getState().updateTransform(activeItemId, { scale: item.scale.map(s => s * 1.15) });
            }}>🔼</button>
            <button className="btn-icon scale" onClick={() => {
              const item = placedItems.find(i => i.id === activeItemId);
              if (item) useARSceneStore.getState().updateTransform(activeItemId, { scale: item.scale.map(s => s * 0.85) });
            }}>🔽</button>
          </div>
        )}

        {/* Bottom product carousel */}
        <div className="product-carousel-container">
          <div className="product-carousel-header">
            <h4 className="product-carousel-title">Select Furniture</h4>
            <span className="product-carousel-badge">
              {placedItems.length} placed
            </span>
          </div>
          <div className="product-carousel">
            {AR_PRODUCTS.map((p) => (
              <button 
                key={p.id} 
                id={`product-${p.id}`} 
                onClick={() => setActiveProduct(p)} 
                title={p.name}
                className={`product-item ${activeProduct?.id === p.id ? 'active' : ''}`}
              >
                <img src={p.image} alt={p.name} className="product-image" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
