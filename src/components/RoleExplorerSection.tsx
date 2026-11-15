import React, { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { ROLES, RoleId, getRoleById } from '../data/hrisData';

function getStatusLabelStyle(tone: 'success' | 'warning' | 'info') {
  switch (tone) {
    case 'success':
      return 'text-[#16A36A] font-semibold';
    case 'warning':
      return 'text-[#B87D00] font-semibold';
    case 'info':
    default:
      return 'text-[#1468E8] font-semibold';
  }
}

export const RoleExplorerSection: React.FC = () => {
  const [selectedRoleId, setSelectedRoleId] = useState<RoleId>('master-admin');
  const activeRole = getRoleById(selectedRoleId);

  return (
    <section id="peran" className="bg-white border-b border-[#E2E8F0] py-16 lg:py-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10 items-end">
          <div className="lg:col-span-7">
            <p className="font-jakarta text-sm font-semibold text-[#1468E8] mb-2">
              Kontrol Akses Empat Peran (RBAC)
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold text-[#102B69] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Dirancang spesifik untuk setiap tanggung jawab di organisasi Anda.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
              Pilih salah satu kartu peran di bawah untuk meninjau matriks wewenang, modul utama,
              dan simulasi data kerja masing-masing pengguna.
            </p>
          </div>
        </div>

        {/* 4-column unified role selector grid */}
        <div
          role="tablist"
          aria-label="Pilih peran pengguna PEVORA"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {ROLES.map((role) => {
            const isActive = role.id === selectedRoleId;
            return (
              <button
                key={role.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedRoleId(role.id)}
                className={`text-left p-5 rounded-[6px] border transition-colors duration-150 flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1468E8] ${
                  isActive
                    ? 'bg-[#EAF2FF] border-[#1468E8]'
                    : 'bg-white border-[#E2E8F0] hover:bg-[#F5F7FA]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-jakarta text-xs font-medium text-[#64748B]">
                      {role.code}
                    </span>
                    {isActive && (
                      <span className="text-xs font-bold text-[#FF7A1A] shrink-0">Aktif</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#102B69] mb-1.5">{role.name}</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">{role.shortDesc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-semibold text-[#1468E8]">
                  <span>{isActive ? 'Sedang Ditampilkan' : 'Lihat Hak Akses'}</span>
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Detailed Selected Role Workspace Grid */}
        <div
          role="tabpanel"
          aria-label={`Detail peran ${activeRole.name}`}
          className="border border-[#E2E8F0] rounded-[6px] bg-white overflow-hidden"
        >
          {/* Dark Navy Structural Header Strip */}
          <div className="bg-[#102B69] text-white px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="font-jakarta text-xs font-medium text-[#EAF2FF]/80 mb-1">
                {activeRole.code}
              </p>
              <h3 className="text-xl font-bold tracking-tight">
                Ruang Kerja {activeRole.name}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-6 md:gap-8">
              {activeRole.metrics.map((metric) => (
                <div key={metric.label}>
                  <p className="text-xs text-[#EAF2FF]/75">{metric.label}</p>
                  <p className="text-base sm:text-lg font-bold tabular-nums text-white">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 12-col Split Detail Body (Whitespace & Hairline Dividers, no nested cards) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0]">
            {/* Left 5 cols: Authority & Permissions */}
            <div className="lg:col-span-5 p-6 sm:p-7">
              <h4 className="text-sm font-bold text-[#102B69] mb-2">Wewenang & Cakupan Sistem</h4>
              <p className="text-sm text-[#64748B] leading-relaxed mb-5">
                {activeRole.authoritySummary}
              </p>

              <ul className="space-y-3 mb-6">
                {activeRole.permissions.map((perm) => (
                  <li key={perm} className="flex items-start gap-2.5 text-sm text-[#172033]">
                    <Check
                      className="w-4 h-4 text-[#16A36A] mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{perm}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4 border-t border-[#E2E8F0]">
                <p className="text-xs font-semibold text-[#64748B] mb-1.5">Modul Utama Terkait</p>
                <p className="text-xs sm:text-sm font-medium text-[#102B69]">
                  {activeRole.primaryModules.join(' · ')}
                </p>
              </div>
            </div>

            {/* Right 7 cols: Live Data Preview Table */}
            <div className="lg:col-span-7 p-6 sm:p-7 bg-[#F5F7FA]/60">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h4 className="text-sm font-bold text-[#102B69]">{activeRole.previewTitle}</h4>
                <span className="text-xs font-medium text-[#64748B]">
                  Simulasi Tampilan Data
                </span>
              </div>

              <div className="overflow-x-auto border border-[#E2E8F0] rounded-[4px] bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                      {activeRole.previewColumns.map((col) => (
                        <th
                          key={col}
                          scope="col"
                          className="py-3 px-4 text-xs font-semibold text-[#64748B]"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-sm">
                    {activeRole.previewRows.map((row) => (
                      <tr key={row.item} className="hover:bg-[#F5F7FA]/60 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[#172033]">{row.item}</td>
                        <td className="py-3.5 px-4 text-[#64748B] tabular-nums">{row.scope}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`text-xs ${getStatusLabelStyle(row.tone)}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
