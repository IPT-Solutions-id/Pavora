import React, { useState } from 'react';
import {
  Activity,
  Building2,
  ClipboardCheck,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { PevoraLogo } from '../PevoraLogo';
import { MasterAdminUser } from '../../utils/validation';
import { WorkspaceStore } from '../../hooks/useWorkspaceStore';
import { DashboardMenuId, countPendingApprovals } from '../../data/masterAdminData';
import { OverviewPanel } from './OverviewPanel';
import { EntitiesPanel } from './EntitiesPanel';
import { EmployeesPanel } from './EmployeesPanel';
import { UsersRbacPanel } from './UsersRbacPanel';
import { PoliciesPanel } from './PoliciesPanel';
import { MonitoringPanel } from './MonitoringPanel';
import { SettingsPanel } from './SettingsPanel';
import { NotificationBellMenu } from '../shared/NotificationBellMenu';

interface MasterAdminDashboardProps {
  user: MasterAdminUser;
  store: WorkspaceStore;
  onLogout: () => void;
}

interface SidebarNavItem {
  id: DashboardMenuId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MENU_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'entities', label: 'Unit & Klien', icon: Building2 },
  { id: 'employees', label: 'Data Karyawan', icon: IdCard },
  { id: 'users', label: 'Hak Akses', icon: Users },
  { id: 'policies', label: 'Kebijakan', icon: ClipboardCheck },
  { id: 'monitoring', label: 'Operasional', icon: Activity },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

export const MasterAdminDashboard: React.FC<MasterAdminDashboardProps> = ({
  user,
  store,
  onLogout,
}) => {
  const [activeMenu, setActiveMenu] = useState<DashboardMenuId>('overview');
  const [monitoringTab, setMonitoringTab] = useState<'summary' | 'attendance' | 'leave-alpha' | 'pkwt'>('summary');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const actorLabel = `${user.name} (${user.id})`;
  const pendingCount = countPendingApprovals(store.approvals);
  const pendingLeaveCount = store.leaveAbsences.filter((l) => l.status === 'Menunggu').length;
  const adminNotifications = store.notifications.filter((n) => n.recipientRole !== 'employee');
  const activeMenuItem = MENU_ITEMS.find((m) => m.id === activeMenu) ?? MENU_ITEMS[0];

  const selectMenu = (id: DashboardMenuId) => {
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
          Konsol Master Admin
        </p>
        <p
          className="text-sm font-bold text-white mt-0.5 truncate"
          title={store.settings.companyName}
        >
          {store.settings.companyName}
        </p>
      </div>

      <nav
        aria-label="Menu Dashboard Master Admin"
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
      >
        {MENU_ITEMS.map((item) => {
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
              {item.id === 'overview' && pendingCount > 0 && (
                <span className="text-[11px] font-bold text-[#FF7A1A] tabular-nums shrink-0">
                  {pendingCount}
                </span>
              )}
              {item.id === 'monitoring' && pendingLeaveCount > 0 && (
                <span className="text-[11px] font-bold text-[#FF7A1A] tabular-nums shrink-0">
                  {pendingLeaveCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/15 shrink-0 space-y-3">
        <div className="px-2">
          <p className="text-xs font-semibold text-white truncate">{user.name}</p>
          <p className="text-[11px] text-[#EAF2FF]/75 truncate">ID: {user.id}</p>
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
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Buka menu dashboard"
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-[4px] border border-[#E2E8F0] text-[#102B69] hover:bg-[#F5F7FA]"
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

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <NotificationBellMenu
              notifications={adminNotifications}
              onSelectNotification={(notif) => {
                store.markNotificationRead(notif.id);
                if (notif.type === 'leave-submitted' || notif.targetMenu === 'monitoring') {
                  setMonitoringTab('leave-alpha');
                  selectMenu('monitoring');
                } else {
                  selectMenu('employees');
                }
              }}
              onMarkAllRead={store.markAllNotificationsRead}
            />
            <div className="hidden sm:block text-right">
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

        {/* Active Panel Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] w-full mx-auto">
          {activeMenu === 'overview' && (
            <OverviewPanel
              entities={store.entities}
              employees={store.employees}
              approvals={store.approvals}
              attendanceLogs={store.attendanceLogs}
              leaveAbsences={store.leaveAbsences}
              contracts={store.contracts}
              onApprove={(id) => store.approveRequest(id, actorLabel)}
              onReject={(id) => store.rejectRequest(id, actorLabel)}
            />
          )}
          {activeMenu === 'entities' && (
            <EntitiesPanel
              entities={store.entities}
              departments={store.departments}
              users={store.users}
              onAddEntity={(item) => store.addEntity(item, actorLabel)}
              onUpdateEntity={(id, item) => store.updateEntity(id, item, actorLabel)}
              onToggleEntityStatus={(id) => store.toggleEntityStatus(id, actorLabel)}
              onRemoveClientEntity={(id) => store.removeClientEntity(id, actorLabel)}
              onUpdateUserScope={(userId, employmentType, assignedScopes) =>
                store.updateUserScope(userId, employmentType, assignedScopes, actorLabel)
              }
            />
          )}
          {activeMenu === 'employees' && (
            <EmployeesPanel
              employees={store.employees}
              entities={store.entities}
              departments={store.departments}
              onCreateEmployee={(data) => store.createEmployee(data, actorLabel)}
              onUpdateEmployee={(id, data) => store.updateEmployee(id, data, actorLabel)}
              onDeleteEmployee={(id) => store.deleteEmployee(id, actorLabel)}
              onResetFaceBiometric={(emp) => store.resetEmployeeFace(emp.id, actorLabel)}
              onMarkReviewed={(emp) => store.markEmployeeReviewed(emp.id)}
              onAddContractHistory={(empId, entry, makeActive) =>
                store.addOrUploadEmployeeContractHistory(empId, entry, actorLabel, makeActive)
              }
            />
          )}
          {activeMenu === 'users' && (
            <UsersRbacPanel
              users={store.users}
              employees={store.employees}
              applicants={store.applicants}
              entities={store.entities}
              onChangeUserRole={(userId, nextRole) =>
                store.changeUserRole(userId, nextRole, actorLabel)
              }
              onUpdateUserScope={(userId, employmentType, assignedScopes) =>
                store.updateUserScope(userId, employmentType, assignedScopes, actorLabel)
              }
              onToggleUserStatus={(userId) => store.toggleUserStatus(userId, actorLabel)}
              onResetOrUpdateUserPassword={(userId, nextPwd) =>
                store.resetOrUpdateUserPassword(userId, nextPwd, actorLabel)
              }
              onCreateInternalUser={(input) =>
                store.createInternalUserAccount(input, actorLabel)
              }
              onToggleEmployeeAccountStatus={(empId) =>
                store.toggleEmployeeAccountStatus(empId, actorLabel)
              }
              onResetOrUpdateEmployeePassword={(empId, nextPwd) =>
                store.resetOrUpdateEmployeePassword(empId, nextPwd, actorLabel)
              }
              onToggleApplicantAccountStatus={(appId) =>
                store.toggleApplicantAccountStatus(appId, actorLabel)
              }
              onResetOrUpdateApplicantPassword={(appId, nextPwd) =>
                store.resetOrUpdateApplicantPassword(appId, nextPwd, actorLabel)
              }
            />
          )}
          {activeMenu === 'policies' && (
            <PoliciesPanel
              policy={store.policy}
              entities={store.entities}
              onSavePolicy={(nextPolicy) => store.savePolicy(nextPolicy, actorLabel)}
              onAddLocation={(loc) => store.addAttendanceLocation(loc, actorLabel)}
              onToggleLocationStatus={(id) => store.toggleLocationStatus(id, actorLabel)}
              onRemoveLocation={(id) => store.removeLocation(id, actorLabel)}
              onSyncLocationsFromEntities={() =>
                store.syncPolicyLocationsFromEntities(actorLabel)
              }
            />
          )}
          {activeMenu === 'monitoring' && (
            <MonitoringPanel
              snapshots={store.snapshots}
              attendanceLogs={store.attendanceLogs}
              leaveAbsences={store.leaveAbsences}
              contracts={store.contracts}
              employees={store.employees}
              policy={store.policy}
              initialTab={monitoringTab}
              onTabChange={setMonitoringTab}
              onApproveLeave={(id) => store.approveLeave(id, actorLabel)}
              onRejectLeave={(id) => store.rejectLeave(id, actorLabel)}
              onConvertAlphaToIzin={(id) => store.convertAlphaToIzin(id, actorLabel)}
              onExtendPkwtContract={(id) => store.extendPkwtContract(id, actorLabel)}
            />
          )}
          {activeMenu === 'settings' && (
            <SettingsPanel
              settings={store.settings}
              activeEntityCount={store.entities.filter((e) => e.status === 'Aktif').length}
              activeEmployeeCount={store.employees.filter((e) => e.status !== 'Nonaktif').length}
              onSaveSettings={(nextSettings) => store.saveSettings(nextSettings, actorLabel)}
              onResetSimulation={() => store.resetWorkspaceSimulation(actorLabel)}
            />
          )}
        </main>
      </div>
    </div>
  );
};
