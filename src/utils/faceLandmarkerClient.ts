import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';

let cachedLandmarkerPromise: Promise<FaceLandmarker> | null = null;

export async function getBrowserFaceLandmarker(): Promise<FaceLandmarker> {
  if (!cachedLandmarkerPromise) {
    cachedLandmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      try {
        return await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 2,
          outputFaceBlendshapes: true,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
      } catch {
        return await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 2,
          outputFaceBlendshapes: true,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
      }
    })().catch((err) => {
      cachedLandmarkerPromise = null;
      throw err;
    });
  }
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
