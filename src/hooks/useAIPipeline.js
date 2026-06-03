import { useRef, useState, useCallback, useEffect } from 'react';
import { generateFreeZones } from '../utils/freeSpaceGenerator';
import { suggestPlacements } from '../utils/furniturePlacementAI';

const INITIAL_STAGES = {
  depth:     { label: 'Depth Map',          icon: '🗺️',  status: 'idle', detail: 'Depth Anything V2' },
  segment:   { label: 'Scene Segmentation', icon: '🎭',  status: 'idle', detail: 'SegFormer ADE20K' },
  detect:    { label: 'Object Detection',   icon: '🔍',  status: 'idle', detail: 'DETR ResNet-50' },
  freeSpace: { label: 'Free Space Map',     icon: '📐',  status: 'idle', detail: 'Geometric Analysis' },
  placement: { label: 'AI Placement',       icon: '🤖',  status: 'idle', detail: 'Placement Engine' },
};

function workerRequest(worker, message, timeoutMs = 50_000) {
  return new Promise(resolve => {
    const { id } = message;
    const handler = (e) => {
      if (e.data.id !== id) return;
      if (e.data.type === 'RESULT' || e.data.type === 'ERROR') {
        worker.removeEventListener('message', handler);
        resolve({ ok: e.data.type === 'RESULT', result: e.data.result ?? null });
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage(message);
    setTimeout(() => {
      worker.removeEventListener('message', handler);
      resolve({ ok: false, result: null });
    }, timeoutMs);
  });
}

export function useAIPipeline(products = []) {
  const depthRef   = useRef(null);
  const segRef     = useRef(null);
  const yoloRef    = useRef(null);
  const initialized = useRef(false);

  const [stages, setStages]   = useState(INITIAL_STAGES);
  const [results, setResults] = useState({
    depthResult:  null,
    masks:        null,
    detections:   null,
    freeZones:    null,
    suggestions:  null,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isDone,    setIsDone]    = useState(false);
  const [error,     setError]     = useState(null);

  const setStage = (key, updates) =>
    setStages(prev => ({ ...prev, [key]: { ...prev[key], ...updates } }));

  // Initialise workers once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    depthRef.current = new Worker(
      new URL('../ai/depthWorker.js', import.meta.url), { type: 'module' }
    );
    segRef.current = new Worker(
      new URL('../ai/segmentWorker.js', import.meta.url), { type: 'module' }
    );
    yoloRef.current = new Worker(
      new URL('../ai/yoloWorker.js', import.meta.url), { type: 'module' }
    );

    depthRef.current.postMessage({ type: 'INIT' });
    segRef.current.postMessage({ type: 'INIT' });
    yoloRef.current.postMessage({ type: 'INIT' });

    return () => {
      depthRef.current?.terminate();
      segRef.current?.terminate();
      yoloRef.current?.terminate();
    };
  }, []);

  /** Resize image DataURL to max dimension for ML */
  const resizeImage = useCallback((dataURL, maxDim = 518) => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const c = document.createElement('canvas');
        c.width  = Math.round(img.width  * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve({ url: c.toDataURL('image/jpeg', 0.85), w: c.width, h: c.height });
      };
      img.src = dataURL;
    });
  }, []);

  const runPipeline = useCallback(async (imageDataURL) => {
    setIsRunning(true);
    setIsDone(false);
    setError(null);

    // Reset stages
    setStages(Object.fromEntries(
      Object.entries(INITIAL_STAGES).map(([k, v]) => [k, { ...v, status: 'pending' }])
    ));
    setResults({ depthResult: null, masks: null, detections: null, freeZones: null, suggestions: null });

    try {
      const { url: smallImg, w: imgW, h: imgH } = await resizeImage(imageDataURL, 518);

      // ── Stage 1: Depth Map ───────────────────────────────
      setStage('depth', { status: 'running' });
      const depthResp = await workerRequest(
        depthRef.current,
        { type: 'PREDICT', id: 'depth-1', image: smallImg },
        50_000
      );
      const depthResult = depthResp.result;
      setResults(p => ({ ...p, depthResult }));
      setStage('depth', { status: depthResp.ok ? 'done' : 'warn' });

      // ── Stage 2: Segmentation ────────────────────────────
      setStage('segment', { status: 'running' });
      const segResp = await workerRequest(
        segRef.current,
        { type: 'PREDICT', id: 'seg-1', image: smallImg },
        50_000
      );
      const masks = segResp.result;
      setResults(p => ({ ...p, masks }));
      setStage('segment', { status: segResp.ok ? 'done' : 'warn' });

      // ── Stage 3: Object Detection (YOLO/DETR) ────────────
      setStage('detect', { status: 'running' });
      const yoloResp = await workerRequest(
        yoloRef.current,
        { type: 'PREDICT', id: 'yolo-1', image: smallImg },
        50_000
      );
      const detections = yoloResp.result || [];
      setResults(p => ({ ...p, detections }));
      setStage('detect', { status: 'done' });

      // ── Stage 4: Free Space Generator ───────────────────
      setStage('freeSpace', { status: 'running' });
      await new Promise(r => setTimeout(r, 200)); // yield for re-render
      const freeZones = generateFreeZones({ depthResult, masks, detections, imgW, imgH });
      setResults(p => ({ ...p, freeZones }));
      setStage('freeSpace', { status: 'done' });

      // ── Stage 5: AI Furniture Placement ──────────────────
      setStage('placement', { status: 'running' });
      await new Promise(r => setTimeout(r, 200));
      const suggestions = suggestPlacements(products, freeZones, detections);
      setResults(p => ({ ...p, suggestions }));
      setStage('placement', { status: 'done' });

      setIsDone(true);
    } catch (err) {
      console.error('[useAIPipeline]', err);
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  }, [products, resizeImage]);

  const reset = useCallback(() => {
    setStages(INITIAL_STAGES);
    setResults({ depthResult: null, masks: null, detections: null, freeZones: null, suggestions: null });
    setIsRunning(false);
    setIsDone(false);
    setError(null);
  }, []);

  return { stages, results, isRunning, isDone, error, runPipeline, reset };
}
