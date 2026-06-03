import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

const FURNITURE_LABELS = new Set([
  'chair', 'couch', 'bed', 'dining table', 'tv', 'laptop',
  'bench', 'potted plant', 'clock', 'vase', 'book',
  'refrigerator', 'oven', 'sink', 'toilet',
]);

let detectorPromise = null;

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise(r => setTimeout(() => r(null), ms))]);

self.addEventListener('message', async (event) => {
  const { type, image, id } = event.data;

  if (type === 'INIT') {
    detectorPromise = (async () => {
      try {
        self.postMessage({ type: 'STATUS', status: 'loading', stage: 'detect' });
        const detector = await withTimeout(
          pipeline('object-detection', 'Xenova/detr-resnet-50', { device: 'wasm' }),
          40_000
        );
        if (detector) {
          self.postMessage({ type: 'STATUS', status: 'ready', stage: 'detect' });
          return detector;
        }
        self.postMessage({ type: 'STATUS', status: 'timeout', stage: 'detect' });
        return null;
      } catch (err) {
        console.warn('[yoloWorker] init failed:', err.message);
        self.postMessage({ type: 'STATUS', status: 'failed', stage: 'detect' });
        return null;
      }
    })();
  }

  if (type === 'PREDICT') {
    try {
      self.postMessage({ type: 'STATUS', status: 'processing', id, stage: 'detect' });
      const detector = await withTimeout(detectorPromise, 45_000);

      if (detector) {
        const raw = await detector(image, { threshold: 0.4 });
        const furniture = raw.filter(r => {
          const lbl = r.label.toLowerCase();
          return (
            FURNITURE_LABELS.has(lbl) ||
            lbl.includes('chair') || lbl.includes('sofa') ||
            lbl.includes('table') || lbl.includes('bed') ||
            lbl.includes('desk') || lbl.includes('cabinet') ||
            lbl.includes('shelf') || lbl.includes('lamp')
          );
        });
        self.postMessage({ type: 'RESULT', id, result: furniture });
      } else {
        // Fallback — no detections
        self.postMessage({ type: 'RESULT', id, result: [] });
      }
    } catch (err) {
      self.postMessage({ type: 'ERROR', id, error: err.message });
      self.postMessage({ type: 'RESULT', id, result: [] });
    }
  }
});
