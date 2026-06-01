import React, { Suspense, useRef, useCallback } from 'react';
import { XR, createXRStore, IfInSessionMode, useXRSessionModeSupported, XROrigin } from '@react-three/xr';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import XRHitTestCursor from './XRHitTestCursor';
import XRPlacedProduct from './XRPlacedProduct';
import { useARSceneStore } from '../../store/useARSceneStore';
import products from '../../data/products.json';
import { useNavigate } from 'react-router-dom';

const AR_PRODUCTS = products.filter((p) => p.glbModel);

// Create store once outside component — singleton per page load
const store = createXRStore({
  sessionInit: {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay', 'light-estimation'],
  },
  // Disable hand/controller rendering — AR mobile only
  hand: false,
  controller: false,
});

// ─────────────────────────────────────────────────────────────
// Inner component — has access to XR context (inside <XR>)
// ─────────────────────────────────────────────────────────────
function ARScene() {
  const placedItems = useARSceneStore((s) => s.placedItems);

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

      {/* XROrigin anchors the scene to the user's floor position */}
      <XROrigin />

      {/* Only render 3D AR content when inside an AR session */}
      <IfInSessionMode allow="immersive-ar">
        <Suspense fallback={null}>
          <XRHitTestCursor />
        </Suspense>
        {placedItems.map((item) => (
          <Suspense key={item.id} fallback={null}>
            <XRPlacedProduct item={item} />
          </Suspense>
        ))}
      </IfInSessionMode>

      {/* Preview scene when NOT in AR */}
      <IfInSessionMode deny="immersive-ar">
        <Environment preset="city" />
      </IfInSessionMode>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Support-check button — uses the v6 hook, lives inside <XR>
// ─────────────────────────────────────────────────────────────
function EnterARButton({ onClick }) {
  // useXRSessionModeSupported returns: true | false | undefined (checking)
  const isSupported = useXRSessionModeSupported('immersive-ar');

  if (isSupported === false) {
    return (
      <button
        disabled
        style={{
          padding: '14px 28px', fontSize: '1rem', fontWeight: 'bold',
          background: 'rgba(100,100,100,0.6)', color: '#aaa',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px',
          cursor: 'not-allowed',
        }}
      >
        AR Not Supported on This Device
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      style={{
        padding: '16px 36px', fontSize: '1.1rem', fontWeight: 'bold',
        background: isSupported
          ? 'linear-gradient(135deg, #00b894, #00cec9)'
          : 'rgba(60,60,60,0.7)',
        color: 'white',
        border: 'none', borderRadius: '30px', cursor: isSupported ? 'pointer' : 'wait',
        boxShadow: isSupported ? '0 10px 30px rgba(0,184,148,0.4)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      {isSupported === undefined ? '⏳ Checking AR support…' : '📷 Start AR Room Builder'}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page — UI overlay is pure DOM (outside Canvas)
// ─────────────────────────────────────────────────────────────
export default function WebXREditor() {
  const navigate = useNavigate();
  const activeProduct = useARSceneStore((s) => s.activeProduct);
  const setActiveProduct = useARSceneStore((s) => s.setActiveProduct);
  const activeItemId = useARSceneStore((s) => s.activeItemId);
  const deleteItem = useARSceneStore((s) => s.deleteItem);
  const duplicateItem = useARSceneStore((s) => s.duplicateItem);
  const undo = useARSceneStore((s) => s.undo);
  const saveScene = useARSceneStore((s) => s.saveScene);
  const loadScene = useARSceneStore((s) => s.loadScene);
  const placedItems = useARSceneStore((s) => s.placedItems);

  // Initialize first product if none selected
  React.useEffect(() => {
    if (!activeProduct && AR_PRODUCTS.length > 0) {
      setActiveProduct(AR_PRODUCTS[0]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnterAR = useCallback(async () => {
    try {
      const overlay = document.getElementById('ar-ui-overlay');
      if (overlay) {
        store.sessionInit.domOverlay = { root: overlay };
      }
      await store.enterAR();
    } catch (err) {
      console.error('Failed to enter AR session:', err);
      alert('Could not start AR. Make sure you are on Android Chrome with ARCore installed.');
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>

      {/* ── R3F Canvas ───────────────────────────────────── */}
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 1.6, 3], fov: 70 }}
      >
        <XR store={store}>
          <ARScene />
        </XR>
      </Canvas>

      {/* ── DOM UI Overlay (outside Canvas — reliable on Android) ── */}
      <div
        id="ar-ui-overlay"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: 'max(env(safe-area-inset-top, 16px), 16px) 16px max(env(safe-area-inset-bottom, 24px), 24px)',
          zIndex: 10,
        }}
      >
        {/* TOP BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'auto' }}>
          <button
            id="btn-back"
            onClick={() => navigate(-1)}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)', color: 'white',
              border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
              fontSize: '1.1rem', cursor: 'pointer', flexShrink: 0,
            }}
          >←</button>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button id="btn-undo" onClick={undo}
              style={toolBtnStyle('#333')}>↩ Undo</button>
            <button id="btn-save" onClick={saveScene}
              style={toolBtnStyle('rgba(108,92,231,0.85)')}>💾 Save</button>
            <button id="btn-load" onClick={loadScene}
              style={toolBtnStyle('rgba(0,184,148,0.85)')}>📂 Load</button>
          </div>
        </div>

        {/* MIDDLE — Enter AR button (shown when not in session) */}
        <div style={{ display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
          {/* EnterARButton is a plain DOM component — useXRSessionModeSupported 
              works outside Canvas via the store */}
          <_EnterARButtonDOM onEnter={handleEnterAR} />
        </div>

        {/* MIDDLE RIGHT — item tools */}
        {activeItemId && (
          <div style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'auto',
          }}>
            <button id="btn-duplicate" onClick={() => duplicateItem(activeItemId)}
              style={iconBtnStyle('rgba(0,0,0,0.6)')}>📑</button>
            <button id="btn-delete" onClick={() => deleteItem(activeItemId)}
              style={iconBtnStyle('rgba(255,100,100,0.8)')}>🗑️</button>
          </div>
        )}

        {/* BOTTOM — Product carousel */}
        <div style={{
          pointerEvents: 'auto',
          background: 'rgba(10,10,15,0.82)', padding: '14px 16px',
          borderRadius: '20px', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <h4 style={{ color: 'white', margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>
              Select Product to Place:
            </h4>
            <span style={{ color: '#00cec9', fontSize: '0.8rem' }}>
              {placedItems.length} placed
            </span>
          </div>
          <div style={{
            display: 'flex', gap: '10px', overflowX: 'auto',
            paddingBottom: '4px', scrollbarWidth: 'none',
          }}>
            {AR_PRODUCTS.map((p) => (
              <button
                key={p.id}
                id={`product-${p.id}`}
                onClick={() => setActiveProduct(p)}
                style={{
                  flexShrink: 0, width: 64, height: 64, borderRadius: '12px',
                  padding: 0, overflow: 'hidden', cursor: 'pointer',
                  border: activeProduct?.id === p.id
                    ? '2.5px solid #00cec9'
                    : '2.5px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  boxShadow: activeProduct?.id === p.id ? '0 0 12px rgba(0,206,201,0.5)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <img src={p.image} alt={p.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Plain DOM version of the Enter AR button ──────────────────
// Lives outside Canvas so it doesn't need XR context
function _EnterARButtonDOM({ onEnter }) {
  const [supported, setSupported] = React.useState(undefined); // undefined = checking

  React.useEffect(() => {
    if (!('xr' in navigator)) { setSupported(false); return; }
    navigator.xr.isSessionSupported('immersive-ar')
      .then(setSupported)
      .catch(() => setSupported(false));
  }, []);

  // Hide the button once user is in a session (session running = canvas is the AR view)
  const [inSession, setInSession] = React.useState(false);
  React.useEffect(() => {
    const unsub = store.subscribe((state) => {
      setInSession(state.session != null);
    });
    return unsub;
  }, []);

  if (inSession) return null;

  if (supported === false) {
    return (
      <div style={{
        background: 'rgba(10,10,15,0.9)', borderRadius: '16px', padding: '20px 28px',
        textAlign: 'center', border: '1px solid rgba(255,80,80,0.3)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
        <p style={{ color: '#ff7675', margin: '0 0 4px', fontWeight: 600 }}>AR Not Supported</p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>
          Requires Android Chrome + ARCore
        </p>
      </div>
    );
  }

  return (
    <button
      id="btn-enter-ar"
      onClick={onEnter}
      disabled={supported === undefined}
      style={{
        padding: '18px 40px', fontSize: '1.1rem', fontWeight: 700,
        background: supported
          ? 'linear-gradient(135deg, #00b894, #00cec9)'
          : 'rgba(60,60,60,0.7)',
        color: 'white', border: 'none', borderRadius: '40px',
        cursor: supported ? 'pointer' : 'wait',
        boxShadow: supported ? '0 12px 35px rgba(0,184,148,0.45)' : 'none',
        transition: 'all 0.3s ease',
        letterSpacing: '0.5px',
      }}
    >
      {supported === undefined ? '⏳ Checking AR…' : '📷 Start AR Room Builder'}
    </button>
  );
}

// ── Style helpers ─────────────────────────────────────────────
const toolBtnStyle = (bg) => ({
  padding: '8px 16px', borderRadius: '20px',
  background: bg, color: 'white',
  border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
});

const iconBtnStyle = (bg) => ({
  width: 50, height: 50, borderRadius: '50%',
  background: bg, color: 'white',
  border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
  fontSize: '1.2rem', cursor: 'pointer',
});
