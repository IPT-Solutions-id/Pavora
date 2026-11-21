import React, { useMemo, useState } from 'react';
import {
  Eye,
  FileCheck2,
  FileText,
  Upload,
} from 'lucide-react';
import {
  EmployeeLeaveQuotaSummary,
  EmployeeRecord,
  LeaveAbsenceRecord,
  LeaveReplacementStaff,
  LeaveRequestType,
  buildSkdCertificatePreviewDataUrl,
  doesLeaveDeductAnnualQuota,
  isPartialDayLeaveType,
} from '../../data/masterAdminData';
import { formatIsoToShortIndoDate } from '../../utils/leaveFormPdfGenerator';
import { LeaveFormPdfModal } from '../shared/LeaveFormPdfModal';

const LEAVE_TYPE_OPTIONS: { value: LeaveRequestType; label: string; hint: string }[] = [
  { value: 'Cuti Tahunan', label: 'Cuti Tahunan', hint: 'Memotong jatah cuti tahunan' },
  { value: 'Izin Sakit', label: 'Izin Sakit (SKD)', hint: 'Wajib lampiran surat dokter' },
  { value: 'Izin Keperluan', label: 'Lainnya / Izin Keperluan', hint: 'Keperluan khusus' },
  { value: 'Datang Terlambat', label: 'Datang Terlambat', hint: 'Izin jam masuk terlambat' },
  { value: 'Pulang Lebih Awal', label: 'Pulang Lebih Awal', hint: 'Izin pulang sebelum jam normal' },
  {
    value: 'Meninggalkan Pekerjaan',
    label: 'Meninggalkan Pekerjaan',
    hint: 'Izin keluar sementara (jam s/d jam)',
  },
];

function countWorkingDaysInclusive(startIso: string, endIso: string): number {
  if (!startIso) return 1;
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${(endIso || startIso)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 1;
  }
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(1, count);
}

function computeNextWorkdayIso(endIso: string): string {
  if (!endIso) return '';
  const dt = new Date(`${endIso}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return '';
  dt.setDate(dt.getDate() + 1);
  while (dt.getDay() === 0 || dt.getDay() === 6) {
    dt.setDate(dt.getDate() + 1);
  }
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildDisplayDateRange(startIso: string, endIso: string, partialDay: boolean): string {
  if (!startIso) return '';
  const startStr = formatIsoToShortIndoDate(startIso);
  if (partialDay || !endIso || endIso === startIso) {
    return startStr;
  }
  const endStr = formatIsoToShortIndoDate(endIso);
  const startParts = startStr.split(' ');
  const endParts = endStr.split(' ');
  if (
    startParts.length === 3 &&
    endParts.length === 3 &&
    startParts[1] === endParts[1] &&
    startParts[2] === endParts[2]
  ) {
    return `${startParts[0]} – ${endParts[0]} ${endParts[1]} ${endParts[2]}`;
  }
  return `${startStr} – ${endStr}`;
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface EmployeeLeavePanelProps {
  employee: EmployeeRecord;
  allEmployees: EmployeeRecord[];
  myLeaves: LeaveAbsenceRecord[];
  leaveQuota: EmployeeLeaveQuotaSummary;
  onSubmitLeave: (input: {
    type: LeaveRequestType;
    dateRange: string;
    daysCount: number;
    reason: string;
    skdFileName?: string;
    skdFileDataUrl?: string;
    doctorOrClinicName?: string;
    categoryDetail?: string;
    startDate?: string;
    endDate?: string;
    returnToWorkDate?: string;
    timeDetail?: string;
    leaveTimeStart?: string;
    leaveTimeEnd?: string;
    contactPhone?: string;
    submittedCity?: string;
    replacementStaff?: LeaveReplacementStaff;
    approverDirectName?: string;
    approverAreaHeadName?: string;
  }) => { ok: boolean; message: string };
  onOpenSkdPreview: (record: LeaveAbsenceRecord) => void;
  onFeedback: (feedback: { tone: 'success' | 'error'; message: string }) => void;
}

export const EmployeeLeavePanel: React.FC<EmployeeLeavePanelProps> = ({
  employee,
  allEmployees,
  myLeaves,
  leaveQuota,
  onSubmitLeave,
  onOpenSkdPreview,
  onFeedback,
}) => {
  const todayIso = useMemo(() => getTodayIso(), []);
  const [leaveType, setLeaveType] = useState<LeaveRequestType>('Cuti Tahunan');
  const [categoryDetail, setCategoryDetail] = useState('Cuti Tahunan');
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [returnToWorkDate, setReturnToWorkDate] = useState(() =>
    computeNextWorkdayIso(todayIso)
  );
  const [leaveDays, setLeaveDays] = useState(1);
  const [timeDetail, setTimeDetail] = useState('09:30');
  const [leaveTimeStart, setLeaveTimeStart] = useState('13:00');
  const [leaveTimeEnd, setLeaveTimeEnd] = useState('15:00');
  const [contactPhone, setContactPhone] = useState(employee.whatsappNumber || '');
  const [submittedCity, setSubmittedCity] = useState('Jakarta');
  const [leaveReason, setLeaveReason] = useState('');

  // SKD state
  const [skdFileName, setSkdFileName] = useState('');
  const [skdFileDataUrl, setSkdFileDataUrl] = useState('');
  const [doctorOrClinicName, setDoctorOrClinicName] = useState('');

  // Replacement staff state
  const [replacementMode, setReplacementMode] = useState<'none' | 'select' | 'manual'>('none');
  const [selectedReplacementCode, setSelectedReplacementCode] = useState('');
  const [manualRep, setManualRep] = useState<LeaveReplacementStaff>({
    employeeCode: '',
    fullName: '',
    division: '',
    position: '',
    unitKerja: '',
  });

  // Approver labels printed in signature box 2
  const [approverDirectName, setApproverDirectName] = useState('Ulan Sari');
  const [approverAreaHeadName, setApproverAreaHeadName] = useState('Fathurrahman');

  // Active PDF modal record
  const [pdfModalRecord, setPdfModalRecord] = useState<LeaveAbsenceRecord | null>(null);

  const colleagueOptions = useMemo(
    () =>
      allEmployees.filter(
        (emp) =>
          emp.status === 'Aktif' &&
          emp.employeeCode.toLowerCase() !== employee.employeeCode.toLowerCase()
      ),
    [allEmployees, employee.employeeCode]
  );

  const partialDay = isPartialDayLeaveType(leaveType);
  const deductsQuota = doesLeaveDeductAnnualQuota(leaveType);

  const handleTypeChange = (nextType: LeaveRequestType) => {
    setLeaveType(nextType);
    if (nextType === 'Cuti Tahunan') {
      setCategoryDetail('Cuti Tahunan');
    } else if (nextType === 'Izin Keperluan') {
      setCategoryDetail('');
    }
    if (isPartialDayLeaveType(nextType)) {
      setEndDate(startDate);
      setReturnToWorkDate(startDate);
      setLeaveDays(0);
    } else {
      const nextDays = countWorkingDaysInclusive(startDate, endDate || startDate);
      setLeaveDays(nextDays);
      setReturnToWorkDate(computeNextWorkdayIso(endDate || startDate));
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    const resolvedEnd = partialDay || !endDate || endDate < val ? val : endDate;
    setEndDate(resolvedEnd);
    if (partialDay) {
      setReturnToWorkDate(val);
      setLeaveDays(0);
    } else {
      setLeaveDays(countWorkingDaysInclusive(val, resolvedEnd));
      setReturnToWorkDate(computeNextWorkdayIso(resolvedEnd));
    }
  };

  const handleEndDateChange = (val: string) => {
    const safeEnd = val < startDate ? startDate : val;
    setEndDate(safeEnd);
    setLeaveDays(countWorkingDaysInclusive(startDate, safeEnd));
    setReturnToWorkDate(computeNextWorkdayIso(safeEnd));
  };

  const handleSkdUpload = (file: File | null) => {
    if (!file) return;
    setSkdFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSkdFileDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAttachClinicSkd = () => {
    const sanitizedName = employee.fullName.replace(/\s+/g, '_');
    const clinicLabel = doctorOrClinicName.trim() || 'Klinik Pratama Medika — dr. Hendra Wijaya';
    setDoctorOrClinicName(clinicLabel);
    setSkdFileName(`SKD_Klinik_Medika_${sanitizedName}_${employee.employeeCode}.svg`);
    setSkdFileDataUrl(
      buildSkdCertificatePreviewDataUrl({
        employeeName: employee.fullName,
        employeeCode: employee.employeeCode,
        dateRange: buildDisplayDateRange(startDate, endDate, false),
        daysCount: Math.max(1, leaveDays),
        reason: leaveReason.trim() || 'Istirahat sakit rawat jalan sesuai pemeriksaan dokter',
        doctorOrClinicName: clinicLabel,
      })
    );
  };

  const resolvedReplacementStaff = useMemo((): LeaveReplacementStaff | undefined => {
    if (replacementMode === 'none') return undefined;
    if (replacementMode === 'select') {
      const matched = colleagueOptions.find(
        (c) => c.employeeCode === selectedReplacementCode
      );
      if (!matched) return undefined;
      return {
        employeeCode: matched.employeeCode,
        fullName: matched.fullName,
        division: matched.department,
        position: matched.position,
        unitKerja: matched.placementName || matched.entityName,
      };
    }
    if (!manualRep.fullName.trim()) return undefined;
    return manualRep;
  }, [replacementMode, selectedReplacementCode, colleagueOptions, manualRep]);

  const hcQuotaPreview = useMemo(() => {
    const before = leaveQuota.remainingLeaveQuota;
    const taken = deductsQuota ? Math.max(1, leaveDays) : 0;
    const remaining = Math.max(0, before - taken);
    return { before, taken, remaining };
  }, [leaveQuota.remainingLeaveQuota, deductsQuota, leaveDays]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedRange = buildDisplayDateRange(startDate, endDate, partialDay);
    const res = onSubmitLeave({
      type: leaveType,
      dateRange: formattedRange,
      daysCount: partialDay ? 0 : leaveDays,
      reason: leaveReason,
      skdFileName: leaveType === 'Izin Sakit' ? skdFileName : undefined,
      skdFileDataUrl: leaveType === 'Izin Sakit' ? skdFileDataUrl : undefined,
      doctorOrClinicName: leaveType === 'Izin Sakit' ? doctorOrClinicName : undefined,
      categoryDetail:
        leaveType === 'Cuti Tahunan' || leaveType === 'Izin Keperluan'
          ? categoryDetail
          : undefined,
      startDate,
      endDate: partialDay ? startDate : endDate,
      returnToWorkDate: returnToWorkDate || (partialDay ? startDate : endDate),
      timeDetail:
        leaveType === 'Datang Terlambat' || leaveType === 'Pulang Lebih Awal'
          ? timeDetail
          : undefined,
      leaveTimeStart:
        leaveType === 'Meninggalkan Pekerjaan' ? leaveTimeStart : undefined,
      leaveTimeEnd:
        leaveType === 'Meninggalkan Pekerjaan' ? leaveTimeEnd : undefined,
      contactPhone,
      submittedCity,
      replacementStaff: resolvedReplacementStaff,
      approverDirectName,
      approverAreaHeadName,
    });

    onFeedback({ tone: res.ok ? 'success' : 'error', message: res.message });
    if (res.ok) {
      setLeaveReason('');
      setSkdFileName('');
      setSkdFileDataUrl('');
      setDoctorOrClinicName('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SWAPRO HCREV-17102023 Leave & Permission Request Form */}
        <section className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-[6px] p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#102B69]">
                Formulir Permohonan Cuti / Izin
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Standar PT. SWAPRO INTERNATIONAL (FORM HCREV-17102023) · Otomatis terisi ke PDF resmi
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
            {/* Jenis Permohonan — 6 Opsi SWAPRO */}
            <div>
              <label
                htmlFor="empLeaveType"
                className="block font-semibold text-[#172033] mb-1.5"
              >
                Mengajukan Permohonan *
              </label>
              <select
                id="empLeaveType"
                data-testid="emp-leave-type-select"
                value={leaveType}
                onChange={(e) => handleTypeChange(e.target.value as LeaveRequestType)}
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-medium text-[#172033]"
              >
                {LEAVE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.hint}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-detail untuk Cuti / Lainnya */}
            {(leaveType === 'Cuti Tahunan' || leaveType === 'Izin Keperluan') && (
              <div>
                <label
                  htmlFor="empLeaveCategoryDetail"
                  className="block font-semibold text-[#172033] mb-1"
                >
                  {leaveType === 'Cuti Tahunan'
                    ? 'Jenis Cuti (dicetak di kolom Cuti)'
                    : 'Keterangan Singkat Lainnya (dicetak di kolom Lainnya)'}
                </label>
                <input
                  id="empLeaveCategoryDetail"
                  type="text"
                  value={categoryDetail}
                  onChange={(e) => setCategoryDetail(e.target.value)}
                  placeholder={
                    leaveType === 'Cuti Tahunan'
                      ? 'Contoh: Cuti Tahunan / Cuti Menikah'
                      : 'Contoh: Urusan Keluarga / Dokumen'
                  }
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                />
              </div>
            )}

            {/* Jam khusus untuk izin parsial */}
            {(leaveType === 'Datang Terlambat' || leaveType === 'Pulang Lebih Awal') && (
              <div>
                <label
                  htmlFor="empLeaveTimeDetail"
                  className="block font-semibold text-[#172033] mb-1"
                >
                  {leaveType === 'Datang Terlambat'
                    ? 'Datang Terlambat Pada Jam *'
                    : 'Pulang Lebih Awal Pada Jam *'}
                </label>
                <input
                  id="empLeaveTimeDetail"
                  data-testid="emp-leave-time-detail"
                  type="time"
                  value={timeDetail}
                  onChange={(e) => setTimeDetail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                />
              </div>
            )}

            {leaveType === 'Meninggalkan Pekerjaan' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="empLeaveTimeStart"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    Dari Jam *
                  </label>
                  <input
                    id="empLeaveTimeStart"
                    data-testid="emp-leave-time-start"
                    type="time"
                    value={leaveTimeStart}
                    onChange={(e) => setLeaveTimeStart(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="empLeaveTimeEnd"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    Sampai Jam (s/d) *
                  </label>
                  <input
                    id="empLeaveTimeEnd"
                    data-testid="emp-leave-time-end"
                    type="time"
                    value={leaveTimeEnd}
                    onChange={(e) => setLeaveTimeEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                  />
                </div>
              </div>
            )}

            {/* Tanggal Dari / Sampai / Kembali Bekerja */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="empLeaveStartDate"
                  className="block font-semibold text-[#172033] mb-1"
                >
                  {partialDay ? 'Tanggal Izin *' : 'Dari Tanggal *'}
                </label>
                <input
                  id="empLeaveStartDate"
                  data-testid="emp-leave-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                />
              </div>

              {!partialDay ? (
                <div>
                  <label
                    htmlFor="empLeaveEndDate"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    Sampai Tanggal *
                  </label>
                  <input
                    id="empLeaveEndDate"
                    data-testid="emp-leave-end-date"
                    type="date"
                    min={startDate}
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="empLeaveCity"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    Diajukan di (Kota)
                  </label>
                  <input
                    id="empLeaveCity"
                    type="text"
                    value={submittedCity}
                    onChange={(e) => setSubmittedCity(e.target.value)}
                    placeholder="Jakarta"
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>
              )}
            </div>

            {!partialDay && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="empLeaveDays"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    Hari Kerja *
                  </label>
                  <input
                    id="empLeaveDays"
                    data-testid="emp-leave-days"
                    type="number"
                    min={1}
                    max={30}
                    value={leaveDays}
                    onChange={(e) => setLeaveDays(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="empLeaveReturnDate"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    Kembali Bekerja Tgl
                  </label>
                  <input
                    id="empLeaveReturnDate"
                    type="date"
                    value={returnToWorkDate}
                    onChange={(e) => setReturnToWorkDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="empLeaveCityFull"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    Diajukan di (Kota)
                  </label>
                  <input
                    id="empLeaveCityFull"
                    type="text"
                    value={submittedCity}
                    onChange={(e) => setSubmittedCity(e.target.value)}
                    placeholder="Jakarta"
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>
              </div>
            )}

            {/* No. Telp selama tidak masuk kerja */}
            <div>
              <label
                htmlFor="empLeavePhone"
                className="block font-semibold text-[#172033] mb-1"
              >
                No. Telp yang Bisa Dihubungi Selama Tidak Masuk Kerja
              </label>
              <input
                id="empLeavePhone"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
              />
            </div>

            {/* Mandatory SKD Attachment Section when Izin Sakit */}
            {leaveType === 'Izin Sakit' && (
              <div className="p-3.5 bg-[#F5F7FA] border border-[#C9DDFB] rounded-[4px] space-y-3">
                <p className="font-bold text-[#102B69]">
                  Lampiran Surat Keterangan Dokter (SKD) — Wajib
                </p>
                <div>
                  <label
                    htmlFor="empSkdClinic"
                    className="block font-semibold text-[#172033] mb-1"
                  >
                    Nama Klinik / Rumah Sakit / Dokter Pemeriksa
                  </label>
                  <input
                    id="empSkdClinic"
                    type="text"
                    value={doctorOrClinicName}
                    onChange={(e) => setDoctorOrClinicName(e.target.value)}
                    placeholder="Contoh: Klinik Medika Jakarta — dr. Arief"
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="empSkdFile"
                      className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{skdFileName ? 'Ganti File SKD' : 'Unggah Foto / PDF SKD'}</span>
                    </label>
                    <button
                      type="button"
                      data-testid="attach-clinic-skd-btn"
                      onClick={handleAttachClinicSkd}
                      className="inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-[#1468E8] bg-white hover:bg-[#EAF2FF] border border-[#C9DDFB] rounded-[4px] cursor-pointer"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Lampirkan SKD Klinik Rekanan</span>
                    </button>
                  </div>
                  <input
                    id="empSkdFile"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleSkdUpload(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  {skdFileName ? (
                    <p className="text-[11px] font-semibold text-[#16A36A] mt-1.5">
                      File SKD terlampir: {skdFileName}
                    </p>
                  ) : (
                    <p className="text-[11px] font-semibold text-[#B87D00] mt-1.5">
                      Belum ada file SKD yang dilampirkan.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Staff Pengganti (Selama tidak masuk kerja, akan digantikan oleh) */}
            <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#172033]">
                  Staff Pengganti (Opsional)
                </span>
                <div className="inline-flex p-0.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                  {(
                    [
                      { id: 'none', label: 'Tanpa' },
                      { id: 'select', label: 'Pilih Rekan' },
                      { id: 'manual', label: 'Manual' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReplacementMode(opt.id)}
                      className={`px-2 py-1 text-[11px] font-semibold rounded-[3px] cursor-pointer ${
                        replacementMode === opt.id
                          ? 'bg-[#102B69] text-white'
                          : 'text-[#64748B] hover:text-[#102B69]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {replacementMode === 'select' && (
                <select
                  aria-label="Pilih staff pengganti"
                  data-testid="emp-replacement-select"
                  value={selectedReplacementCode}
                  onChange={(e) => setSelectedReplacementCode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                >
                  <option value="">-- Pilih Rekan Kerja Pengganti --</option>
                  {colleagueOptions.map((c) => (
                    <option key={c.employeeCode} value={c.employeeCode}>
                      {c.fullName} ({c.employeeCode}) — {c.position} · {c.entityName}
                    </option>
                  ))}
                </select>
              )}

              {replacementMode === 'manual' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="NIK Pengganti"
                    value={manualRep.employeeCode}
                    onChange={(e) =>
                      setManualRep((prev) => ({ ...prev, employeeCode: e.target.value }))
                    }
                    className="px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                  <input
                    type="text"
                    placeholder="Nama Lengkap Pengganti"
                    value={manualRep.fullName}
                    onChange={(e) =>
                      setManualRep((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    className="px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                  <input
                    type="text"
                    placeholder="Divisi"
                    value={manualRep.division}
                    onChange={(e) =>
                      setManualRep((prev) => ({ ...prev, division: e.target.value }))
                    }
                    className="px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                  <input
                    type="text"
                    placeholder="Jabatan"
                    value={manualRep.position}
                    onChange={(e) =>
                      setManualRep((prev) => ({ ...prev, position: e.target.value }))
                    }
                    className="px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                  <input
                    type="text"
                    placeholder="Unit Kerja / Klien"
                    value={manualRep.unitKerja}
                    onChange={(e) =>
                      setManualRep((prev) => ({ ...prev, unitKerja: e.target.value }))
                    }
                    className="col-span-2 px-2.5 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                  />
                </div>
              )}
            </div>

            {/* Pejabat Penandatangan di Formulir (Opsional) */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
              <div>
                <label
                  htmlFor="empApproverDirect"
                  className="block font-semibold text-[#172033] mb-1"
                >
                  Atasan Langsung
                </label>
                <input
                  id="empApproverDirect"
                  type="text"
                  value={approverDirectName}
                  onChange={(e) => setApproverDirectName(e.target.value)}
                  placeholder="Nama Atasan Langsung"
                  className="w-full px-3 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                />
              </div>
              <div>
                <label
                  htmlFor="empApproverHead"
                  className="block font-semibold text-[#172033] mb-1"
                >
                  Area / Head
                </label>
                <input
                  id="empApproverHead"
                  type="text"
                  value={approverAreaHeadName}
                  onChange={(e) => setApproverAreaHeadName(e.target.value)}
                  placeholder="Nama Area / Head"
                  className="w-full px-3 py-1.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                />
              </div>
            </div>

            {/* Pratinjau Diisi oleh HC (Hak Cuti) */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-center tabular-nums">
              <div>
                <p className="text-[11px] text-[#64748B]">Hak Cuti Saat Ini</p>
                <p className="text-sm font-bold text-[#102B69]">{hcQuotaPreview.before} hari</p>
              </div>
              <div className="border-x border-[#E2E8F0]">
                <p className="text-[11px] text-[#64748B]">Akan Diambil</p>
                <p className="text-sm font-bold text-[#1468E8]">{hcQuotaPreview.taken} hari</p>
              </div>
              <div>
                <p className="text-[11px] text-[#64748B]">Sisa Hak Cuti</p>
                <p className="text-sm font-bold text-[#16A36A]">{hcQuotaPreview.remaining} hari</p>
              </div>
            </div>

            {/* Alasan / Keterangan */}
            <div>
              <label
                htmlFor="empLeaveReason"
                className="block font-semibold text-[#172033] mb-1"
              >
                {leaveType === 'Izin Sakit'
                  ? 'Keluhan Medis / Diagnosa Singkat *'
                  : 'Alasan & Keterangan Serah Terima Tugas *'}
              </label>
              <textarea
                id="empLeaveReason"
                rows={3}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder={
                  leaveType === 'Izin Sakit'
                    ? 'Tuliskan keluhan sakit atau anjuran istirahat sesuai surat dokter...'
                    : 'Tuliskan alasan permohonan atau keterangan serah terima tugas...'
                }
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
              />
            </div>

            <button
              type="submit"
              data-testid="submit-leave-btn"
              className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer transition-colors"
            >
              {leaveType === 'Izin Sakit'
                ? 'Kirim Pengajuan Sakit + SKD & Buat Formulir SWAPRO'
                : 'Kirim Permohonan & Buat Formulir PDF SWAPRO'}
            </button>
          </form>
        </section>

        {/* Leave History List */}
        <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-base font-bold text-[#102B69]">
              Riwayat Pengajuan Cuti, Izin &amp; Formulir PDF SWAPRO
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Klik Formulir PDF pada setiap pengajuan untuk pratinjau &amp; unduh format resmi HCREV-17102023
            </p>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {myLeaves.length === 0 ? (
              <p className="p-6 text-xs text-[#64748B]">
                Belum ada pengajuan cuti atau izin tercatat.
              </p>
            ) : (
              myLeaves.map((lv) => {
                const isAlpha =
                  lv.type === 'Alpha / Tanpa Keterangan' ||
                  lv.status === 'Alpha' ||
                  lv.status === 'Perlu Klarifikasi';
                const lvPartial = isPartialDayLeaveType(lv.type);
                const durationText = lvPartial
                  ? lv.type === 'Meninggalkan Pekerjaan' && lv.leaveTimeStart && lv.leaveTimeEnd
                    ? `${lv.leaveTimeStart} s/d ${lv.leaveTimeEnd}`
                    : lv.timeDetail
                      ? `Pukul ${lv.timeDetail} WIB`
                      : 'Parsial'
                  : `${lv.daysCount} hari`;

                return (
                  <div
                    key={lv.id}
                    className="p-5 flex flex-wrap items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5 flex-1 min-w-[240px]">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-bold text-[#102B69]">
                          {lv.type} · <span className="tabular-nums">{lv.dateRange}</span> (
                          {durationText})
                        </p>
                        {lv.status === 'Disetujui' && doesLeaveDeductAnnualQuota(lv.type) && (
                          <span className="text-[11px] font-semibold text-[#1468E8] tabular-nums">
                            · Jatah Cuti -{lv.daysCount} Hari
                          </span>
                        )}
                      </div>

                      <p className="text-[#64748B]">{lv.reason}</p>

                      {lv.replacementStaff?.fullName && (
                        <p className="text-[11px] text-[#475569]">
                          Staff Pengganti:{' '}
                          <span className="font-semibold text-[#172033]">
                            {lv.replacementStaff.fullName}
                          </span>{' '}
                          ({lv.replacementStaff.employeeCode})
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {!isAlpha && (
                          <button
                            type="button"
                            data-testid={`open-leave-pdf-${lv.id}`}
                            onClick={() => setPdfModalRecord(lv)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer whitespace-nowrap transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                            <span>Formulir PDF SWAPRO</span>
                          </button>
                        )}

                        {lv.type === 'Izin Sakit' && (
                          <>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A36A]">
                              <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>SKD: {lv.skdFileName || 'Surat_Keterangan_Dokter.pdf'}</span>
                            </span>
                            {lv.skdFileDataUrl && (
                              <button
                                type="button"
                                onClick={() => onOpenSkdPreview(lv)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#1468E8] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white rounded-[4px] cursor-pointer whitespace-nowrap"
                              >
                                <Eye className="w-3 h-3" aria-hidden="true" />
                                <span>Lihat SKD</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {lv.reviewedBy && (
                        <p className="text-[11px] text-[#64748B]">
                          Diproses oleh {lv.reviewedBy}{' '}
                          {lv.reviewedAt ? `(${lv.reviewedAt})` : ''}
                        </p>
                      )}
                    </div>

                    <span
                      className={`font-bold shrink-0 ${
                        isAlpha
                          ? 'text-[#DC3545]'
                          : lv.status === 'Disetujui' || lv.status === 'Terkonfirmasi Izin'
                            ? 'text-[#16A36A]'
                            : lv.status === 'Ditolak'
                              ? 'text-[#DC3545]'
                              : 'text-[#B87D00]'
                      }`}
                    >
                      {isAlpha ? 'Alpha Mengikat' : lv.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Official SWAPRO PDF Modal */}
      {pdfModalRecord && (
        <LeaveFormPdfModal
          record={pdfModalRecord}
          employee={employee}
          quotaSummary={leaveQuota}
          onClose={() => setPdfModalRecord(null)}
        />
      )}
    </div>
  );
};
