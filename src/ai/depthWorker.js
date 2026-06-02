import { pipeline, env } from '@huggingface/transformers';

// Skip local model check since we're using remote HF Hub
env.allowLocalModels = false;

let depthPipeline = null;

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, image, id } = event.data;

  if (type === 'INIT') {
    try {
      self.postMessage({ type: 'STATUS', status: 'loading' });
      
      depthPipeline = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', {
        device: 'webgpu' // Attempt to use WebGPU for acceleration
      });
      
      self.postMessage({ type: 'STATUS', status: 'ready' });
    } catch (error) {
      console.warn("WebGPU failed, falling back to WebAssembly", error);
      // Fallback to WASM if WebGPU is not supported
      depthPipeline = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', {
        device: 'wasm'
      });
      self.postMessage({ type: 'STATUS', status: 'ready' });
    }
  }

  if (type === 'PREDICT' && depthPipeline) {
    try {
      self.postMessage({ type: 'STATUS', status: 'processing', id });
      
      // Run the model on the provided image (URL or blob)
      const output = await depthPipeline(image);
      
      // Output contains the depth map as an image
      self.postMessage({ 
        type: 'RESULT', 
        id, 
        result: output 
      });
    } catch (error) {
      self.postMessage({ type: 'ERROR', id, error: error.message });
    }
  }
});
