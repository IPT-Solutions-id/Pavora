import { useEffect, useMemo, useState } from 'react';
import {
  ApprovalRequestRecord,
  AttendanceLocationRecord,
  AttendanceLogRecord,
  AuditLogRecord,
  ContractHistoryItem,
  ContractRecord,
  DepartmentRecord,
  EmployeeFormInput,
  EmployeeRecord,
  EmploymentCategory,
  EntityRecord,
  INITIAL_APPROVALS,
  INITIAL_ATTENDANCE_LOGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CONTRACTS,
  INITIAL_DEPARTMENTS,
  INITIAL_EMPLOYEES,
  INITIAL_ENTITIES,
  INITIAL_LEAVE_ABSENCES,
  INITIAL_ONBOARDING_CANDIDATES,
  INITIAL_OPERATIONAL_SNAPSHOTS,
  INITIAL_POLICY,
  INITIAL_SETTINGS,
  INITIAL_USERS,
  LeaveAbsenceRecord,
  OnboardingCandidateRecord,
  OperationalSnapshot,
  SystemSettingsConfig,
  UserAccountRecord,
  UserRoleName,
  WorkPolicyConfig,
  WorkspaceNotificationRecord,
  buildLiveOperationalSnapshots,
  buildSkdCertificatePreviewDataUrl,
  calculateDaysRemaining,
  calculateEmployeeLeaveQuotaSummary,
  countUploadedDocuments,
  createAuditEntry,
  evaluateAttendanceAgainstPolicy,
  extractEntityNikPrefix,
  formatIndonesianDate,
  generateClientEmployeeNik,
  getContractEocIndicator,
  resolveEmployeeWorkSchedule,
  syncAttendanceLocationsFromEntities,
  validateLeaveRequestSubmission,
} from '../data/masterAdminData';
import { FACE_MATCH_THRESHOLD_PERCENT } from '../utils/faceVerification';
import {
  buildExtendedPkwtContractDraft,
  isContractSignedLocked,
} from '../utils/pkwtLifecycle';
import {
  ApplicantProfileRecord,
  ApplicationStage,
  INITIAL_APPLICANT_PROFILES,
  INITIAL_JOB_APPLICATIONS,
  INITIAL_VACANCIES,
  InterviewScheduleRecord,
  JobApplicationRecord,
  JobVacancyRecord,
  buildApplicantEmployeeFormPrefill,
  calculateApplicantProfileCompleteness,
  computeRemainingHeadcount,
} from '../data/recruitmentData';
import type { MasterAdminUser } from '../utils/validation';

const WORKSPACE_STORAGE_KEY = 'pevora_hris_workspace_v1';

interface PersistedWorkspaceSlice {
  entities: EntityRecord[];
  employees: EmployeeRecord[];
  users: UserAccountRecord[];
  approvals: ApprovalRequestRecord[];
  snapshots: OperationalSnapshot[];
  attendanceLogs: AttendanceLogRecord[];
  leaveAbsences: LeaveAbsenceRecord[];
  contracts: ContractRecord[];
  onboardingCandidates: OnboardingCandidateRecord[];
  auditLogs: AuditLogRecord[];
  policy: WorkPolicyConfig;
  settings: SystemSettingsConfig;
  vacancies: JobVacancyRecord[];
  applicants: ApplicantProfileRecord[];
  applications: JobApplicationRecord[];
  notifications: WorkspaceNotificationRecord[];
}

function loadPersistedWorkspace(): Partial<PersistedWorkspaceSlice> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Partial<PersistedWorkspaceSlice>) : {};
  } catch {
    return {};
  }
}

export function useWorkspaceStore() {
  const [initial] = useState<Partial<PersistedWorkspaceSlice>>(() => loadPersistedWorkspace());

  const [entities, setEntities] = useState<EntityRecord[]>(() => {
    const base = initial.entities ?? INITIAL_ENTITIES;
    return base.map((ent) => {
      const seed = INITIAL_ENTITIES.find((s) => s.id === ent.id || s.code === ent.code);
      if (!seed) return ent;
      return {
        ...seed,
        ...ent,
        supportedPositions: ent.supportedPositions ?? seed.supportedPositions,
        supportedPlacements: ent.supportedPlacements ?? seed.supportedPlacements,
        legalCompanyName: ent.legalCompanyName ?? seed.legalCompanyName,
        industryLabel: ent.industryLabel ?? seed.industryLabel,
        placementAddress: ent.placementAddress ?? seed.placementAddress,
        pksNumber: ent.pksNumber ?? seed.pksNumber,
        headcountQuota: ent.headcountQuota ?? seed.headcountQuota,
        defaultBaseSalary: ent.defaultBaseSalary ?? seed.defaultBaseSalary,
      };
    });
  });
  const [departments] = useState<DepartmentRecord[]>(INITIAL_DEPARTMENTS);
  const [employees, setEmployees] = useState<EmployeeRecord[]>(
    initial.employees ?? INITIAL_EMPLOYEES
  );
  const [users, setUsers] = useState<UserAccountRecord[]>(initial.users ?? INITIAL_USERS);
  const [approvals, setApprovals] = useState<ApprovalRequestRecord[]>(
    initial.approvals ?? INITIAL_APPROVALS
  );
  const [snapshots, setSnapshots] = useState<OperationalSnapshot[]>(
    initial.snapshots ?? INITIAL_OPERATIONAL_SNAPSHOTS
  );
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogRecord[]>(
    initial.attendanceLogs ?? INITIAL_ATTENDANCE_LOGS
  );
  const [leaveAbsences, setLeaveAbsences] = useState<LeaveAbsenceRecord[]>(() => {
    const base = initial.leaveAbsences ?? INITIAL_LEAVE_ABSENCES;
    const mapped = base.map((item) => {
      if (item.id === 'lv-1' && item.type === 'Alpha / Tanpa Keterangan') {
        return {
          ...item,
          status: 'Alpha' as const,
          reason:
            'Tidak melakukan presensi masuk dan tanpa pengajuan cuti/izin resmi (Status Alpha Mengikat)',
        };
      }
      return item;
    });
    if (!mapped.some((item) => item.id === 'lv-5')) {
      const seedSick = INITIAL_LEAVE_ABSENCES.find((item) => item.id === 'lv-5');
      if (seedSick) return [seedSick, ...mapped];
    }
    return mapped;
  });
  const [contracts, setContracts] = useState<ContractRecord[]>(
    initial.contracts ?? INITIAL_CONTRACTS
  );
  const [onboardingCandidates, setOnboardingCandidates] = useState<OnboardingCandidateRecord[]>(
    initial.onboardingCandidates ?? INITIAL_ONBOARDING_CANDIDATES
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(
    initial.auditLogs ?? INITIAL_AUDIT_LOGS
  );
  const [policy, setPolicy] = useState<WorkPolicyConfig>(initial.policy ?? INITIAL_POLICY);
  const [settings, setSettings] = useState<SystemSettingsConfig>(() => ({
    ...INITIAL_SETTINGS,
    ...(initial.settings ?? {}),
  }));
  const [vacancies, setVacancies] = useState<JobVacancyRecord[]>(
    initial.vacancies ?? INITIAL_VACANCIES
  );
  const [applicants, setApplicants] = useState<ApplicantProfileRecord[]>(
    initial.applicants ?? INITIAL_APPLICANT_PROFILES
  );
  const [applications, setApplications] = useState<JobApplicationRecord[]>(
    initial.applications ?? INITIAL_JOB_APPLICATIONS
  );
  const [notifications, setNotifications] = useState<WorkspaceNotificationRecord[]>(() => {
    const seeded: WorkspaceNotificationRecord[] = [];
    for (const lv of INITIAL_LEAVE_ABSENCES) {
      if (lv.status === 'Menunggu') {
        seeded.push({
          id: `notif-leave-${lv.id}`,
          type: 'leave-submitted',
          title: `Pengajuan ${lv.type} — ${lv.employeeName} (${lv.employeeCode})`,
          message: `${lv.dateRange} (${lv.daysCount} hari)${lv.skdFileName ? ` · Lampiran SKD: ${lv.skdFileName}` : ''} · ${lv.entityName}`,
          createdAt: lv.submittedAt ?? 'Menunggu Persetujuan',
          targetMenu: 'monitoring',
          employeeCode: lv.employeeCode,
          entityName: lv.entityName,
          leaveId: lv.id,
          recipientRole: 'admin',
          read: false,
        });
      }
    }
    for (const emp of initial.employees ?? INITIAL_EMPLOYEES) {
      if (emp.isNewHire) {
        seeded.push({
          id: `notif-new-${emp.id}`,
          type: 'new-employee',
          title: `Karyawan Baru: ${emp.fullName} (${emp.employeeCode})`,
          message: `${emp.position} · ${emp.entityName}${emp.placementName ? ` (${emp.placementName})` : ''}.`,
          createdAt: 'Baru masuk',
          targetMenu: 'employees',
          employeeCode: emp.employeeCode,
          entityName: emp.entityName,
          recipientRole: 'admin',
          read: false,
        });
      }
      const eoc = getContractEocIndicator(emp.contractType, emp.contractEndDate);
      if (eoc.isExpiring) {
        seeded.push({
          id: `notif-eoc-${emp.id}`,
          type: 'pkwt-expiring',
          title: `Kontrak ${eoc.badgeLabel} — ${emp.fullName}`,
          message: `NIK ${emp.employeeCode} · EOC ${formatIndonesianDate(emp.contractEndDate)} (${emp.entityName}).`,
          createdAt: 'Pengingat EOC',
          targetMenu: 'employees',
          employeeCode: emp.employeeCode,
          entityName: emp.entityName,
          recipientRole: 'admin',
          read: false,
        });
      }
    }
    for (const app of initial.applications ?? INITIAL_JOB_APPLICATIONS) {
      if (app.handedOffToOnboarding) continue;
      const vac = (initial.vacancies ?? INITIAL_VACANCIES).find((v) => v.id === app.vacancyId);
      const ap = (initial.applicants ?? INITIAL_APPLICANT_PROFILES).find(
        (p) => p.id === app.applicantId
      );
      if (!vac || !ap) continue;
      const comp = calculateApplicantProfileCompleteness(ap);
      if (comp.isEmployeeReady && (app.stage === 'Offering' || app.stage === 'Lolos & Siap Onboarding')) {
        seeded.push({
          id: `notif-rec-ready-${app.id}`,
          type: 'applicant-ready',
          title: `Kandidat Siap Handoff 100%: ${ap.fullName}`,
          message: `${vac.position} (${vac.clientName}) — berkas & biodata lengkap 100%, siap dikonversi ke Admin Onboarding.`,
          createdAt: 'Siap Verifikasi',
          targetMenu: 'rec-handoff',
          entityName: vac.clientName,
          applicationId: app.id,
          recipientRole: 'recruiter',
          read: false,
        });
      } else if (app.stage === 'Jadwal Interview' && app.interview) {
        seeded.push({
          id: `notif-rec-iv-${app.id}`,
          type: 'new-application',
          title: `Jadwal Interview: ${ap.fullName} (${app.applicationCode})`,
          message: `${vac.position} (${vac.clientName}) · ${formatIndonesianDate(app.interview.date)} ${app.interview.time} · Profil ${comp.percentage}%.`,
          createdAt: 'Jadwal Aktif',
          targetMenu: 'rec-interviews',
          entityName: vac.clientName,
          applicationId: app.id,
          recipientRole: 'recruiter',
          read: false,
        });
        seeded.push({
          id: `notif-app-iv-${app.id}`,
          type: 'interview-scheduled',
          title: `Undangan Interview: ${vac.position}`,
          message: `${formatIndonesianDate(app.interview.date)} ${app.interview.time} (${app.interview.mode}) · Pastikan biodata & dokumen lengkap.`,
          createdAt: 'Jadwal Aktif',
          targetMenu: 'app-interviews',
          entityName: vac.clientName,
          applicationId: app.id,
          applicantId: ap.id,
          recipientRole: 'applicant',
          read: false,
        });
      }
    }
    if (initial.notifications && initial.notifications.length > 0) {
      const existingIds = new Set(initial.notifications.map((n) => n.id));
      const missingSeededNotifs = seeded.filter(
        (n) =>
          (n.type === 'leave-submitted' ||
            n.recipientRole === 'recruiter' ||
            n.recipientRole === 'applicant') &&
          !existingIds.has(n.id)
      );
      return [...missingSeededNotifs, ...initial.notifications];
    }
    return seeded;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload: PersistedWorkspaceSlice = {
        entities,
        employees,
        users,
        approvals,
        snapshots,
        attendanceLogs,
        leaveAbsences,
        contracts,
        onboardingCandidates,
        auditLogs,
        policy,
        settings,
        vacancies,
        applicants,
        applications,
        notifications,
      };
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [
    entities,
    employees,
    users,
    approvals,
    snapshots,
    attendanceLogs,
    leaveAbsences,
    contracts,
    onboardingCandidates,
    auditLogs,
    policy,
    settings,
    vacancies,
    applicants,
    applications,
    notifications,
  ]);

  const appendAudit = (
    actorLabel: string,
    category: AuditLogRecord['category'],
    action: string,
    target: string
  ) => {
    setAuditLogs((prev) => [createAuditEntry(actorLabel, category, action, target), ...prev]);
  };

  const pushNotification = (
    notif: Omit<WorkspaceNotificationRecord, 'id' | 'read' | 'createdAt'> & {
      createdAt?: string;
    }
  ) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setNotifications((prev) => [
      {
        ...notif,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        createdAt: notif.createdAt ?? `Hari ini · ${hh}:${mm}`,
        read: false,
      },
      ...prev.slice(0, 29),
    ]);
  };

  const markNotificationRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markEmployeeReviewed = (employeeId: string) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, isNewHire: false } : e))
    );
  };

  const buildSyncedContractRecord = (
    data: EmployeeFormInput,
    existingId?: string
  ): ContractRecord => {
    const daysRem =
      data.contractType === 'PKWT' ? calculateDaysRemaining(data.contractEndDate) : null;
    const contractNum =
      data.contractNumber.trim() ||
      `${data.contractType}-${data.employmentType === 'Internal' ? 'INT' : 'CLN'}-${data.employeeCode}`;
    return {
      id: existingId ?? `ctr-${Date.now()}`,
      contractNumber: contractNum,
      employeeCode: data.employeeCode,
      employeeName: data.fullName,
      employmentType: data.employmentType,
      entityName: data.entityName,
      contractType: data.contractType,
      startDate: formatIndonesianDate(data.joinDate),
      endDate:
        data.contractType === 'PKWTT'
          ? 'Karyawan Tetap'
          : formatIndonesianDate(data.contractEndDate),
      daysRemaining: daysRem,
      status: daysRem !== null && daysRem <= 30 ? 'Segera Berakhir' : 'Aktif',
    };
  };

  const approveRequest = (id: string, actorLabel: string) => {
    const found = approvals.find((a) => a.id === id);
    if (!found) return;
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'Disetujui' } : item))
    );
    // If this approval was a PKWT extension proposal from Admin, run full PKWT extension + Menu TTD handoff
    if (found.title.startsWith('Usulan Perpanjangan PKWT — ')) {
      const targetName = found.title.replace('Usulan Perpanjangan PKWT — ', '').trim();
      const matchingContract = contracts.find(
        (c) => c.employeeName === targetName && c.contractType === 'PKWT'
      );
      if (matchingContract) {
        extendPkwtContract(matchingContract.id, actorLabel);
      } else {
        setContracts((prev) =>
          prev.map((c) =>
            c.employeeName === targetName && c.contractType === 'PKWT'
              ? {
                  ...c,
                  status: 'Diperpanjang',
                  extensionRequested: false,
                  daysRemaining: (c.daysRemaining ?? 0) + 180,
                  endDate: `${c.endDate} (+6 Bln)`,
                }
              : c
          )
        );
      }
    }
    if (found.title.startsWith('Aktivasi Onboarding Karyawan Baru — ')) {
      const targetName = found.title.replace('Aktivasi Onboarding Karyawan Baru — ', '').trim();
      setOnboardingCandidates((prev) =>
        prev.map((cand) =>
          cand.fullName === targetName ? { ...cand, status: 'Aktif Menjadi Karyawan' } : cand
        )
      );
      setEmployees((prev) =>
        prev.map((emp) => (emp.fullName === targetName ? { ...emp, status: 'Aktif' } : emp))
      );
    }
    setNotifications((prev) =>
      prev.map((n) =>
        n.recipientRole === 'master-admin' &&
        (n.type === 'pkwt-extension-requested' || n.type === 'approval-pending') &&
        found.title.includes(n.entityName ?? '')
          ? { ...n, read: true }
          : n
      )
    );
    appendAudit(actorLabel, 'Persetujuan', `Menyetujui permintaan: ${found.title}`, found.entityName);
  };

  const rejectRequest = (id: string, actorLabel: string) => {
    const found = approvals.find((a) => a.id === id);
    if (!found) return;
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'Ditolak' } : item))
    );
    if (found.title.startsWith('Usulan Perpanjangan PKWT — ')) {
      const targetName = found.title.replace('Usulan Perpanjangan PKWT — ', '').trim();
      setContracts((prev) =>
        prev.map((c) =>
          c.employeeName === targetName && c.contractType === 'PKWT'
            ? { ...c, extensionRequested: false }
            : c
        )
      );
      pushNotification({
        type: 'approval-pending',
        title: `Usulan Perpanjangan PKWT Ditolak — ${targetName}`,
        message: `Ditolak oleh ${actorLabel}. Status kontrak ${found.entityName} dikembalikan tanpa perpanjangan.`,
        targetMenu: 'admin-onboarding',
        entityName: found.entityName,
        recipientRole: 'admin',
      });
    }
    appendAudit(actorLabel, 'Persetujuan', `Menolak permintaan: ${found.title}`, found.entityName);
  };

  const addEntity = (newEntity: Omit<EntityRecord, 'id'>, actorLabel: string) => {
    const created: EntityRecord = {
      ...newEntity,
      id: `ent-${Date.now()}`,
    };
    setEntities((prev) => [created, ...prev]);
    setSnapshots((prev) => [
      {
        id: `op-${Date.now()}`,
        entityName: created.name,
        category: created.category,
        attendanceRate: '100,0%',
        onLeaveToday: 0,
        expiringContracts: 0,
        openPositions: 0,
        activeCandidates: 0,
      },
      ...prev,
    ]);
    appendAudit(
      actorLabel,
      'Organisasi',
      `Menambahkan ${created.category === 'Klien Penempatan' ? 'klien penempatan' : 'unit internal'} (${created.code})`,
      created.name
    );
  };

  const updateEntity = (id: string, updated: Omit<EntityRecord, 'id'>, actorLabel: string) => {
    const existing = entities.find((e) => e.id === id);
    if (!existing) return;
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...updated, id } : e))
    );
    if (existing.name !== updated.name) {
      setSnapshots((prev) =>
        prev.map((s) =>
          s.entityName === existing.name
            ? { ...s, entityName: updated.name, category: updated.category }
            : s
        )
      );
      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          assignedScopes: u.assignedScopes.map((sc) =>
            sc === existing.name ? updated.name : sc
          ),
        }))
      );
    }
    appendAudit(
      actorLabel,
      'Organisasi',
      `Memperbarui konfigurasi, lokasi & posisi ${updated.category === 'Klien Penempatan' ? 'klien' : 'unit'} (${updated.code})`,
      `${updated.name} · ${(updated.supportedPlacements ?? []).length} lokasi · ${(updated.supportedPositions ?? []).length} posisi`
    );
  };

  const toggleEntityStatus = (id: string, actorLabel: string) => {
    const found = entities.find((e) => e.id === id);
    if (!found) return;
    const nextStatus = found.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: nextStatus } : e))
    );
    appendAudit(
      actorLabel,
      'Organisasi',
      `Mengubah status unit/klien menjadi ${nextStatus}`,
      found.name
    );
  };

  const removeClientEntity = (id: string, actorLabel: string) => {
    const found = entities.find((e) => e.id === id);
    if (!found || found.category !== 'Klien Penempatan') return;
    setEntities((prev) => prev.filter((e) => e.id !== id));
    setSnapshots((prev) => prev.filter((s) => s.entityName !== found.name));
    setUsers((prev) =>
      prev.map((u) => {
        const remaining = u.assignedScopes.filter((s) => s !== found.name);
        if (remaining.length === u.assignedScopes.length) return u;
        return {
          ...u,
          assignedScopes: remaining.length > 0 ? remaining : ['Kantor Pusat Operasional'],
          employmentType:
            u.role === 'Karyawan' && remaining.length === 0 ? 'Internal' : u.employmentType,
        };
      })
    );
    appendAudit(
      actorLabel,
      'Organisasi',
      `Menghapus klien penempatan (${found.code})`,
      found.name
    );
  };

  const buildInitialHistoryFromInput = (
    data: EmployeeFormInput,
    defaultSignatureStatus: ContractHistoryItem['signatureStatus'] = 'Menunggu TTD Karyawan'
  ): ContractHistoryItem[] => {
    if (data.contractHistory && data.contractHistory.length > 0) {
      return data.contractHistory;
    }
    return [
      {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        sequenceLabel: data.contractType === 'PKWTT' ? 'PKWTT (Tetap)' : 'PKWT Ke-1',
        contractType: data.contractType,
        contractNumber:
          data.contractNumber.trim() ||
          `${data.contractType}-${data.employmentType === 'Internal' ? 'INT' : 'CLN'}-${data.employeeCode}`,
        startDate: data.joinDate,
        endDate: data.contractType === 'PKWTT' ? '' : data.contractEndDate,
        entityName: data.entityName,
        placementName: data.placementName || data.placementLocation,
        placementArea: data.placementArea,
        placementMapsUrl: data.placementMapsUrl,
        position: data.position,
        signatureStatus:
          data.documents.contractUploaded && defaultSignatureStatus === 'Menunggu TTD Karyawan'
            ? 'Sudah Upload TTD Manual'
            : defaultSignatureStatus,
        signerEmployeeName: data.fullName,
      },
    ];
  };

  const createEmployee = (data: EmployeeFormInput, actorLabel: string) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const created: EmployeeRecord = {
      ...data,
      id: `emp-${Date.now()}`,
      isNewHire: data.isNewHire ?? true,
      createdAtIso: data.createdAtIso ?? todayIso,
      contractHistory: buildInitialHistoryFromInput(
        data,
        data.contractType === 'PKWT' ? 'Menunggu TTD Karyawan' : 'Sudah TTD Digital'
      ),
    };
    setEmployees((prev) => [created, ...prev]);
    setContracts((prev) => [buildSyncedContractRecord(data), ...prev]);
    pushNotification({
      type: 'new-employee',
      title: `Karyawan Baru Ditambahkan: ${created.fullName} (${created.employeeCode})`,
      message: `${created.position} · ${created.entityName}${created.placementName ? ` (${created.placementName})` : ''}.`,
      targetMenu: 'employees',
      employeeCode: created.employeeCode,
      entityName: created.entityName,
    });
    appendAudit(
      actorLabel,
      'Operasional',
      `Menambahkan karyawan baru (${created.employeeCode} · ${created.contractType})`,
      `${created.fullName} · ${created.entityName}`
    );
    return created;
  };

  const updateEmployee = (id: string, data: EmployeeFormInput, actorLabel: string) => {
    const existing = employees.find((e) => e.id === id);
    if (!existing) return;
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...data,
              id,
              faceBiometric: data.faceBiometric ?? existing.faceBiometric,
              contractHistory: data.contractHistory ?? existing.contractHistory,
              originApplicantCode: data.originApplicantCode ?? existing.originApplicantCode,
              applicantId: data.applicantId ?? existing.applicantId,
              portalPassword: data.portalPassword ?? existing.portalPassword,
              accountDisabled: data.accountDisabled ?? existing.accountDisabled,
              passwordResetAt: data.passwordResetAt ?? existing.passwordResetAt,
              isNewHire: data.isNewHire ?? existing.isNewHire,
              createdAtIso: data.createdAtIso ?? existing.createdAtIso,
              savedSignatureDataUrl: data.savedSignatureDataUrl ?? existing.savedSignatureDataUrl,
              savedSignatureUpdatedAt:
                data.savedSignatureUpdatedAt ?? existing.savedSignatureUpdatedAt,
              bpjsKesehatanCardName: data.bpjsKesehatanCardName ?? existing.bpjsKesehatanCardName,
              bpjsKesehatanCardDataUrl:
                data.bpjsKesehatanCardDataUrl ?? existing.bpjsKesehatanCardDataUrl,
              bpjsKetenagakerjaanCardName:
                data.bpjsKetenagakerjaanCardName ?? existing.bpjsKetenagakerjaanCardName,
              bpjsKetenagakerjaanCardDataUrl:
                data.bpjsKetenagakerjaanCardDataUrl ?? existing.bpjsKetenagakerjaanCardDataUrl,
            }
          : e
      )
    );
    setContracts((prev) => {
      const matched = prev.find((c) => c.employeeCode === existing.employeeCode);
      if (!matched) {
        return [buildSyncedContractRecord(data), ...prev];
      }
      return prev.map((c) => (c.id === matched.id ? buildSyncedContractRecord(data, c.id) : c));
    });
    appendAudit(
      actorLabel,
      'Operasional',
      `Memperbarui data induk karyawan (${data.employeeCode})`,
      `${data.fullName} · ${data.entityName}`
    );
  };

  const saveEmployeeSignatureSpecimen = (
    employeeId: string,
    signatureDataUrl: string,
    actorLabel: string
  ): { ok: boolean; message: string } => {
    const target = employees.find((e) => e.id === employeeId);
    if (!target) return { ok: false, message: 'Data karyawan tidak ditemukan.' };
    if (!signatureDataUrl.startsWith('data:image/')) {
      return { ok: false, message: 'Silakan goreskan tanda tangan digital pada kanvas terlebih dahulu.' };
    }
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const updatedAt = `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()] ?? 'Nov'} ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              savedSignatureDataUrl: signatureDataUrl,
              savedSignatureUpdatedAt: updatedAt,
            }
          : emp
      )
    );
    appendAudit(
      actorLabel,
      'Keamanan',
      `Menyimpan spesimen tanda tangan digital melalui Menu TTD (${target.employeeCode})`,
      `${target.fullName} · ${target.entityName}`
    );
    return {
      ok: true,
      message: `Tanda tangan digital pribadi berhasil disimpan (${updatedAt}). Saat ada kontrak/perpanjangan PKWT baru, Anda tetap harus meninjau dokumen terlebih dahulu sebelum membubuhkan TTD.`,
    };
  };

  const signEmployeePkwtDigitally = (
    employeeId: string,
    signatureDataUrl: string,
    actorLabel: string,
    targetContractNumber?: string
  ): { ok: boolean; message: string } => {
    const target = employees.find((e) => e.id === employeeId);
    if (!target) return { ok: false, message: 'Data karyawan tidak ditemukan.' };
    if (!signatureDataUrl.startsWith('data:image/')) {
      return { ok: false, message: 'Buat tanda tangan digital pada kanvas atau simpan di Menu TTD terlebih dahulu.' };
    }
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const signedAt = `${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()] ?? 'Nov'} ${now.getFullYear()} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const baseHistory: ContractHistoryItem[] =
      target.contractHistory && target.contractHistory.length > 0
        ? target.contractHistory
        : [
            {
              id: `hist-${target.id}-1`,
              sequenceLabel: target.contractType === 'PKWTT' ? 'PKWTT (Tetap)' : 'PKWT Ke-1',
              contractType: target.contractType,
              contractNumber: target.contractNumber || `PKWT-${target.employeeCode}`,
              startDate: target.joinDate,
              endDate: target.contractEndDate,
              entityName: target.entityName,
              placementName: target.placementName || target.placementLocation,
              placementArea: target.placementArea,
              placementMapsUrl: target.placementMapsUrl,
              position: target.position,
              signatureStatus: 'Menunggu TTD Karyawan',
              signerEmployeeName: target.fullName,
            },
          ];

    const matchIdx = targetContractNumber
      ? baseHistory.findIndex((h) => h.contractNumber === targetContractNumber)
      : baseHistory.findIndex((h) => h.signatureStatus === 'Menunggu TTD Karyawan');
    const resolvedIdx = matchIdx !== -1 ? matchIdx : baseHistory.length - 1;
    const targetItem = baseHistory[resolvedIdx];

    if (targetItem && isContractSignedLocked(targetItem.signatureStatus)) {
      return {
        ok: false,
        message: `Dokumen ${targetItem.sequenceLabel} (${targetItem.contractNumber}) sudah ditandatangani dan terkunci permanen (tidak dapat diedit).`,
      };
    }

    const updatedHistory = baseHistory.map((item, idx) =>
      idx === resolvedIdx
        ? {
            ...item,
            signatureStatus: 'Sudah TTD Digital' as const,
            signedAt,
            signerEmployeeName: target.fullName,
            employeeSignatureDataUrl: signatureDataUrl,
            notes: item.notes || 'Ditandatangani digital oleh karyawan melalui Portal Karyawan (Terkunci Permanen).',
          }
        : item
    );

    const signedNumber = updatedHistory[resolvedIdx]?.contractNumber ?? target.contractNumber;

    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              status: emp.status === 'Probation' ? 'Aktif' : emp.status,
              documents: { ...emp.documents, contractUploaded: true },
              savedSignatureDataUrl: emp.savedSignatureDataUrl || signatureDataUrl,
              savedSignatureUpdatedAt: emp.savedSignatureUpdatedAt || signedAt,
              contractHistory: updatedHistory,
            }
          : emp
      )
    );
    setContracts((prev) =>
      prev.map((c) =>
        c.employeeCode === target.employeeCode ? { ...c, status: 'Aktif' } : c
      )
    );
    pushNotification({
      type: 'pkwt-signed',
      title: `PKWT Ditandatangani: ${target.fullName} (${target.employeeCode})`,
      message: `${updatedHistory[resolvedIdx]?.sequenceLabel ?? 'PKWT'} (${signedNumber}) telah ditandatangani secara digital pada ${signedAt} dan tersimpan permanen.`,
      targetMenu: 'employees',
      employeeCode: target.employeeCode,
      entityName: target.entityName,
    });
    appendAudit(
      actorLabel,
      'Operasional',
      `Menandatangani PKWT secara digital (${signedNumber})`,
      `${target.fullName} (${target.employeeCode})`
    );
    return {
      ok: true,
      message: `PKWT (${signedNumber}) berhasil ditandatangani, tersimpan permanen & terkunci (hanya dapat dilihat dan diunduh).`,
    };
  };

  const addOrUploadEmployeeContractHistory = (
    employeeId: string,
    entry: Omit<ContractHistoryItem, 'id'>,
    actorLabel: string,
    makeActiveContract = true
  ) => {
    const target = employees.find((e) => e.id === employeeId);
    if (!target) return;
    const newItem: ContractHistoryItem = {
      ...entry,
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    };
    const priorHistory = (target.contractHistory ?? []).map((item) =>
      makeActiveContract && item.signatureStatus !== 'Selesai / Digantikan'
        ? { ...item, signatureStatus: 'Selesai / Digantikan' as const }
        : item
    );
    const nextHistory = [...priorHistory, newItem];
    const hasSignedFile =
      newItem.signatureStatus === 'Sudah TTD Digital' ||
      newItem.signatureStatus === 'Sudah Upload TTD Manual' ||
      Boolean(newItem.uploadedSignedFileDataUrl);

    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              contractType: makeActiveContract ? newItem.contractType : emp.contractType,
              contractNumber: makeActiveContract ? newItem.contractNumber : emp.contractNumber,
              joinDate: makeActiveContract && !emp.joinDate ? newItem.startDate : emp.joinDate,
              contractEndDate: makeActiveContract ? newItem.endDate : emp.contractEndDate,
              documents: hasSignedFile ? { ...emp.documents, contractUploaded: true } : emp.documents,
              contractHistory: nextHistory,
            }
          : emp
      )
    );

    if (makeActiveContract) {
      const updatedEmpInput: EmployeeFormInput = {
        ...target,
        contractType: newItem.contractType,
        contractNumber: newItem.contractNumber,
        contractEndDate: newItem.endDate,
      };
      setContracts((prev) => {
        const matched = prev.find((c) => c.employeeCode === target.employeeCode);
        if (!matched) return [buildSyncedContractRecord(updatedEmpInput), ...prev];
        return prev.map((c) =>
          c.id === matched.id
            ? {
                ...buildSyncedContractRecord(updatedEmpInput, c.id),
                startDate: formatIndonesianDate(newItem.startDate),
              }
            : c
        );
      });
    }

    appendAudit(
      actorLabel,
      'Operasional',
      `Menyimpan riwayat kontrak ${newItem.sequenceLabel} (${newItem.contractNumber})`,
      `${target.fullName} (${target.employeeCode})`
    );
  };

  const deleteEmployee = (id: string, actorLabel: string) => {
    const existing = employees.find((e) => e.id === id);
    if (!existing) return;
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    setContracts((prev) => prev.filter((c) => c.employeeCode !== existing.employeeCode));
    appendAudit(
      actorLabel,
      'Operasional',
      `Menghapus data karyawan (${existing.employeeCode})`,
      `${existing.fullName} · ${existing.entityName}`
    );
  };

  const changeUserRole = (userId: string, nextRole: UserRoleName, actorLabel: string) => {
    const found = users.find((u) => u.id === userId);
    if (!found || found.role === nextRole) return;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)));
    appendAudit(
      actorLabel,
      'RBAC',
      `Mengubah peran menjadi ${nextRole}`,
      `${found.fullName} (${found.employeeCode})`
    );
  };

  const updateUserScope = (
    userId: string,
    employmentType: EmploymentCategory,
    assignedScopes: string[],
    actorLabel: string
  ) => {
    const found = users.find((u) => u.id === userId);
    if (!found) return;
    const finalScopes = assignedScopes.length > 0 ? assignedScopes : ['Kantor Pusat Operasional'];
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, employmentType, assignedScopes: finalScopes } : u
      )
    );
    appendAudit(
      actorLabel,
      'RBAC',
      `Memperbarui cakupan (${finalScopes.join(', ')})`,
      `${found.fullName} (${found.employeeCode})`
    );
  };

  const toggleUserStatus = (userId: string, actorLabel: string) => {
    const found = users.find((u) => u.id === userId);
    if (!found) return;
    const nextStatus = found.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: nextStatus,
              lastActive:
                nextStatus === 'Aktif' && u.lastActive === 'Belum masuk'
                  ? 'Diaktifkan hari ini'
                  : u.lastActive,
            }
          : u
      )
    );
    appendAudit(
      actorLabel,
      'RBAC',
      `Mengubah status akun menjadi ${nextStatus}`,
      `${found.fullName} (${found.employeeCode})`
    );
  };

  const resetOrUpdateUserPassword = (
    userId: string,
    newPassword: string,
    actorLabel: string
  ) => {
    const found = users.find((u) => u.id === userId);
    if (!found) return;
    const cleanPwd = newPassword.trim() || '1234';
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, portalPassword: cleanPwd } : u))
    );
    appendAudit(
      actorLabel,
      'Keamanan',
      `Memperbarui / reset PIN kata sandi akun pengelola (${found.role})`,
      `${found.fullName} (${found.employeeCode})`
    );
  };

  const createInternalUserAccount = (
    input: {
      employeeCode: string;
      loginAlias?: string;
      fullName: string;
      email: string;
      whatsappNumber?: string;
      role: 'Master Admin' | 'Admin' | 'Rekruter';
      employmentType: EmploymentCategory;
      assignedScopes: string[];
      portalPassword: string;
    },
    actorLabel: string
  ): UserAccountRecord => {
    const created: UserAccountRecord = {
      id: `usr-${Date.now()}`,
      employeeCode: input.employeeCode.trim().toUpperCase(),
      loginAlias: input.loginAlias?.trim().toLowerCase() || undefined,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      whatsappNumber: input.whatsappNumber?.trim() || '081199881024',
      role: input.role,
      employmentType: input.employmentType,
      assignedScopes:
        input.assignedScopes.length > 0 ? input.assignedScopes : ['Kantor Pusat Operasional'],
      status: 'Aktif',
      lastActive: 'Baru dibuat',
      portalPassword: input.portalPassword.trim() || '1234',
    };
    setUsers((prev) => [created, ...prev]);
    appendAudit(
      actorLabel,
      'RBAC',
      `Menambahkan akun pengelola baru (${created.role} · ${created.employeeCode})`,
      `${created.fullName} (${created.email})`
    );
    return created;
  };

  const toggleEmployeeAccountStatus = (employeeId: string, actorLabel: string) => {
    const found = employees.find((e) => e.id === employeeId);
    if (!found) return;
    const isCurrentlyLocked = Boolean(found.accountDisabled) || found.status === 'Nonaktif';
    const nextDisabled = !isCurrentlyLocked;
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              accountDisabled: nextDisabled,
              status: !nextDisabled && emp.status === 'Nonaktif' ? 'Aktif' : emp.status,
            }
          : emp
      )
    );
    setUsers((prev) =>
      prev.map((u) =>
        u.employeeCode.toLowerCase() === found.employeeCode.toLowerCase()
          ? { ...u, status: nextDisabled ? 'Nonaktif' : 'Aktif' }
          : u
      )
    );
    appendAudit(
      actorLabel,
      'Keamanan',
      nextDisabled
        ? `Menonaktifkan akses login akun karyawan (${found.employeeCode})`
        : `Mengaktifkan kembali akses login akun karyawan (${found.employeeCode})`,
      `${found.fullName} · ${found.entityName}`
    );
  };

  const resetOrUpdateEmployeePassword = (
    employeeId: string,
    newPassword: string,
    actorLabel: string
  ) => {
    const found = employees.find((e) => e.id === employeeId);
    if (!found) return;
    const cleanPwd = newPassword.trim() || '1234';
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const resetStamp = `Diperbarui · ${hh}:${mm}`;
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              portalPassword: cleanPwd,
              passwordResetAt: resetStamp,
            }
          : emp
      )
    );
    setUsers((prev) =>
      prev.map((u) =>
        u.employeeCode.toLowerCase() === found.employeeCode.toLowerCase()
          ? { ...u, portalPassword: cleanPwd }
          : u
      )
    );
    appendAudit(
      actorLabel,
      'Keamanan',
      `Mengatur ulang / memperbarui PIN kata sandi akun karyawan (${found.employeeCode})`,
      `${found.fullName} · ${found.entityName}`
    );
  };

  const changeEmployeeOwnPassword = (
    employeeId: string,
    currentPassword: string,
    newPassword: string,
    actorLabel: string
  ): { ok: boolean; message: string } => {
    const found = employees.find((e) => e.id === employeeId);
    if (!found) {
      return { ok: false, message: 'Data karyawan tidak ditemukan.' };
    }
    const activePwd = found.portalPassword?.trim() || '1234';
    if (currentPassword.trim() !== activePwd) {
      return {
        ok: false,
        message: 'PIN / Kata Sandi saat ini tidak sesuai.',
      };
    }
    const cleanNext = newPassword.trim();
    if (cleanNext.length < 4) {
      return {
        ok: false,
        message: 'PIN / Kata Sandi baru minimal harus terdiri dari 4 karakter.',
      };
    }
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const resetStamp = `Diubah Mandiri · ${hh}:${mm}`;

    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              portalPassword: cleanNext,
              passwordResetAt: resetStamp,
            }
          : emp
      )
    );
    appendAudit(
      actorLabel,
      'Keamanan',
      `Memperbarui PIN / Kata Sandi login mandiri di Portal Karyawan (${found.employeeCode})`,
      found.fullName
    );
    return {
      ok: true,
      message: `PIN / Kata Sandi login untuk akun ${found.employeeCode} berhasil diperbarui.`,
    };
  };

  const toggleApplicantAccountStatus = (applicantId: string, actorLabel: string) => {
    const found = applicants.find((a) => a.id === applicantId);
    if (!found) return;
    const nextDisabled = !found.accountDisabled;
    setApplicants((prev) =>
      prev.map((a) => (a.id === applicantId ? { ...a, accountDisabled: nextDisabled } : a))
    );
    appendAudit(
      actorLabel,
      'Keamanan',
      nextDisabled
        ? `Menonaktifkan akun pelamar (${found.applicantCode})`
        : `Mengaktifkan kembali akun pelamar (${found.applicantCode})`,
      `${found.fullName} (${found.email})`
    );
  };

  const resetOrUpdateApplicantPassword = (
    applicantId: string,
    newPassword: string,
    actorLabel: string
  ) => {
    const found = applicants.find((a) => a.id === applicantId);
    if (!found) return;
    const cleanPwd = newPassword.trim() || '1234';
    setApplicants((prev) =>
      prev.map((a) => (a.id === applicantId ? { ...a, password: cleanPwd } : a))
    );
    appendAudit(
      actorLabel,
      'Keamanan',
      `Mengatur ulang PIN kata sandi akun pelamar (${found.applicantCode})`,
      `${found.fullName} (${found.email})`
    );
  };

  const savePolicy = (nextPolicy: WorkPolicyConfig, actorLabel: string) => {
    setPolicy(nextPolicy);
    appendAudit(
      actorLabel,
      'Kebijakan',
      `Memperbarui jam kerja (${nextPolicy.checkInTime}–${nextPolicy.checkOutTime}) & aturan absensi`,
      `Toleransi ${nextPolicy.lateToleranceMinutes} mnt · Cuti ${nextPolicy.annualLeaveQuota} hari`
    );
  };

  const addAttendanceLocation = (
    loc: Omit<AttendanceLocationRecord, 'id'>,
    actorLabel: string
  ) => {
    const created: AttendanceLocationRecord = {
      ...loc,
      id: `loc-${Date.now()}`,
    };
    setPolicy((prev) => ({
      ...prev,
      attendanceLocations: [created, ...prev.attendanceLocations],
    }));
    appendAudit(
      actorLabel,
      'Kebijakan',
      `Menambahkan titik lokasi absensi (radius ${created.radiusMeters}m)`,
      `${created.name} · ${created.entityName}`
    );
  };

  const toggleLocationStatus = (id: string, actorLabel: string) => {
    const found = policy.attendanceLocations.find((l) => l.id === id);
    if (!found) return;
    const nextStatus = found.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    setPolicy((prev) => ({
      ...prev,
      attendanceLocations: prev.attendanceLocations.map((l) =>
        l.id === id ? { ...l, status: nextStatus } : l
      ),
    }));
    appendAudit(
      actorLabel,
      'Kebijakan',
      `Mengubah status lokasi absensi menjadi ${nextStatus}`,
      found.name
    );
  };

  const removeLocation = (id: string, actorLabel: string) => {
    const found = policy.attendanceLocations.find((l) => l.id === id);
    if (!found) return;
    setPolicy((prev) => ({
      ...prev,
      attendanceLocations: prev.attendanceLocations.filter((l) => l.id !== id),
    }));
    appendAudit(actorLabel, 'Kebijakan', 'Menghapus titik lokasi absensi', found.name);
  };

  const syncPolicyLocationsFromEntities = (
    actorLabel: string
  ): { addedCount: number; updatedCount: number } => {
    const result = syncAttendanceLocationsFromEntities(
      policy.attendanceLocations,
      entities,
      policy.clientOverrides
    );
    if (result.addedCount > 0 || result.updatedCount > 0) {
      setPolicy((prev) => ({
        ...prev,
        attendanceLocations: result.nextLocations,
      }));
      appendAudit(
        actorLabel,
        'Kebijakan',
        `Menyinkronkan titik lokasi absensi dari cabang Unit & Klien (+${result.addedCount} lokasi baru, ${result.updatedCount} diperbarui)`,
        'Seluruh Cabang Klien & Unit Internal'
      );
    }
    return { addedCount: result.addedCount, updatedCount: result.updatedCount };
  };

  const approveLeave = (id: string, actorLabel: string) => {
    const found = leaveAbsences.find((l) => l.id === id);
    if (!found) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const reviewedStamp = `Hari ini · ${hh}:${mm}`;

    const nextLeaves: LeaveAbsenceRecord[] = leaveAbsences.map((l) =>
      l.id === id
        ? { ...l, status: 'Disetujui' as const, reviewedBy: actorLabel, reviewedAt: reviewedStamp }
        : l
    );
    setLeaveAbsences(nextLeaves);

    const quotaAfter = calculateEmployeeLeaveQuotaSummary(
      found.employeeCode,
      nextLeaves,
      policy.annualLeaveQuota
    );

    setNotifications((prev) =>
      prev.map((n) => (n.leaveId === id && n.type === 'leave-submitted' ? { ...n, read: true } : n))
    );

    const quotaDetail =
      found.type === 'Izin Sakit'
        ? `Total Izin Sakit (SKD) disetujui: ${quotaAfter.approvedSickDays} hari · Sisa kuota cuti tahunan: ${quotaAfter.remainingLeaveQuota}/${quotaAfter.annualLeaveQuota} hari.`
        : `Kuota cuti otomatis terpotong ${found.daysCount} hari · Sisa kuota cuti tahunan Anda: ${quotaAfter.remainingLeaveQuota}/${quotaAfter.annualLeaveQuota} hari.`;

    pushNotification({
      type: 'leave-approved',
      title: `${found.type} Disetujui — ${found.dateRange} (${found.daysCount} Hari)`,
      message: `Disetujui oleh ${actorLabel}. ${quotaDetail}`,
      targetMenu: 'emp-leave',
      employeeCode: found.employeeCode,
      entityName: found.entityName,
      leaveId: found.id,
      recipientRole: 'employee',
    });

    appendAudit(
      actorLabel,
      'Operasional',
      `Menyetujui ${found.type} (${found.dateRange} · ${found.daysCount} hari) — Sisa kuota cuti: ${quotaAfter.remainingLeaveQuota}/${quotaAfter.annualLeaveQuota} hari`,
      `${found.employeeName} (${found.employeeCode}) · ${found.entityName}`
    );
  };

  const rejectLeave = (id: string, actorLabel: string) => {
    const found = leaveAbsences.find((l) => l.id === id);
    if (!found) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const reviewedStamp = `Hari ini · ${hh}:${mm}`;

    setLeaveAbsences((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, status: 'Ditolak' as const, reviewedBy: actorLabel, reviewedAt: reviewedStamp }
          : l
      )
    );
    setNotifications((prev) =>
      prev.map((n) => (n.leaveId === id && n.type === 'leave-submitted' ? { ...n, read: true } : n))
    );

    pushNotification({
      type: 'leave-rejected',
      title: `${found.type} Ditolak — ${found.dateRange}`,
      message: `Pengajuan ${found.type} (${found.daysCount} hari) ditolak oleh ${actorLabel}. Kuota cuti tahunan Anda tidak terpotong.`,
      targetMenu: 'emp-leave',
      employeeCode: found.employeeCode,
      entityName: found.entityName,
      leaveId: found.id,
      recipientRole: 'employee',
    });

    appendAudit(
      actorLabel,
      'Operasional',
      `Menolak ${found.type} (${found.dateRange})`,
      `${found.employeeName} (${found.employeeCode}) · ${found.entityName}`
    );
  };

  const convertAlphaToIzin = (id: string, actorLabel: string) => {
    const found = leaveAbsences.find((l) => l.id === id);
    if (!found) return;
    setLeaveAbsences((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'Terkonfirmasi Izin' } : l))
    );
    setAttendanceLogs((prev) =>
      prev.map((log) =>
        log.employeeCode === found.employeeCode && log.status === 'Alpha'
          ? {
              ...log,
              status: 'Izin',
              locationUsed: 'Dikonfirmasi Admin / Master Admin',
              notes: 'Klarifikasi ketidakhadiran disetujui menjadi Izin',
            }
          : log
      )
    );
    appendAudit(
      actorLabel,
      'Operasional',
      'Mengklarifikasi Alpha menjadi Terkonfirmasi Izin',
      `${found.employeeName} (${found.employeeCode})`
    );
  };

  const updateAttendanceNotes = (logId: string, notes: string, actorLabel: string) => {
    const found = attendanceLogs.find((l) => l.id === logId);
    if (!found) return;
    setAttendanceLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, notes: notes.trim() || l.notes } : l))
    );
    appendAudit(
      actorLabel,
      'Operasional',
      `Memverifikasi catatan presensi (${found.status})`,
      `${found.employeeName} · ${found.entityName}`
    );
  };

  const extendPkwtContract = (id: string, actorLabel: string) => {
    const found = contracts.find((c) => c.id === id);
    if (!found) return;
    const emp = employees.find(
      (e) => e.employeeCode.toLowerCase() === found.employeeCode.toLowerCase()
    );

    if (emp) {
      const extDraft = buildExtendedPkwtContractDraft({ employee: emp, months: 6 });
      const priorHistory = (emp.contractHistory ?? []).map((item) =>
        item.signatureStatus !== 'Selesai / Digantikan'
          ? { ...item, signatureStatus: 'Selesai / Digantikan' as const }
          : item
      );
      const nextHistory = [...priorHistory, extDraft.newHistoryItem];

      setEmployees((prev) =>
        prev.map((item) =>
          item.id === emp.id
            ? {
                ...item,
                contractType: 'PKWT',
                contractNumber: extDraft.nextContractNumber,
                contractEndDate: extDraft.nextEndDate,
                documents: { ...item.documents, contractUploaded: false },
                contractHistory: nextHistory,
              }
            : item
        )
      );

      setContracts((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                contractNumber: extDraft.nextContractNumber,
                startDate: formatIndonesianDate(extDraft.nextStartDate),
                endDate: formatIndonesianDate(extDraft.nextEndDate),
                status: 'Diperpanjang',
                extensionRequested: false,
                daysRemaining: calculateDaysRemaining(extDraft.nextEndDate),
              }
            : c
        )
      );

      pushNotification({
        type: 'pkwt-pending-sign',
        title: `Perpanjangan ${extDraft.sequenceLabel} Terbit (${extDraft.nextContractNumber})`,
        message: `Kontrak ${extDraft.sequenceLabel} Anda sudah diterbitkan untuk periode ${formatIndonesianDate(extDraft.nextStartDate)} – ${formatIndonesianDate(extDraft.nextEndDate)}. Silakan buka Menu TTD untuk meninjau & menandatangani.`,
        recipientRole: 'employee',
        employeeCode: emp.employeeCode,
        entityName: emp.entityName,
        targetMenu: 'emp-signature',
      });
    } else {
      setContracts((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: 'Diperpanjang',
                extensionRequested: false,
                daysRemaining: (c.daysRemaining ?? 0) + 180,
                endDate: `${c.endDate} (+6 Bln)`,
              }
            : c
        )
      );
    }

    setApprovals((prev) =>
      prev.map((item) =>
        item.status === 'Menunggu' &&
        item.title === `Usulan Perpanjangan PKWT — ${found.employeeName}`
          ? { ...item, status: 'Disetujui' }
          : item
      )
    );
    setNotifications((prev) =>
      prev.map((n) =>
        n.type === 'pkwt-extension-requested' &&
        n.employeeCode?.toLowerCase() === found.employeeCode.toLowerCase()
          ? { ...n, read: true }
          : n
      )
    );

    appendAudit(
      actorLabel,
      'Operasional',
      `Menerbitkan perpanjangan kontrak ${found.contractNumber} (+6 bulan) berstatus Menunggu TTD Karyawan`,
      `${found.employeeName} · ${found.entityName}`
    );
  };

  const proposePkwtExtension = (contractId: string, adminName: string, actorLabel: string) => {
    const found = contracts.find((c) => c.id === contractId);
    if (!found || found.extensionRequested) return;
    setContracts((prev) =>
      prev.map((c) => (c.id === contractId ? { ...c, extensionRequested: true } : c))
    );
    setApprovals((prev) => [
      {
        id: `apr-${Date.now()}`,
        title: `Usulan Perpanjangan PKWT — ${found.employeeName}`,
        requester: adminName,
        requesterRole: 'Admin',
        entityName: found.entityName,
        category: 'Penempatan Klien',
        submittedAt: 'Hari ini · Baru saja',
        status: 'Menunggu',
      },
      ...prev,
    ]);
    pushNotification({
      type: 'pkwt-extension-requested',
      title: `Usulan Perpanjangan PKWT: ${found.employeeName} (${found.employeeCode})`,
      message: `Diajukan oleh ${adminName} untuk kontrak ${found.contractNumber} (${found.entityName}). Klik untuk ACC & terbitkan ke Menu TTD Karyawan.`,
      targetMenu: 'monitoring',
      employeeCode: found.employeeCode,
      entityName: found.entityName,
      recipientRole: 'master-admin',
    });
    appendAudit(
      actorLabel,
      'Operasional',
      `Mengajukan usulan perpanjangan kontrak ${found.contractNumber} ke Master Admin`,
      `${found.employeeName} · ${found.entityName}`
    );
  };

  const submitCandidateOnboarding = (
    candidateId: string,
    employeeData: EmployeeFormInput,
    adminName: string,
    actorLabel: string
  ) => {
    const candidate = onboardingCandidates.find((c) => c.id === candidateId);
    if (!candidate) return;
    createEmployee({ ...employeeData, status: 'Probation' }, actorLabel);
    setOnboardingCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId ? { ...c, status: 'Menunggu Aktivasi Master Admin' } : c
      )
    );
    setApprovals((prev) => [
      {
        id: `apr-${Date.now()}`,
        title: `Aktivasi Onboarding Karyawan Baru — ${employeeData.fullName}`,
        requester: adminName,
        requesterRole: 'Admin',
        entityName: employeeData.entityName,
        category: 'Akses Akun',
        submittedAt: 'Hari ini · Baru saja',
        status: 'Menunggu',
      },
      ...prev,
    ]);
    pushNotification({
      type: 'approval-pending',
      title: `Permohonan Aktivasi Onboarding: ${employeeData.fullName}`,
      message: `Diajukan oleh ${adminName} (${employeeData.entityName}). Buka Ringkasan untuk aktivasi status karyawan.`,
      targetMenu: 'overview',
      employeeCode: employeeData.employeeCode,
      entityName: employeeData.entityName,
      recipientRole: 'master-admin',
    });
    appendAudit(
      actorLabel,
      'Operasional',
      `Memproses onboarding kandidat ${candidate.candidateCode} & mengajukan aktivasi`,
      `${employeeData.fullName} · ${employeeData.entityName}`
    );
  };

  const saveSettings = (nextSettings: SystemSettingsConfig, actorLabel: string) => {
    setSettings(nextSettings);
    appendAudit(
      actorLabel,
      'Keamanan',
      'Memperbarui profil perusahaan pengguna & notifikasi',
      nextSettings.companyName
    );
  };

  const resetWorkspaceSimulation = (actorLabel: string) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
    }
    setEntities(INITIAL_ENTITIES);
    setEmployees(INITIAL_EMPLOYEES);
    setUsers(INITIAL_USERS);
    setApprovals(INITIAL_APPROVALS);
    setSnapshots(INITIAL_OPERATIONAL_SNAPSHOTS);
    setAttendanceLogs(INITIAL_ATTENDANCE_LOGS);
    setLeaveAbsences(INITIAL_LEAVE_ABSENCES);
    setContracts(INITIAL_CONTRACTS);
    setOnboardingCandidates(INITIAL_ONBOARDING_CANDIDATES);
    setPolicy(INITIAL_POLICY);
    setSettings(INITIAL_SETTINGS);
    setVacancies(INITIAL_VACANCIES);
    setApplicants(INITIAL_APPLICANT_PROFILES);
    setApplications(INITIAL_JOB_APPLICATIONS);
    appendAudit(
      actorLabel,
      'Keamanan',
      'Mereset data simulasi workspace ke kondisi awal bawaan sistem',
      INITIAL_SETTINGS.companyName
    );
  };

  // =========================================================================
  // REKRUTER & PELAMAR WORKFLOW ACTIONS
  // =========================================================================

  const registerApplicantAccount = (input: {
    fullName: string;
    email: string;
    whatsappNumber?: string;
    password: string;
  }): { ok: boolean; user?: MasterAdminUser; error?: string } => {
    const cleanEmail = input.email.trim().toLowerCase();
    const existing = applicants.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      return {
        ok: false,
        error: 'Alamat email ini sudah terdaftar sebagai akun Pelamar. Silakan masuk menggunakan email tersebut.',
      };
    }

    const nextSeq = String(applicants.length + 1).padStart(3, '0');
    const applicantCode = `PLM-2026-${nextSeq}`;
    const newId = `app-user-${Date.now()}`;
    const fullName = input.fullName.trim();
    const whatsapp = (input.whatsappNumber ?? '').trim();

    const newProfile: ApplicantProfileRecord = {
      id: newId,
      applicantCode,
      loginId: cleanEmail,
      fullName,
      email: cleanEmail,
      password: input.password,
      whatsappNumber: whatsapp,
      nik: '',
      birthPlace: '',
      birthDate: '',
      gender: 'Laki-laki',
      religion: 'Islam',
      maritalStatus: 'Belum Kawin',
      bloodType: '-',
      education: '',
      npwpNumber: '',
      bpjsKesehatanNumber: '',
      bpjsKetenagakerjaanNumber: '',
      ktpAddress: {
        street: '',
        rtRw: '',
        kelurahan: '',
        kecamatan: '',
        city: '',
        province: '',
        postalCode: '',
      },
      domicileSameAsKtp: true,
      domicileAddress: '',
      kkNumber: '',
      headOfFamily: '',
      familyMembers: [],
      emergencyContact: {
        name: '',
        relation: 'Orang Tua',
        phone: '',
      },
      bankName: 'BCA',
      bankAccountNumber: '',
      bankAccountHolder: fullName,
      bankBranch: '',
      latestExperience: '',
      skillsSummary: '',
      documents: {
        cvUploaded: false,
        ktpUploaded: false,
        kkUploaded: false,
        simUploaded: false,
        ijazahUploaded: false,
        sertifikatUploaded: false,
        passFotoUploaded: false,
        skckUploaded: false,
        transkripNilaiUploaded: false,
        bankBookUploaded: false,
        contractUploaded: false,
      },
      documentFileNames: {},
      ocrSources: {
        ktpVerifiedByOcr: false,
        kkVerifiedByOcr: false,
      },
    };

    setApplicants((prev) => [newProfile, ...prev]);
    setUsers((prev) => [
      {
        id: `usr-${Date.now()}`,
        employeeCode: applicantCode,
        fullName,
        email: cleanEmail,
        employmentType: 'Penempatan Klien',
        assignedScopes: ['Portal Pelamar Kerja'],
        role: 'Pelamar',
        status: 'Aktif',
        lastActive: 'Baru mendaftar',
      },
      ...prev,
    ]);
    appendAudit(
      `${fullName} (${applicantCode})`,
      'Keamanan',
      'Mendaftarkan akun Pelamar baru & langsung masuk ke Portal Pelamar',
      cleanEmail
    );

    return {
      ok: true,
      user: {
        id: applicantCode,
        name: fullName,
        role: 'Pelamar',
        title: 'Portal Pelamar Kerja PEVORA',
        assignedScopes: [],
        applicantId: newId,
        email: cleanEmail,
      },
    };
  };

  const updateApplicantProfile = (
    applicantId: string,
    patch: Partial<ApplicantProfileRecord>,
    actorLabel?: string
  ) => {
    const existing = applicants.find((app) => app.id === applicantId);
    const wasReady = existing ? calculateApplicantProfileCompleteness(existing).isEmployeeReady : false;
    const nextMerged = existing ? { ...existing, ...patch } : null;
    const isNowReady = nextMerged
      ? calculateApplicantProfileCompleteness(nextMerged).isEmployeeReady
      : false;

    setApplicants((prev) =>
      prev.map((app) => (app.id === applicantId ? { ...app, ...patch } : app))
    );
    if (!wasReady && isNowReady && nextMerged) {
      const activeApp = applications.find(
        (a) => a.applicantId === applicantId && !a.handedOffToOnboarding && a.stage !== 'Tidak Lolos'
      );
      const activeVac = activeApp ? vacancies.find((v) => v.id === activeApp.vacancyId) : undefined;
      if (activeApp && activeVac) {
        pushNotification({
          type: 'applicant-ready',
          title: `Berkas Pelamar Lengkap 100%: ${nextMerged.fullName}`,
          message: `${activeVac.position} (${activeVac.clientName}) — data karyawan & dokumen lengkap, siap diproses ke Handoff Onboarding.`,
          targetMenu: 'rec-handoff',
          entityName: activeVac.clientName,
          applicationId: activeApp.id,
          recipientRole: 'recruiter',
        });
      }
    }
    if (actorLabel) {
      appendAudit(
        actorLabel,
        'Operasional',
        'Memperbarui profil biodata / dokumen karyawan pelamar',
        applicantId
      );
    }
  };

  const submitJobApplication = (
    applicantId: string,
    vacancyId: string
  ): { ok: boolean; message: string } => {
    const applicant = applicants.find((a) => a.id === applicantId);
    const vacancy = vacancies.find((v) => v.id === vacancyId);
    if (!applicant || !vacancy) {
      return { ok: false, message: 'Data pelamar atau lowongan tidak ditemukan.' };
    }
    if (vacancy.status === 'Ditutup' || vacancy.status === 'Draft') {
      return { ok: false, message: 'Lowongan ini sudah ditutup atau belum dipublikasikan.' };
    }
    if (computeRemainingHeadcount(vacancy) <= 0) {
      return { ok: false, message: 'Kuota kebutuhan posisi pada lowongan ini sudah terpenuhi.' };
    }
    const alreadyApplied = applications.some(
      (app) => app.applicantId === applicantId && app.vacancyId === vacancyId
    );
    if (alreadyApplied) {
      return { ok: false, message: 'Anda sudah mengirimkan lamaran untuk posisi ini.' };
    }

    const nextSeq = String(applications.length + 101);
    const newApp: JobApplicationRecord = {
      id: `lam-${Date.now()}`,
      applicationCode: `APP-2026-${nextSeq}`,
      vacancyId,
      applicantId,
      appliedAt: 'Hari ini · Baru dikirim',
      stage: 'Lamaran Masuk',
      requiresFullProfile: false,
      recruiterNotes: 'Lamaran baru masuk dari Portal Pelamar.',
      handedOffToOnboarding: false,
    };

    setApplications((prev) => [newApp, ...prev]);
    pushNotification({
      type: 'new-application',
      title: `Lamaran Baru: ${applicant.fullName} (${newApp.applicationCode})`,
      message: `Melamar posisi ${vacancy.position} · ${vacancy.clientName} (${vacancy.placementLocation}).`,
      targetMenu: 'rec-pipeline',
      entityName: vacancy.clientName,
      applicationId: newApp.id,
      recipientRole: 'recruiter',
    });
    appendAudit(
      `${applicant.fullName} (${applicant.applicantCode})`,
      'Operasional',
      `Melamar posisi ${vacancy.position} (${vacancy.clientName})`,
      newApp.applicationCode
    );

    return {
      ok: true,
      message: `Lamaran untuk posisi ${vacancy.position} (${newApp.applicationCode}) berhasil dikirim.`,
    };
  };

  const withdrawJobApplication = (applicationId: string, applicantId: string) => {
    const target = applications.find(
      (a) => a.id === applicationId && a.applicantId === applicantId
    );
    if (!target || target.handedOffToOnboarding) return;
    setApplications((prev) => prev.filter((a) => a.id !== applicationId));
  };

  const createVacancy = (
    input: Omit<JobVacancyRecord, 'id' | 'code' | 'headcountFilled' | 'createdAt'>,
    actorLabel: string
  ) => {
    const seq = String(vacancies.length + 1).padStart(2, '0');
    const created: JobVacancyRecord = {
      ...input,
      id: `vac-${Date.now()}`,
      code: `LOW-2026-${seq}`,
      headcountFilled: 0,
      createdAt: 'Hari ini',
    };
    setVacancies((prev) => [created, ...prev]);
    appendAudit(
      actorLabel,
      'Operasional',
      `Membuat lowongan ${created.code} (${created.position} · butuh ${created.headcountNeeded} org)`,
      created.clientName
    );
  };

  const updateVacancy = (
    vacancyId: string,
    patch: Partial<JobVacancyRecord>,
    actorLabel: string
  ) => {
    const target = vacancies.find((v) => v.id === vacancyId);
    if (!target) return;
    setVacancies((prev) =>
      prev.map((v) => (v.id === vacancyId ? { ...v, ...patch } : v))
    );
    appendAudit(
      actorLabel,
      'Operasional',
      `Memperbarui lowongan ${target.code} (${patch.position ?? target.position})`,
      patch.clientName ?? target.clientName
    );
  };

  const toggleVacancyStatus = (
    vacancyId: string,
    nextStatus: JobVacancyRecord['status'],
    actorLabel: string
  ) => {
    const target = vacancies.find((v) => v.id === vacancyId);
    if (!target) return;
    setVacancies((prev) =>
      prev.map((v) =>
        v.id === vacancyId
          ? {
              ...v,
              status: nextStatus,
              urgency: nextStatus === 'Mendesak' ? 'Mendesak' : v.urgency,
            }
          : v
      )
    );
    appendAudit(
      actorLabel,
      'Operasional',
      `Mengubah status lowongan ${target.code} menjadi ${nextStatus}`,
      target.clientName
    );
  };

  const advanceApplicationStage = (
    applicationId: string,
    nextStage: ApplicationStage,
    options: { recruiterNotes?: string; requiresFullProfile?: boolean },
    actorLabel: string
  ) => {
    const target = applications.find((a) => a.id === applicationId);
    if (!target) return;
    const applicant = applicants.find((ap) => ap.id === target.applicantId);

    const contactedStages: ApplicationStage[] = [
      'Screening Berkas',
      'Jadwal Interview',
      'Offering',
      'Lolos & Siap Onboarding',
    ];
    const shouldRequireFull =
      typeof options.requiresFullProfile === 'boolean'
        ? options.requiresFullProfile
        : target.requiresFullProfile || contactedStages.includes(nextStage);

    const vac = vacancies.find((v) => v.id === target.vacancyId);

    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              stage: nextStage,
              requiresFullProfile: shouldRequireFull,
              recruiterNotes:
                options.recruiterNotes !== undefined ? options.recruiterNotes : a.recruiterNotes,
            }
          : a
      )
    );
    pushNotification({
      type: 'application-updated',
      title: `Pembaruan Tahap Lamaran (${nextStage})`,
      message: `${vac?.position ?? 'Lowongan Kerja'} · ${shouldRequireFull ? 'Silakan lengkapi profil & dokumen karyawan 100% di menu Profil & Berkas.' : options.recruiterNotes || 'Pantau progres terbaru di menu Lamaran Saya.'}`,
      targetMenu: shouldRequireFull ? 'app-profile' : 'app-applications',
      entityName: vac?.clientName,
      applicationId: target.id,
      applicantId: target.applicantId,
      recipientRole: 'applicant',
    });
    appendAudit(
      actorLabel,
      'Operasional',
      `Memperbarui tahap lamaran ${target.applicationCode} ke ${nextStage}`,
      applicant?.fullName ?? target.applicantId
    );
  };

  const scheduleApplicantInterview = (
    applicationId: string,
    schedule: InterviewScheduleRecord,
    actorLabel: string
  ) => {
    const target = applications.find((a) => a.id === applicationId);
    if (!target) return;
    const applicant = applicants.find((ap) => ap.id === target.applicantId);
    const vac = vacancies.find((v) => v.id === target.vacancyId);

    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              stage: 'Jadwal Interview',
              requiresFullProfile: true,
              interview: schedule,
              recruiterNotes: `Jadwal interview ditetapkan (${schedule.date} ${schedule.time} · ${schedule.mode}). Pelamar diminta melengkapi biodata & dokumen karyawan.`,
            }
          : a
      )
    );
    pushNotification({
      type: 'interview-scheduled',
      title: `Undangan Interview: ${vac?.position ?? target.applicationCode}`,
      message: `Jadwal: ${formatIndonesianDate(schedule.date)} pukul ${schedule.time} (${schedule.mode} · ${schedule.locationOrLink}). Lengkapi profil & berkas Anda sebelum wawancara.`,
      targetMenu: 'app-interviews',
      entityName: vac?.clientName,
      applicationId: target.id,
      applicantId: target.applicantId,
      recipientRole: 'applicant',
    });
    appendAudit(
      actorLabel,
      'Operasional',
      `Menjadwalkan interview ${target.applicationCode} (${schedule.date} ${schedule.time})`,
      applicant?.fullName ?? target.applicantId
    );
  };

  const recordInterviewEvaluation = (
    applicationId: string,
    score: number,
    summary: string,
    nextStage: ApplicationStage,
    actorLabel: string
  ) => {
    const target = applications.find((a) => a.id === applicationId);
    if (!target) return;
    const applicant = applicants.find((ap) => ap.id === target.applicantId);
    const vac = vacancies.find((v) => v.id === target.vacancyId);

    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              stage: nextStage,
              requiresFullProfile: nextStage !== 'Tidak Lolos',
              recruiterNotes: summary.trim() || a.recruiterNotes,
              interview: a.interview
                ? { ...a.interview, evaluationScore: score, evaluationSummary: summary }
                : undefined,
            }
          : a
      )
    );
    pushNotification({
      type: 'application-updated',
      title: `Hasil Evaluasi Interview: ${nextStage}`,
      message: `${vac?.position ?? target.applicationCode} · Skor ${score}/100${summary.trim() ? ` — ${summary.trim()}` : ''}`,
      targetMenu: 'app-applications',
      entityName: vac?.clientName,
      applicationId: target.id,
      applicantId: target.applicantId,
      recipientRole: 'applicant',
    });
    appendAudit(
      actorLabel,
      'Operasional',
      `Mencatat skor interview (${score}/100 → ${nextStage})`,
      applicant?.fullName ?? target.applicantId
    );
  };

  const handoffApplicantToOnboarding = (
    applicationId: string,
    targetJoinDate: string,
    proposedEndDate: string,
    actorLabel: string,
    placementId?: string
  ): { ok: boolean; message: string; createdEmployee?: EmployeeRecord } => {
    const target = applications.find((a) => a.id === applicationId);
    if (!target) return { ok: false, message: 'Lamaran tidak ditemukan.' };
    if (target.handedOffToOnboarding) {
      return { ok: false, message: 'Kandidat ini sudah diproses menjadi karyawan.' };
    }

    const applicant = applicants.find((ap) => ap.id === target.applicantId);
    const vacancy = vacancies.find((v) => v.id === target.vacancyId);
    if (!applicant || !vacancy) {
      return { ok: false, message: 'Profil pelamar atau lowongan tidak ditemukan.' };
    }

    const completeness = calculateApplicantProfileCompleteness(applicant);
    if (!completeness.isEmployeeReady) {
      setApplications((prev) =>
        prev.map((a) =>
          a.id === applicationId
            ? {
                ...a,
                requiresFullProfile: true,
                recruiterNotes: `Menunggu pelamar melengkapi sisa data karyawan (${completeness.missingEmployeeFields.slice(0, 4).join(', ')}).`,
              }
            : a
        )
      );
      return {
        ok: false,
        message: `Data karyawan pelamar belum lengkap (${completeness.percentage}%). Sistem telah menandai wajib lengkapi: ${completeness.missingEmployeeFields.slice(0, 3).join(', ')}.`,
      };
    }

    // Ensure typed client exists as an EntityRecord so Admin & Master Admin views handle it cleanly
    let resolvedEntity = entities.find(
      (e) => e.name.toLowerCase() === vacancy.clientName.trim().toLowerCase()
    );
    const canonicalEntityName = resolvedEntity ? resolvedEntity.name : vacancy.clientName.trim();
    if (!resolvedEntity) {
      const codePrefix = vacancy.employmentType === 'Internal' ? 'INT' : 'CLN';
      const newEnt: EntityRecord = {
        id: `ent-${Date.now()}`,
        code: `${codePrefix}-${String(entities.length + 1).padStart(2, '0')}`,
        name: canonicalEntityName,
        category: vacancy.employmentType === 'Internal' ? 'Internal' : 'Klien Penempatan',
        city: vacancy.placementLocation,
        lead: vacancy.recruiterName,
        employeeCount: 1,
        departmentCount: 1,
        status: 'Aktif',
      };
      resolvedEntity = newEnt;
      setEntities((prev) => [newEnt, ...prev]);
    }

    const generatedNik = generateClientEmployeeNik(resolvedEntity, employees);
    const matchedPlacement =
      resolvedEntity.supportedPlacements?.find((loc) => loc.id === placementId) ??
      (vacancy.placementId
        ? resolvedEntity.supportedPlacements?.find((loc) => loc.id === vacancy.placementId)
        : undefined) ??
      resolvedEntity.supportedPlacements?.find((loc) =>
        vacancy.placementLocation.toLowerCase().includes(loc.name.toLowerCase())
      ) ??
      resolvedEntity.supportedPlacements?.[0];

    const matchedPosition = resolvedEntity.supportedPositions?.find(
      (p) => p.title.toLowerCase() === vacancy.position.trim().toLowerCase()
    );

    const nextSeq = String(onboardingCandidates.length + 95);
    const candidateCode = `ATS-2026-${nextSeq}`;
    const onboardingId = `onb-${Date.now()}`;
    const docProgress = countUploadedDocuments(applicant.documents);
    const prefill = buildApplicantEmployeeFormPrefill(
      applicant,
      { ...vacancy, clientName: canonicalEntityName },
      generatedNik,
      targetJoinDate,
      proposedEndDate
    );

    const nikPrefix = extractEntityNikPrefix(resolvedEntity);
    const seqDigits = generatedNik.split('-')[1] ?? nextSeq;
    const contractNum = `${vacancy.contractType === 'PKWT' ? 'PKWT' : 'PKWTT'}-${nikPrefix}-2026/${seqDigits}`;
    const todayIso = new Date().toISOString().slice(0, 10);

    const employeeFormPayload: EmployeeFormInput = {
      employeeCode: generatedNik,
      fullName: prefill.fullName ?? applicant.fullName,
      email: prefill.email ?? applicant.email,
      whatsappNumber: prefill.whatsappNumber ?? applicant.whatsappNumber,
      position: matchedPosition?.title ?? vacancy.position,
      department: matchedPosition?.department ?? vacancy.department,
      employmentType: vacancy.employmentType,
      entityName: canonicalEntityName,
      contractType: vacancy.contractType,
      contractNumber: contractNum,
      joinDate: targetJoinDate,
      contractEndDate: vacancy.contractType === 'PKWT' ? proposedEndDate : '',
      status: 'Aktif',
      nik: prefill.nik ?? applicant.nik,
      birthPlace: prefill.birthPlace ?? applicant.birthPlace,
      birthDate: prefill.birthDate ?? applicant.birthDate,
      gender: prefill.gender ?? applicant.gender,
      religion: prefill.religion ?? applicant.religion,
      maritalStatus: prefill.maritalStatus ?? applicant.maritalStatus,
      bloodType: prefill.bloodType ?? applicant.bloodType,
      education: prefill.education ?? applicant.education,
      npwpNumber: prefill.npwpNumber ?? applicant.npwpNumber,
      bpjsKesehatanNumber: prefill.bpjsKesehatanNumber ?? applicant.bpjsKesehatanNumber ?? '',
      bpjsKetenagakerjaanNumber:
        prefill.bpjsKetenagakerjaanNumber ?? applicant.bpjsKetenagakerjaanNumber ?? '',
      ktpAddress: prefill.ktpAddress ?? { ...applicant.ktpAddress },
      domicileSameAsKtp: prefill.domicileSameAsKtp ?? applicant.domicileSameAsKtp,
      domicileAddress: prefill.domicileAddress ?? applicant.domicileAddress,
      kkNumber: prefill.kkNumber ?? applicant.kkNumber,
      headOfFamily: prefill.headOfFamily ?? applicant.headOfFamily,
      familyMembers: prefill.familyMembers ?? applicant.familyMembers.map((m) => ({ ...m })),
      emergencyContact: prefill.emergencyContact ?? { ...applicant.emergencyContact },
      bankName: prefill.bankName ?? applicant.bankName,
      bankAccountNumber: prefill.bankAccountNumber ?? applicant.bankAccountNumber,
      bankAccountHolder: prefill.bankAccountHolder ?? applicant.bankAccountHolder,
      bankBranch: prefill.bankBranch ?? applicant.bankBranch,
      documents: {
        ...(prefill.documents ?? applicant.documents),
        contractUploaded: false,
      },
      salaryMonthly:
        matchedPosition?.baseSalary ??
        prefill.salaryMonthly ??
        vacancy.salaryMax ??
        vacancy.salaryMin,
      placementLocation: matchedPlacement?.name ?? vacancy.placementLocation,
      placementId: matchedPlacement?.id,
      placementName: matchedPlacement?.name ?? vacancy.placementLocation,
      placementArea: matchedPlacement?.area ?? vacancy.placementLocation,
      placementMapsUrl: matchedPlacement?.mapsUrl,
      originApplicantCode: applicant.applicantCode,
      applicantId: applicant.id,
      portalPassword: applicant.password,
      isNewHire: true,
      createdAtIso: todayIso,
      contractHistory: [
        {
          id: `hist-${Date.now()}-1`,
          sequenceLabel: vacancy.contractType === 'PKWT' ? 'PKWT Ke-1' : 'PKWTT (Tetap)',
          contractType: vacancy.contractType,
          contractNumber: contractNum,
          startDate: targetJoinDate,
          endDate: vacancy.contractType === 'PKWT' ? proposedEndDate : '',
          entityName: canonicalEntityName,
          placementName: matchedPlacement?.name ?? vacancy.placementLocation,
          placementArea: matchedPlacement?.area,
          placementMapsUrl: matchedPlacement?.mapsUrl,
          position: matchedPosition?.title ?? vacancy.position,
          signatureStatus: 'Menunggu TTD Karyawan',
          signerEmployeeName: applicant.fullName,
          notes: `Konversi otomatis dari pelamar ${applicant.applicantCode} (${vacancy.code}). Menunggu TTD digital di akun karyawan.`,
        },
      ],
    };

    const createdEmployee: EmployeeRecord = {
      ...employeeFormPayload,
      id: `emp-${Date.now()}`,
    };

    setEmployees((prev) => [createdEmployee, ...prev]);
    setContracts((prev) => [buildSyncedContractRecord(employeeFormPayload), ...prev]);

    const newOnboarding: OnboardingCandidateRecord = {
      id: onboardingId,
      candidateCode,
      applicantId: applicant.id,
      fullName: applicant.fullName,
      email: applicant.email,
      whatsappNumber: applicant.whatsappNumber,
      position: employeeFormPayload.position,
      employmentType: vacancy.employmentType,
      entityName: canonicalEntityName,
      recruiterName: vacancy.recruiterName,
      targetJoinDate,
      proposedContractType: vacancy.contractType,
      proposedEndDate,
      documentsReadyCount: docProgress.completed,
      salaryMonthly: employeeFormPayload.salaryMonthly,
      placementLocation: employeeFormPayload.placementLocation,
      prefillEmployeeData: employeeFormPayload,
      status: 'Aktif Menjadi Karyawan',
    };

    setOnboardingCandidates((prev) => [newOnboarding, ...prev]);
    setApplicants((prev) =>
      prev.map((ap) =>
        ap.id === applicant.id
          ? {
              ...ap,
              convertedToEmployeeCode: generatedNik,
              accountDisabled: true,
            }
          : ap
      )
    );
    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              stage: 'Lolos & Siap Onboarding',
              requiresFullProfile: true,
              handedOffToOnboarding: true,
              onboardingCandidateId: onboardingId,
              recruiterNotes: `Lolos & otomatis terdaftar di Data Karyawan dengan NIK ${generatedNik} (asal ${applicant.applicantCode}). PKWT Ke-1 siap TTD digital karyawan.`,
            }
          : a
      )
    );
    setVacancies((prev) =>
      prev.map((v) => {
        if (v.id !== vacancy.id) return v;
        const nextFilled = Math.min(v.headcountNeeded, v.headcountFilled + 1);
        return {
          ...v,
          headcountFilled: nextFilled,
          status: nextFilled >= v.headcountNeeded ? 'Ditutup' : v.status,
        };
      })
    );
    pushNotification({
      type: 'new-employee',
      title: `Pelamar Lolos → Karyawan Baru (${generatedNik})`,
      message: `${applicant.fullName} (${applicant.applicantCode}) resmi masuk Data Karyawan ${canonicalEntityName}${matchedPlacement ? ` · ${matchedPlacement.name}` : ''}. PKWT Ke-1 menunggu TTD digital karyawan.`,
      targetMenu: 'employees',
      employeeCode: generatedNik,
      entityName: canonicalEntityName,
    });
    appendAudit(
      actorLabel,
      'Operasional',
      `Mengonversi pelamar lolos ${applicant.applicantCode} menjadi karyawan ${generatedNik} & menerbitkan PKWT Ke-1`,
      `${applicant.fullName} · ${canonicalEntityName}`
    );

    return {
      ok: true,
      message: `${applicant.fullName} berhasil lolos & otomatis masuk Data Karyawan dengan NIK ${generatedNik} (menggantikan ${applicant.applicantCode}). Anda dapat langsung mengirim info akun via WA atau Email.`,
      createdEmployee,
    };
  };

  // =========================================================================
  // ROLE KARYAWAN (ESS) + BIOMETRIC FACE ATTENDANCE ACTIONS
  // =========================================================================

  const formatCurrentClockLabel = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm} WIB`;
  };

  const formatTodayAttendanceLabel = () => {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const dd = String(now.getDate()).padStart(2, '0');
    const mmm = months[now.getMonth()] ?? 'Nov';
    const yyyy = now.getFullYear();
    return `${dd} ${mmm} ${yyyy}`;
  };

  const enrollEmployeeFace = (
    employeeId: string,
    descriptor: number[],
    referenceSnapshot: string,
    actorLabel: string
  ) => {
    const target = employees.find((e) => e.id === employeeId);
    if (!target || descriptor.length === 0) return;
    const timestamp = `Hari ini · ${formatCurrentClockLabel()}`;
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              faceBiometric: {
                enrolled: true,
                enrolledAt: timestamp,
                descriptor,
                referenceSnapshot,
              },
            }
          : emp
      )
    );
    appendAudit(
      actorLabel,
      'Keamanan',
      `Mendaftarkan biometrik wajah karyawan (${target.employeeCode})`,
      `${target.fullName} · ${target.entityName}`
    );
  };

  const resetEmployeeFace = (employeeId: string, actorLabel: string) => {
    const target = employees.find((e) => e.id === employeeId);
    if (!target) return;
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              faceBiometric: undefined,
            }
          : emp
      )
    );
    appendAudit(
      actorLabel,
      'Keamanan',
      `Mereset data biometrik wajah karyawan (${target.employeeCode}) untuk registrasi ulang`,
      `${target.fullName} · ${target.entityName}`
    );
  };

  const recordEmployeeAttendance = (
    employeeCode: string,
    mode: 'checkin' | 'checkout',
    payload: {
      locationUsed: string;
      notes: string;
      faceMatchScore: number;
      selfieSnapshot: string;
    },
    actorLabel: string
  ): { ok: boolean; message: string } => {
    const target = employees.find(
      (e) => e.employeeCode.toLowerCase() === employeeCode.trim().toLowerCase()
    );
    if (!target) {
      return { ok: false, message: 'Data karyawan tidak ditemukan.' };
    }
    if (!target.faceBiometric?.enrolled) {
      return {
        ok: false,
        message: 'Wajah belum terdaftar. Selesaikan Registrasi Wajah terlebih dahulu.',
      };
    }
    if (payload.faceMatchScore < FACE_MATCH_THRESHOLD_PERCENT) {
      return {
        ok: false,
        message: `Skor kecocokan wajah (${payload.faceMatchScore}%) di bawah ambang batas keamanan (${FACE_MATCH_THRESHOLD_PERCENT}%).`,
      };
    }

    const todayLabel = formatTodayAttendanceLabel();
    const clockNow = formatCurrentClockLabel();
    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const schedule = resolveEmployeeWorkSchedule(
      target.entityName,
      policy,
      target.placementName
    );

    const activeEntityLocs = policy.attendanceLocations.filter(
      (loc) => loc.entityName === target.entityName && loc.status === 'Aktif'
    );
    const hasConfiguredEntityLocs = policy.attendanceLocations.some(
      (loc) => loc.entityName === target.entityName
    );
    if (hasConfiguredEntityLocs && activeEntityLocs.length === 0) {
      return {
        ok: false,
        message: `Titik lokasi presensi untuk ${target.entityName} sedang dinonaktifkan oleh HR / Master Admin pada menu Kebijakan.`,
      };
    }

    const chosenLocRecord =
      policy.attendanceLocations.find(
        (loc) => loc.status === 'Aktif' && loc.name === payload.locationUsed
      ) ?? schedule.matchedLocation;

    const formattedLocationUsed = chosenLocRecord
      ? `${chosenLocRecord.name} (${
          schedule.locationMode === 'Fleksibel Lapangan'
            ? `Mode Lapangan · Radius ${chosenLocRecord.radiusMeters}m`
            : `Radius ${chosenLocRecord.radiusMeters}m`
        })`
      : payload.locationUsed;

    if (mode === 'checkin') {
      const existingToday = attendanceLogs.find(
        (l) =>
          l.employeeCode.toLowerCase() === target.employeeCode.toLowerCase() &&
          l.dateLabel === todayLabel
      );
      if (existingToday && existingToday.checkIn !== '—') {
        return {
          ok: false,
          message: `Clock-In hari ini (${todayLabel}) sudah tercatat pada pukul ${existingToday.checkIn}.`,
        };
      }

      const evalIn = evaluateAttendanceAgainstPolicy('checkin', currentHourMin, schedule);

      const newLog: AttendanceLogRecord = {
        id: `att-${Date.now()}`,
        employeeCode: target.employeeCode,
        employeeName: target.fullName,
        employmentType: target.employmentType,
        entityName: target.entityName,
        dateLabel: todayLabel,
        checkIn: clockNow,
        checkOut: '—',
        status: evalIn.status,
        lateMinutes: evalIn.lateMinutes,
        locationUsed: formattedLocationUsed,
        notes: payload.notes.trim()
          ? `${payload.notes.trim()} · ${evalIn.policyNote}`
          : `${evalIn.policyNote} · Face Match ${payload.faceMatchScore}%`,
        faceVerified: true,
        livenessPassed: true,
        faceMatchScore: payload.faceMatchScore,
        selfieSnapshot: payload.selfieSnapshot,
      };

      setAttendanceLogs((prev) => [newLog, ...prev]);
      appendAudit(
        actorLabel,
        'Operasional',
        `Clock-In biometrik wajah (${newLog.status}${
          evalIn.lateMinutes > 0 ? ` · telat ${evalIn.lateMinutes} mnt` : ''
        } · ${schedule.policySourceLabel})`,
        `${target.fullName} · ${formattedLocationUsed}`
      );
      return {
        ok: true,
        message: `Clock-In berhasil tercatat pukul ${clockNow} — Status: ${newLog.status}${
          evalIn.lateMinutes > 0 ? ` (Terlambat ${evalIn.lateMinutes} mnt)` : ' (Tepat Waktu)'
        } mengikuti ${schedule.policySourceLabel} (${schedule.checkInTime}–${schedule.checkOutTime} WIB).`,
      };
    }

    // Clock-Out
    const activeTodayLog = attendanceLogs.find(
      (l) =>
        l.employeeCode.toLowerCase() === target.employeeCode.toLowerCase() &&
        l.dateLabel === todayLabel &&
        l.checkIn !== '—'
    );

    if (!activeTodayLog) {
      return {
        ok: false,
        message: `Belum ada catatan Clock-In untuk hari ini (${todayLabel}). Lakukan Clock-In terlebih dahulu.`,
      };
    }
    if (activeTodayLog.checkOut !== '—') {
      return {
        ok: false,
        message: `Clock-Out hari ini sudah tercatat pada pukul ${activeTodayLog.checkOut}.`,
      };
    }

    const evalOut = evaluateAttendanceAgainstPolicy('checkout', currentHourMin, schedule);

    setAttendanceLogs((prev) =>
      prev.map((log) =>
        log.id === activeTodayLog.id
          ? {
              ...log,
              checkOut: clockNow,
              notes: `${log.notes} | Clock-Out ${clockNow}: ${evalOut.policyNote}`,
              faceVerified: true,
              livenessPassed: true,
              faceMatchScore: payload.faceMatchScore,
              selfieSnapshot: payload.selfieSnapshot || log.selfieSnapshot,
            }
          : log
      )
    );
    appendAudit(
      actorLabel,
      'Operasional',
      `Clock-Out biometrik wajah (${evalOut.policyNote} · skor ${payload.faceMatchScore}%)`,
      `${target.fullName} · ${formattedLocationUsed}`
    );
    return {
      ok: true,
      message: `Clock-Out berhasil tercatat pukul ${clockNow} (${evalOut.policyNote}).`,
    };
  };

  const submitEmployeeLeaveRequest = (
    employeeCode: string,
    input: {
      type: 'Cuti Tahunan' | 'Izin Sakit' | 'Izin Keperluan';
      dateRange: string;
      daysCount: number;
      reason: string;
      skdFileName?: string;
      skdFileDataUrl?: string;
      doctorOrClinicName?: string;
    },
    actorLabel: string
  ): { ok: boolean; message: string } => {
    const target = employees.find(
      (e) => e.employeeCode.toLowerCase() === employeeCode.trim().toLowerCase()
    );
    if (!target) return { ok: false, message: 'Data karyawan tidak ditemukan.' };

    const quotaSummary = calculateEmployeeLeaveQuotaSummary(
      target.employeeCode,
      leaveAbsences,
      policy.annualLeaveQuota
    );
    const cleanDays = Math.max(1, Math.round(Number(input.daysCount) || 1));

    const validation = validateLeaveRequestSubmission({
      type: input.type,
      dateRange: input.dateRange,
      daysCount: cleanDays,
      reason: input.reason,
      skdFileName: input.skdFileName,
      skdFileDataUrl: input.skdFileDataUrl,
      remainingLeaveQuota: quotaSummary.remainingLeaveQuota,
    });
    if (!validation.ok) {
      return {
        ok: false,
        message: validation.error ?? 'Lengkapi data pengajuan cuti/izin terlebih dahulu.',
      };
    }

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const submittedStamp = `Hari ini · ${hh}:${mm}`;

    const resolvedSkdDataUrl =
      input.type === 'Izin Sakit'
        ? input.skdFileDataUrl?.trim() ||
          buildSkdCertificatePreviewDataUrl({
            employeeName: target.fullName,
            employeeCode: target.employeeCode,
            dateRange: input.dateRange.trim(),
            daysCount: cleanDays,
            reason: input.reason.trim(),
            doctorOrClinicName: input.doctorOrClinicName,
          })
        : undefined;

    const created: LeaveAbsenceRecord = {
      id: `lv-${Date.now()}`,
      employeeCode: target.employeeCode,
      employeeName: target.fullName,
      employmentType: target.employmentType,
      entityName: target.entityName,
      type: input.type,
      dateRange: input.dateRange.trim(),
      daysCount: cleanDays,
      reason: input.reason.trim(),
      status: 'Menunggu',
      skdFileName: input.type === 'Izin Sakit' ? input.skdFileName?.trim() : undefined,
      skdFileDataUrl: resolvedSkdDataUrl,
      doctorOrClinicName:
        input.type === 'Izin Sakit' ? input.doctorOrClinicName?.trim() : undefined,
      submittedAt: submittedStamp,
    };

    setLeaveAbsences((prev) => [created, ...prev]);

    pushNotification({
      type: 'leave-submitted',
      title: `Pengajuan ${created.type} Baru: ${target.fullName} (${target.employeeCode})`,
      message: `${created.dateRange} (${created.daysCount} hari)${
        created.skdFileName ? ` · Lampiran SKD: ${created.skdFileName}` : ''
      } · ${target.entityName}. Klik untuk verifikasi di Operasional.`,
      targetMenu: 'monitoring',
      employeeCode: target.employeeCode,
      entityName: target.entityName,
      leaveId: created.id,
      recipientRole: 'admin',
    });

    appendAudit(
      actorLabel,
      'Operasional',
      `Mengajukan ${created.type} (${created.dateRange} · ${created.daysCount} hari${
        created.skdFileName ? ` · SKD: ${created.skdFileName}` : ''
      })`,
      `${target.fullName} · ${target.entityName}`
    );

    return {
      ok: true,
      message:
        created.type === 'Izin Sakit'
          ? `Pengajuan Izin Sakit (${created.dateRange} · ${created.daysCount} hari) beserta lampiran SKD (${created.skdFileName}) berhasil dikirim ke notifikasi & menu Operasional Admin.`
          : `Pengajuan ${created.type} (${created.dateRange} · ${created.daysCount} hari) berhasil dikirim ke notifikasi & antrean persetujuan Operasional Admin.`,
    };
  };

  const clarifyEmployeeAlpha = (leaveId: string, explanation: string, actorLabel: string) => {
    const found = leaveAbsences.find((l) => l.id === leaveId);
    if (!found || !explanation.trim()) return;
    setLeaveAbsences((prev) =>
      prev.map((l) =>
        l.id === leaveId
          ? {
              ...l,
              reason: `[Klarifikasi Karyawan] ${explanation.trim()}`,
              status: 'Menunggu',
            }
          : l
      )
    );
    pushNotification({
      type: 'alpha-clarified',
      title: `Klarifikasi Alpha Karyawan: ${found.employeeName} (${found.employeeCode})`,
      message: `${found.dateRange} · "${explanation.trim()}" (${found.entityName}).`,
      targetMenu: 'monitoring',
      employeeCode: found.employeeCode,
      entityName: found.entityName,
      leaveId: found.id,
      recipientRole: 'admin',
    });
    appendAudit(
      actorLabel,
      'Operasional',
      `Mengirim klarifikasi ketidakhadiran (${found.dateRange})`,
      `${found.employeeName} · ${found.entityName}`
    );
  };

  const updateEmployeeSelfProfile = (
    employeeId: string,
    patch: Partial<
      Pick<
        EmployeeRecord,
        | 'whatsappNumber'
        | 'email'
        | 'domicileSameAsKtp'
        | 'domicileAddress'
        | 'emergencyContact'
        | 'npwpNumber'
        | 'bpjsKesehatanNumber'
        | 'bpjsKetenagakerjaanNumber'
        | 'bankName'
        | 'bankAccountNumber'
        | 'bankAccountHolder'
        | 'bankBranch'
        | 'documents'
        | 'bpjsKesehatanCardName'
        | 'bpjsKesehatanCardDataUrl'
        | 'bpjsKetenagakerjaanCardName'
        | 'bpjsKetenagakerjaanCardDataUrl'
      >
    >,
    actorLabel: string
  ) => {
    const target = employees.find((e) => e.id === employeeId);
    if (!target) return;
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === employeeId ? { ...emp, ...patch } : emp))
    );
    appendAudit(
      actorLabel,
      'Operasional',
      `Memperbarui data mandiri karyawan (${target.employeeCode})`,
      `${target.fullName} · BPJS / Kontak / Berkas`
    );
  };

  const liveSnapshots = useMemo(
    () =>
      buildLiveOperationalSnapshots({
        entities,
        vacancies,
        applications,
        contracts,
        leaveAbsences,
        attendanceLogs,
        baseSnapshots: snapshots,
      }),
    [entities, vacancies, applications, contracts, leaveAbsences, attendanceLogs, snapshots]
  );

  return {
    entities,
    departments,
    employees,
    users,
    approvals,
    snapshots: liveSnapshots,
    attendanceLogs,
    leaveAbsences,
    contracts,
    onboardingCandidates,
    auditLogs,
    policy,
    settings,
    vacancies,
    applicants,
    applications,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    markEmployeeReviewed,
    approveRequest,
    rejectRequest,
    addEntity,
    updateEntity,
    toggleEntityStatus,
    removeClientEntity,
    createEmployee,
    updateEmployee,
    saveEmployeeSignatureSpecimen,
    signEmployeePkwtDigitally,
    addOrUploadEmployeeContractHistory,
    deleteEmployee,
    changeUserRole,
    updateUserScope,
    toggleUserStatus,
    resetOrUpdateUserPassword,
    createInternalUserAccount,
    toggleEmployeeAccountStatus,
    resetOrUpdateEmployeePassword,
    changeEmployeeOwnPassword,
    toggleApplicantAccountStatus,
    resetOrUpdateApplicantPassword,
    savePolicy,
    addAttendanceLocation,
    toggleLocationStatus,
    removeLocation,
    syncPolicyLocationsFromEntities,
    approveLeave,
    rejectLeave,
    convertAlphaToIzin,
    updateAttendanceNotes,
    extendPkwtContract,
    proposePkwtExtension,
    submitCandidateOnboarding,
    saveSettings,
    resetWorkspaceSimulation,
    registerApplicantAccount,
    updateApplicantProfile,
    submitJobApplication,
    withdrawJobApplication,
    createVacancy,
    updateVacancy,
    toggleVacancyStatus,
    advanceApplicationStage,
    scheduleApplicantInterview,
    recordInterviewEvaluation,
    handoffApplicantToOnboarding,
    enrollEmployeeFace,
    resetEmployeeFace,
    recordEmployeeAttendance,
    submitEmployeeLeaveRequest,
    clarifyEmployeeAlpha,
    updateEmployeeSelfProfile,
  };
}

export type WorkspaceStore = ReturnType<typeof useWorkspaceStore>;
