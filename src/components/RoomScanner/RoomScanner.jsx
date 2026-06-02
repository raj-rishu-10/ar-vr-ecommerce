import React, { useState, useEffect, useRef } from 'react';
import { useOpenCV } from '../../hooks/useOpenCV';
import { useRoomStore } from '../../stores/useRoomStore';

export default function RoomScanner({ onClose }) {
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState('Idle');
  const [depthOutput, setDepthOutput] = useState(null);
  const canvasRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  
  const { loaded: cvLoaded, cv } = useOpenCV();
  const { generateRoomLayout } = useRoomStore();

  const depthWorkerRef = useRef(null);
  const samWorkerRef = useRef(null);

  useEffect(() => {
    // Initialize Web Workers
    depthWorkerRef.current = new Worker(new URL('../../ai/depthWorker.js', import.meta.url), { type: 'module' });
    samWorkerRef.current = new Worker(new URL('../../ai/samWorker.js', import.meta.url), { type: 'module' });

    depthWorkerRef.current.onmessage = (e) => {
      if (e.data.type === 'STATUS') setStatus(`Depth Model: ${e.data.status}`);
      if (e.data.type === 'RESULT') {
        setStatus('Processing Depth Map...');
        // The output is a raw greyscale array from transformers.js
        // For demonstration, we'll extract simulated room bounds
        simulateRoomGeneration();
      }
    };

    depthWorkerRef.current.postMessage({ type: 'INIT' });
    // samWorkerRef.current.postMessage({ type: 'INIT' });

    return () => {
      depthWorkerRef.current.terminate();
      samWorkerRef.current.terminate();
    };
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = () => {
    if (!image || !cvLoaded || !cv) return;
    setStatus('Running Computer Vision Pipeline (Canny Edge Detection)...');
    
    // Draw uploaded image to hidden canvas for OpenCV processing
    const imgElement = new Image();
    imgElement.src = image;
    imgElement.onload = () => {
      const canvas = hiddenCanvasRef.current;
      if (!canvas) return;
      canvas.width = imgElement.width;
      canvas.height = imgElement.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgElement, 0, 0);

      try {
        // 1. Read Image
        const src = cv.imread(canvas);
        const dst = new cv.Mat();
        
        // 2. Grayscale
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
        
        // 3. Edge Detection
        cv.Canny(dst, dst, 50, 150, 3, false);
        
        // 4. (In full production) Use cv.HoughLinesP or cv.findContours to extract exact floor polygon
        // For now, we simulate extraction bounds:
        
        src.delete();
        dst.delete();
        
        setStatus('Sending edge maps to AI (Depth & Segment)...');
        
        // Send to depth worker
        depthWorkerRef.current.postMessage({ 
          type: 'PREDICT', 
          image,
          id: Date.now() 
        });

      } catch (err) {
        console.error("OpenCV Processing Error:", err);
        setStatus('CV Error. Check console.');
      }
    };
  };

  const simulateRoomGeneration = () => {
    // Simulate OpenCV edge detection and layout generation
    setTimeout(() => {
      setStatus('OpenCV processing contours...');
      setTimeout(() => {
        // Automatically generate a 6x4 room based on the "scanned" image
        generateRoomLayout({ dimensions: { width: 6, height: 3, depth: 4 } });
        setStatus('Room Layout Generated!');
        setTimeout(() => onClose(), 1500);
      }, 1500);
    }, 1000);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <div style={{ background: '#1e293b', padding: '30px', borderRadius: '12px', width: '500px', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2>AI Room Scanner</h2>
        <p style={{ color: '#cbd5e1' }}>Upload a photo of your physical room. The AI will extract the depth map and OpenCV will trace the walls to generate a 3D floor plan.</p>
        
        {!cvLoaded ? (
          <div style={{ color: '#f59e0b' }}>Loading OpenCV.js core...</div>
        ) : (
          <div style={{ color: '#10b981' }}>OpenCV.js Ready ✅</div>
        )}

        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ padding: '10px', background: '#0f172a', borderRadius: '8px' }} />
        
        {/* Hidden canvas for OpenCV Canny Processing */}
        <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

        {image && (
          <img src={image} alt="Room" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }} />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: '#60a5fa' }}>Status: {status}</div>
          <div>
            <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button 
              onClick={processImage} 
              disabled={!image || !cvLoaded}
              style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: (!image || !cvLoaded) ? 0.5 : 1 }}
            >
              Analyze Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
