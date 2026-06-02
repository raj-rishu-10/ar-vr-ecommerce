import { useState, useEffect } from 'react';

export function useOpenCV() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.cv) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
    script.async = true;
    script.onload = () => {
      // OpenCV.js takes a bit of time to initialize even after script load
      const checkCv = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkCv);
          setLoaded(true);
        }
      }, 100);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup if component unmounts before load
    };
  }, []);

  return { loaded, cv: window.cv };
}
