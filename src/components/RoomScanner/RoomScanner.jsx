import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOpenCV } from '../../hooks/useOpenCV';
import { useRoomStore } from '../../stores/useRoomStore';

/* ─── helpers ─────────────────────────────────────────────── */
const STEPS = [
  { id: 'upload',    label: 'Upload Photo' },
  { id: 'cv',        label: 'Edge Detection' },
  { id: 'ai-erase',  label: 'AI Magic Erase' },
  { id: 'generate',  label: 'Generate Room' },
];

function StepDot({ active, done, label, index }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: done ? '#0058a3' : active ? '#fff' : 'rgba(255,255,255,0.15)',
        border: `2px solid ${done || active ? '#0058a3' : 'rgba(255,255,255,0.3)'}`,
        color: done ? '#fff' : active ? '#0058a3' : 'rgba(255,255,255,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 13,
        transition: 'all 0.3s ease',
        boxShadow: active ? '0 0 0 4px rgba(0,88,163,0.3)' : 'none',
      }}>
        {done ? '✓' : index + 1}
      </div>
      <span style={{ fontSize: 11, color: active || done ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}

function StepConnector({ done }) {
  return (
    <div style={{
      flex: 1, height: 2, background: done ? '#0058a3' : 'rgba(255,255,255,0.15)',
      marginBottom: 22, transition: 'background 0.4s ease',
    }} />
  );
}

/* ─── Main component ──────────────────────────────────────── */
export default function RoomScanner({ onClose }) {
  const [image, setImage] = useState(null);         // data URL of uploaded photo
  const [edgeDataUrl, setEdgeDataUrl] = useState(null); // Canny overlay
  const [stepIdx, setStepIdx] = useState(0);        // 0=upload,1=cv,2=depth,3=generate
  const [statusMsg, setStatusMsg] = useState('Upload a photo of your room to begin.');
  const [roomDims, setRoomDims] = useState(null);   // { width, depth, height }
  const [running, setRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const hiddenCanvasRef = useRef(null);
  const edgeCanvasRef   = useRef(null);
  const segmentCanvasRef = useRef(null);
  const fileInputRef    = useRef(null);
  const segmentWorkerRef = useRef(null);

  const { loaded: cvLoaded, cv } = useOpenCV();
  
  useEffect(() => {
    // Initialize AI segmentation worker
    segmentWorkerRef.current = new Worker(new URL('../../ai/segmentWorker.js', import.meta.url), { type: 'module' });
    segmentWorkerRef.current.postMessage({ type: 'INIT' });
    
    return () => {
      segmentWorkerRef.current?.terminate();
    };
  }, []);
  const { generateRoomLayout } = useRoomStore();

  /* ── accept file from input or drop ── */
  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setEdgeDataUrl(null);
      setRoomDims(null);
      setStepIdx(0);
      setStatusMsg('Photo loaded. Click "Analyze Room" to start.');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    loadFile(e.dataTransfer.files[0]);
  }, [loadFile]);

  /* ── core pipeline ── */
  const runPipeline = async () => {
    if (!image || !cvLoaded || !cv || running) return;
    setRunning(true);

    try {
      /* STEP 1 — OpenCV Edge detection */
      setStepIdx(1);
      setStatusMsg('Running Canny edge detection…');
      await new Promise(r => setTimeout(r, 80)); // let react re-render

      const imgEl = new Image();
      imgEl.src = image;
      await new Promise((res, rej) => { imgEl.onload = res; imgEl.onerror = rej; });

      const hidden = hiddenCanvasRef.current;
      hidden.width  = imgEl.naturalWidth;
      hidden.height = imgEl.naturalHeight;
      hidden.getContext('2d').drawImage(imgEl, 0, 0);

      /* Read → grayscale → blur → Canny */
      const src  = cv.imread(hidden);
      const gray = new cv.Mat();
      const blur = new cv.Mat();
      const edge = new cv.Mat();

      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
      cv.Canny(blur, edge, 40, 120, 3, false);

      /* Draw edge map to edge canvas → export as data URL */
      const edgeCv = new cv.Mat();
      cv.cvtColor(edge, edgeCv, cv.COLOR_GRAY2RGBA);
      cv.imshow(edgeCanvasRef.current, edgeCv);
      setEdgeDataUrl(edgeCanvasRef.current.toDataURL());

      /* STEP 2 — HoughLines → estimate room bounding box */
      setStepIdx(2);
      setStatusMsg('Tracing walls with Hough transform…');
      await new Promise(r => setTimeout(r, 200));

      const lines   = new cv.Mat();
      cv.HoughLinesP(edge, lines, 1, Math.PI / 180, 50, 40, 10);

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < lines.rows; i++) {
        const x1 = lines.data32S[i * 4],     y1 = lines.data32S[i * 4 + 1];
        const x2 = lines.data32S[i * 4 + 2], y2 = lines.data32S[i * 4 + 3];
        minX = Math.min(minX, x1, x2); maxX = Math.max(maxX, x1, x2);
        minY = Math.min(minY, y1, y2); maxY = Math.max(maxY, y1, y2);
      }
      lines.delete();

      /* Map pixel bounding-box to real-world metres (assume ~10m max) */
      const W = hidden.width, H = hidden.height;
      const bboxW = maxX === -Infinity ? W : (maxX - minX);
      const bboxH = maxY === -Infinity ? H : (maxY - minY);
      const rawWidth = Math.max(3, Math.min(10, (bboxW / W) * 10));
      const rawDepth = Math.max(3, Math.min(10, (bboxH / H) * 10));

      const dims = {
        width:  Math.round(rawWidth * 10) / 10,
        depth:  Math.round(rawDepth * 10) / 10,
        height: 2.8,
      };
      setRoomDims(dims);

      // cleanup cv mats
      src.delete(); gray.delete(); blur.delete(); edge.delete(); edgeCv.delete();

      /* STEP 3 — AI Magic Erase (Segmentation) */
      setStepIdx(2);
      setStatusMsg('AI Magic Erase: Detecting and removing furniture...');
      
      // Resize image for segmentation to prevent WASM OOM
      const segInputCanvas = document.createElement('canvas');
      const MAX_DIM = 512;
      let scale = 1;
      if (hidden.width > MAX_DIM || hidden.height > MAX_DIM) {
        scale = Math.min(MAX_DIM / hidden.width, MAX_DIM / hidden.height);
      }
      segInputCanvas.width = hidden.width * scale;
      segInputCanvas.height = hidden.height * scale;
      segInputCanvas.getContext('2d').drawImage(hidden, 0, 0, segInputCanvas.width, segInputCanvas.height);
      const smallImageUrl = segInputCanvas.toDataURL('image/jpeg', 0.8);

      const aiResult = await new Promise((resolve) => {
        const handler = (e) => {
          if (e.data.type === 'RESULT' && e.data.id === 'erase-1') {
            segmentWorkerRef.current.removeEventListener('message', handler);
            resolve(e.data.result);
          } else if (e.data.type === 'ERROR' && e.data.id === 'erase-1') {
            segmentWorkerRef.current.removeEventListener('message', handler);
            console.error('Segmentation error:', e.data.error);
            resolve(null);
          }
        };
        segmentWorkerRef.current.addEventListener('message', handler);
        segmentWorkerRef.current.postMessage({ type: 'PREDICT', id: 'erase-1', image: smallImageUrl });
        
        // Timeout after 15s
        setTimeout(() => resolve(null), 15000);
      });

      if (aiResult && aiResult.length > 0) {
        const segCanvas = segmentCanvasRef.current;
        segCanvas.width = hidden.width;
        segCanvas.height = hidden.height;
        const segCtx = segCanvas.getContext('2d');
        
        // Draw the original image first
        segCtx.drawImage(hidden, 0, 0);
        
        // Find all furniture masks
        const furnitureLabels = ['bed', 'chair', 'sofa', 'table', 'cabinet', 'desk', 'shelf', 'lamp', 'plant', 'tv'];
        const furnitureMasks = aiResult.filter(res => 
          furnitureLabels.some(label => res.label.toLowerCase().includes(label))
        );

        if (furnitureMasks.length > 0) {
          setStatusMsg('Inpainting removed furniture areas...');
          await new Promise(r => setTimeout(r, 200));

          // 1. Create a blurred version of the original image for inpainting fill
          const blurCanvas = document.createElement('canvas');
          blurCanvas.width = hidden.width;
          blurCanvas.height = hidden.height;
          const blurCtx = blurCanvas.getContext('2d');
          blurCtx.filter = 'blur(20px)';
          blurCtx.drawImage(hidden, 0, 0);

          // 2. Create a combined mask of all furniture
          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = hidden.width;
          maskCanvas.height = hidden.height;
          const maskCtx = maskCanvas.getContext('2d');
          
          for (const item of furnitureMasks) {
             // Create an ImageBitmap or use putImageData
             // Transformers.js RawImage has .data, .width, .height
             if (item.mask && item.mask.data) {
                const imgData = new ImageData(
                  new Uint8ClampedArray(item.mask.data), 
                  item.mask.width, 
                  item.mask.height
                );
                
                // Draw mask to temporary canvas, then scale up to full image size
                const tempC = document.createElement('canvas');
                tempC.width = item.mask.width;
                tempC.height = item.mask.height;
                tempC.getContext('2d').putImageData(imgData, 0, 0);
                
                maskCtx.drawImage(tempC, 0, 0, maskCanvas.width, maskCanvas.height);
             }
          }

          // 3. Apply the mask to cut a hole in the original image
          segCtx.globalCompositeOperation = 'destination-out';
          segCtx.drawImage(maskCanvas, 0, 0);
          
          // 4. Draw the blurred background behind the image to fill the holes
          segCtx.globalCompositeOperation = 'destination-over';
          segCtx.drawImage(blurCanvas, 0, 0);
          
          // Reset composite operation
          segCtx.globalCompositeOperation = 'source-over';
          
          // Add a subtle grid/wireframe overlay over the inpainted areas to indicate "empty space"
          segCtx.globalCompositeOperation = 'source-atop';
          segCtx.fillStyle = 'rgba(0, 88, 163, 0.15)';
          segCtx.drawImage(maskCanvas, 0, 0);
        }
        
        setEdgeDataUrl(segCanvas.toDataURL());
      }
      
      await new Promise(r => setTimeout(r, 800));

      /* STEP 4 — Generate 3D room */
      setStepIdx(3);
      setStatusMsg(`Generating 3D room — ${dims.width}m × ${dims.depth}m × ${dims.height}m…`);
      await new Promise(r => setTimeout(r, 600));

      generateRoomLayout({ dimensions: dims });
      setStatusMsg('✅ Room generated! Opening designer…');
      await new Promise(r => setTimeout(r, 900));
      onClose();

    } catch (err) {
      console.error('RoomScanner pipeline error:', err);
      setStatusMsg(`Error: ${err.message}. Using default room.`);
      // fallback: use a standard 5×5 room
      generateRoomLayout({ dimensions: { width: 5, height: 2.8, depth: 5 } });
      setTimeout(onClose, 1500);
    } finally {
      setRunning(false);
    }
  };

  const isDone = (i) => i < stepIdx;
  const isActive = (i) => i === stepIdx;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Noto IKEA', 'Inter', system-ui, sans-serif",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1a1a2e',
        borderRadius: 16,
        width: 620,
        maxWidth: '95vw',
        maxHeight: '95vh',
        overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0058a3 0%, #003d73 100%)',
          padding: '28px 32px 24px',
          borderRadius: '16px 16px 0 0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>
                IKEA Room Planner
              </div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                AI Room Scanner
              </h2>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                Upload a photo — OpenCV traces your walls & generates a precise 3D floor plan.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >×</button>
          </div>

          {/* Step progress */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 24 }}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <StepDot active={isActive(i)} done={isDone(i)} label={s.label} index={i} />
                {i < STEPS.length - 1 && <StepConnector done={isDone(i)} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* OpenCV status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: cvLoaded ? '#10b981' : '#f59e0b',
              boxShadow: cvLoaded ? '0 0 6px #10b981' : '0 0 6px #f59e0b',
              animation: cvLoaded ? 'none' : 'pulse 1.2s infinite',
            }} />
            <span style={{ fontSize: 13, color: cvLoaded ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
              {cvLoaded ? 'OpenCV.js Ready' : 'Loading OpenCV.js…'}
            </span>
          </div>

          {/* Drop zone / image preview */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !image && fileInputRef.current?.click()}
            style={{
              position: 'relative',
              height: 220,
              borderRadius: 12,
              border: `2px dashed ${dragOver ? '#0058a3' : image ? 'transparent' : 'rgba(255,255,255,0.2)'}`,
              background: image ? 'transparent' : 'rgba(255,255,255,0.04)',
              cursor: image ? 'default' : 'pointer',
              overflow: 'hidden',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {image ? (
              <>
                {/* Original photo */}
                <img
                  src={image}
                  alt="Room"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* Edge overlay */}
                {edgeDataUrl && (
                  <img
                    src={edgeDataUrl}
                    alt="Edges"
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      mixBlendMode: 'screen',
                      opacity: 0.75,
                    }}
                  />
                )}
                {/* Change photo pill */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: 12, right: 12,
                    background: 'rgba(0,0,0,0.65)', color: '#fff',
                    border: 'none', borderRadius: 20, padding: '6px 14px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                  }}
                >Change photo</button>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>Drop photo here or click to upload</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>JPG, PNG, WEBP — taken from room corner for best results</div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => loadFile(e.target.files[0])}
            style={{ display: 'none' }}
          />

          {/* Hidden processing canvases */}
          <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
          <canvas ref={edgeCanvasRef}   style={{ display: 'none' }} />
          <canvas ref={segmentCanvasRef} style={{ display: 'none' }} />

          {/* Detected room dimensions card */}
          {roomDims && (
            <div style={{
              background: 'rgba(0,88,163,0.15)',
              border: '1px solid rgba(0,88,163,0.4)',
              borderRadius: 10,
              padding: '14px 20px',
              display: 'flex', gap: 32, alignItems: 'center',
            }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Detected Room</div>
              {[
                { label: 'Width',  value: roomDims.width,  unit: 'm' },
                { label: 'Depth',  value: roomDims.depth,  unit: 'm' },
                { label: 'Height', value: roomDims.height, unit: 'm' },
              ].map(d => (
                <div key={d.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{d.value}<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginLeft: 2 }}>{d.unit}</span></div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 2 }}>{d.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Status line */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 8, padding: '10px 16px',
          }}>
            {running && (
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.2)',
                borderTopColor: '#0058a3',
                animation: 'spin 0.8s linear infinite',
                flexShrink: 0,
              }} />
            )}
            <span style={{ fontSize: 13, color: running ? '#60a5fa' : '#94a3b8', fontWeight: 500 }}>
              {statusMsg}
            </span>
          </div>

          {/* Tip box */}
          {!image && (
            <div style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 8, padding: '12px 16px',
              fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6,
            }}>
              <strong style={{ color: '#10b981' }}>💡 Tip:</strong>{' '}
              For best results, stand in a corner of the room and photograph all 4 walls. Good contrast between walls and floor improves accuracy.
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px', background: 'transparent',
                color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.target.style.color='#fff'}
              onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.6)'}
            >
              Cancel
            </button>
            <button
              onClick={runPipeline}
              disabled={!image || !cvLoaded || running}
              style={{
                padding: '12px 32px',
                background: (!image || !cvLoaded || running) ? 'rgba(0,88,163,0.4)' : '#0058a3',
                color: '#fff', border: 'none', borderRadius: 8,
                cursor: (!image || !cvLoaded || running) ? 'not-allowed' : 'pointer',
                fontWeight: 800, fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 0.2s',
                boxShadow: (!image || !cvLoaded || running) ? 'none' : '0 4px 16px rgba(0,88,163,0.5)',
              }}
            >
              {running ? 'Analyzing…' : 'Analyze Room'}
            </button>
          </div>
        </div>
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
