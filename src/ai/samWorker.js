import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

let samPipeline = null;

self.addEventListener('message', async (event) => {
  const { type, image, points, labels, id } = event.data;

  if (type === 'INIT') {
    try {
      self.postMessage({ type: 'STATUS', status: 'loading' });
      // We load the image segmentation model (MobileSAM)
      samPipeline = await pipeline('image-segmentation', 'Xenova/mobile-sam');
      self.postMessage({ type: 'STATUS', status: 'ready' });
    } catch (error) {
      self.postMessage({ type: 'ERROR', error: error.message });
    }
  }

  if (type === 'PREDICT' && samPipeline) {
    try {
      self.postMessage({ type: 'STATUS', status: 'processing', id });
      
      // MobileSAM accepts the image and prompt points to generate segmentation masks
      // If no points are provided, it can be used to generate masks for everything
      const output = await samPipeline(image, {
        input_points: points, // Array of [x, y] coordinates
        input_labels: labels  // Array of 1 (foreground) or 0 (background)
      });
      
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
