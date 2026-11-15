import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Plus,
  ScanLine,
  Search,
  Send,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { PevoraLogo } from '../PevoraLogo';
import { NotificationBellMenu } from '../shared/NotificationBellMenu';
import type { MasterAdminUser } from '../../utils/validation';
import type { WorkspaceStore } from '../../hooks/useWorkspaceStore';
import {
  DOCUMENT_CHECKLIST_ITEMS,
  EmployeeDocumentsRecord,
  FamilyMemberRecord,
  countUploadedDocuments,
  formatIndonesianDate,
} from '../../data/masterAdminData';
import {
  ApplicantProfileRecord,
  JobApplicationRecord,
  JobVacancyRecord,
  calculateAgeFromIsoDate,
  calculateApplicantProfileCompleteness,
  computeRemainingHeadcount,
  filterVacanciesForApplicant,
  formatSalaryRangeRupiah,
} from '../../data/recruitmentData';

type ApplicantMenuId =
  | 'app-overview'
  | 'app-vacancies'
  | 'app-applications'
  | 'app-interviews'
  | 'app-profile';

interface ApplicantDashboardProps {
  user: MasterAdminUser;
  store: WorkspaceStore;
  onLogout: () => void;
}

const APPLICANT_MENU_ITEMS: Array<{
  id: ApplicantMenuId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'app-overview', label: 'Beranda', icon: LayoutDashboard },
  { id: 'app-vacancies', label: 'Lowongan', icon: Briefcase },
  { id: 'app-applications', label: 'Lamaran Saya', icon: ClipboardList },
  { id: 'app-interviews', label: 'Wawancara', icon: CalendarClock },
  { id: 'app-profile', label: 'Profil & Berkas', icon: UserCheck },
];

function getStageColorClass(stage: JobApplicationRecord['stage']): string {
  switch (stage) {
    case 'Lolos & Siap Onboarding':
      return 'text-[#16A36A]';
    case 'Offering':
    case 'Jadwal Interview':
      return 'text-[#1468E8]';
    case 'Screening Berkas':
      return 'text-[#B87D00]';
    case 'Tidak Lolos':
      return 'text-[#DC3545]';
    default:
      return 'text-[#102B69]';
  }
}

function readFileAsBase64(file: File): Promise<{ mimeType: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({ mimeType: file.type || 'image/jpeg', base64 });
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas dari perangkat.'));
    reader.readAsDataURL(file);
  });
}

export const ApplicantDashboard: React.FC<ApplicantDashboardProps> = ({
  user,
  store,
  onLogout,
}) => {
  const [activeMenu, setActiveMenu] = useState<ApplicantMenuId>('app-overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Job board filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('Semua');
  const [urgencyFilter, setUrgencyFilter] = useState<'Semua' | 'Mendesak'>('Semua');
  const [selectedVacancy, setSelectedVacancy] = useState<JobVacancyRecord | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const profile = useMemo(() => {
    return (
      store.applicants.find(
        (a) =>
          a.id === user.applicantId ||
          a.applicantCode === user.id ||
          (user.email && a.email.toLowerCase() === user.email.toLowerCase())
      ) ?? store.applicants[0]
    );
  }, [store.applicants, user]);

  // Local editable form mirror synced when user saves
  const [draft, setDraft] = useState<ApplicantProfileRecord>(() => profile);
  const [profileSavedNotice, setProfileSavedNotice] = useState<string | null>(null);

  // AI Vision OCR state
  const [ocrScanningType, setOcrScanningType] = useState<'ktp' | 'kk' | null>(null);
  const [ocrFeedback, setOcrFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const ktpFileInputRef = useRef<HTMLInputElement | null>(null);
  const kkFileInputRef = useRef<HTMLInputElement | null>(null);

  const activeProfile = draft.id === profile.id ? draft : profile;
  const completeness = useMemo(
    () => calculateApplicantProfileCompleteness(activeProfile),
    [activeProfile]
  );
  const docStats = useMemo(
    () => countUploadedDocuments(activeProfile.documents),
    [activeProfile.documents]
  );

  const myApplications = useMemo(
    () => store.applications.filter((app) => app.applicantId === profile.id),
    [store.applications, profile.id]
  );
  const myInterviews = useMemo(
    () => myApplications.filter((app) => Boolean(app.interview)),
    [myApplications]
  );
  const myNotifications = useMemo(
    () =>
      store.notifications.filter(
        (n) => n.recipientRole === 'applicant' && n.applicantId === profile.id
      ),
    [store.notifications, profile.id]
  );
  const contactedNeedsProfile = useMemo(
    () =>
      myApplications.some(
        (app) => app.requiresFullProfile && app.stage !== 'Tidak Lolos' && !completeness.isEmployeeReady
      ),
    [myApplications, completeness.isEmployeeReady]
  );

  const distinctLocations = useMemo(() => {
    const locs = Array.from(new Set(store.vacancies.map((v) => v.placementLocation)));
    return locs.sort((a, b) => a.localeCompare(b));
  }, [store.vacancies]);

  const visibleVacancies = useMemo(
    () => filterVacanciesForApplicant(store.vacancies, searchQuery, locationFilter, urgencyFilter),
    [store.vacancies, searchQuery, locationFilter, urgencyFilter]
  );

  const computedAge = useMemo(
    () => calculateAgeFromIsoDate(activeProfile.birthDate),
    [activeProfile.birthDate]
  );

  const selectMenu = (id: ApplicantMenuId) => {
    setActiveMenu(id);
    setMobileSidebarOpen(false);
    setActionBanner(null);
    if (id === 'app-profile') {
      setDraft(profile);
    }
  };

  const handleApplyVacancy = (vacancy: JobVacancyRecord) => {
    const res = store.submitJobApplication(profile.id, vacancy.id);
    setActionBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    if (res.ok) {
      setSelectedVacancy(null);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const compiledDomicile = activeProfile.domicileSameAsKtp
      ? [
          activeProfile.ktpAddress.street,
          activeProfile.ktpAddress.rtRw ? `RT/RW ${activeProfile.ktpAddress.rtRw}` : '',
          activeProfile.ktpAddress.kelurahan,
          activeProfile.ktpAddress.city,
        ]
          .filter(Boolean)
          .join(', ')
      : activeProfile.domicileAddress;

    const cleanMembers = activeProfile.familyMembers.filter((m) => m.name.trim().length > 0);
    const updated: ApplicantProfileRecord = {
      ...activeProfile,
      domicileAddress: compiledDomicile,
      familyMembers: cleanMembers,
    };
    setDraft(updated);
    store.updateApplicantProfile(
      profile.id,
      updated,
      `${profile.fullName} (${profile.applicantCode})`
    );
    setProfileSavedNotice(
      `Profil & kelengkapan dokumen berhasil disimpan (${calculateApplicantProfileCompleteness(updated).percentage}% siap database karyawan).`
    );
  };

  const handleOcrFileChange = async (
    docType: 'ktp' | 'kk',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrFeedback(null);
    setOcrScanningType(docType);

    // Record uploaded file name immediately in documents checklist
    const docKey: keyof EmployeeDocumentsRecord = docType === 'ktp' ? 'ktpUploaded' : 'kkUploaded';
    const baseUpdatedDocs: EmployeeDocumentsRecord = {
      ...activeProfile.documents,
      [docKey]: true,
    };
    const baseUpdatedNames = {
      ...activeProfile.documentFileNames,
      [docKey]: file.name,
    };

    try {
      const { mimeType, base64 } = await readFileAsBase64(file);
      const response = await fetch('/api/ocr/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          mimeType,
          imageBase64: base64,
        }),
      });
      const json = await response.json();

      if (!response.ok || !json.ok) {
        const nextDraft: ApplicantProfileRecord = {
          ...activeProfile,
          documents: baseUpdatedDocs,
          documentFileNames: baseUpdatedNames,
        };
        setDraft(nextDraft);
        store.updateApplicantProfile(profile.id, {
          documents: baseUpdatedDocs,
          documentFileNames: baseUpdatedNames,
        });
        setOcrFeedback({
          type: 'error',
          text:
            json.error ||
            'File berhasil diunggah, namun pemindaian AI Vision tidak dapat membaca teks otomatis. Silakan ketik/edit kolom secara manual di bawah.',
        });
        return;
      }

      const data = (json.data ?? {}) as Record<string, unknown>;
      const nowLabel = 'Baru dipindai AI Vision';

      if (docType === 'ktp') {
        const nextGender =
          data.gender === 'Perempuan'
            ? 'Perempuan'
            : data.gender === 'Laki-laki'
              ? 'Laki-laki'
              : activeProfile.gender;
        const validMarital = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'] as const;
        const nextMarital = validMarital.includes(data.maritalStatus as (typeof validMarital)[number])
          ? (data.maritalStatus as ApplicantProfileRecord['maritalStatus'])
          : activeProfile.maritalStatus;

        const nextDraft: ApplicantProfileRecord = {
          ...activeProfile,
          nik:
            typeof data.nik === 'string' && data.nik.replace(/\D/g, '')
              ? data.nik.replace(/\D/g, '').slice(0, 16)
              : activeProfile.nik,
          fullName:
            typeof data.fullName === 'string' && data.fullName.trim()
              ? data.fullName.trim()
              : activeProfile.fullName,
          birthPlace:
            typeof data.birthPlace === 'string' && data.birthPlace.trim()
              ? data.birthPlace.trim()
              : activeProfile.birthPlace,
          birthDate:
            typeof data.birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.birthDate.trim())
              ? data.birthDate.trim()
              : activeProfile.birthDate,
          gender: nextGender,
          religion:
            typeof data.religion === 'string' && data.religion.trim()
              ? data.religion.trim()
              : activeProfile.religion,
          maritalStatus: nextMarital,
          bloodType:
            typeof data.bloodType === 'string' && data.bloodType.trim()
              ? data.bloodType.trim()
              : activeProfile.bloodType,
          ktpAddress: {
            street:
              typeof data.street === 'string' && data.street.trim()
                ? data.street.trim()
                : activeProfile.ktpAddress.street,
            rtRw:
              typeof data.rtRw === 'string' && data.rtRw.trim()
                ? data.rtRw.trim()
                : activeProfile.ktpAddress.rtRw,
            kelurahan:
              typeof data.kelurahan === 'string' && data.kelurahan.trim()
                ? data.kelurahan.trim()
                : activeProfile.ktpAddress.kelurahan,
            kecamatan:
              typeof data.kecamatan === 'string' && data.kecamatan.trim()
                ? data.kecamatan.trim()
                : activeProfile.ktpAddress.kecamatan,
            city:
              typeof data.city === 'string' && data.city.trim()
                ? data.city.trim()
                : activeProfile.ktpAddress.city,
            province:
              typeof data.province === 'string' && data.province.trim()
                ? data.province.trim()
                : activeProfile.ktpAddress.province,
            postalCode:
              typeof data.postalCode === 'string' && data.postalCode.trim()
                ? data.postalCode.trim()
                : activeProfile.ktpAddress.postalCode,
          },
          documents: baseUpdatedDocs,
          documentFileNames: baseUpdatedNames,
          ocrSources: {
            ...activeProfile.ocrSources,
            ktpVerifiedByOcr: true,
            lastKtpScanAt: nowLabel,
          },
        };
        setDraft(nextDraft);
        store.updateApplicantProfile(profile.id, nextDraft);
        setOcrFeedback({
          type: 'success',
          text: `AI Vision OCR KTP (${file.name}) berhasil mengisi data KTP Anda secara otomatis. Periksa hasil di bawah dan edit jika diperlukan.`,
        });
      } else {
        const rawMembers = Array.isArray(data.familyMembers) ? data.familyMembers : [];
        const validRelations = ['Pasangan', 'Anak', 'Orang Tua', 'Saudara Kandung'] as const;
        const parsedMembers: FamilyMemberRecord[] = rawMembers
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item, idx) => ({
            id: `fam-ocr-${Date.now()}-${idx}`,
            name: typeof item.name === 'string' ? item.name.trim() : '',
            relation: validRelations.includes(item.relation as (typeof validRelations)[number])
              ? (item.relation as FamilyMemberRecord['relation'])
              : 'Saudara Kandung',
            birthDate:
              typeof item.birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.birthDate.trim())
                ? item.birthDate.trim()
                : '1995-01-01',
            nik: typeof item.nik === 'string' ? item.nik.replace(/\D/g, '').slice(0, 16) : '',
          }))
          .filter((m) => m.name.length > 0);

        const nextDraft: ApplicantProfileRecord = {
          ...activeProfile,
          kkNumber:
            typeof data.kkNumber === 'string' && data.kkNumber.replace(/\D/g, '')
              ? data.kkNumber.replace(/\D/g, '').slice(0, 16)
              : activeProfile.kkNumber,
          headOfFamily:
            typeof data.headOfFamily === 'string' && data.headOfFamily.trim()
              ? data.headOfFamily.trim()
              : activeProfile.headOfFamily,
          familyMembers:
            parsedMembers.length > 0 ? parsedMembers : activeProfile.familyMembers,
          ktpAddress: {
            ...activeProfile.ktpAddress,
            street:
              activeProfile.ktpAddress.street ||
              (typeof data.street === 'string' ? data.street.trim() : ''),
            rtRw:
              activeProfile.ktpAddress.rtRw ||
              (typeof data.rtRw === 'string' ? data.rtRw.trim() : ''),
            kelurahan:
              activeProfile.ktpAddress.kelurahan ||
              (typeof data.kelurahan === 'string' ? data.kelurahan.trim() : ''),
            kecamatan:
              activeProfile.ktpAddress.kecamatan ||
              (typeof data.kecamatan === 'string' ? data.kecamatan.trim() : ''),
            city:
              activeProfile.ktpAddress.city ||
              (typeof data.city === 'string' ? data.city.trim() : ''),
            province:
              activeProfile.ktpAddress.province ||
              (typeof data.province === 'string' ? data.province.trim() : ''),
            postalCode:
              activeProfile.ktpAddress.postalCode ||
              (typeof data.postalCode === 'string' ? data.postalCode.trim() : ''),
          },
          documents: baseUpdatedDocs,
          documentFileNames: baseUpdatedNames,
          ocrSources: {
            ...activeProfile.ocrSources,
            kkVerifiedByOcr: true,
            lastKkScanAt: nowLabel,
          },
        };
        setDraft(nextDraft);
        store.updateApplicantProfile(profile.id, nextDraft);
        setOcrFeedback({
          type: 'success',
          text: `AI Vision OCR Kartu Keluarga (${file.name}) berhasil mengisi No. KK, Kepala Keluarga, dan anggota keluarga secara otomatis.`,
        });
      }
    } catch (err) {
      setOcrFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? `${err.message} Silakan isi kolom secara manual.`
            : 'Gagal memproses file OCR. Silakan isi manual.',
      });
    } finally {
      setOcrScanningType(null);
      e.target.value = '';
    }
  };

  const handleDocumentFileUpload = (
    docKey: keyof EmployeeDocumentsRecord,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const nextDraft: ApplicantProfileRecord = {
      ...activeProfile,
      documents: { ...activeProfile.documents, [docKey]: true },
      documentFileNames: { ...activeProfile.documentFileNames, [docKey]: file.name },
    };
    setDraft(nextDraft);
    store.updateApplicantProfile(profile.id, {
      documents: nextDraft.documents,
      documentFileNames: nextDraft.documentFileNames,
    });
    e.target.value = '';
  };

  const activeMenuItem =
    APPLICANT_MENU_ITEMS.find((m) => m.id === activeMenu) ?? APPLICANT_MENU_ITEMS[0];

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-[#102B69] text-white">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/15 shrink-0">
        <PevoraLogo variant="light" />
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Tutup sidebar"
          className="lg:hidden p-1.5 rounded-[4px] text-[#EAF2FF] hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-4 border-b border-white/15">
        <p className="font-jakarta text-[11px] font-semibold text-[#EAF2FF]/70">
          Portal Pelamar Kerja
        </p>
        <p className="text-sm font-bold text-white mt-0.5 truncate">{profile.fullName}</p>
        <p className="text-[11px] text-[#EAF2FF]/80 mt-0.5 tabular-nums truncate">
          {profile.applicantCode} · Data Karyawan {completeness.percentage}%
        </p>
      </div>

      <nav aria-label="Menu Portal Pelamar" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {APPLICANT_MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectMenu(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-[4px] transition-colors duration-150 cursor-pointer text-left ${
                isActive
                  ? 'bg-[#1468E8] text-white font-semibold'
                  : 'text-[#EAF2FF]/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'app-applications' && myApplications.length > 0 && (
                <span className="text-[11px] font-bold text-[#EAF2FF] tabular-nums shrink-0">
                  {myApplications.length}
                </span>
              )}
              {item.id === 'app-profile' && contactedNeedsProfile && (
                <span className="text-[11px] font-bold text-[#FF7A1A] tabular-nums shrink-0">
                  !
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/15 shrink-0 space-y-3">
        <div className="px-2">
          <p className="text-xs font-semibold text-white truncate">{profile.email}</p>
          <p className="text-[11px] text-[#EAF2FF]/75 truncate">Role: Pelamar</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-[4px] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F5F7FA] text-[#172033]">
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">
        {renderSidebar()}
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#172033]/50"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-[260px] max-w-[82vw] h-full z-10">{renderSidebar()}</aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Buka menu pelamar"
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-[4px] border border-[#E2E8F0] text-[#102B69] hover:bg-[#F5F7FA]"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <p className="text-xs text-[#64748B] truncate">
                Portal Pelamar PEVORA /{' '}
                <span className="font-semibold text-[#102B69]">{activeMenuItem.label}</span>
              </p>
              <h1 className="text-base sm:text-lg font-bold text-[#102B69] truncate">
                {activeMenuItem.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <NotificationBellMenu
              notifications={myNotifications}
              onSelectNotification={(notif) => {
                store.markNotificationRead(notif.id);
                if (notif.targetMenu === 'app-interviews' || notif.type === 'interview-scheduled') {
                  selectMenu('app-interviews');
                } else if (notif.targetMenu === 'app-profile') {
                  selectMenu('app-profile');
                } else if (notif.targetMenu === 'app-vacancies') {
                  selectMenu('app-vacancies');
                } else {
                  selectMenu('app-applications');
                }
              }}
              onMarkAllRead={() => {
                myNotifications.forEach((n) => {
                  if (!n.read) store.markNotificationRead(n.id);
                });
              }}
            />
            <button
              type="button"
              onClick={() => selectMenu('app-vacancies')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cari Lowongan</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] w-full mx-auto space-y-6">
          {/* Mandatory full-profile alert when contacted by Recruiter */}
          {contactedNeedsProfile && (
            <div
              role="alert"
              className="p-4 sm:p-5 bg-[#FFFBEB] border border-[#FDE68A] rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#B87D00] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-[#102B69]">
                    Lamaran Anda Sudah Diproses / Dihubungi Rekruter — Segera Lengkapi Data Karyawan
                  </p>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Agar proses dapat dilanjutkan ke tahap Offering &amp; Kontrak Kerja (PKWT), mohon
                    lengkapi sisa data berikut:{' '}
                    <span className="font-semibold text-[#172033]">
                      {completeness.missingEmployeeFields.slice(0, 5).join(', ')}
                      {completeness.missingEmployeeFields.length > 5
                        ? ` (+${completeness.missingEmployeeFields.length - 5} lainnya)`
                        : ''}
                    </span>
                    .
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => selectMenu('app-profile')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#102B69] hover:bg-[#1468E8] rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Lengkapi Sekarang ({completeness.percentage}%)
              </button>
            </div>
          )}

          {actionBanner && (
            <div
              role="status"
              className={`p-4 rounded-[6px] border text-xs font-medium flex items-center justify-between gap-3 ${
                actionBanner.type === 'success'
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A36A]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC3545]'
              }`}
            >
              <span>{actionBanner.text}</span>
              <button
                type="button"
                onClick={() => setActionBanner(null)}
                aria-label="Tutup notifikasi"
                className="p-1 hover:bg-black/5 rounded-[4px] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 1: BERANDA PELAMAR                                          */}
          {/* =============================================================== */}
          {activeMenu === 'app-overview' && (
            <div className="space-y-6">
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Lowongan Aktif Tersedia</p>
                  <p className="text-2xl font-extrabold text-[#102B69] mt-2 tabular-nums">
                    {filterVacanciesForApplicant(store.vacancies, '').length} Posisi
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">Siap dilamar langsung</p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Lamaran Saya</p>
                  <p className="text-2xl font-extrabold text-[#1468E8] mt-2 tabular-nums">
                    {myApplications.length} Lamaran
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">Dipantau real-time</p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Jadwal Wawancara</p>
                  <p className="text-2xl font-extrabold text-[#102B69] mt-2 tabular-nums">
                    {myInterviews.length} Jadwal
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">Undangan dari Rekruter</p>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5">
                  <p className="text-xs font-semibold text-[#64748B]">Kelengkapan Profil &amp; Berkas</p>
                  <p
                    className={`text-2xl font-extrabold mt-2 tabular-nums ${
                      completeness.isEmployeeReady ? 'text-[#16A36A]' : 'text-[#B87D00]'
                    }`}
                  >
                    {completeness.percentage}%
                  </p>
                  <p className="text-xs text-[#64748B] mt-1 tabular-nums">
                    {docStats.completed}/{docStats.total} dokumen ·{' '}
                    {activeProfile.ocrSources.ktpVerifiedByOcr || activeProfile.ocrSources.kkVerifiedByOcr
                      ? 'OCR Aktif'
                      : 'Siap Scan OCR'}
                  </p>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Latest applications summary */}
                <section className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-[#102B69]">
                        Status Lamaran Terbaru
                      </h2>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Progres seleksi terbaru dari tim Rekrutmen SWAPRO
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectMenu('app-applications')}
                      className="text-xs font-semibold text-[#1468E8] hover:underline cursor-pointer"
                    >
                      Lihat Semua
                    </button>
                  </div>

                  {myApplications.length === 0 ? (
                    <div className="p-8 text-center space-y-3">
                      <p className="text-sm font-semibold text-[#102B69]">
                        Anda belum melamar posisi apa pun.
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Jelajahi lowongan terbuka sesuai lokasi penempatan dan kirim lamaran pertama
                        Anda.
                      </p>
                      <button
                        type="button"
                        onClick={() => selectMenu('app-vacancies')}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                      >
                        Lihat Lowongan Tersedia
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E2E8F0]">
                      {myApplications.slice(0, 4).map((app) => {
                        const vac = store.vacancies.find((v) => v.id === app.vacancyId);
                        return (
                          <div key={app.id} className="p-5 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-bold text-[#102B69]">
                                  {vac?.position ?? 'Posisi Lowongan'}
                                </p>
                                <p className="text-xs text-[#64748B] mt-0.5">
                                  {vac
                                    ? vac.showClientNameToApplicants
                                      ? vac.clientName
                                      : vac.clientIndustryLabel
                                    : ''}{' '}
                                  · {vac?.placementLocation}
                                </p>
                              </div>
                              <span className={`text-xs font-bold ${getStageColorClass(app.stage)}`}>
                                {app.stage}
                              </span>
                            </div>
                            <p className="text-xs text-[#64748B]">{app.recruiterNotes}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Quick OCR & Profile Readiness */}
                <section className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-[#102B69]">
                      Kelengkapan Data Pelamar
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Lengkapi biodata KTP, KK, dan dokumen pendukung Anda agar proses seleksi
                      hingga kontrak kerja berjalan lebih cepat.
                    </p>
                  </div>

                  <div className="w-full h-2.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[3px] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        completeness.isEmployeeReady ? 'bg-[#16A36A]' : 'bg-[#1468E8]'
                      }`}
                      style={{ width: `${completeness.percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#102B69] tabular-nums">
                      {completeness.completedFields} / {completeness.totalFields} Komponen Lengkap
                    </span>
                    <span className="font-bold text-[#1468E8] tabular-nums">
                      {completeness.percentage}%
                    </span>
                  </div>

                  {completeness.missingEmployeeFields.length > 0 ? (
                    <div className="p-3.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] space-y-1.5">
                      <p className="text-xs font-bold text-[#102B69]">
                        Perlu dilengkapi (via AI Vision OCR atau Manual):
                      </p>
                      <ul className="list-disc pl-4 text-xs text-[#64748B] space-y-0.5">
                        {completeness.missingEmployeeFields.slice(0, 6).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[4px] text-xs font-semibold text-[#16A36A]">
                      Profil &amp; dokumen Anda sudah 100% lengkap dan siap untuk proses seleksi
                      maupun kontrak kerja.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => selectMenu('app-profile')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors cursor-pointer"
                  >
                    <ScanLine className="w-4 h-4" aria-hidden="true" />
                    <span>Buka Profil &amp; Scan OCR KTP/KK</span>
                  </button>
                </section>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 2: LOWONGAN TERSEDIA                                        */}
          {/* =============================================================== */}
          {activeMenu === 'app-vacancies' && (
            <div className="space-y-6">
              <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari posisi, client, jobdesk, atau kota penempatan..."
                    aria-label="Cari lowongan tersedia"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    aria-label="Filter kota penempatan"
                    className="px-3 py-2 text-xs font-medium bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                  >
                    <option value="Semua">Semua Lokasi Penempatan</option>
                    {distinctLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                    {(['Semua', 'Mendesak'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setUrgencyFilter(mode)}
                        className={`px-3 py-1 text-xs font-semibold rounded-[3px] cursor-pointer ${
                          urgencyFilter === mode
                            ? 'bg-[#1468E8] text-white'
                            : 'text-[#64748B] hover:text-[#102B69]'
                        }`}
                      >
                        {mode === 'Semua' ? 'Semua Posisi' : 'Butuh Segera'}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {visibleVacancies.length === 0 ? (
                <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-10 text-center space-y-2">
                  <p className="text-sm font-bold text-[#102B69]">
                    Tidak ada lowongan aktif yang cocok dengan pencarian Anda.
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Coba hapus filter lokasi atau kata kunci pencarian.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {visibleVacancies.map((vac) => {
                    const remaining = computeRemainingHeadcount(vac);
                    const appliedRecord = myApplications.find((a) => a.vacancyId === vac.id);
                    const clientLabel = vac.showClientNameToApplicants
                      ? vac.clientName
                      : vac.clientIndustryLabel;

                    return (
                      <article
                        key={vac.id}
                        className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold text-[#64748B]">
                                {vac.code} · {clientLabel}
                              </p>
                              <h2 className="text-base font-bold text-[#102B69] mt-1">
                                {vac.position}
                              </h2>
                            </div>
                            <span
                              className={`text-xs font-bold shrink-0 ${
                                vac.urgency === 'Mendesak' ? 'text-[#B87D00]' : 'text-[#16A36A]'
                              }`}
                            >
                              {vac.urgency === 'Mendesak' ? 'Butuh Segera' : 'Dibuka'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
                            <span className="inline-flex items-center gap-1 text-[#102B69] font-medium">
                              <MapPin className="w-3.5 h-3.5 text-[#1468E8]" aria-hidden="true" />
                              {vac.placementLocation}
                            </span>
                            <span aria-hidden="true" className="hidden sm:inline">
                              ·
                            </span>
                            <span className="font-semibold text-[#172033] tabular-nums">
                              {formatSalaryRangeRupiah(vac.salaryMin, vac.salaryMax, vac.salaryNote)}
                            </span>
                          </div>

                          <div className="text-xs text-[#64748B] tabular-nums">
                            Kebutuhan:{' '}
                            <span className="font-bold text-[#102B69]">
                              {vac.headcountNeeded} orang
                            </span>{' '}
                            (Sisa kuota {remaining} orang) · Kontrak {vac.contractType} · Batas{' '}
                            {formatIndonesianDate(vac.deadlineDate)}
                          </div>

                          <div className="pt-2 border-t border-[#E2E8F0] text-xs text-[#64748B] space-y-1">
                            <p className="font-semibold text-[#172033]">Ringkasan Jobdesk:</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                              {vac.jobdesk.slice(0, 2).map((j, idx) => (
                                <li key={idx}>{j}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedVacancy(vac)}
                            className="text-xs font-semibold text-[#1468E8] hover:text-[#102B69] hover:underline cursor-pointer"
                          >
                            Lihat Detail &amp; Persyaratan
                          </button>

                          {appliedRecord ? (
                            <span className="text-xs font-bold text-[#16A36A]">
                              Sudah Dilamar ({appliedRecord.stage})
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApplyVacancy(vac)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Lamar Sekarang</span>
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* MENU 3: LAMARAN SAYA                                             */}
          {/* =============================================================== */}
          {activeMenu === 'app-applications' && (
            <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0]">
                <h2 className="text-base font-bold text-[#102B69]">
                  Riwayat &amp; Pelacakan Status Lamaran
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Pantau progres seleksi dan pembaruan catatan dari tim Rekrutmen
                </p>
              </div>

              {myApplications.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <p className="text-sm font-bold text-[#102B69]">Belum ada lamaran dikirim.</p>
                  <button
                    type="button"
                    onClick={() => selectMenu('app-vacancies')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                  >
                    Jelajahi Lowongan Tersedia
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {myApplications.map((app) => {
                    const vac = store.vacancies.find((v) => v.id === app.vacancyId);
                    const clientLabel = vac
                      ? vac.showClientNameToApplicants
                        ? vac.clientName
                        : vac.clientIndustryLabel
                      : 'Mitra SWAPRO';

                    return (
                      <div key={app.id} className="p-6 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-[#64748B] tabular-nums">
                              {app.applicationCode} · Dikirim: {app.appliedAt}
                            </p>
                            <h3 className="text-base font-bold text-[#102B69] mt-0.5">
                              {vac?.position ?? 'Posisi'} — {clientLabel}
                            </h3>
                            <p className="text-xs text-[#64748B] mt-0.5">
                              Penempatan: {vac?.placementLocation} · Gaji:{' '}
                              {vac
                                ? formatSalaryRangeRupiah(
                                    vac.salaryMin,
                                    vac.salaryMax,
                                    vac.salaryNote
                                  )
                                : '—'}
                            </p>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            <p className="text-[11px] text-[#64748B]">Tahapan Saat Ini</p>
                            <p className={`text-sm font-bold ${getStageColorClass(app.stage)}`}>
                              {app.stage}
                            </p>
                          </div>
                        </div>

                        <div className="p-3.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-xs text-[#172033]">
                          <span className="font-semibold text-[#102B69]">Catatan Rekruter: </span>
                          {app.recruiterNotes}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          {app.requiresFullProfile && !completeness.isEmployeeReady ? (
                            <button
                              type="button"
                              onClick={() => selectMenu('app-profile')}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#B87D00] bg-[#FFFBEB] border border-[#FDE68A] rounded-[4px] hover:bg-[#FEF3C7] cursor-pointer"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Wajib Lengkapi Data Karyawan ({completeness.percentage}%)</span>
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-[#16A36A]">
                              {completeness.isEmployeeReady
                                ? 'Data karyawan & dokumen sudah lengkap 100%'
                                : 'Menunggu peninjauan awal Rekruter'}
                            </span>
                          )}

                          {app.stage === 'Lamaran Masuk' && !app.handedOffToOnboarding && (
                            <button
                              type="button"
                              onClick={() => store.withdrawJobApplication(app.id, profile.id)}
                              className="text-xs font-semibold text-[#DC3545] hover:underline cursor-pointer"
                            >
                              Batalkan Lamaran
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* =============================================================== */}
          {/* MENU 4: JADWAL WAWANCARA                                         */}
          {/* =============================================================== */}
          {activeMenu === 'app-interviews' && (
            <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0]">
                <h2 className="text-base font-bold text-[#102B69]">Undangan &amp; Jadwal Wawancara</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Detail waktu, lokasi/tautan wawancara, dan pewawancara dari tim SWAPRO
                </p>
              </div>

              {myInterviews.length === 0 ? (
                <div className="p-10 text-center text-xs text-[#64748B]">
                  Belum ada jadwal wawancara yang diterbitkan untuk lamaran Anda.
                </div>
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {myInterviews.map((app) => {
                    const vac = store.vacancies.find((v) => v.id === app.vacancyId);
                    const iv = app.interview!;
                    return (
                      <div key={app.id} className="p-6 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-[#1468E8]">
                              {iv.mode} · {app.applicationCode}
                            </p>
                            <h3 className="text-base font-bold text-[#102B69] mt-0.5">
                              {vac?.position} —{' '}
                              {vac?.showClientNameToApplicants
                                ? vac.clientName
                                : vac?.clientIndustryLabel}
                            </h3>
                          </div>
                          <div className="text-left sm:text-right tabular-nums">
                            <p className="text-sm font-bold text-[#102B69]">
                              {formatIndonesianDate(iv.date)}
                            </p>
                            <p className="text-xs font-semibold text-[#64748B]">{iv.time}</p>
                          </div>
                        </div>

                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                          <div>
                            <dt className="text-[#64748B]">Lokasi / Link Meeting</dt>
                            <dd className="font-semibold text-[#172033] mt-0.5 break-all">
                              {iv.locationOrLink}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[#64748B]">Pewawancara</dt>
                            <dd className="font-semibold text-[#172033] mt-0.5">
                              {iv.interviewerName}
                            </dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-[#64748B]">Instruksi Persiapan</dt>
                            <dd className="font-medium text-[#172033] mt-0.5">
                              {iv.notesToApplicant}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* =============================================================== */}
          {/* MENU 5: PROFIL & OCR KTP/KK (SETARA DATABASE KARYAWAN)           */}
          {/* =============================================================== */}
          {activeMenu === 'app-profile' && (
            <div className="space-y-6">
              {/* AI Vision OCR Uploader Card */}
              <section className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
                  <div>
                    <h2 className="text-base font-bold text-[#102B69]">
                      Pemindaian AI Vision OCR (e-KTP &amp; Kartu Keluarga)
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Unggah foto atau scan e-KTP dan KK untuk mengisi kolom biodata secara otomatis
                      (autofill), lalu Anda tetap bisa mengubah atau mengisi secara manual.
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold tabular-nums shrink-0 ${
                      completeness.isEmployeeReady ? 'text-[#16A36A]' : 'text-[#1468E8]'
                    }`}
                  >
                    Kelengkapan: {completeness.percentage}% ({docStats.completed}/{docStats.total}{' '}
                    Berkas)
                  </span>
                </div>

                {ocrFeedback && (
                  <div
                    role="status"
                    className={`p-3.5 rounded-[4px] border text-xs font-medium ${
                      ocrFeedback.type === 'success'
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A36A]'
                        : 'bg-[#FFFBEB] border-[#FDE68A] text-[#B87D00]'
                    }`}
                  >
                    {ocrFeedback.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Scan KTP */}
                  <div className="p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#102B69]">
                          1. Scan e-KTP (Autofill Identitas &amp; Alamat)
                        </p>
                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          Otomatis mengisi NIK, Nama, TTL, Jenis Kelamin, Agama, dan Alamat KTP.
                        </p>
                      </div>
                      {activeProfile.ocrSources.ktpVerifiedByOcr && (
                        <span className="text-[11px] font-bold text-[#16A36A] shrink-0">
                          Terisi OCR
                        </span>
                      )}
                    </div>

                    <input
                      ref={ktpFileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleOcrFileChange('ktp', e)}
                      className="sr-only"
                      aria-label="Pilih berkas e-KTP untuk AI Vision OCR"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={ocrScanningType !== null}
                        onClick={() => ktpFileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] disabled:opacity-60 rounded-[4px] cursor-pointer"
                      >
                        {ocrScanningType === 'ktp' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <ScanLine className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>
                          {ocrScanningType === 'ktp'
                            ? 'Memindai e-KTP...'
                            : 'Upload & Scan OCR KTP'}
                        </span>
                      </button>
                      <span className="text-[11px] text-[#64748B] truncate max-w-[200px]">
                        {activeProfile.documentFileNames.ktpUploaded || 'Belum ada file dipilih'}
                      </span>
                    </div>
                  </div>

                  {/* Scan KK */}
                  <div className="p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#102B69]">
                          2. Scan Kartu Keluarga (Autofill KK &amp; Keluarga)
                        </p>
                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          Otomatis mengisi Nomor KK, Kepala Keluarga, dan daftar anggota keluarga.
                        </p>
                      </div>
                      {activeProfile.ocrSources.kkVerifiedByOcr && (
                        <span className="text-[11px] font-bold text-[#16A36A] shrink-0">
                          Terisi OCR
                        </span>
                      )}
                    </div>

                    <input
                      ref={kkFileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleOcrFileChange('kk', e)}
                      className="sr-only"
                      aria-label="Pilih berkas Kartu Keluarga untuk AI Vision OCR"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={ocrScanningType !== null}
                        onClick={() => kkFileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#102B69] hover:bg-[#1468E8] disabled:opacity-60 rounded-[4px] cursor-pointer"
                      >
                        {ocrScanningType === 'kk' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <ScanLine className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>
                          {ocrScanningType === 'kk' ? 'Memindai KK...' : 'Upload & Scan OCR KK'}
                        </span>
                      </button>
                      <span className="text-[11px] text-[#64748B] truncate max-w-[200px]">
                        {activeProfile.documentFileNames.kkUploaded || 'Belum ada file dipilih'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Complete Employee-Parity Profile Form */}
              <form
                onSubmit={handleSaveProfile}
                className="bg-white border border-[#E2E8F0] rounded-[6px] p-6 space-y-6 text-xs"
              >
                {profileSavedNotice && (
                  <div
                    role="status"
                    className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[4px] text-[#16A36A] font-semibold flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{profileSavedNotice}</span>
                  </div>
                )}

                {/* 01. Identitas Pribadi & KTP */}
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0]">
                    01. Biodata Identitas Pribadi &amp; KTP
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Nama Lengkap (Sesuai KTP) *
                      </label>
                      <input
                        type="text"
                        value={activeProfile.fullName}
                        onChange={(e) => setDraft({ ...activeProfile, fullName: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        NIK (16 Digit e-KTP) *
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        value={activeProfile.nik}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            nik: e.target.value.replace(/[^0-9]/g, ''),
                          })
                        }
                        placeholder="16 digit NIK"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        No. WhatsApp Aktif *
                      </label>
                      <input
                        type="tel"
                        value={activeProfile.whatsappNumber}
                        onChange={(e) =>
                          setDraft({ ...activeProfile, whatsappNumber: e.target.value })
                        }
                        placeholder="0812xxxxxxxx"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Email Aktif
                      </label>
                      <input
                        type="email"
                        value={activeProfile.email}
                        onChange={(e) => setDraft({ ...activeProfile, email: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Tempat Lahir *
                      </label>
                      <input
                        type="text"
                        value={activeProfile.birthPlace}
                        onChange={(e) =>
                          setDraft({ ...activeProfile, birthPlace: e.target.value })
                        }
                        placeholder="Kota/Kabupaten lahir"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Tanggal Lahir * {computedAge > 0 ? `(Umur: ${computedAge} th)` : ''}
                      </label>
                      <input
                        type="date"
                        value={activeProfile.birthDate}
                        onChange={(e) => setDraft({ ...activeProfile, birthDate: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Jenis Kelamin
                      </label>
                      <select
                        value={activeProfile.gender}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            gender: e.target.value as 'Laki-laki' | 'Perempuan',
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">Agama</label>
                      <select
                        value={activeProfile.religion}
                        onChange={(e) => setDraft({ ...activeProfile, religion: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                      >
                        <option value="Islam">Islam</option>
                        <option value="Kristen">Kristen</option>
                        <option value="Katolik">Katolik</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Buddha">Buddha</option>
                        <option value="Konghucu">Konghucu</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Status Perkawinan
                      </label>
                      <select
                        value={activeProfile.maritalStatus}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            maritalStatus: e.target.value as ApplicantProfileRecord['maritalStatus'],
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                      >
                        <option value="Belum Kawin">Belum Kawin</option>
                        <option value="Kawin">Kawin</option>
                        <option value="Cerai Hidup">Cerai Hidup</option>
                        <option value="Cerai Mati">Cerai Mati</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Golongan Darah
                      </label>
                      <select
                        value={activeProfile.bloodType}
                        onChange={(e) => setDraft({ ...activeProfile, bloodType: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#102B69]"
                      >
                        <option value="-">Tidak Diketahui</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                        <option value="O">O</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Pendidikan Terakhir
                      </label>
                      <input
                        type="text"
                        value={activeProfile.education}
                        onChange={(e) => setDraft({ ...activeProfile, education: e.target.value })}
                        placeholder="Contoh: S1 Manajemen / D3 Akuntansi"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Nomor NPWP (Opsional)
                      </label>
                      <input
                        type="text"
                        value={activeProfile.npwpNumber}
                        onChange={(e) =>
                          setDraft({ ...activeProfile, npwpNumber: e.target.value })
                        }
                        placeholder="99.999.999.9-999.000"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        No. BPJS Kesehatan (Opsional)
                      </label>
                      <input
                        type="text"
                        maxLength={13}
                        value={activeProfile.bpjsKesehatanNumber ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            bpjsKesehatanNumber: e.target.value.replace(/[^0-9]/g, ''),
                          })
                        }
                        placeholder="13 digit JKN-KIS jika sudah punya"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        No. BPJS Ketenagakerjaan (Opsional)
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        value={activeProfile.bpjsKetenagakerjaanNumber ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            bpjsKetenagakerjaanNumber: e.target.value.replace(/[^A-Za-z0-9]/g, ''),
                          })
                        }
                        placeholder="Nomor KPJ jika sudah punya"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono"
                      />
                    </div>
                  </div>
                </section>

                {/* 02. Alamat KTP & Domisili */}
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0]">
                    02. Alamat Lengkap KTP &amp; Domisili Saat Ini
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-[#172033] mb-1">
                        Alamat Jalan Sesuai KTP *
                      </label>
                      <input
                        type="text"
                        value={activeProfile.ktpAddress.street}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            ktpAddress: { ...activeProfile.ktpAddress, street: e.target.value },
                          })
                        }
                        placeholder="Nama jalan, nomor rumah, blok"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">RT / RW</label>
                      <input
                        type="text"
                        value={activeProfile.ktpAddress.rtRw}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            ktpAddress: { ...activeProfile.ktpAddress, rtRw: e.target.value },
                          })
                        }
                        placeholder="001/002"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Kelurahan / Desa
                      </label>
                      <input
                        type="text"
                        value={activeProfile.ktpAddress.kelurahan}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            ktpAddress: { ...activeProfile.ktpAddress, kelurahan: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">Kecamatan</label>
                      <input
                        type="text"
                        value={activeProfile.ktpAddress.kecamatan}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            ktpAddress: { ...activeProfile.ktpAddress, kecamatan: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Kota / Kabupaten *
                      </label>
                      <input
                        type="text"
                        value={activeProfile.ktpAddress.city}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            ktpAddress: { ...activeProfile.ktpAddress, city: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">Provinsi</label>
                      <input
                        type="text"
                        value={activeProfile.ktpAddress.province}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            ktpAddress: { ...activeProfile.ktpAddress, province: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">Kode Pos</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={activeProfile.ktpAddress.postalCode}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            ktpAddress: { ...activeProfile.ktpAddress, postalCode: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="inline-flex items-center gap-2 font-semibold text-[#102B69] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeProfile.domicileSameAsKtp}
                        onChange={(e) =>
                          setDraft({ ...activeProfile, domicileSameAsKtp: e.target.checked })
                        }
                      />
                      <span>Alamat domisili saat ini sama dengan alamat KTP</span>
                    </label>
                    {!activeProfile.domicileSameAsKtp && (
                      <input
                        type="text"
                        value={activeProfile.domicileAddress}
                        onChange={(e) =>
                          setDraft({ ...activeProfile, domicileAddress: e.target.value })
                        }
                        placeholder="Alamat lengkap domisili saat ini"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    )}
                  </div>
                </section>

                {/* 03. Data Kartu Keluarga & Kontak Darurat */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                    <h3 className="text-xs font-bold text-[#102B69]">
                      03. Kartu Keluarga (KK), Anggota Keluarga &amp; Kontak Darurat
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...activeProfile,
                          familyMembers: [
                            ...activeProfile.familyMembers,
                            {
                              id: `fam-${Date.now()}`,
                              name: '',
                              relation: 'Orang Tua',
                              birthDate: '1995-01-01',
                              nik: '',
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#1468E8] bg-[#EAF2FF] hover:bg-[#1468E8] hover:text-white rounded-[4px] cursor-pointer"
                    >
                      <Plus className="w-3 h-3" aria-hidden="true" />
                      <span>Tambah Anggota KK</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Nomor Kartu Keluarga (16 Digit) *
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        value={activeProfile.kkNumber}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            kkNumber: e.target.value.replace(/[^0-9]/g, ''),
                          })
                        }
                        placeholder="16 digit nomor KK"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Nama Kepala Keluarga *
                      </label>
                      <input
                        type="text"
                        value={activeProfile.headOfFamily}
                        onChange={(e) =>
                          setDraft({ ...activeProfile, headOfFamily: e.target.value })
                        }
                        placeholder="Sesuai Kartu Keluarga"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Nama Kontak Darurat *
                      </label>
                      <input
                        type="text"
                        value={activeProfile.emergencyContact.name}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            emergencyContact: {
                              ...activeProfile.emergencyContact,
                              name: e.target.value,
                            },
                          })
                        }
                        placeholder="Nama keluarga terdekat"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Hubungan Kontak Darurat
                      </label>
                      <input
                        type="text"
                        value={activeProfile.emergencyContact.relation}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            emergencyContact: {
                              ...activeProfile.emergencyContact,
                              relation: e.target.value,
                            },
                          })
                        }
                        placeholder="Orang Tua / Pasangan / Saudara"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        No. HP / WA Kontak Darurat *
                      </label>
                      <input
                        type="tel"
                        value={activeProfile.emergencyContact.phone}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            emergencyContact: {
                              ...activeProfile.emergencyContact,
                              phone: e.target.value,
                            },
                          })
                        }
                        placeholder="08xxxxxxxxxx"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] tabular-nums"
                      />
                    </div>
                  </div>

                  {activeProfile.familyMembers.length > 0 && (
                    <div className="space-y-2">
                      {activeProfile.familyMembers.map((member, idx) => (
                        <div
                          key={member.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] items-center"
                        >
                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => {
                                const next = activeProfile.familyMembers.map((m, i) =>
                                  i === idx ? { ...m, name: e.target.value } : m
                                );
                                setDraft({ ...activeProfile, familyMembers: next });
                              }}
                              placeholder="Nama anggota KK"
                              className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <select
                              value={member.relation}
                              onChange={(e) => {
                                const next = activeProfile.familyMembers.map((m, i) =>
                                  i === idx
                                    ? {
                                        ...m,
                                        relation: e.target.value as FamilyMemberRecord['relation'],
                                      }
                                    : m
                                );
                                setDraft({ ...activeProfile, familyMembers: next });
                              }}
                              className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                            >
                              <option value="Pasangan">Pasangan</option>
                              <option value="Anak">Anak</option>
                              <option value="Orang Tua">Orang Tua</option>
                              <option value="Saudara Kandung">Saudara Kandung</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <input
                              type="date"
                              value={member.birthDate}
                              onChange={(e) => {
                                const next = activeProfile.familyMembers.map((m, i) =>
                                  i === idx ? { ...m, birthDate: e.target.value } : m
                                );
                                setDraft({ ...activeProfile, familyMembers: next });
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px]"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              maxLength={16}
                              value={member.nik ?? ''}
                              onChange={(e) => {
                                const next = activeProfile.familyMembers.map((m, i) =>
                                  i === idx
                                    ? { ...m, nik: e.target.value.replace(/[^0-9]/g, '') }
                                    : m
                                );
                                setDraft({ ...activeProfile, familyMembers: next });
                              }}
                              placeholder="NIK (opsional)"
                              className="w-full px-2 py-1.5 bg-white border border-[#E2E8F0] rounded-[4px] font-mono"
                            />
                          </div>
                          <div className="sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setDraft({
                                  ...activeProfile,
                                  familyMembers: activeProfile.familyMembers.filter(
                                    (_, i) => i !== idx
                                  ),
                                })
                              }
                              aria-label="Hapus anggota keluarga"
                              className="p-1.5 text-[#DC3545] hover:bg-white rounded-[4px] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* 04. Data Rekening Bank & Pengalaman */}
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0]">
                    04. Rekening Bank (Payroll) &amp; Ringkasan Pengalaman
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">Nama Bank *</label>
                      <input
                        type="text"
                        list="applicant-bank-options"
                        value={activeProfile.bankName}
                        onChange={(e) => setDraft({ ...activeProfile, bankName: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                      <datalist id="applicant-bank-options">
                        <option value="BCA" />
                        <option value="Bank Mandiri" />
                        <option value="BRI" />
                        <option value="BNI" />
                        <option value="CIMB Niaga" />
                      </datalist>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Nomor Rekening *
                      </label>
                      <input
                        type="text"
                        value={activeProfile.bankAccountNumber}
                        onChange={(e) =>
                          setDraft({
                            ...activeProfile,
                            bankAccountNumber: e.target.value.replace(/[^0-9]/g, ''),
                          })
                        }
                        placeholder="8–20 digit rekening"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">
                        Nama Pemilik Rekening *
                      </label>
                      <input
                        type="text"
                        value={activeProfile.bankAccountHolder}
                        onChange={(e) =>
                          setDraft({ ...activeProfile, bankAccountHolder: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#172033] mb-1">Cabang Bank</label>
                      <input
                        type="text"
                        value={activeProfile.bankBranch}
                        onChange={(e) =>
                          setDraft({ ...activeProfile, bankBranch: e.target.value })
                        }
                        placeholder="KC / KCP"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-[#172033] mb-1">
                        Pengalaman Kerja Terakhir
                      </label>
                      <input
                        type="text"
                        value={activeProfile.latestExperience}
                        onChange={(e) =>
                          setDraft({ ...activeProfile, latestExperience: e.target.value })
                        }
                        placeholder="Contoh: 2 tahun sebagai Admin Operasional"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-[#172033] mb-1">
                        Keahlian / Sertifikasi
                      </label>
                      <input
                        type="text"
                        value={activeProfile.skillsSummary}
                        onChange={(e) =>
                          setDraft({ ...activeProfile, skillsSummary: e.target.value })
                        }
                        placeholder="Contoh: MS Excel, Customer Service, SIM C"
                        className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]"
                      />
                    </div>
                  </div>
                </section>

                {/* 05. Brankas 11 Dokumen Karyawan */}
                <section className="space-y-3">
                  <h3 className="text-xs font-bold text-[#102B69] pb-2 border-b border-[#E2E8F0]">
                    05. Brankas Berkas Kandidat &amp; Calon Karyawan
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {DOCUMENT_CHECKLIST_ITEMS.filter((item) => item.key !== 'contractUploaded').map(
                      (doc) => {
                        const uploaded = Boolean(activeProfile.documents[doc.key]);
                        const fileName = activeProfile.documentFileNames[doc.key];
                        return (
                          <div
                            key={doc.key}
                            className="p-3.5 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-[#102B69]">{doc.label}</span>
                              <span
                                className={`text-[11px] font-bold shrink-0 ${
                                  uploaded ? 'text-[#16A36A]' : 'text-[#B87D00]'
                                }`}
                              >
                                {uploaded ? 'Tersedia' : 'Belum Ada'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#64748B] truncate">
                              {fileName || 'Unggah berkas PDF / JPG / PNG'}
                            </p>
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-[#102B69] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer">
                              <Upload className="w-3 h-3" aria-hidden="true" />
                              <span>{uploaded ? 'Ganti Berkas' : 'Upload Berkas'}</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => handleDocumentFileUpload(doc.key, e)}
                                className="sr-only"
                              />
                            </label>
                          </div>
                        );
                      }
                    )}
                  </div>
                </section>

                <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] transition-colors cursor-pointer"
                  >
                    Simpan Profil &amp; Berkas Saya
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Vacancy Detail & Apply Modal */}
      {selectedVacancy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vacancy-detail-title"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F5F7FA] flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#1468E8]">
                  {selectedVacancy.code} ·{' '}
                  {selectedVacancy.showClientNameToApplicants
                    ? selectedVacancy.clientName
                    : selectedVacancy.clientIndustryLabel}
                </p>
                <h2 id="vacancy-detail-title" className="text-lg font-bold text-[#102B69] mt-0.5">
                  {selectedVacancy.position}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVacancy(null)}
                aria-label="Tutup detail lowongan"
                className="p-1.5 text-[#64748B] hover:text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
                <div>
                  <dt className="text-[#64748B]">Lokasi Penempatan</dt>
                  <dd className="font-bold text-[#102B69] mt-0.5">
                    {selectedVacancy.placementLocation}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Bagian / Divisi</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5">
                    {selectedVacancy.department}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Estimasi Gaji &amp; Kompensasi</dt>
                  <dd className="font-bold text-[#16A36A] mt-0.5 tabular-nums">
                    {formatSalaryRangeRupiah(
                      selectedVacancy.salaryMin,
                      selectedVacancy.salaryMax,
                      selectedVacancy.salaryNote
                    )}
                  </dd>
                  <dd className="text-[11px] text-[#64748B] mt-0.5">
                    {selectedVacancy.salaryNote}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Kebutuhan Kuota &amp; Kontrak</dt>
                  <dd className="font-semibold text-[#172033] mt-0.5 tabular-nums">
                    Butuh {selectedVacancy.headcountNeeded} orang (Sisa{' '}
                    {computeRemainingHeadcount(selectedVacancy)}) · {selectedVacancy.contractType}
                  </dd>
                </div>
              </dl>

              <div>
                <h3 className="text-xs font-bold text-[#102B69] mb-2">
                  Uraian Pekerjaan (Jobdesk)
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-[#172033] leading-relaxed">
                  {selectedVacancy.jobdesk.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#102B69] mb-2">
                  Persyaratan &amp; Kualifikasi
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-[#172033] leading-relaxed">
                  {selectedVacancy.requirements.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {!completeness.isEmployeeReady && (
                <div className="p-3.5 bg-[#EAF2FF] border border-[#C9DDFB] rounded-[4px] text-[#102B69] flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-[#1468E8] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Anda dapat langsung melamar sekarang. Apabila nanti dihubungi oleh Rekruter,
                    Anda akan diminta melengkapi sisa biodata &amp; dokumen karyawan ({completeness.percentage}% terisi saat ini).
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F5F7FA] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedVacancy(null)}
                className="px-4 py-2 text-xs font-semibold text-[#102B69] bg-white border border-[#E2E8F0] rounded-[4px] cursor-pointer"
              >
                Tutup
              </button>
              {myApplications.some((a) => a.vacancyId === selectedVacancy.id) ? (
                <span className="text-xs font-bold text-[#16A36A] px-2">
                  Lamaran Sudah Terkirim
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleApplyVacancy(selectedVacancy)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#1468E8] hover:bg-[#102B69] rounded-[4px] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Kirim Lamaran Posisi Ini</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
