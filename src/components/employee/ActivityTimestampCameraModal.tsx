import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Navigation,
  RefreshCw,
  RotateCcw,
  SwitchCamera,
  X,
} from 'lucide-react';
import { EmployeeRecord } from '../../data/masterAdminData';
import {
  ActivityCameraCaptureResult,
  ActivityGpsStatus,
  captureWatermarkedActivityPhoto,
  formatGpsCoordinateText,
  formatTimestampCameraLabel,
} from '../../utils/activityTimestampCamera';
import { buildGoogleMapsUrl } from '../../utils/mapsUrl';

interface ActivityTimestampCameraModalProps {
  employee: EmployeeRecord;
  targetEntityName: string;
  targetBranchName: string;
  onClose: () => void;
  onConfirmCapture: (capture: ActivityCameraCaptureResult) => void;
}

export const ActivityTimestampCameraModal: React.FC<ActivityTimestampCameraModalProps> = ({
  employee,
  targetEntityName,
  targetBranchName,
  onClose,
  onConfirmCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gpsWatchIdRef = useRef<number | null>(null);
  const gpsRequestIdRef = useRef(0);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const lastGeocodedKeyRef = useRef<string>('');
  const isMountedRef = useRef(true);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraRestartNonce, setCameraRestartNonce] = useState(0);
  const [cameraStatus, setCameraStatus] = useState<'initializing' | 'ready' | 'error'>(
    'initializing'
  );
  const [cameraError, setCameraError] = useState('');

  const [nowTick, setNowTick] = useState<Date>(() => new Date());
  const [gpsState, setGpsState] = useState<{
    status: 'searching' | ActivityGpsStatus;
    lat?: number;
    lng?: number;
    accuracyMeters?: number;
    address?: string;
    addressStatus: 'idle' | 'loading' | 'resolved' | 'unavailable';
    message: string;
  }>({
    status: 'searching',
    addressStatus: 'idle',
    message: 'Meminta izin & mengunci koordinat GPS perangkat...',
  });

  const [capturedPreview, setCapturedPreview] = useState<ActivityCameraCaptureResult | null>(null);

  // Live 1-second timestamp clock while camera viewfinder is active
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const clearGpsWatch = useCallback(() => {
    if (
      gpsWatchIdRef.current !== null &&
      typeof navigator !== 'undefined' &&
      'geolocation' in navigator
    ) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
    if (geocodeAbortRef.current) {
      geocodeAbortRef.current.abort();
      geocodeAbortRef.current = null;
    }
  }, []);

  const fetchReverseGeocode = useCallback((lat: number, lng: number, forceRefresh = false) => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (!forceRefresh && lastGeocodedKeyRef.current === key) {
      return;
    }
    lastGeocodedKeyRef.current = key;

    if (geocodeAbortRef.current) {
      geocodeAbortRef.current.abort();
    }
    const controller = new AbortController();
    geocodeAbortRef.current = controller;

    setGpsState((prev) => ({
      ...prev,
      addressStatus: 'loading',
    }));

    fetch(
      `/api/geocode/reverse?lat=${encodeURIComponent(lat.toFixed(6))}&lng=${encodeURIComponent(
        lng.toFixed(6)
      )}`,
      { signal: controller.signal }
    )
      .then((res) => res.json() as Promise<{ ok?: boolean; address?: string }>)
      .then((data) => {
        if (!isMountedRef.current || controller.signal.aborted) return;
        const resolved = typeof data?.address === 'string' ? data.address.trim() : '';
        setGpsState((prev) => ({
          ...prev,
          address: resolved || prev.address,
          addressStatus: resolved ? 'resolved' : 'unavailable',
        }));
      })
      .catch(() => {
        if (!isMountedRef.current || controller.signal.aborted) return;
        setGpsState((prev) => ({
          ...prev,
          addressStatus: prev.address ? 'resolved' : 'unavailable',
        }));
      });
  }, []);

  // Synchronous-start Geolocation requester (safe for direct user-gesture clicks & auto mount)
  const requestGpsLock = useCallback(() => {
    clearGpsWatch();
    lastGeocodedKeyRef.current = '';
    gpsRequestIdRef.current += 1;
    const currentReqId = gpsRequestIdRef.current;

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsState({
        status: 'unavailable',
        addressStatus: 'idle',
        message: 'Browser atau perangkat tidak mendukung layanan GPS.',
      });
      return;
    }

    setGpsState((prev) => ({
      ...prev,
      status: 'searching',
      message:
        prev.lat !== undefined
          ? 'Memperbarui koordinat & alamat GPS perangkat...'
          : 'Meminta izin & mengunci koordinat GPS perangkat...',
    }));

    const applyLockedPosition = (pos: GeolocationPosition, startContinuousWatch: boolean) => {
      if (!isMountedRef.current || gpsRequestIdRef.current !== currentReqId) return;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracyMeters = pos.coords.accuracy;
      setGpsState((prev) => ({
        ...prev,
        status: 'locked',
        lat,
        lng,
        accuracyMeters,
        message: `GPS terkunci (${lat.toFixed(6)}, ${lng.toFixed(6)} · ±${Math.round(accuracyMeters)} m)`,
      }));

      fetchReverseGeocode(lat, lng, startContinuousWatch);

      if (startContinuousWatch && gpsWatchIdRef.current === null) {
        gpsWatchIdRef.current = navigator.geolocation.watchPosition(
          (nextPos) => applyLockedPosition(nextPos, false),
          () => {
            // Keep already locked coordinates if a background watch tick transiently times out
          },
          {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 15000,
          }
        );
      }
    };

    const handleFinalError = (err: GeolocationPositionError) => {
      if (!isMountedRef.current || gpsRequestIdRef.current !== currentReqId) return;
      if (err.code === err.PERMISSION_DENIED) {
        const lowerMsg = (err.message || '').toLowerCase();
        const isPolicyBlocked =
          lowerMsg.includes('permissions policy') || lowerMsg.includes('disabled in this document');
        setGpsState({
          status: 'denied',
          addressStatus: 'idle',
          message: isPolicyBlocked
            ? 'Akses GPS dibatasi oleh kebijakan frame/browser. Pastikan izin Lokasi (GPS) diaktifkan lalu klik Izinkan & Kunci GPS.'
            : 'Izin lokasi GPS ditolak browser. Aktifkan izin Lokasi di ikon gembok/izin address bar browser lalu klik Izinkan & Kunci GPS.',
        });
      } else {
        setGpsState((prev) =>
          prev.lat !== undefined
            ? { ...prev, status: 'locked' }
            : {
                status: 'unavailable',
                addressStatus: 'idle',
                message:
                  'Sinyal GPS belum tertangkap. Pastikan layanan Lokasi (GPS) perangkat aktif lalu klik Coba Kunci GPS.',
              }
        );
      }
    };

    // Stage 1: High-accuracy GPS fix (invoked synchronously inside click/mount to preserve user gesture)
    navigator.geolocation.getCurrentPosition(
      (pos) => applyLockedPosition(pos, true),
      (err) => {
        if (!isMountedRef.current || gpsRequestIdRef.current !== currentReqId) return;
        // Stage 2: On desktop/indoor timeout or unavailable, gracefully fall back to standard network location
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => applyLockedPosition(fallbackPos, true),
            handleFinalError,
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            }
          );
          return;
        }
        handleFinalError(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 15000,
      }
    );
  }, [clearGpsWatch, fetchReverseGeocode]);

  // Trigger GPS permission & lock on modal open, plus listen for browser permission updates
  useEffect(() => {
    isMountedRef.current = true;
    requestGpsLock();

    let permStatus: PermissionStatus | null = null;
    const handlePermChange = () => {
      if (permStatus?.state === 'granted' && isMountedRef.current) {
        requestGpsLock();
      }
    };

    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          if (!isMountedRef.current) return;
          permStatus = status;
          status.addEventListener('change', handlePermChange);
        })
        .catch(() => {
          // Permissions API for geolocation is optional in some browsers (e.g. Safari)
        });
    }

    return () => {
      isMountedRef.current = false;
      clearGpsWatch();
      if (permStatus) {
        permStatus.removeEventListener('change', handlePermChange);
      }
    };
  }, [requestGpsLock, clearGpsWatch]);

  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start / restart live camera stream
  useEffect(() => {
    if (capturedPreview) {
      stopCameraTracks();
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      stopCameraTracks();
      setCameraStatus('initializing');
      setCameraError('');

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('error');
        setCameraError(
          'Browser tidak mendukung akses kamera langsung (getUserMedia). Gunakan Chrome, Edge, atau Safari versi terbaru.'
        );
        return;
      }

      let stream: MediaStream;
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (primaryErr) {
          const errName = primaryErr instanceof Error ? primaryErr.name : '';
          if (
            errName === 'OverconstrainedError' ||
            errName === 'ConstraintNotSatisfiedError' ||
            errName === 'NotFoundError'
          ) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } else {
            throw primaryErr;
          }
        }
      } catch (err) {
        if (cancelled) return;
        setCameraStatus('error');
        const errName = err instanceof Error ? err.name : '';
        const errMsg = err instanceof Error ? err.message.toLowerCase() : '';
        if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errName === 'SecurityError' ||
          errMsg.includes('permission') ||
          errMsg.includes('denied')
        ) {
          setCameraError(
            'Izin kamera ditolak oleh browser. Aktifkan izin kamera pada address bar lalu klik Coba Hubungkan Kamera Ulang.'
          );
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setCameraError(
            'Perangkat kamera tidak ditemukan. Pastikan kamera/webcam terpasang lalu klik Coba Hubungkan Kamera Ulang.'
          );
        } else {
          setCameraError(
            'Kamera sedang digunakan aplikasi lain atau gagal dibuka. Tutup aplikasi lain lalu coba ulang.'
          );
        }
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      if (!cancelled) {
        setCameraStatus('ready');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCameraTracks();
    };
  }, [facingMode, cameraRestartNonce, capturedPreview, stopCameraTracks]);

  const liveStamp = useMemo(() => formatTimestampCameraLabel(nowTick), [nowTick]);
  const resolvedGpsStatus: ActivityGpsStatus =
    gpsState.status === 'searching' ? 'unavailable' : gpsState.status;
  const liveGpsText = useMemo(
    () =>
      gpsState.status === 'searching'
        ? 'Mengunci koordinat GPS...'
        : formatGpsCoordinateText(
            gpsState.lat,
            gpsState.lng,
            gpsState.accuracyMeters,
            resolvedGpsStatus
          ),
    [gpsState, resolvedGpsStatus]
  );

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || cameraStatus !== 'ready') return;

    const captureTime = new Date();
    const captureLabel = formatTimestampCameraLabel(captureTime);
    const effectiveGpsStatus: ActivityGpsStatus =
      gpsState.status === 'locked'
        ? 'locked'
        : gpsState.status === 'denied'
          ? 'denied'
          : 'unavailable';

    const dataUrl = captureWatermarkedActivityPhoto({
      video,
      canvas,
      mirrorHorizontal: facingMode === 'user',
      overlayInput: {
        capturedAtDisplay: captureLabel.display,
        employeeName: employee.fullName,
        employeeCode: employee.employeeCode,
        employmentType: employee.employmentType,
        targetEntityName: targetEntityName || employee.entityName,
        targetBranchName: targetBranchName || employee.placementName || 'Lokasi Kerja',
        gpsLat: gpsState.lat,
        gpsLng: gpsState.lng,
        gpsAccuracyMeters: gpsState.accuracyMeters,
        gpsAddress: gpsState.address,
        gpsStatus: effectiveGpsStatus,
      },
    });

    if (!dataUrl) {
      setCameraError('Frame kamera belum siap dibaca. Tunggu sebentar lalu jepret ulang.');
      return;
    }

    const compactTs = `${captureTime.getFullYear()}${String(captureTime.getMonth() + 1).padStart(
      2,
      '0'
    )}${String(captureTime.getDate()).padStart(2, '0')}-${String(captureTime.getHours()).padStart(
      2,
      '0'
    )}${String(captureTime.getMinutes()).padStart(2, '0')}${String(
      captureTime.getSeconds()
    ).padStart(2, '0')}`;

    setCapturedPreview({
      fileName: `cam-${employee.employeeCode.toLowerCase()}-${compactTs}.jpg`,
      dataUrl,
      capturedAt: captureLabel.display,
      capturedAtIso: captureLabel.iso,
      gpsLat: gpsState.lat,
      gpsLng: gpsState.lng,
      gpsAccuracyMeters: gpsState.accuracyMeters,
      gpsAddress: gpsState.address,
      gpsStatus: effectiveGpsStatus,
    });
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    setCameraRestartNonce((n) => n + 1);
  };

  const handleConfirm = () => {
    if (!capturedPreview) return;
    stopCameraTracks();
    onConfirmCapture(capturedPreview);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-camera-modal-title"
    >
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#102B69] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Camera className="w-5 h-5 text-[#FF7A1A] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="activity-camera-modal-title" className="text-sm font-bold truncate">
                Live Timestamp Kamera &amp; Koordinat GPS
              </h2>
              <p className="text-[11px] text-[#EAF2FF]/80 truncate">
                {employee.fullName} ({employee.employeeCode}) · {targetEntityName || employee.entityName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCameraTracks();
              onClose();
            }}
            aria-label="Tutup live timestamp kamera"
            className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-[4px] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* GPS Status Bar */}
          <div
            data-testid="live-camera-gps-status"
            className={`px-3.5 py-2.5 rounded-[4px] border text-xs flex flex-wrap items-center justify-between gap-2 ${
              gpsState.status === 'locked'
                ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A36A]'
                : gpsState.status === 'denied'
                  ? 'bg-[#FFF8EB] border-[#FDE68A] text-[#B87D00]'
                  : 'bg-[#EAF2FF] border-[#C9DDFB] text-[#102B69]'
            }`}
          >
            <div className="flex items-start gap-2 font-semibold min-w-0 flex-1">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <span className="block leading-snug">{gpsState.message}</span>
                {gpsState.status === 'locked' && (
                  <p
                    data-testid="live-camera-gps-address"
                    className="text-[11px] font-medium text-[#172033] leading-snug"
                  >
                    {gpsState.addressStatus === 'loading' && !gpsState.address
                      ? 'Mengambil nama jalan & alamat lokasi...'
                      : gpsState.address
                        ? `Alamat: ${gpsState.address}`
                        : 'Alamat jalan belum terbaca (koordinat GPS tetap terkunci).'}
                  </p>
                )}
                {gpsState.status === 'locked' &&
                  typeof gpsState.lat === 'number' &&
                  typeof gpsState.lng === 'number' && (
                    <a
                      href={buildGoogleMapsUrl(gpsState.lat, gpsState.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1468E8] hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      <span>Cek Titik di Google Maps</span>
                    </a>
                  )}
              </div>
            </div>
            <button
              type="button"
              data-testid="request-gps-permission-btn"
              onClick={requestGpsLock}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                gpsState.status === 'denied' || gpsState.status === 'unavailable'
                  ? 'bg-[#102B69] hover:bg-[#1468E8] text-white border border-[#102B69]'
                  : 'bg-white/90 hover:bg-white border border-current/20'
              }`}
            >
              {gpsState.status === 'denied' || gpsState.status === 'unavailable' ? (
                <Navigation className="w-3 h-3" aria-hidden="true" />
              ) : (
                <RefreshCw
                  className={`w-3 h-3 ${gpsState.status === 'searching' ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              )}
              <span>
                {gpsState.status === 'denied'
                  ? 'Izinkan & Kunci GPS'
                  : gpsState.status === 'unavailable'
                    ? 'Coba Kunci GPS'
                    : gpsState.status === 'searching'
                      ? 'Mengunci GPS...'
                      : 'Perbarui GPS'}
              </span>
            </button>
          </div>

          {/* Camera Viewfinder / Captured Preview */}
          <div className="relative bg-[#0B1736] border border-[#E2E8F0] rounded-[6px] overflow-hidden aspect-[4/3] flex items-center justify-center">
            {capturedPreview ? (
              <img
                src={capturedPreview.dataUrl}
                alt="Hasil foto timestamp kamera"
                data-testid="captured-timestamp-photo-preview"
                className="w-full h-full object-contain bg-[#0B1736]"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  data-testid="live-activity-camera-video"
                  className={`w-full h-full object-cover ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  } ${cameraStatus === 'ready' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                />

                {/* Live Timestamp & GPS HUD Overlay */}
                {cameraStatus === 'ready' && (
                  <div
                    data-testid="live-camera-overlay"
                    className="pointer-events-none absolute inset-0 flex flex-col justify-between"
                  >
                    <div className="p-3 flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#102B69]/85 border border-[#FF7A1A] rounded-[4px] text-[10px] font-bold tracking-wide text-white uppercase">
                        <span className="w-2 h-2 rounded-full bg-[#FF7A1A]" />
                        LIVE KAMERA · TIMESTAMP &amp; GPS
                      </span>
                      <span className="px-2 py-1 bg-[#0B1736]/80 rounded-[4px] text-[10px] font-semibold text-[#EAF2FF]">
                        Kamera {facingMode === 'environment' ? 'Belakang' : 'Depan'}
                      </span>
                    </div>

                    <div className="bg-[#0B1736]/80 border-t-2 border-[#FF7A1A] px-3.5 py-2.5 text-[11px] font-mono leading-snug space-y-0.5">
                      <p className="font-bold text-[#FDE68A] tabular-nums">
                        LIVE TIMESTAMP: {liveStamp.display}
                      </p>
                      <p
                        className={`font-bold tabular-nums ${
                          gpsState.status === 'locked'
                            ? 'text-[#86EFAC]'
                            : gpsState.status === 'denied'
                              ? 'text-[#FCD34D]'
                              : 'text-[#93C5FD]'
                        }`}
                      >
                        GPS: {liveGpsText}
                      </p>
                      {(gpsState.address || gpsState.addressStatus === 'loading') && (
                        <p className="font-semibold text-[#BAE6FD] line-clamp-2">
                          ALAMAT:{' '}
                          {gpsState.address || 'Mengambil alamat lokasi...'}
                        </p>
                      )}
                      <p className="text-white truncate">
                        {employee.fullName} ({employee.employeeCode}) ·{' '}
                        {employee.employmentType === 'Internal' ? 'Internal' : 'Eksternal'}
                      </p>
                      <p className="text-[#CBD5E1] truncate">
                        {targetEntityName || employee.entityName} ·{' '}
                        {targetBranchName || employee.placementName || 'Lokasi Kerja'}
                      </p>
                    </div>
                  </div>
                )}

                {cameraStatus === 'initializing' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white space-y-2 bg-[#0B1736]">
                    <Camera className="w-8 h-8 text-[#1468E8]" aria-hidden="true" />
                    <p className="text-sm font-bold">Mengaktifkan Live Kamera...</p>
                    <p className="text-xs text-[#EAF2FF]/75">
                      Mohon izinkan akses kamera pada peramban Anda.
                    </p>
                  </div>
                )}

                {cameraStatus === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white space-y-3 bg-[#0B1736]">
                    <AlertCircle className="w-9 h-9 text-[#FF7A1A]" aria-hidden="true" />
                    <p className="text-sm font-bold">Kamera Live Wajib Aktif</p>
                    <p className="text-xs text-[#EAF2FF]/85 max-w-md leading-relaxed">
                      {cameraError}
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
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {capturedPreview ? (
              <>
                <div className="text-[11px] text-[#16A36A] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>
                    Foto &amp; watermark timestamp siap digunakan ({capturedPreview.capturedAt})
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    data-testid="retake-activity-photo"
                    onClick={handleRetake}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Jepret Ulang</span>
                  </button>
                  <button
                    type="button"
                    data-testid="confirm-activity-photo"
                    onClick={handleConfirm}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#16A36A] hover:bg-[#128557] rounded-[4px] cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Gunakan Foto Ini</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                >
                  <SwitchCamera className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    Ganti ke Kamera {facingMode === 'environment' ? 'Depan' : 'Belakang'}
                  </span>
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      stopCameraTracks();
                      onClose();
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    data-testid="capture-timestamp-photo"
                    disabled={cameraStatus !== 'ready'}
                    onClick={handleCapturePhoto}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1468E8] hover:bg-[#102B69] disabled:bg-[#94A3B8] disabled:cursor-not-allowed rounded-[4px] cursor-pointer"
                  >
                    <Camera className="w-4 h-4" aria-hidden="true" />
                    <span>Ambil Foto Timestamp</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
