import { pipeline, env } from '@huggingface/transformers';

// Skip local model check since we're using remote HF Hub
env.allowLocalModels = false;

// Timeout helper — resolves with `null` after `ms` milliseconds
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(null), ms))
  ]);

let depthPipelinePromise = null;

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, image, id } = event.data;

  if (type === 'INIT') {
    depthPipelinePromise = (async () => {
      try {
        self.postMessage({ type: 'STATUS', status: 'loading' });
        // Use wasm to avoid WebGPU console noise; cap at 25 s so it never hangs
        const pipe = await withTimeout(
          pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { device: 'wasm' }),
          25_000
        );
        if (pipe) {
          self.postMessage({ type: 'STATUS', status: 'ready' });
          return pipe;
        } else {
          self.postMessage({ type: 'STATUS', status: 'timeout' });
          return null;
        }
      } catch (error) {
        console.warn('[depthWorker] WASM pipeline failed:', error.message);
        self.postMessage({ type: 'STATUS', status: 'failed' });
        return null;
      }
    })();
  }

  if (type === 'PREDICT') {
    try {
      self.postMessage({ type: 'STATUS', status: 'processing', id });

      // Wait at most 30 s for the pipeline (it might still be loading)
      const pipe = await withTimeout(depthPipelinePromise, 30_000);

      if (pipe) {
        const output = await pipe(image);
        self.postMessage({ type: 'RESULT', id, result: output });
      } else {
        // Pipeline unavailable — return fallback immediately so UI continues
        self.postMessage({ type: 'RESULT', id, result: 'fallback-simulation' });
      }
    } catch (error) {
      self.postMessage({ type: 'ERROR', id, error: error.message });
      // Always send a RESULT so the UI never gets stuck
      self.postMessage({ type: 'RESULT', id, result: 'fallback-simulation' });
    }
  }
});
