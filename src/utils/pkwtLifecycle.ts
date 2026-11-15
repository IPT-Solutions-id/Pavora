import type { ContractHistoryItem, EmployeeRecord } from '../data/masterAdminData.ts';

export function resolveEmployeeContractSequenceLabel(
  employee: Pick<EmployeeRecord, 'contractType' | 'contractHistory'>
): string {
  const history = employee.contractHistory ?? [];
  if (history.length > 0) {
    const activeWaiting = history.find((h) => h.signatureStatus === 'Menunggu TTD Karyawan');
    if (activeWaiting?.sequenceLabel) return activeWaiting.sequenceLabel;
    const latest = history[history.length - 1];
    if (latest?.sequenceLabel) return latest.sequenceLabel;
  }
  return employee.contractType === 'PKWTT' ? 'PKWTT (Tetap)' : 'PKWT Ke-1';
}

export function resolveLatestContractSignatureStatus(
  employee: Pick<EmployeeRecord, 'contractType' | 'contractHistory' | 'documents'>
): ContractHistoryItem['signatureStatus'] {
  const history = employee.contractHistory ?? [];
  if (history.length > 0) {
    const waiting = history.find((h) => h.signatureStatus === 'Menunggu TTD Karyawan');
    if (waiting) return 'Menunggu TTD Karyawan';
    return history[history.length - 1].signatureStatus;
  }
  if (employee.contractType === 'PKWT' && !employee.documents.contractUploaded) {
    return 'Menunggu TTD Karyawan';
  }
  return employee.documents.contractUploaded ? 'Sudah TTD Digital' : 'Menunggu TTD Karyawan';
}

export function isContractSignedLocked(
  signatureStatus?: ContractHistoryItem['signatureStatus'] | null
): boolean {
  return (
    signatureStatus === 'Sudah TTD Digital' ||
    signatureStatus === 'Sudah Upload TTD Manual' ||
    signatureStatus === 'Selesai / Digantikan'
  );
}

export function isPkwtModalReadOnly(options: {
  viewerRole: 'admin' | 'employee';
  signatureStatus?: ContractHistoryItem['signatureStatus'] | null;
}): boolean {
  if (options.viewerRole === 'employee') return true;
  return isContractSignedLocked(options.signatureStatus);
}

export function canSignContractHistoryItem(
  item?: Pick<ContractHistoryItem, 'signatureStatus' | 'contractType'> | null
): boolean {
  if (!item) return false;
  if (item.contractType !== 'PKWT') return false;
  return item.signatureStatus === 'Menunggu TTD Karyawan';
}

export function addMonthsToIsoDate(isoDate: string, monthsToAdd: number): string {
  const clean = isoDate.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (!match) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + monthsToAdd);
    return fallback.toISOString().slice(0, 10);
  }
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  const target = new Date(Date.UTC(year, monthIdx + monthsToAdd, day));
  return target.toISOString().slice(0, 10);
}

export function buildExtendedPkwtContractDraft(options: {
  employee: Pick<
    EmployeeRecord,
    | 'id'
    | 'employeeCode'
    | 'fullName'
    | 'entityName'
    | 'placementName'
    | 'placementLocation'
    | 'placementArea'
    | 'placementMapsUrl'
    | 'position'
    | 'contractNumber'
    | 'joinDate'
    | 'contractEndDate'
    | 'contractHistory'
  >;
  months?: number;
  nowMs?: number;
}): {
  sequenceNumber: number;
  sequenceLabel: string;
  nextStartDate: string;
  nextEndDate: string;
  nextContractNumber: string;
  newHistoryItem: ContractHistoryItem;
} {
  const months = options.months ?? 6;
  const existingHistory = options.employee.contractHistory ?? [];
  const pkwtCount = existingHistory.filter((h) => h.contractType === 'PKWT').length;
  const sequenceNumber = Math.max(2, pkwtCount + 1);
  const sequenceLabel = `PKWT Ke-${sequenceNumber}`;

  const latestItem = existingHistory[existingHistory.length - 1];
  const prevEnd =
    latestItem?.endDate || options.employee.contractEndDate || options.employee.joinDate || '2026-11-15';
  const nextStartDate = /^\d{4}-\d{2}-\d{2}$/.test(prevEnd)
    ? addMonthsToIsoDate(prevEnd, 0) === prevEnd
      ? (() => {
          const d = new Date(`${prevEnd}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() + 1);
          return d.toISOString().slice(0, 10);
        })()
      : prevEnd
    : new Date().toISOString().slice(0, 10);

  const nextEndDate = addMonthsToIsoDate(nextStartDate, months);
  const baseContractNo = (latestItem?.contractNumber || options.employee.contractNumber || `PKWT-${options.employee.employeeCode}`)
    .replace(/-EXT\d+$/i, '');
  const nextContractNumber = `${baseContractNo}-EXT${sequenceNumber}`;

  const stamp = options.nowMs ?? Date.now();
  const newHistoryItem: ContractHistoryItem = {
    id: `hist-${stamp}-${sequenceNumber}`,
    sequenceLabel,
    contractType: 'PKWT',
    contractNumber: nextContractNumber,
    startDate: nextStartDate,
    endDate: nextEndDate,
    entityName: options.employee.entityName,
    placementName: options.employee.placementName || options.employee.placementLocation,
    placementArea: options.employee.placementArea,
    placementMapsUrl: options.employee.placementMapsUrl,
    position: options.employee.position,
    signatureStatus: 'Menunggu TTD Karyawan',
    signerEmployeeName: options.employee.fullName,
    notes: `Perpanjangan ${sequenceLabel} (${months} bulan) diterbitkan HR / Super Admin. Menunggu tinjauan & TTD digital karyawan.`,
  };

  return {
    sequenceNumber,
    sequenceLabel,
    nextStartDate,
    nextEndDate,
    nextContractNumber,
    newHistoryItem,
  };
}
