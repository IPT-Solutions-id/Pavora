import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  MapPin,
  PlusCircle,
  Search,
  X,
} from 'lucide-react';
import {
  ActivityProgressStatus,
  EmployeeActivityReportInput,
  EmployeeActivityReportRecord,
  EmployeeRecord,
  formatIndonesianDate,
  resolveEmployeeActivityScopeOptions,
  summarizeActivityReports,
} from '../../data/masterAdminData';
import {
  ActivityCameraCaptureResult,
  ActivityGpsStatus,
  formatGpsCoordinateText,
} from '../../utils/activityTimestampCamera';
import { buildGoogleMapsUrl } from '../../utils/mapsUrl';
import { ActivityTimestampCameraModal } from './ActivityTimestampCameraModal';

interface EmployeeActivityPanelProps {
  employee: EmployeeRecord;
  reports: EmployeeActivityReportRecord[];
  onSubmitReport: (input: EmployeeActivityReportInput) => {
    ok: boolean;
    message: string;
  };
  onUpdateReport: (
    reportId: string,
    input: EmployeeActivityReportInput
  ) => {
    ok: boolean;
    message: string;
  };
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getProgressBadgeClass(status: ActivityProgressStatus): string {
  switch (status) {
    case 'Selesai':
      return 'bg-[#F0FDF4] text-[#16A36A] border-[#BBF7D0]';
    case 'Terkendala':
      return 'bg-[#FEF2F2] text-[#DC3545] border-[#FECACA]';
    case 'Berjalan':
    default:
      return 'bg-[#FFF8EB] text-[#B87D00] border-[#FDE68A]';
  }
}

export const EmployeeActivityPanel: React.FC<EmployeeActivityPanelProps> = ({
  employee,
  reports,
  onSubmitReport,
  onUpdateReport,
}) => {
  const scopeOptions = useMemo(() => resolveEmployeeActivityScopeOptions(employee), [employee]);

  const myReports = useMemo(
    () =>
      reports.filter(
        (r) =>
          r.employeeId === employee.id ||
          r.employeeCode.toLowerCase() === employee.employeeCode.toLowerCase()
      ),
    [reports, employee.id, employee.employeeCode]
  );

  const summary = useMemo(() => summarizeActivityReports(myReports), [myReports]);

  const initialScope = scopeOptions[0] ?? {
    entityName: employee.entityName,
    branches: [employee.placementName || employee.placementLocation || 'Lokasi Kerja'],
  };

  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [activityDate, setActivityDate] = useState<string>(getTodayIso);
  const [targetEntityName, setTargetEntityName] = useState<string>(initialScope.entityName);
  const [targetBranchName, setTargetBranchName] = useState<string>(initialScope.branches[0] ?? '');
  const [customBranchMode, setCustomBranchMode] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progressStatus, setProgressStatus] = useState<ActivityProgressStatus>('Berjalan');
  const [attachmentFileName, setAttachmentFileName] = useState('');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState('');
  const [photoCapturedAt, setPhotoCapturedAt] = useState('');
  const [photoGpsLat, setPhotoGpsLat] = useState<number | undefined>(undefined);
  const [photoGpsLng, setPhotoGpsLng] = useState<number | undefined>(undefined);
  const [photoGpsAccuracyMeters, setPhotoGpsAccuracyMeters] = useState<number | undefined>(undefined);
  const [photoGpsAddress, setPhotoGpsAddress] = useState<string>('');
  const [photoGpsStatus, setPhotoGpsStatus] = useState<ActivityGpsStatus | undefined>(undefined);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Filter state for history list
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyProgressFilter, setHistoryProgressFilter] = useState<
    ActivityProgressStatus | 'Semua'
  >('Semua');
  const [previewReport, setPreviewReport] = useState<EmployeeActivityReportRecord | null>(null);

  const selectedEntityScope = useMemo(
    () =>
      scopeOptions.find((o) => o.entityName === targetEntityName) ??
      scopeOptions[0] ??
      initialScope,
    [scopeOptions, targetEntityName, initialScope]
  );

  const resetFormToCreate = () => {
    setEditingReportId(null);
    setActivityDate(getTodayIso());
    setTargetEntityName(initialScope.entityName);
    setTargetBranchName(initialScope.branches[0] ?? '');
    setCustomBranchMode(false);
    setTitle('');
    setDescription('');
    setProgressStatus('Berjalan');
    setAttachmentFileName('');
    setAttachmentDataUrl('');
    setPhotoCapturedAt('');
    setPhotoGpsLat(undefined);
    setPhotoGpsLng(undefined);
    setPhotoGpsAccuracyMeters(undefined);
    setPhotoGpsAddress('');
    setPhotoGpsStatus(undefined);
  };

  const handleEntityChange = (nextEntity: string) => {
    setTargetEntityName(nextEntity);
    const matched = scopeOptions.find((o) => o.entityName === nextEntity);
    if (matched && matched.branches.length > 0) {
      setTargetBranchName(matched.branches[0]);
      setCustomBranchMode(false);
    } else {
      setTargetBranchName('');
      setCustomBranchMode(true);
    }
  };

  const handleStartEdit = (report: EmployeeActivityReportRecord) => {
    setFeedback(null);
    setEditingReportId(report.id);
    setActivityDate(report.activityDate);
    setTargetEntityName(report.targetEntityName);
    const matched = scopeOptions.find((o) => o.entityName === report.targetEntityName);
    const inList = matched?.branches.some(
      (b) => b.toLowerCase() === report.targetBranchName.toLowerCase()
    );
    setCustomBranchMode(!inList);
    setTargetBranchName(report.targetBranchName);
    setTitle(report.title);
    setDescription(report.description);
    setProgressStatus(report.progressStatus);
    setAttachmentFileName(report.attachmentFileName ?? '');
    setAttachmentDataUrl(report.attachmentDataUrl ?? '');
    setPhotoCapturedAt(report.photoCapturedAt ?? '');
    setPhotoGpsLat(report.photoGpsLat);
    setPhotoGpsLng(report.photoGpsLng);
    setPhotoGpsAccuracyMeters(report.photoGpsAccuracyMeters);
    setPhotoGpsAddress(report.photoGpsAddress ?? '');
    setPhotoGpsStatus(report.photoGpsStatus);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCameraConfirm = (capture: ActivityCameraCaptureResult) => {
    setAttachmentFileName(capture.fileName);
    setAttachmentDataUrl(capture.dataUrl);
    setPhotoCapturedAt(capture.capturedAt);
    setPhotoGpsLat(capture.gpsLat);
    setPhotoGpsLng(capture.gpsLng);
    setPhotoGpsAccuracyMeters(capture.gpsAccuracyMeters);
    setPhotoGpsAddress(capture.gpsAddress ?? '');
    setPhotoGpsStatus(capture.gpsStatus);
    setShowCameraModal(false);
    setFeedback(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReportId && !attachmentDataUrl.trim()) {
      setFeedback({
        ok: false,
        text: 'Ambil foto bukti melalui Live Timestamp Kamera terlebih dahulu sebelum mengirim laporan.',
      });
      return;
    }

    const payload: EmployeeActivityReportInput = {
      activityDate,
      targetEntityName,
      targetBranchName,
      title,
      description,
      progressStatus,
      attachmentFileName: attachmentFileName || undefined,
      attachmentDataUrl: attachmentDataUrl || undefined,
      photoCapturedAt: photoCapturedAt || undefined,
      photoGpsLat,
      photoGpsLng,
      photoGpsAccuracyMeters,
      photoGpsAddress: photoGpsAddress || undefined,
      photoGpsStatus,
    };

    const result = editingReportId
      ? onUpdateReport(editingReportId, payload)
      : onSubmitReport(payload);

    setFeedback({ ok: result.ok, text: result.message });
    if (result.ok) {
      resetFormToCreate();
    }
  };

  const visibleHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    return myReports.filter((r) => {
      if (historyProgressFilter !== 'Semua' && r.progressStatus !== historyProgressFilter) {
        return false;
      }
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.targetEntityName.toLowerCase().includes(q) ||
        r.targetBranchName.toLowerCase().includes(q)
      );
    });
  }, [myReports, historyQuery, historyProgressFilter]);

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Total Kegiatan Saya</p>
          <p
            data-testid="emp-activity-kpi-total"
            className="text-2xl font-extrabold text-[#102B69] mt-1 tabular-nums"
          >
            {summary.total}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            {employee.employmentType === 'Internal' ? 'Jalur Internal' : 'Penempatan Klien'}
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Selesai</p>
          <p
            data-testid="emp-activity-kpi-completed"
            className="text-2xl font-extrabold text-[#16A36A] mt-1 tabular-nums"
          >
            {summary.completed}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">Tugas tuntas</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Sedang Berjalan</p>
          <p
            data-testid="emp-activity-kpi-ongoing"
            className="text-2xl font-extrabold text-[#B87D00] mt-1 tabular-nums"
          >
            {summary.ongoing}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">Dapat diperbarui</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Terkendala</p>
          <p
            data-testid="emp-activity-kpi-blocked"
            className="text-2xl font-extrabold text-[#DC3545] mt-1 tabular-nums"
          >
            {summary.blocked}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">Butuh tindak lanjut</p>
        </div>
      </div>

      {/* Create / Update Activity Form */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#102B69] flex items-center gap-2">
              {editingReportId ? (
                <Edit3 className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
              ) : (
                <PlusCircle className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
              )}
              <span>
                {editingReportId
                  ? 'Perbarui Laporan Kegiatan'
                  : 'Catat / Update Laporan Kegiatan Baru'}
              </span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {employee.employmentType === 'Internal'
                ? 'Pilih aktivitas unit internal atau client & cabang yang Anda handle. Laporan langsung terpantau Admin & Master Admin tanpa proses ACC.'
                : 'Catat aktivitas harian dan progres kerja di client & cabang penempatan Anda. Anda dapat memperbarui progres kapan saja.'}
            </p>
          </div>
          {editingReportId && (
            <button
              type="button"
              onClick={resetFormToCreate}
              className="px-3 py-1.5 text-xs font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
            >
              Batal Update
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {feedback && (
            <div
              role="status"
              data-testid="emp-activity-feedback"
              className={`p-3.5 rounded-[4px] border text-xs font-semibold flex items-center justify-between gap-3 ${
                feedback.ok
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A36A]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC3545]'
              }`}
            >
              <span className="flex items-center gap-2">
                {feedback.ok && <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />}
                <span>{feedback.text}</span>
              </span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="Tutup pesan status"
                className="p-0.5 hover:bg-black/5 rounded-[4px] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="activity-date"
                className="block text-xs font-semibold text-[#102B69] mb-1.5"
              >
                Tanggal Kegiatan <span className="text-[#DC3545]">*</span>
              </label>
              <input
                id="activity-date"
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
              />
            </div>

            <div>
              <label
                htmlFor="activity-progress"
                className="block text-xs font-semibold text-[#102B69] mb-1.5"
              >
                Status Progres <span className="text-[#DC3545]">*</span>
              </label>
              <select
                id="activity-progress"
                value={progressStatus}
                onChange={(e) => setProgressStatus(e.target.value as ActivityProgressStatus)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8] cursor-pointer"
              >
                <option value="Berjalan">Berjalan</option>
                <option value="Selesai">Selesai</option>
                <option value="Terkendala">Terkendala</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="activity-target-entity"
                className="block text-xs font-semibold text-[#102B69] mb-1.5"
              >
                {employee.employmentType === 'Internal'
                  ? 'Unit / Client yang Ditangani'
                  : 'Client Penempatan'}{' '}
                <span className="text-[#DC3545]">*</span>
              </label>
              <select
                id="activity-target-entity"
                value={targetEntityName}
                onChange={(e) => handleEntityChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8] cursor-pointer"
              >
                {scopeOptions.map((opt) => (
                  <option key={opt.entityName} value={opt.entityName}>
                    {opt.entityName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="activity-target-branch"
                  className="text-xs font-semibold text-[#102B69] whitespace-nowrap"
                >
                  Cabang / Lokasi Kegiatan <span className="text-[#DC3545]">*</span>
                </label>
                {selectedEntityScope.branches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomBranchMode((prev) => {
                        const next = !prev;
                        if (!next && selectedEntityScope.branches[0]) {
                          setTargetBranchName(selectedEntityScope.branches[0]);
                        }
                        return next;
                      });
                    }}
                    className="text-[11px] font-semibold text-[#1468E8] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {customBranchMode ? 'Pilih dari daftar' : 'Tulis cabang manual'}
                  </button>
                )}
              </div>
              {customBranchMode || selectedEntityScope.branches.length === 0 ? (
                <input
                  id="activity-target-branch"
                  type="text"
                  value={targetBranchName}
                  onChange={(e) => setTargetBranchName(e.target.value)}
                  placeholder="Contoh: Adira Tebet / Kunjungan Lapangan"
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                />
              ) : (
                <select
                  id="activity-target-branch"
                  value={targetBranchName}
                  onChange={(e) => setTargetBranchName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8] cursor-pointer"
                >
                  {selectedEntityScope.branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="activity-title"
              className="block text-xs font-semibold text-[#102B69] mb-1.5"
            >
              Judul / Ringkasan Kegiatan <span className="text-[#DC3545]">*</span>
            </label>
            <input
              id="activity-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Verifikasi 25 berkas pengajuan nasabah & sinkronisasi jadwal shift"
              required
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
            />
          </div>

          <div>
            <label
              htmlFor="activity-description"
              className="block text-xs font-semibold text-[#102B69] mb-1.5"
            >
              Deskripsi Detail &amp; Hasil Kegiatan <span className="text-[#DC3545]">*</span>
            </label>
            <textarea
              id="activity-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tuliskan detail pekerjaan yang dilakukan, capaian, atau catatan kendala di lapangan..."
              required
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
            />
          </div>

          {/* Live Timestamp Camera Capture Card */}
          <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#102B69] flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#1468E8]" aria-hidden="true" />
                  <span>
                    Foto Bukti Live Kamera (Timestamp &amp; GPS){' '}
                    {!editingReportId && <span className="text-[#DC3545]">*</span>}
                  </span>
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Foto diambil langsung dari kamera dengan stempel waktu berjalan dan koordinat GPS otomatis (tanpa unggah galeri).
                </p>
              </div>
              <button
                type="button"
                data-testid="open-activity-camera-btn"
                onClick={() => setShowCameraModal(true)}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-[#102B69] hover:bg-[#1468E8] rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {attachmentDataUrl ? 'Ambil Ulang Foto Kamera' : 'Buka Live Kamera + GPS'}
                </span>
              </button>
            </div>

            {attachmentDataUrl && (
              <div
                data-testid="emp-captured-camera-card"
                className="flex flex-col sm:flex-row items-start gap-4 bg-white border border-[#E2E8F0] rounded-[4px] p-3"
              >
                <img
                  src={attachmentDataUrl}
                  alt={attachmentFileName || 'Foto timestamp kegiatan'}
                  className="w-full sm:w-44 h-32 object-cover rounded-[4px] border border-[#E2E8F0] shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                  <p className="font-bold text-[#102B69] truncate">
                    {attachmentFileName || 'Foto Timestamp Kamera'}
                  </p>
                  {photoCapturedAt && (
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#172033] tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-[#1468E8] shrink-0" aria-hidden="true" />
                      <span>Timestamp: {photoCapturedAt}</span>
                    </p>
                  )}
                  <p
                    className={`flex items-center gap-1.5 text-[11px] font-semibold tabular-nums ${
                      photoGpsStatus === 'locked'
                        ? 'text-[#16A36A]'
                        : photoGpsStatus === 'denied'
                          ? 'text-[#B87D00]'
                          : 'text-[#64748B]'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      GPS:{' '}
                      {formatGpsCoordinateText(
                        photoGpsLat,
                        photoGpsLng,
                        photoGpsAccuracyMeters,
                        photoGpsStatus ?? 'unavailable'
                      )}
                    </span>
                  </p>
                  {photoGpsAddress && (
                    <p className="text-[11px] font-medium text-[#172033] leading-snug">
                      Alamat: {photoGpsAddress}
                    </p>
                  )}
                  {photoGpsStatus !== 'locked' && (
                    <p className="text-[11px] text-[#B87D00]">
                      Koordinat GPS belum terkunci pada foto ini. Klik <strong>Ambil Ulang Foto Kamera</strong> lalu tekan <strong>Izinkan &amp; Kunci GPS</strong> bila ingin menyertakan titik lokasi.
                    </p>
                  )}
                  {typeof photoGpsLat === 'number' && typeof photoGpsLng === 'number' && (
                    <div>
                      <a
                        href={buildGoogleMapsUrl(photoGpsLat, photoGpsLng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1468E8] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        <span>Lihat Titik GPS di Google Maps</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              data-testid="submit-activity-report"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" aria-hidden="true" />
              <span>
                {editingReportId ? 'Simpan Pembaruan Kegiatan' : 'Kirim Laporan Kegiatan'}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* Personal Activity History List */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#102B69]">
              Riwayat &amp; Pembaruan Kegiatan Saya
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Klik tombol <strong>Update Kegiatan</strong> pada item mana saja untuk memperbarui progres atau catatan hasil kerja.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Cari kegiatan..."
                aria-label="Cari riwayat kegiatan saya"
                className="pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
              />
            </div>
            <select
              value={historyProgressFilter}
              onChange={(e) =>
                setHistoryProgressFilter(e.target.value as ActivityProgressStatus | 'Semua')
              }
              aria-label="Filter status progres riwayat kegiatan"
              className="px-2.5 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8] cursor-pointer"
            >
              <option value="Semua">Semua Progres</option>
              <option value="Berjalan">Berjalan</option>
              <option value="Selesai">Selesai</option>
              <option value="Terkendala">Terkendala</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {visibleHistory.length === 0 ? (
            <div className="py-10 px-6 text-center text-xs text-[#64748B]">
              Belum ada catatan laporan kegiatan yang sesuai. Gunakan form di atas untuk menambahkan laporan baru.
            </div>
          ) : (
            visibleHistory.map((item) => (
              <article
                key={item.id}
                data-testid={`emp-activity-item-${item.id}`}
                className="p-5 sm:px-6 hover:bg-[#F8FAFC]/70 transition-colors flex flex-col lg:flex-row lg:items-start justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-[#102B69] tabular-nums">
                      {formatIndonesianDate(item.activityDate)}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-[4px] border ${getProgressBadgeClass(
                        item.progressStatus
                      )}`}
                    >
                      {item.progressStatus}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-semibold text-[#102B69] bg-[#EAF2FF] rounded-[4px]">
                      {item.targetEntityName} · {item.targetBranchName}
                    </span>
                    {item.updateCount > 0 && (
                      <span className="text-[11px] font-semibold text-[#1468E8] tabular-nums">
                        Diperbarui {item.updateCount}x ({item.updatedAt})
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-[#172033]">{item.title}</h4>
                  <p className="text-xs text-[#64748B] leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>

                  {(item.attachmentFileName || item.photoCapturedAt) && (
                    <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPreviewReport(item)}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#1468E8] hover:underline cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Lihat Foto Kamera ({item.attachmentFileName ?? 'Lampiran'})</span>
                      </button>
                      {item.photoCapturedAt && (
                        <span className="inline-flex items-center gap-1 text-[#64748B] tabular-nums">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          <span>{item.photoCapturedAt}</span>
                        </span>
                      )}
                      {typeof item.photoGpsLat === 'number' && typeof item.photoGpsLng === 'number' && (
                        <span className="inline-flex items-center gap-1 text-[#16A36A] font-semibold tabular-nums">
                          <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>
                            {item.photoGpsLat.toFixed(5)}, {item.photoGpsLng.toFixed(5)}
                            {item.photoGpsAddress ? ` · ${item.photoGpsAddress}` : ''}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid={`edit-activity-${item.id}`}
                    onClick={() => handleStartEdit(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] whitespace-nowrap cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Update Kegiatan</span>
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Attachment Preview Modal */}
      {previewReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau lampiran kegiatan"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 bg-[#102B69] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold truncate">
                Lampiran · {previewReport.attachmentFileName}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewReport(null)}
                aria-label="Tutup pratinjau lampiran"
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {previewReport.attachmentDataUrl ? (
                <div className="border border-[#E2E8F0] rounded-[4px] bg-[#F8FAFC] p-3 flex justify-center">
                  <img
                    src={previewReport.attachmentDataUrl}
                    alt={previewReport.attachmentFileName || 'Lampiran kegiatan'}
                    className="max-h-72 w-auto object-contain rounded-[4px]"
                  />
                </div>
              ) : (
                <p className="text-[#64748B]">
                  Lampiran tersimpan sebagai berkas dokumen: <strong>{previewReport.attachmentFileName}</strong>.
                </p>
              )}
              {(previewReport.photoCapturedAt || previewReport.photoGpsLat !== undefined) && (
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] space-y-1 text-[11px]">
                  {previewReport.photoCapturedAt && (
                    <p className="font-semibold text-[#102B69] tabular-nums">
                      Waktu Tangkap Kamera: {previewReport.photoCapturedAt}
                    </p>
                  )}
                  <p
                    className={`font-semibold tabular-nums ${
                      previewReport.photoGpsStatus === 'locked'
                        ? 'text-[#16A36A]'
                        : previewReport.photoGpsStatus === 'denied'
                          ? 'text-[#B87D00]'
                          : 'text-[#64748B]'
                    }`}
                  >
                    Koordinat GPS:{' '}
                    {formatGpsCoordinateText(
                      previewReport.photoGpsLat,
                      previewReport.photoGpsLng,
                      previewReport.photoGpsAccuracyMeters,
                      previewReport.photoGpsStatus ?? 'unavailable'
                    )}
                  </p>
                  {previewReport.photoGpsAddress && (
                    <p className="text-[#172033] font-medium leading-snug">
                      Alamat Lokasi: {previewReport.photoGpsAddress}
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewReport(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Timestamp & GPS Camera Modal */}
      {showCameraModal && (
        <ActivityTimestampCameraModal
          employee={employee}
          targetEntityName={targetEntityName}
          targetBranchName={targetBranchName}
          onClose={() => setShowCameraModal(false)}
          onConfirmCapture={handleCameraConfirm}
        />
      )}
    </div>
  );
};
