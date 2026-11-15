export interface FacePoint {
  x: number;
  y: number;
  z?: number;
}

export interface HeadPoseMetrics {
  yawRatio: number; // Negative = turned left, Positive = turned right, ~0 = frontal
  zDepthDelta: number; // Difference between left & right cheek z depth
  isFrontal: boolean;
  isTurnedLeftOrRight: boolean;
}

export interface LivenessFrameTelemetry {
  faceCount: number;
  blinkScore: number; // Max of eyeBlinkLeft & eyeBlinkRight from MediaPipe blendshapes (0..1)
  headPose: HeadPoseMetrics;
  matchScore: number | null; // 0..100 geometric descriptor match
}

export interface ActiveLivenessState {
  phase:
    | 'need_enrollment'
    | 'wait_single_face'
    | 'challenge_blink'
    | 'blink_closing'
    | 'challenge_turn'
    | 'turn_detected'
    | 'ready_to_match'
    | 'rejected_mismatch'
    | 'verified';
  blinkCompleted: boolean;
  headTurnCompleted: boolean;
  stableFrontalFrames: number;
  consecutiveMismatchFrames: number;
  lastMatchScore: number | null;
  statusMessage: string;
}

export interface GateCheckSummary {
  gate1Enrolled: boolean;
  gate2SingleLiveFace: boolean;
  gate3LivenessPassed: boolean;
  gate4FaceMatched: boolean;
  allGatesPassed: boolean;
}

export const FACE_MATCH_THRESHOLD_PERCENT = 82;
export const BLINK_CLOSE_THRESHOLD = 0.42;
export const BLINK_OPEN_THRESHOLD = 0.22;
export const HEAD_TURN_YAW_THRESHOLD = 0.19;
export const HEAD_TURN_Z_DELTA_THRESHOLD = 0.035;
export const FRONTAL_YAW_LIMIT = 0.13;

function dist2D(a: FacePoint, b: FacePoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function safePoint(landmarks: FacePoint[], idx: number): FacePoint {
  return landmarks[idx] ?? { x: 0, y: 0, z: 0 };
}

/**
 * Computes head yaw asymmetry and 3D Z-depth delta using MediaPipe 468/478 face landmarks.
 * A printed photo held flat cannot easily produce natural 3D Z-depth cheek parallax + blink.
 */
export function computeHeadYawRatio(landmarks: FacePoint[]): HeadPoseMetrics {
  if (landmarks.length < 455) {
    return { yawRatio: 0, zDepthDelta: 0, isFrontal: false, isTurnedLeftOrRight: false };
  }

  const noseTip = safePoint(landmarks, 1);
  const leftCheek = safePoint(landmarks, 234);
  const rightCheek = safePoint(landmarks, 454);

  const distLeft = dist2D(noseTip, leftCheek);
  const distRight = dist2D(noseTip, rightCheek);
  const totalWidth = Math.max(distLeft + distRight, 1e-5);

  // 0 when nose tip is centered between left & right face boundaries
  const yawRatio = (distLeft - distRight) / totalWidth;
  const zDepthDelta = Math.abs((leftCheek.z ?? 0) - (rightCheek.z ?? 0));

  const isFrontal = Math.abs(yawRatio) <= FRONTAL_YAW_LIMIT;
  const isTurnedLeftOrRight =
    Math.abs(yawRatio) >= HEAD_TURN_YAW_THRESHOLD && zDepthDelta >= HEAD_TURN_Z_DELTA_THRESHOLD;

  return {
    yawRatio,
    zDepthDelta,
    isFrontal,
    isTurnedLeftOrRight,
  };
}

/**
 * Extracts a scale- and translation-invariant 20-dimensional facial proportion descriptor
 * from MediaPipe landmarks so geometric facial proportions can be compared reliably.
 */
export function extractGeometricFaceDescriptor(landmarks: FacePoint[]): number[] {
  if (landmarks.length < 455) return [];

  const leftEyeOuter = safePoint(landmarks, 33);
  const leftEyeInner = safePoint(landmarks, 133);
  const rightEyeInner = safePoint(landmarks, 362);
  const rightEyeOuter = safePoint(landmarks, 263);

  const leftEyeTop = safePoint(landmarks, 159);
  const leftEyeBottom = safePoint(landmarks, 145);
  const rightEyeTop = safePoint(landmarks, 386);
  const rightEyeBottom = safePoint(landmarks, 374);

  const forehead = safePoint(landmarks, 10);
  const noseBridge = safePoint(landmarks, 6);
  const noseTip = safePoint(landmarks, 1);
  const noseBottom = safePoint(landmarks, 2);

  const leftNostril = safePoint(landmarks, 98);
  const rightNostril = safePoint(landmarks, 327);

  const mouthLeft = safePoint(landmarks, 61);
  const mouthRight = safePoint(landmarks, 291);
  const upperLip = safePoint(landmarks, 13);
  const chin = safePoint(landmarks, 152);

  const leftCheek = safePoint(landmarks, 234);
  const rightCheek = safePoint(landmarks, 454);
  const jawLeft = safePoint(landmarks, 172);
  const jawRight = safePoint(landmarks, 397);

  const leftBrowInner = safePoint(landmarks, 107);
  const leftBrowOuter = safePoint(landmarks, 70);
  const rightBrowInner = safePoint(landmarks, 336);
  const rightBrowOuter = safePoint(landmarks, 300);

  const interOcular = Math.max(dist2D(leftEyeOuter, rightEyeOuter), 1e-4);
  const faceHeight = Math.max(dist2D(forehead, chin), 1e-4);

  const rawFeatures = [
    dist2D(leftEyeInner, rightEyeInner) / interOcular,
    dist2D(leftEyeOuter, leftEyeInner) / interOcular,
    dist2D(rightEyeInner, rightEyeOuter) / interOcular,
    dist2D(leftEyeTop, leftEyeBottom) / interOcular,
    dist2D(rightEyeTop, rightEyeBottom) / interOcular,
    dist2D(noseBridge, noseTip) / interOcular,
    dist2D(noseBridge, noseBottom) / faceHeight,
    dist2D(leftNostril, rightNostril) / interOcular,
    dist2D(mouthLeft, mouthRight) / interOcular,
    dist2D(noseBottom, upperLip) / faceHeight,
    dist2D(noseBottom, chin) / faceHeight,
    dist2D(upperLip, chin) / faceHeight,
    dist2D(leftCheek, rightCheek) / interOcular,
    dist2D(jawLeft, jawRight) / interOcular,
    dist2D(jawLeft, chin) / interOcular,
    dist2D(jawRight, chin) / interOcular,
    dist2D(leftBrowInner, rightBrowInner) / interOcular,
    dist2D(leftBrowOuter, leftBrowInner) / interOcular,
    dist2D(rightBrowOuter, rightBrowInner) / interOcular,
    dist2D(leftEyeOuter, mouthLeft) / faceHeight,
  ];

  return rawFeatures.map((val) => Number(val.toFixed(5)));
}

/**
 * Compares two geometric face descriptors and returns a 0..100 percentage score.
 * Combines normalized L1 proportional distance with vector cosine similarity so
 * differences in facial ratios reliably drop below 82%.
 */
export function computeFaceDescriptorSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  let absDiffSum = 0;

  for (let i = 0; i < a.length; i += 1) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
    const scale = Math.max(Math.abs(va), Math.abs(vb), 0.1);
    absDiffSum += Math.abs(va - vb) / scale;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  const cosine = denom > 0 ? Math.max(0, Math.min(1, dot / denom)) : 0;
  const meanRelDiff = absDiffSum / a.length;

  // Penalize proportional mismatch strongly so distinct faces drop below 82%
  // while minor live-webcam landmark jitter (~4-6%) on the same person stays ~88-96%
  const relSimilarity = Math.max(0, 1 - meanRelDiff * 1.85);
  const combined = cosine * 0.2 + relSimilarity * 0.8;

  return Math.max(0, Math.min(100, Math.round(combined * 100)));
}

export function createInitialLivenessState(isEnrolled: boolean): ActiveLivenessState {
  if (!isEnrolled) {
    return {
      phase: 'need_enrollment',
      blinkCompleted: false,
      headTurnCompleted: false,
      stableFrontalFrames: 0,
      consecutiveMismatchFrames: 0,
      lastMatchScore: null,
      statusMessage: 'Wajah belum terdaftar. Selesaikan Registrasi Wajah terlebih dahulu.',
    };
  }
  return {
    phase: 'wait_single_face',
    blinkCompleted: false,
    headTurnCompleted: false,
    stableFrontalFrames: 0,
    consecutiveMismatchFrames: 0,
    lastMatchScore: null,
    statusMessage: 'Posisikan tepat 1 wajah menghadap kamera untuk memulai verifikasi.',
  };
}

/**
 * Pure active anti-spoof state machine.
 * Enforces sequential transitions:
 * 1) Enrollment exists
 * 2) Single live face in frame
 * 3) Genuine eye blink (open -> blink >= 0.42 -> open <= 0.22)
 * 4) 3D head yaw + Z-depth rotation -> back to frontal
 * 5) Face descriptor match >= 82%
 */
export function evaluateActiveLivenessFrame(
  prev: ActiveLivenessState,
  telemetry: LivenessFrameTelemetry,
  isEnrolled: boolean,
  thresholdPercent = FACE_MATCH_THRESHOLD_PERCENT
): ActiveLivenessState {
  if (!isEnrolled) {
    return createInitialLivenessState(false);
  }

  if (prev.phase === 'verified') {
    return prev;
  }

  if (telemetry.faceCount === 0) {
    return {
      ...prev,
      phase: 'wait_single_face',
      stableFrontalFrames: 0,
      statusMessage: 'Wajah tidak terdeteksi. Arahkan wajah Anda ke tengah bingkai kamera.',
    };
  }

  if (telemetry.faceCount > 1) {
    return {
      ...prev,
      phase: 'wait_single_face',
      blinkCompleted: false,
      headTurnCompleted: false,
      stableFrontalFrames: 0,
      statusMessage:
        'Terdeteksi lebih dari 1 wajah di kamera. Pastikan hanya Anda seorang diri di depan kamera.',
    };
  }

  // Single face present
  if (prev.phase === 'wait_single_face') {
    if (telemetry.headPose.isFrontal) {
      return {
        ...prev,
        phase: 'challenge_blink',
        statusMessage: 'Tahap 1/3: Silakan KEDIPKAN MATA Anda 1 kali dengan jelas.',
      };
    }
    return {
      ...prev,
      statusMessage: 'Hadapkan wajah lurus ke depan kamera.',
    };
  }

  // Step 1: Eye Blink Challenge
  if (!prev.blinkCompleted) {
    if (prev.phase === 'challenge_blink') {
      if (telemetry.blinkScore >= BLINK_CLOSE_THRESHOLD) {
        return {
          ...prev,
          phase: 'blink_closing',
          statusMessage: 'Kedipan terdeteksi, buka kembali mata Anda...',
        };
      }
      return {
        ...prev,
        statusMessage: 'Tahap 1/3: Kedipkan mata Anda 1 kali (foto statis tidak bisa berkedip).',
      };
    }
    if (prev.phase === 'blink_closing') {
      if (telemetry.blinkScore <= BLINK_OPEN_THRESHOLD) {
        return {
          ...prev,
          phase: 'challenge_turn',
          blinkCompleted: true,
          statusMessage:
            'Tahap 2/3: Tolehkan kepala sedikit ke KIRI atau KANAN, lalu hadap depan kembali.',
        };
      }
      return prev;
    }
  }

  // Step 2: 3D Head Yaw + Z-depth Challenge
  if (!prev.headTurnCompleted) {
    if (prev.phase === 'challenge_turn') {
      if (telemetry.headPose.isTurnedLeftOrRight) {
        return {
          ...prev,
          phase: 'turn_detected',
          statusMessage: 'Gerakan kepala 3D terdeteksi! Sekarang hadapkan wajah lurus ke depan...',
        };
      }
      return {
        ...prev,
        statusMessage:
          'Tahap 2/3: Tolehkan kepala sedikit ke kiri atau kanan untuk validasi kedalaman 3D.',
      };
    }

    if (prev.phase === 'turn_detected') {
      if (telemetry.headPose.isFrontal) {
        return {
          ...prev,
          phase: 'ready_to_match',
          headTurnCompleted: true,
          stableFrontalFrames: 1,
          statusMessage: 'Tahap 3/3: Liveness lolos! Mencocokkan identitas wajah Anda...',
        };
      }
      return prev;
    }
  }

  // Step 3: Face Match Gate (>= 82%)
  if (prev.blinkCompleted && prev.headTurnCompleted) {
    const score = telemetry.matchScore ?? 0;
    if (score >= thresholdPercent && telemetry.headPose.isFrontal) {
      return {
        ...prev,
        phase: 'verified',
        lastMatchScore: score,
        consecutiveMismatchFrames: 0,
        statusMessage: `Identitas & keaslian wajah terverifikasi (${score}% cocok). Presensi siap dicatat.`,
      };
    }

    const nextMismatch = prev.consecutiveMismatchFrames + 1;
    if (nextMismatch >= 5) {
      return {
        ...prev,
        phase: 'rejected_mismatch',
        lastMatchScore: score,
        consecutiveMismatchFrames: nextMismatch,
        statusMessage: `Wajah tidak cocok dengan pemilik akun (${score}% < ${thresholdPercent}%). Absen ditolak.`,
      };
    }

    return {
      ...prev,
      phase: 'ready_to_match',
      lastMatchScore: score,
      consecutiveMismatchFrames: nextMismatch,
      statusMessage: `Memverifikasi kecocokan wajah (${score}%)... pastikan pencahayaan cukup.`,
    };
  }

  return prev;
}

export function summarizeAttendanceGates(
  isEnrolled: boolean,
  state: ActiveLivenessState,
  faceCount: number
): GateCheckSummary {
  const gate1Enrolled = Boolean(isEnrolled);
  const gate2SingleLiveFace = gate1Enrolled && faceCount === 1;
  const gate3LivenessPassed =
    gate1Enrolled && state.blinkCompleted && state.headTurnCompleted;
  const gate4FaceMatched =
    gate3LivenessPassed &&
    state.phase === 'verified' &&
    (state.lastMatchScore ?? 0) >= FACE_MATCH_THRESHOLD_PERCENT;

  return {
    gate1Enrolled,
    gate2SingleLiveFace,
    gate3LivenessPassed,
    gate4FaceMatched,
    allGatesPassed:
      gate1Enrolled && gate2SingleLiveFace && gate3LivenessPassed && gate4FaceMatched,
  };
}
