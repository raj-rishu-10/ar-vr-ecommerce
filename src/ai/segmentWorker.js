import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

let segmentPipelinePromise = null;

self.addEventListener('message', async (event) => {
  const { type, image, id } = event.data;

  if (type === 'INIT') {
    segmentPipelinePromise = (async () => {
      try {
        self.postMessage({ type: 'STATUS', status: 'loading' });
        // Use a small segformer model for fast in-browser segmentation
        const pipe = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', { device: 'wasm' });
        self.postMessage({ type: 'STATUS', status: 'ready' });
        return pipe;
      } catch (error) {
        console.error('[segmentWorker] Initialization failed:', error);
        self.postMessage({ type: 'STATUS', status: 'failed' });
        return null;
      }
    })();
  }

  if (type === 'PREDICT') {
    try {
      self.postMessage({ type: 'STATUS', status: 'processing', id });
      const pipe = await segmentPipelinePromise;
      if (pipe) {
        // Run segmentation
        const result = await pipe(image);
        self.postMessage({ type: 'RESULT', id, result });
      } else {
        self.postMessage({ type: 'ERROR', id, error: 'Pipeline not initialized' });
      }
    } catch (error) {
      self.postMessage({ type: 'ERROR', id, error: error.message });
    }
  }
});
