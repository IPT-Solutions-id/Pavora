import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  MapPin,
  RefreshCw,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  AttendanceLocationRecord,
  EmployeeRecord,
  ResolvedEmployeeAttendancePolicy,
} from '../../data/masterAdminData';
import {
  ActiveLivenessState,
  FACE_MATCH_THRESHOLD_PERCENT,
  computeFaceDescriptorSimilarity,
  computeHeadYawRatio,
  createInitialLivenessState,
  evaluateActiveLivenessFrame,
  extractGeometricFaceDescriptor,
  summarizeAttendanceGates,
} from '../../utils/faceVerification';
import { extractMaxBlinkScore, getBrowserFaceLandmarker } from '../../utils/faceLandmarkerClient';

interface FaceAttendanceCameraModalProps {
  mode: 'enroll' | 'checkin' | 'checkout';
  employee: EmployeeRecord;
  locations: AttendanceLocationRecord[];
  workSchedule?: ResolvedEmployeeAttendancePolicy;
  onClose: () => void;
  onCompleteEnrollment: (descriptor: number[], referenceSnapshot: string) => void;
  onCompleteAttendance: (payload: {
    locationUsed: string;
    notes: string;
    faceMatchScore: number;
    selfieSnapshot: string;
  }) => { ok: boolean; message: string };
}

export const FaceAttendanceCameraModal: React.FC<FaceAttendanceCameraModalProps> = ({
  mode,
  employee,
  locations,
  workSchedule,
  onClose,
  onCompleteEnrollment,
  onCompleteAttendance,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  const isEnrollMode = mode === 'enroll';
  const isEnrolled = Boolean(employee.faceBiometric?.enrolled && employee.faceBiometric.descriptor?.length);

  const [cameraStatus, setCameraStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');
  const [cameraError, setCameraError] = useState<string>('');
  const [modelReady, setModelReady] = useState<boolean>(false);
  const [liveFaceCount, setLiveFaceCount] = useState<number>(0);
  const [liveDescriptor, setLiveDescriptor] = useState<number[]>([]);
  const [enrollBlinkDone, setEnrollBlinkDone] = useState<boolean>(false);
  const [enrollBlinkClosing, setEnrollBlinkClosing] = useState<boolean>(false);
  const [livenessState, setLivenessState] = useState<ActiveLivenessState>(() =>
    createInitialLivenessState(isEnrollMode ? true : isEnrolled)
  );
  const [capturedSnapshot, setCapturedSnapshot] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');
  const [cameraRestartNonce, setCameraRestartNonce] = useState<number>(0);

  const scopedActiveLocations = useMemo(() => {
    const forEntity = locations.filter(
      (loc) => loc.status === 'Aktif' && loc.entityName === employee.entityName
    );
    if (forEntity.length > 0) return forEntity;
    return locations.filter((loc) => loc.status === 'Aktif');
  }, [locations, employee.entityName]);

  const defaultLocationName = useMemo(() => {
    if (workSchedule?.matchedLocation?.name) {
      return workSchedule.matchedLocation.name;
    }
    return (
      scopedActiveLocations[0]?.name ??
      employee.placementName ??
      employee.placementLocation ??
      employee.entityName
    );
  }, [workSchedule, scopedActiveLocations, employee.placementName, employee.placementLocation, employee.entityName]);

  const [selectedLocation, setSelectedLocation] = useState<string>(defaultLocationName);
  const [attendanceNotes, setAttendanceNotes] = useState<string>('');

  const enrollBlinkDoneRef = useRef(enrollBlinkDone);
  enrollBlinkDoneRef.current = enrollBlinkDone;
  const enrollBlinkClosingRef = useRef(enrollBlinkClosing);
  enrollBlinkClosingRef.current = enrollBlinkClosing;
  const livenessRef = useRef(livenessState);
  livenessRef.current = livenessState;
  const capturedSnapshotRef = useRef(capturedSnapshot);
  capturedSnapshotRef.current = capturedSnapshot;

  const takeCompressedSelfie = (): string => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return '';
    const targetWidth = 420;
    const targetHeight = Math.round((video.videoHeight / video.videoWidth) * targetWidth);
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/jpeg', 0.78);
  };

  useEffect(() => {
    let cancelled = false;

    const stopStream = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    const startPipeline = async () => {
      setCameraStatus('initializing');
      setCameraError('');
      setModelReady(false);

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('error');
        setCameraError(
          'Peramban Anda tidak mendukung akses kamera langsung (getUserMedia). Gunakan browser modern dengan webcam aktif.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => undefined);
        }
        setCameraStatus('ready');

        const landmarker = await getBrowserFaceLandmarker();
        if (cancelled) return;
        setModelReady(true);

        const processFrame = () => {
          if (cancelled) return;
          const v = videoRef.current;
          const overlay = overlayCanvasRef.current;

          if (v && v.readyState >= 2 && v.videoWidth > 0 && v.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = v.currentTime;
            const nowMs = performance.now();
            const result = landmarker.detectForVideo(v, nowMs);
            const faceCount = result.faceLandmarks?.length ?? 0;
            setLiveFaceCount(faceCount);

            if (overlay) {
              overlay.width = v.videoWidth;
              overlay.height = v.videoHeight;
              const oCtx = overlay.getContext('2d');
              if (oCtx) {
                oCtx.clearRect(0, 0, overlay.width, overlay.height);
                if (faceCount === 1 && result.faceLandmarks[0]) {
                  const pts = result.faceLandmarks[0];
                  oCtx.fillStyle = '#16A36A';
                  for (let i = 0; i < pts.length; i += 6) {
                    const p = pts[i];
                    oCtx.fillRect(p.x * overlay.width, p.y * overlay.height, 2.5, 2.5);
                  }
                }
              }
            }

            if (faceCount === 1 && result.faceLandmarks[0]) {
              const landmarks = result.faceLandmarks[0];
              const descriptor = extractGeometricFaceDescriptor(landmarks);
              const blinkScore = extractMaxBlinkScore(result);
              const headPose = computeHeadYawRatio(landmarks);

              if (isEnrollMode) {
                if (headPose.isFrontal && descriptor.length > 0) {
                  setLiveDescriptor(descriptor);
                }
                if (!enrollBlinkDoneRef.current) {
                  if (!enrollBlinkClosingRef.current && blinkScore >= 0.42) {
                    setEnrollBlinkClosing(true);
                  } else if (enrollBlinkClosingRef.current && blinkScore <= 0.22) {
                    setEnrollBlinkDone(true);
                    if (!capturedSnapshotRef.current) {
                      const snap = takeCompressedSelfie();
                      if (snap) setCapturedSnapshot(snap);
                    }
                  }
                } else if (!capturedSnapshotRef.current && headPose.isFrontal) {
                  const snap = takeCompressedSelfie();
                  if (snap) setCapturedSnapshot(snap);
                }
              } else {
                const enrolledDesc = employee.faceBiometric?.descriptor ?? [];
                const matchScore =
                  isEnrolled && descriptor.length > 0
                    ? computeFaceDescriptorSimilarity(descriptor, enrolledDesc)
                    : 0;

                const nextState = evaluateActiveLivenessFrame(
                  livenessRef.current,
                  { faceCount, blinkScore, headPose, matchScore },
                  isEnrolled,
                  FACE_MATCH_THRESHOLD_PERCENT
                );

                setLivenessState(nextState);

                if (nextState.phase === 'verified' && !capturedSnapshotRef.current) {
                  const snap = takeCompressedSelfie();
                  if (snap) setCapturedSnapshot(snap);
                }
              }
            } else if (!isEnrollMode) {
              const nextState = evaluateActiveLivenessFrame(
                livenessRef.current,
                {
                  faceCount,
                  blinkScore: 0,
                  headPose: {
                    yawRatio: 0,
                    zDepthDelta: 0,
                    isFrontal: false,
                    isTurnedLeftOrRight: false,
                  },
                  matchScore: null,
                },
                isEnrolled,
                FACE_MATCH_THRESHOLD_PERCENT
              );
              setLivenessState(nextState);
            }
          }

          rafRef.current = requestAnimationFrame(processFrame);
        };

        rafRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        if (cancelled) return;
        setCameraStatus('error');
        const message = err instanceof Error ? err.message : '';
        if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('denied')) {
          setCameraError(
            'Izin kamera ditolak oleh browser. Aktifkan izin webcam agar sistem dapat melakukan verifikasi wajah live.'
          );
        } else {
          setCameraError(
            'Perangkat webcam tidak terdeteksi atau sedang dipakai aplikasi lain. Hubungkan kamera untuk melanjutkan.'
          );
        }
      }
    };

    startPipeline();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isEnrollMode, isEnrolled, employee.faceBiometric?.descriptor, cameraRestartNonce]);

  const gates = summarizeAttendanceGates(isEnrolled, livenessState, liveFaceCount);
  const canSubmitEnroll =
    isEnrollMode &&
    cameraStatus === 'ready' &&
    modelReady &&
    liveFaceCount === 1 &&
    enrollBlinkDone &&
    liveDescriptor.length > 0;

  const canSubmitAttendance = !isEnrollMode && gates.allGatesPassed && Boolean(capturedSnapshot);

  const handleConfirmEnroll = () => {
    if (!canSubmitEnroll) return;
    const finalSnapshot = capturedSnapshot || takeCompressedSelfie();
    onCompleteEnrollment(liveDescriptor, finalSnapshot);
  };

  const handleConfirmAttendance = () => {
    if (!canSubmitAttendance) return;
    setSubmitError('');
    const result = onCompleteAttendance({
      locationUsed: selectedLocation,
      notes: attendanceNotes,
      faceMatchScore: livenessState.lastMatchScore ?? FACE_MATCH_THRESHOLD_PERCENT,
      selfieSnapshot: capturedSnapshot || takeCompressedSelfie(),
    });
    if (!result.ok) {
      setSubmitError(result.message);
    }
  };

  const handleRetryVerification = () => {
    setSubmitError('');
    setCapturedSnapshot('');
    setEnrollBlinkDone(false);
    setEnrollBlinkClosing(false);
    setLivenessState(createInitialLivenessState(isEnrollMode ? true : isEnrolled));
  };

  const titleLabel = isEnrollMode
    ? 'Registrasi Biometrik Wajah Karyawan'
    : mode === 'checkin'
      ? 'Presensi Clock-In · Verifikasi Wajah Live'
      : 'Presensi Clock-Out · Verifikasi Wajah Live';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="face-camera-modal-title"
    >
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#102B69] text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <ScanFace className="w-5 h-5 text-[#FF7A1A] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="face-camera-modal-title" className="text-base font-bold truncate">
                {titleLabel}
              </h2>
              <p className="text-xs text-[#EAF2FF]/80 truncate">
                {employee.fullName} ({employee.employeeCode}) · Anti-Spoof Live Camera
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup kamera verifikasi wajah"
            className="p-1.5 text-[#EAF2FF] hover:text-white bg-white/10 hover:bg-white/20 rounded-[4px] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Live Webcam Feed */}
          <div className="lg:col-span-7 space-y-3">
            <div className="relative bg-[#0B1736] border border-[#E2E8F0] rounded-[6px] overflow-hidden aspect-[4/3] flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] ${
                  cameraStatus === 'ready' ? 'block' : 'hidden'
                }`}
              />
              <canvas
                ref={overlayCanvasRef}
                className="pointer-events-none absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              />
              <canvas ref={captureCanvasRef} className="hidden" />

              {cameraStatus === 'initializing' && (
                <div className="p-6 text-center text-white space-y-2">
                  <Camera className="w-8 h-8 mx-auto text-[#1468E8]" aria-hidden="true" />
                  <p className="text-sm font-bold">Mengaktifkan Kamera Langsung...</p>
                  <p className="text-xs text-[#EAF2FF]/75">
                    Mohon izinkan akses webcam pada browser Anda.
                  </p>
                </div>
              )}

              {cameraStatus === 'error' && (
                <div className="p-6 text-center text-white space-y-3 max-w-sm">
                  <ShieldAlert className="w-9 h-9 mx-auto text-[#FF7A1A]" aria-hidden="true" />
                  <p className="text-sm font-bold">Kamera Live Wajib Aktif</p>
                  <p className="text-xs text-[#EAF2FF]/85 leading-relaxed">{cameraError}</p>
                  <p className="text-[11px] text-[#EAF2FF]/70">
                    Demi keamanan anti-kecurangan, sistem menolak unggahan pas foto atau galeri gambar untuk presensi.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCameraRestartNonce((n) => n + 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#0E56C5] rounded-[4px] cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Coba Hubungkan Kamera Ulang</span>
                  </button>
                </div>
              )}

              {cameraStatus === 'ready' && !modelReady && (
                <div className="absolute bottom-3 left-3 right-3 px-3 py-2 bg-[#102B69]/90 border border-white/20 rounded-[4px] text-xs text-white font-semibold">
                  Memuat model deteksi landmark wajah 3D...
                </div>
              )}
            </div>

            {/* Live Status Prompt Bar */}
            <div
              role="status"
              aria-live="polite"
              className={`p-3.5 rounded-[4px] border text-xs font-semibold flex items-start gap-2.5 ${
                (isEnrollMode && canSubmitEnroll) || (!isEnrollMode && gates.allGatesPassed)
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A36A]'
                  : livenessState.phase === 'rejected_mismatch' || cameraStatus === 'error'
                    ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC3545]'
                    : 'bg-[#EAF2FF] border-[#C9DDFB] text-[#102B69]'
              }`}
            >
              {(isEnrollMode && canSubmitEnroll) || (!isEnrollMode && gates.allGatesPassed) ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <span>
                {isEnrollMode
                  ? enrollBlinkDone
                    ? 'Liveness & wajah depan terverifikasi! Klik Simpan Biometrik Wajah.'
                    : enrollBlinkClosing
                      ? 'Kedipan terdeteksi, buka mata kembali menghadap depan...'
                      : 'Hadapkan wajah ke kamera lalu KEDIPKAN MATA 1x untuk menyimpan biometrik asli.'
                  : livenessState.statusMessage}
              </span>
            </div>
          </div>

          {/* Right: 4-Gate Anti-Spoof Checklist & Controls */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4 text-xs">
            <div className="space-y-4">
              {isEnrollMode ? (
                <div className="p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[6px] space-y-2.5">
                  <h3 className="text-xs font-bold text-[#102B69]">
                    Tahapan Registrasi Wajah Asli
                  </h3>
                  <div className="flex items-center justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">1. Kamera Live &amp; Model 3D</span>
                    <span className={modelReady ? 'font-bold text-[#16A36A]' : 'font-semibold text-[#B87D00]'}>
                      {modelReady ? 'Aktif' : 'Memuat'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">2. Tepat 1 Wajah di Kamera</span>
                    <span
                      className={
                        liveFaceCount === 1 ? 'font-bold text-[#16A36A]' : 'font-semibold text-[#B87D00]'
                      }
                    >
                      {liveFaceCount === 1 ? '1 Wajah Valid' : `${liveFaceCount} Wajah`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#64748B]">3. Kedipan Mata (Anti-Foto)</span>
                    <span
                      className={
                        enrollBlinkDone ? 'font-bold text-[#16A36A]' : 'font-semibold text-[#B87D00]'
                      }
                    >
                      {enrollBlinkDone ? 'Selesai' : 'Menunggu Kedipan'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[6px] space-y-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                    <h3 className="text-xs font-bold text-[#102B69]">
                      4 Gerbang Anti-Spoof Presensi
                    </h3>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Gate 1 · Biometrik Terdaftar</span>
                    <span
                      className={
                        gates.gate1Enrolled ? 'font-bold text-[#16A36A]' : 'font-bold text-[#DC3545]'
                      }
                    >
                      {gates.gate1Enrolled ? 'Terdaftar' : 'Belum'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Gate 2 · 1 Wajah Live</span>
                    <span
                      className={
                        gates.gate2SingleLiveFace
                          ? 'font-bold text-[#16A36A]'
                          : 'font-semibold text-[#B87D00]'
                      }
                    >
                      {gates.gate2SingleLiveFace ? 'Valid' : `${liveFaceCount} Terdeteksi`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Gate 3 · Kedip &amp; Toleh 3D</span>
                    <span
                      className={
                        gates.gate3LivenessPassed
                          ? 'font-bold text-[#16A36A]'
                          : 'font-semibold text-[#B87D00]'
                      }
                    >
                      {gates.gate3LivenessPassed
                        ? 'Lolos'
                        : livenessState.blinkCompleted
                          ? 'Kedip OK · Toleh'
                          : 'Kedip Dulu'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#64748B]">Gate 4 · Cocok Pemilik (≥82%)</span>
                    <span
                      className={
                        gates.gate4FaceMatched
                          ? 'font-bold text-[#16A36A] tabular-nums'
                          : livenessState.phase === 'rejected_mismatch'
                            ? 'font-bold text-[#DC3545] tabular-nums'
                            : 'font-semibold text-[#64748B] tabular-nums'
                      }
                    >
                      {livenessState.lastMatchScore !== null
                        ? `${livenessState.lastMatchScore}%`
                        : 'Menunggu'}
                    </span>
                  </div>
                </div>
              )}

              {!isEnrollMode && (
                <div className="space-y-3">
                  {workSchedule && (
                    <div className="p-3 bg-[#EAF2FF]/60 border border-[#C9DDFB] rounded-[4px] text-[11px] text-[#102B69] space-y-1 tabular-nums">
                      <p className="font-bold">
                        Aturan Wajib ({workSchedule.policySourceLabel}): {workSchedule.checkInTime}–
                        {workSchedule.checkOutTime} WIB
                      </p>
                      <p className="text-[#64748B]">
                        Toleransi {workSchedule.lateToleranceMinutes} mnt · {workSchedule.workDays}{' '}
                        · {workSchedule.locationMode}
                      </p>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="attendanceLocationSelect"
                      className="block font-semibold text-[#172033] mb-1"
                    >
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                        Titik Lokasi Penempatan ({employee.entityName})
                      </span>
                    </label>
                    <select
                      id="attendanceLocationSelect"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69] font-medium"
                    >
                      {scopedActiveLocations.map((loc) => (
                        <option key={loc.id} value={loc.name}>
                          {loc.name} ({loc.radiusMeters}m · {loc.mode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="attendanceNotesInput" className="block font-semibold text-[#172033] mb-1">
                      Catatan Kehadiran (Opsional)
                    </label>
                    <input
                      id="attendanceNotesInput"
                      type="text"
                      value={attendanceNotes}
                      onChange={(e) => setAttendanceNotes(e.target.value)}
                      placeholder="Contoh: Shift pagi di cabang operasional"
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033]"
                    />
                  </div>
                </div>
              )}

              {submitError && (
                <div
                  role="alert"
                  className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[4px] text-[#DC3545] font-medium"
                >
                  {submitError}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex flex-col gap-2">
              {isEnrollMode ? (
                <button
                  type="button"
                  disabled={!canSubmitEnroll}
                  onClick={handleConfirmEnroll}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] disabled:bg-[#94A3B8] disabled:cursor-not-allowed rounded-[4px] cursor-pointer transition-colors"
                >
                  Simpan Biometrik Wajah
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canSubmitAttendance}
                  onClick={handleConfirmAttendance}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#16A36A] hover:bg-[#128557] disabled:bg-[#94A3B8] disabled:cursor-not-allowed rounded-[4px] cursor-pointer transition-colors"
                >
                  {mode === 'checkin' ? 'Catat Clock-In Terverifikasi' : 'Catat Clock-Out Terverifikasi'}
                </button>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleRetryVerification}
                  className="px-3 py-2 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                >
                  Ulangi Deteksi
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
