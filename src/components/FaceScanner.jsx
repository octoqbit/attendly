import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { loadModels, detectFaceLiveness, detectSpoofingPhone } from '../lib/faceApi';

const LIVENESS_CHALLENGES = [
  { id: 'blink', text: 'Please blink your eyes once or twice' },
  { id: 'tilt_head', text: 'Tilt your head left to right' },
  { id: 'head_up_down', text: 'Nod your head up and down' }
];

export default function FaceScanner({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [status, setStatus] = useState('Loading models...');
  const [challenges, setChallenges] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [verified, setVerified] = useState(false);

  // Initialize random challenges
  useEffect(() => {
    const shuffled = [...LIVENESS_CHALLENGES].sort(() => 0.5 - Math.random());
    setChallenges(shuffled.slice(0, 2)); // Pick 2 random challenges
  }, []);

  useEffect(() => {
    if (challenges.length === 0) return;

    let stream = null;
    let animationFrameId = null;

    const startCamera = async () => {
      try {
        await loadModels();
        setStatus('Starting camera...');
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setStatus('Error accessing camera.');
        console.error(err);
      }
    };

    startCamera();

    const handleVideoPlay = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);

      let localIdx = 0;
      let lastActionCompleteTime = Date.now();
      let challengeStartTime = Date.now();
      const TIME_LIMIT_MS = 7000; // 7 seconds max per challenge

      let lastPhoneCheck = Date.now();

      const scanLoop = async () => {
        if (!video || video.paused || video.ended) return;

        const now = Date.now();

        // Phone spoofing detection check (runs every 1 second to save CPU)
        if (now - lastPhoneCheck > 1000) {
          lastPhoneCheck = now;
          const isSpoofing = await detectSpoofingPhone(video);
          if (isSpoofing) {
            setStatus('🚨 SECURITY ALERT: Cell phone detected! Spoofing attempt blocked.');
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            setTimeout(onClose, 3000); // Auto-close after 3s
            return;
          }
        }

        const { face, actions } = await detectFaceLiveness(video);

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (face) {
          const resizedDetections = faceapi.resizeResults(face, displaySize);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

          
          if (localIdx < challenges.length) {
            const timeElapsed = now - challengeStartTime;
            const timeLeft = Math.max(0, Math.ceil((TIME_LIMIT_MS - timeElapsed) / 1000));
            
            if (timeElapsed > TIME_LIMIT_MS) {
              setStatus('Verification failed: Time limit exceeded. Restarting...');
              // Reset the test
              localIdx = 0;
              setCurrentIdx(0);
              challengeStartTime = Date.now();
              lastActionCompleteTime = Date.now();
              // Shuffle challenges again
              const newShuffled = [...LIVENESS_CHALLENGES].sort(() => 0.5 - Math.random());
              setChallenges(newShuffled.slice(0, 2));
              setTimeout(() => { requestAnimationFrame(scanLoop); }, 1500);
              return;
            }

            const currentChallenge = challenges[localIdx];
            
            // Give a small cooldown between challenges (e.g., 1.5 seconds) to ensure they return to neutral
            if (now - lastActionCompleteTime > 1500) {
              setStatus(`Step ${localIdx + 1}/2: ${currentChallenge.text} (${timeLeft}s)`);

              if (actions[currentChallenge.id]) {
                localIdx++;
                setCurrentIdx(localIdx);
                lastActionCompleteTime = now;
                challengeStartTime = now;
              }
            } else {
              setStatus(`Please return to a neutral face...`);
            }
          } else {
            // All challenges completed successfully within the time limits!
            setStatus('Liveness verified! Extracting detailed mathematical biometrics...');
            setVerified(true);
            
            if (!window.tempDescriptors) window.tempDescriptors = [];
            window.tempDescriptors.push(face.descriptor);

            if (window.tempDescriptors.length >= 5) {
              // Calculate the mean of 5 descriptors for a highly detailed mathematical average
              const avgDescriptor = new Float32Array(128);
              for (let i = 0; i < 128; i++) {
                let sum = 0;
                for (let j = 0; j < 5; j++) {
                  sum += window.tempDescriptors[j][i];
                }
                avgDescriptor[i] = sum / 5;
              }
              
              const descriptorArray = Array.from(avgDescriptor);
              window.tempDescriptors = null; // cleanup
              
              setTimeout(() => {
                onCapture(JSON.stringify(descriptorArray));
              }, 500);
              
              return; // End loop
            }
          }
        } else {
          setStatus('No face detected. Please look at the camera.');
          challengeStartTime = Date.now(); // Reset timer while face is not detected
        }

        animationFrameId = requestAnimationFrame(scanLoop);
      };

      scanLoop();
    };

    if (videoRef.current) {
      videoRef.current.addEventListener('play', handleVideoPlay);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (videoRef.current) {
        videoRef.current.removeEventListener('play', handleVideoPlay);
      }
    };
  }, [challenges, onCapture]);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-main)' }}>Anti-Spoofing Liveness Check</h3>
        
        <div style={{
          background: verified ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
          color: verified ? 'var(--emerald)' : 'var(--blue)',
          padding: '12px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          fontWeight: 500,
          fontSize: '15px'
        }}>
          {verified ? '✅ Verification Complete!' : status}
        </div>
        
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline
            style={{ width: '100%', borderRadius: 'var(--radius-md)', background: '#000' }}
          />
          <canvas 
            ref={canvasRef} 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
        </div>

        <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: '20px', width: '100%' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.8)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle = {
  background: 'var(--surface-color)',
  border: '1px solid var(--border-color)',
  padding: '24px',
  borderRadius: 'var(--radius-lg)',
  width: '90%',
  maxWidth: '450px',
  textAlign: 'center',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
};
