import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  CheckCheck,
  FileCheck2,
  FileWarning,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import type { WorkspaceNotificationRecord } from '../../data/masterAdminData';

interface NotificationBellMenuProps {
  notifications: WorkspaceNotificationRecord[];
  onSelectNotification: (notification: WorkspaceNotificationRecord) => void;
  onMarkAllRead: () => void;
}

export const NotificationBellMenu: React.FC<NotificationBellMenuProps> = ({
  notifications,
  onSelectNotification,
  onMarkAllRead,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const renderIcon = (type: WorkspaceNotificationRecord['type']) => {
    switch (type) {
      case 'new-employee':
      case 'new-application':
        return <UserPlus className="w-4 h-4 text-[#1468E8] shrink-0" aria-hidden="true" />;
      case 'pkwt-signed':
      case 'applicant-ready':
        return <FileCheck2 className="w-4 h-4 text-[#16A36A] shrink-0" aria-hidden="true" />;
      case 'pkwt-expiring':
      case 'pkwt-pending-sign':
      case 'pkwt-extension-requested':
        return <FileWarning className="w-4 h-4 text-[#B87D00] shrink-0" aria-hidden="true" />;
      case 'leave-submitted':
      case 'interview-scheduled':
      case 'alpha-clarified':
        return <CalendarClock className="w-4 h-4 text-[#FF7A1A] shrink-0" aria-hidden="true" />;
      case 'leave-approved':
        return <CalendarCheck2 className="w-4 h-4 text-[#16A36A] shrink-0" aria-hidden="true" />;
      case 'leave-rejected':
        return <CalendarX2 className="w-4 h-4 text-[#DC3545] shrink-0" aria-hidden="true" />;
      case 'application-updated':
      case 'approval-pending':
      default:
        return <Sparkles className="w-4 h-4 text-[#102B69] shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={
          unreadCount > 0
            ? `Notifikasi sistem (${unreadCount} belum dibaca)`
            : 'Notifikasi sistem'
        }
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative inline-flex items-center justify-center w-9 h-9 bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] text-[#102B69] transition-colors cursor-pointer shrink-0"
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-count"
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center bg-[#FF7A1A] text-white text-[10px] font-extrabold rounded-[3px] tabular-nums leading-none"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Daftar Notifikasi HRIS"
          className="absolute right-0 mt-2 w-[340px] sm:w-[390px] max-w-[92vw] bg-white border border-[#E2E8F0] rounded-[6px] shadow-lg z-50 overflow-hidden"
        >
          <div className="px-4 py-3 bg-[#F5F7FA] border-b border-[#E2E8F0] flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-[#102B69]">Notifikasi Workspace</p>
              <p className="text-[11px] text-[#64748B] tabular-nums">
                {unreadCount > 0
                  ? `${unreadCount} pemberitahuan belum dibaca`
                  : 'Semua notifikasi sudah dibaca'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#1468E8] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tandai Dibaca</span>
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-[#E2E8F0]">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748B]">
                Belum ada notifikasi aktivitas karyawan atau kontrak PKWT.
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSelectNotification(item);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                    item.read
                      ? 'bg-white hover:bg-[#F5F7FA]'
                      : 'bg-[#EAF2FF]/45 hover:bg-[#EAF2FF]/80'
                  }`}
                >
                  <div className="mt-0.5">{renderIcon(item.type)}</div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-[#102B69] leading-snug">{item.title}</p>
                      {!item.read && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#FF7A1A] text-white rounded-[3px] shrink-0">
                          Baru
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#475569] leading-relaxed">{item.message}</p>
                    <p className="text-[10px] font-semibold text-[#64748B] pt-0.5 tabular-nums">
                      {item.createdAt}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
