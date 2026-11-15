import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';

let cachedLandmarkerPromise: Promise<FaceLandmarker> | null = null;
let cachedVisionFilesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;

function getVisionFileset() {
  if (!cachedVisionFilesetPromise) {
    cachedVisionFilesetPromise = FilesetResolver.forVisionTasks('/mediapipe/wasm').catch((err) => {
      cachedVisionFilesetPromise = null;
      throw err;
    });
  }
  return cachedVisionFilesetPromise;
}

async function createLandmarkerWithDelegate(delegate: 'GPU' | 'CPU'): Promise<FaceLandmarker> {
  const vision = await getVisionFileset();
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: '/mediapipe/face_landmarker.task',
      delegate,
    },
    runningMode: 'VIDEO',
    numFaces: 2,
    outputFaceBlendshapes: true,
    minFaceDetectionConfidence: 0.55,
    minFacePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
  });
}

export async function getBrowserFaceLandmarker(): Promise<FaceLandmarker> {
  if (!cachedLandmarkerPromise) {
    cachedLandmarkerPromise = createLandmarkerWithDelegate('GPU')
      .catch(() => createLandmarkerWithDelegate('CPU'))
      .catch((err) => {
        cachedLandmarkerPromise = null;
        throw err;
      });
  }
  return cachedLandmarkerPromise;
}

export async function switchToCpuFaceLandmarker(): Promise<FaceLandmarker> {
  cachedLandmarkerPromise = createLandmarkerWithDelegate('CPU').catch((err) => {
    cachedLandmarkerPromise = null;
    throw err;
  });
  return cachedLandmarkerPromise;
}

export function extractMaxBlinkScore(result: FaceLandmarkerResult): number {
  const categories = result.faceBlendshapes?.[0]?.categories;
  if (!categories || categories.length === 0) return 0;

  let maxBlink = 0;
  for (const cat of categories) {
    if (cat.categoryName === 'eyeBlinkLeft' || cat.categoryName === 'eyeBlinkRight') {
      if (cat.score > maxBlink) maxBlink = cat.score;
    }
  }
  return maxBlink;
}
