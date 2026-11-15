import React, { useState } from 'react';
import {
  CalendarCheck2,
  Clock,
  FileSpreadsheet,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCheck,
  X,
} from 'lucide-react';
import { PevoraLogo } from '../PevoraLogo';
import { MasterAdminUser } from '../../utils/validation';
import { WorkspaceStore } from '../../hooks/useWorkspaceStore';
import {
  AdminMenuId,
  ContractHistoryItem,
  EmployeeRecord,
  calculateDaysRemaining,
  filterByAssignedScopes,
  formatAssignedScopesSummary,
} from '../../data/masterAdminData';
import { AdminOverviewPanel } from './AdminOverviewPanel';
import { AdminEmployeesPanel } from './AdminEmployeesPanel';
import { AdminAttendancePanel } from './AdminAttendancePanel';
import { AdminLeavePanel } from './AdminLeavePanel';
import { AdminOnboardingPkwtPanel } from './AdminOnboardingPkwtPanel';
import { AdminReportsPanel } from './AdminReportsPanel';
import { EmployeeModal } from '../dashboard/EmployeeModal';
import { PkwtDocumentModal } from '../dashboard/PkwtDocumentModal';
import { NotificationBellMenu } from '../shared/NotificationBellMenu';

interface AdminDashboardProps {
  user: MasterAdminUser;
  store: WorkspaceStore;
  onLogout: () => void;
}

interface AdminSidebarNavItem {
  id: AdminMenuId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_MENU_ITEMS: AdminSidebarNavItem[] = [
  { id: 'admin-overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'admin-employees', label: 'Data Karyawan', icon: IdCard },
  { id: 'admin-attendance', label: 'Presensi', icon: Clock },
  { id: 'admin-leave', label: 'Cuti & Izin', icon: CalendarCheck2 },
  { id: 'admin-onboarding', label: 'Onboarding', icon: UserCheck },
  { id: 'admin-reports', label: 'Laporan', icon: FileSpreadsheet },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, store, onLogout }) => {
  const [activeMenu, setActiveMenu] = useState<AdminMenuId>('admin-overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState<string>('Semua Cakupan');
  const [inspectedEmployee, setInspectedEmployee] = useState<EmployeeRecord | null>(null);
  const [inspectMode, setInspectMode] = useState<'view' | 'edit'>('view');
  const [pkwtTarget, setPkwtTarget] = useState<{
    employee: EmployeeRecord;
    historyItem?: ContractHistoryItem;
  } | null>(null);

  const liveInspectedEmployee = inspectedEmployee
    ? store.employees.find((e) => e.id === inspectedEmployee.id) ?? inspectedEmployee
    : null;

  const assignedScopes = user.assignedScopes;
  const actorLabel = `${user.name} (${user.id})`;
  const activeMenuItem =
    ADMIN_MENU_ITEMS.find((m) => m.id === activeMenu) ?? ADMIN_MENU_ITEMS[0];

  const allClaimedAdminScopes = new Set(
    store.users.filter((u) => u.role === 'Admin').flatMap((u) => u.assignedScopes)
  );
  const effectiveScopes = [
    ...assignedScopes,
    ...store.onboardingCandidates
      .filter((c) => Boolean(c.applicantId) && !allClaimedAdminScopes.has(c.entityName))
      .map((c) => c.entityName)
      .filter((name, idx, arr) => arr.indexOf(name) === idx),
  ];

  const scopedEmployees = filterByAssignedScopes(store.employees, effectiveScopes, selectedScope);
  const scopedAttendanceLogs = filterByAssignedScopes(
    store.attendanceLogs,
    effectiveScopes,
    selectedScope
  );
  const scopedLeaveAbsences = filterByAssignedScopes(
    store.leaveAbsences,
    effectiveScopes,
    selectedScope
  );
  const scopedContracts = filterByAssignedScopes(store.contracts, effectiveScopes, selectedScope);
  const scopedCandidates = filterByAssignedScopes(
    store.onboardingCandidates,
    effectiveScopes,
    selectedScope
  );
  const scopedSnapshots = filterByAssignedScopes(store.snapshots, effectiveScopes, selectedScope);
  const scopedEntities = store.entities.filter((e) => effectiveScopes.includes(e.name));

  const pendingLeaveCount = scopedLeaveAbsences.filter((l) => l.status === 'Menunggu').length;
  const scopedNotifications = store.notifications.filter(
    (n) =>
      n.recipientRole !== 'employee' &&
      (!n.entityName || effectiveScopes.includes(n.entityName))
  );

  const activeScopeList =
    selectedScope === 'Semua Cakupan' ? assignedScopes : [selectedScope];

  const handleInspectByCode = (employeeCode: string) => {
    const found = scopedEmployees.find((e) => e.employeeCode === employeeCode);
    if (found) {
      setInspectedEmployee(found);
      setInspectMode('view');
    }
  };

  const selectMenu = (id: AdminMenuId) => {
    setActiveMenu(id);
    setMobileSidebarOpen(false);
  };

  const renderSidebarNav = () => (
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
          Konsol Admin Operasional
        </p>
        <p
          className="text-sm font-bold text-white mt-0.5 truncate"
          title={store.settings.companyName}
        >
          {store.settings.companyName}
        </p>
        <p
          className="text-[11px] text-[#EAF2FF]/80 mt-1 truncate"
          title={assignedScopes.join(', ')}
        >
          Cakupan: {formatAssignedScopesSummary(assignedScopes)}
        </p>
      </div>

      <nav
        aria-label="Menu Dashboard Admin"
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
      >
        {ADMIN_MENU_ITEMS.map((item) => {
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
              {item.id === 'admin-leave' && pendingLeaveCount > 0 && (
                <span className="text-[11px] font-bold text-[#FF7A1A] tabular-nums shrink-0">
                  {pendingLeaveCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/15 shrink-0 space-y-3">
        {(() => {
          const activeAdminRecord = store.users.find(
            (u) => u.employeeCode.toLowerCase() === user.id.toLowerCase()
          );
          const adminEmail = activeAdminRecord?.email || 'siti.rahmawati@swapro-demo.co.id';
          const adminWa = activeAdminRecord?.whatsappNumber || '081288770014';
          return (
            <div className="px-2 space-y-0.5">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-[#EAF2FF]/75 truncate">
                {user.role} · {user.id}
              </p>
              <p className="text-[10px] text-[#93C5FD] truncate" title={adminEmail}>
                {adminEmail}
              </p>
              <p className="text-[10px] text-[#EAF2FF]/80 tabular-nums truncate">
                WA Admin: {adminWa}
              </p>
            </div>
          );
        })()}
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
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">
        {renderSidebarNav()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#172033]/50"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-[260px] max-w-[82vw] h-full z-10">
            {renderSidebarNav()}
          </aside>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-30 min-h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Buka menu dashboard"
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-[4px] border border-[#E2E8F0] text-[#102B69] hover:bg-[#F5F7FA] shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <p className="text-xs text-[#64748B] truncate">
                {store.settings.companyName} /{' '}
                <span className="font-semibold text-[#102B69]">{activeMenuItem.label}</span>
              </p>
              <h1 className="text-base sm:text-lg font-bold text-[#102B69] truncate">
                {activeMenuItem.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {assignedScopes.length > 1 && (
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                aria-label="Filter cakupan unit atau klien"
                className="px-2.5 py-2 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] max-w-[200px] sm:max-w-[250px] focus:outline-none focus:border-[#1468E8] cursor-pointer"
              >
                <option value="Semua Cakupan">Semua Cakupan ({assignedScopes.length})</option>
                {assignedScopes.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
            )}

            <NotificationBellMenu
              notifications={scopedNotifications}
              onSelectNotification={(notif) => {
                store.markNotificationRead(notif.id);
                if (notif.type === 'leave-submitted' || notif.targetMenu === 'monitoring') {
                  selectMenu('admin-leave');
                } else {
                  selectMenu('admin-employees');
                  if (notif.employeeCode) {
                    handleInspectByCode(notif.employeeCode);
                  }
                }
              }}
              onMarkAllRead={store.markAllNotificationsRead}
            />

            <div className="hidden md:block text-right">
              <p className="text-xs font-bold text-[#102B69]">{user.name}</p>
              <p className="text-[11px] text-[#64748B]">{user.role}</p>
            </div>

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

        {/* Active Admin Panel */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] w-full mx-auto">
          {activeMenu === 'admin-overview' && (
            <AdminOverviewPanel
              entities={store.entities.filter((e) => activeScopeList.includes(e.name))}
              employees={scopedEmployees}
              attendanceLogs={scopedAttendanceLogs}
              leaveAbsences={scopedLeaveAbsences}
              contracts={scopedContracts}
              onboardingCandidates={scopedCandidates}
              activeScopes={activeScopeList}
              onNavigateMenu={setActiveMenu}
              onApproveLeave={(id) => store.approveLeave(id, actorLabel)}
              onRejectLeave={(id) => store.rejectLeave(id, actorLabel)}
              onConvertAlphaToIzin={(id) => store.convertAlphaToIzin(id, actorLabel)}
            />
          )}

          {activeMenu === 'admin-employees' && (
            <AdminEmployeesPanel
              employees={scopedEmployees}
              entities={store.entities}
              departments={store.departments}
              assignedScopes={effectiveScopes}
              onUpdateEmployee={(id, data) => store.updateEmployee(id, data, actorLabel)}
              onResetFaceBiometric={(emp) => store.resetEmployeeFace(emp.id, actorLabel)}
              onMarkReviewed={(emp) => store.markEmployeeReviewed(emp.id)}
              onAddContractHistory={(empId, entry, makeActive) =>
                store.addOrUploadEmployeeContractHistory(empId, entry, actorLabel, makeActive)
              }
            />
          )}

          {activeMenu === 'admin-attendance' && (
            <AdminAttendancePanel
              attendanceLogs={scopedAttendanceLogs}
              leaveAbsences={scopedLeaveAbsences}
              employees={scopedEmployees}
              policy={store.policy}
              assignedScopes={activeScopeList}
              onVerifyAttendanceNote={(logId, notes) =>
                store.updateAttendanceNotes(logId, notes, actorLabel)
              }
              onInspectEmployee={handleInspectByCode}
            />
          )}

          {activeMenu === 'admin-leave' && (
            <AdminLeavePanel
              leaveAbsences={scopedLeaveAbsences}
              employees={scopedEmployees}
              policy={store.policy}
              onApproveLeave={(id) => store.approveLeave(id, actorLabel)}
              onRejectLeave={(id) => store.rejectLeave(id, actorLabel)}
              onConvertAlphaToIzin={(id) => store.convertAlphaToIzin(id, actorLabel)}
            />
          )}

          {activeMenu === 'admin-onboarding' && (
            <AdminOnboardingPkwtPanel
              candidates={scopedCandidates}
              contracts={scopedContracts}
              employees={scopedEmployees}
              entities={store.entities}
              departments={store.departments}
              assignedScopes={effectiveScopes}
              onSubmitCandidateOnboarding={(candId, data) =>
                store.submitCandidateOnboarding(candId, data, user.name, actorLabel)
              }
              onProposePkwtExtension={(contractId) =>
                store.proposePkwtExtension(contractId, user.name, actorLabel)
              }
              onInspectEmployee={handleInspectByCode}
            />
          )}

          {activeMenu === 'admin-reports' && (
            <AdminReportsPanel
              snapshots={scopedSnapshots}
              employees={scopedEmployees}
              auditLogs={store.auditLogs}
              assignedScopes={activeScopeList}
              adminName={user.name}
            />
          )}
        </main>
      </div>

      {/* Inspect / Edit Employee Detail Modal Triggered from Attendance or PKWT Panels */}
      {liveInspectedEmployee && (
        <EmployeeModal
          key={`inspect-${inspectMode}-${liveInspectedEmployee.id}`}
          mode={inspectMode}
          employee={liveInspectedEmployee}
          entities={scopedEntities.length > 0 ? scopedEntities : store.entities}
          departments={store.departments}
          onClose={() => setInspectedEmployee(null)}
          onSwitchToEdit={() => setInspectMode('edit')}
          onOpenPkwt={(emp, historyItem) => {
            setInspectedEmployee(null);
            setPkwtTarget({ employee: emp, historyItem });
          }}
          onResetFaceBiometric={(emp) => {
            store.resetEmployeeFace(emp.id, actorLabel);
            setInspectedEmployee(null);
          }}
          onMarkReviewed={(emp) => store.markEmployeeReviewed(emp.id)}
          onAddContractHistory={(empId, entry, makeActive) =>
            store.addOrUploadEmployeeContractHistory(empId, entry, actorLabel, makeActive)
          }
          onSave={(data, existingId) => {
            if (existingId) {
              store.updateEmployee(existingId, data, actorLabel);
            }
            setInspectedEmployee(null);
          }}
        />
      )}

      {pkwtTarget && (
        <PkwtDocumentModal
          contract={
            scopedContracts.find((c) => c.employeeCode === pkwtTarget.employee.employeeCode) ?? {
              id: `ctr-${pkwtTarget.employee.id}`,
              contractNumber:
                pkwtTarget.historyItem?.contractNumber ?? pkwtTarget.employee.contractNumber,
              employeeCode: pkwtTarget.employee.employeeCode,
              employeeName: pkwtTarget.employee.fullName,
              employmentType: pkwtTarget.employee.employmentType,
              entityName: pkwtTarget.employee.entityName,
              contractType:
                pkwtTarget.historyItem?.contractType ?? pkwtTarget.employee.contractType,
              startDate: pkwtTarget.historyItem?.startDate ?? pkwtTarget.employee.joinDate,
              endDate: pkwtTarget.historyItem?.endDate ?? pkwtTarget.employee.contractEndDate,
              daysRemaining: calculateDaysRemaining(
                pkwtTarget.historyItem?.endDate ?? pkwtTarget.employee.contractEndDate
              ),
              status: 'Aktif',
            }
          }
          employee={
            pkwtTarget.historyItem
              ? {
                  ...pkwtTarget.employee,
                  contractNumber: pkwtTarget.historyItem.contractNumber,
                  joinDate: pkwtTarget.historyItem.startDate,
                  contractEndDate: pkwtTarget.historyItem.endDate,
                  position: pkwtTarget.historyItem.position,
                  placementName:
                    pkwtTarget.historyItem.placementName ?? pkwtTarget.employee.placementName,
                  contractHistory: [pkwtTarget.historyItem],
                }
              : pkwtTarget.employee
          }
          onClose={() => setPkwtTarget(null)}
        />
      )}
    </div>
  );
};
