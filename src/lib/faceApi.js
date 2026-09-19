import * as faceapi from '@vladmandic/face-api';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let modelsLoaded = false;
let cocoSsdModel = null;

export async function loadModels() {
  if (modelsLoaded) return;
  const MODEL_URL = '/models';
  
  // Set tf backend (optional, but good practice for tfjs)
  await tf.ready();

  const [_, ssd] = await Promise.all([
    Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]),
    cocoSsd.load()
  ]);
  
  cocoSsdModel = ssd;
  modelsLoaded = true;
}

export async function detectSpoofingPhone(videoElement) {
  if (!cocoSsdModel) return false;
  
  const predictions = await cocoSsdModel.detect(videoElement);
  // Check if any prediction is a 'cell phone'
  return predictions.some(p => p.class === 'cell phone' && p.score > 0.5);
}

function euclideanDist(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function calculateEAR(eye) {
  // eye is an array of 6 points:
  // p1: eye[0], p2: eye[1], p3: eye[2], p4: eye[3], p5: eye[4], p6: eye[5]
  const v1 = euclideanDist(eye[1], eye[5]);
  const v2 = euclideanDist(eye[2], eye[4]);
  const h = euclideanDist(eye[0], eye[3]);
  return (v1 + v2) / (2.0 * h);
}

export async function detectFaceLiveness(videoElement) {
  if (!modelsLoaded) await loadModels();

  const detection = await faceapi.detectSingleFace(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    return { face: null, actions: {} };
  }

  const landmarks = detection.landmarks;
  
  // 1. Blink (EAR)
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const leftEAR = calculateEAR(leftEye);
  const rightEAR = calculateEAR(rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2.0;
  const isBlinking = avgEAR < 0.28;

  // 2. Tilt Head (Roll)
  const leftEyeCenter = leftEye.reduce((acc, curr) => ({ x: acc.x + curr.x, y: acc.y + curr.y }), { x: 0, y: 0 });
  leftEyeCenter.x /= 6; leftEyeCenter.y /= 6;
  const rightEyeCenter = rightEye.reduce((acc, curr) => ({ x: acc.x + curr.x, y: acc.y + curr.y }), { x: 0, y: 0 });
  rightEyeCenter.x /= 6; rightEyeCenter.y /= 6;
  
  const dy = rightEyeCenter.y - leftEyeCenter.y;
  const dx = rightEyeCenter.x - leftEyeCenter.x;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const isTilted = Math.abs(angle) > 15; // > 15 degrees tilt

  // 3. Head Up/Down (Pitch)
  const pts = landmarks.positions;
  const nose = pts[30]; // nose tip
  const top = pts[27]; // between eyes
  const chin = pts[8]; // chin tip
  
  const distTop = euclideanDist(nose, top);
  const distBottom = euclideanDist(nose, chin);
  const pitchRatio = distBottom / (distTop || 1);
  
  // Normal ratio is around 1.1 - 1.4. > 1.8 is head up, < 0.8 is head down
  const isHeadUpOrDown = pitchRatio > 1.8 || pitchRatio < 0.8;

  return { 
    face: detection, 
    actions: {
      blink: isBlinking,
      tilt_head: isTilted,
      head_up_down: isHeadUpOrDown
    } 
  };
}

export function compareFaceDescriptors(desc1, desc2) {
  if (!desc1 || !desc2) return false;
  // desc1 and desc2 are Float32Array or arrays
  const arr1 = desc1 instanceof Float32Array ? desc1 : new Float32Array(desc1);
  const arr2 = desc2 instanceof Float32Array ? desc2 : new Float32Array(desc2);
  
  const distance = faceapi.euclideanDistance(arr1, arr2);
  // Stricter threshold (0.42) for more detailed mathematical matching (default is usually 0.5 or 0.6)
  return distance < 0.42;
}
