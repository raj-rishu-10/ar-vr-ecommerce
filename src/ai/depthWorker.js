import { pipeline, env } from '@huggingface/transformers';

// Skip local model check since we're using remote HF Hub
env.allowLocalModels = false;

let depthPipelinePromise = null;

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, image, id } = event.data;

  if (type === 'INIT') {
    depthPipelinePromise = (async () => {
      try {
        self.postMessage({ type: 'STATUS', status: 'loading' });
        const pipe = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', {
          device: 'webgpu'
        });
        self.postMessage({ type: 'STATUS', status: 'ready' });
        return pipe;
      } catch (error) {
        console.warn("WebGPU failed, falling back to WebAssembly", error);
        try {
          const pipe = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', {
            device: 'wasm'
          });
          self.postMessage({ type: 'STATUS', status: 'ready' });
          return pipe;
        } catch (fallbackError) {
          console.error("WASM fallback also failed:", fallbackError);
          self.postMessage({ type: 'STATUS', status: 'failed' });
          return null; // Model could not load
        }
      }
    })();
  }

  if (type === 'PREDICT') {
    try {
      self.postMessage({ type: 'STATUS', status: 'processing', id });
      
      const pipe = await depthPipelinePromise;
      if (pipe) {
        const output = await pipe(image);
        self.postMessage({ type: 'RESULT', id, result: output });
      } else {
        // If pipeline failed to load, return mock result so UI doesn't hang
        self.postMessage({ type: 'RESULT', id, result: 'fallback-simulation' });
      }
    } catch (error) {
      self.postMessage({ type: 'ERROR', id, error: error.message });
      // Proceed with simulation even on error
      self.postMessage({ type: 'RESULT', id, result: 'fallback-simulation' });
    }
  }
});
