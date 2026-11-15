import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { AuditLogRecord, filterAuditLogs } from '../../data/masterAdminData';

interface AuditLogPanelProps {
  logs: AuditLogRecord[];
}

const CATEGORIES: Array<AuditLogRecord['category'] | 'Semua'> = [
  'Semua',
  'Operasional',
  'RBAC',
  'Organisasi',
  'Persetujuan',
  'Kebijakan',
  'Keamanan',
];

export const AuditLogPanel: React.FC<AuditLogPanelProps> = ({ logs }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AuditLogRecord['category'] | 'Semua'>('Semua');

  const visibleLogs = filterAuditLogs(logs, query, category);

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#102B69]">Log Audit &amp; Keamanan Sistem</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Rekaman aktivitas perubahan peran, struktur entitas, persetujuan, dan kebijakan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari aktor atau aktivitas..."
              aria-label="Cari log audit"
              className="pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1468E8] w-56"
            />
          </div>

          <div className="inline-flex flex-wrap gap-1 p-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  category === cat
                    ? 'bg-[#1468E8] text-white'
                    : 'text-[#64748B] hover:text-[#102B69]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
              <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                Waktu
              </th>
              <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                Kategori
              </th>
              <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                Aktor
              </th>
              <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                Aktivitas
              </th>
              <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                Objek / Target
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-sm">
            {visibleLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 px-6 text-center text-xs text-[#64748B]">
                  Tidak ada catatan audit yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              visibleLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#F5F7FA]/60 transition-colors">
                  <td className="py-3 px-6 text-xs text-[#64748B] tabular-nums whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold text-[#1468E8] whitespace-nowrap">
                    {log.category}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium text-[#102B69]">{log.actor}</td>
                  <td className="py-3 px-4 text-xs text-[#172033]">{log.action}</td>
                  <td className="py-3 px-6 text-xs text-[#64748B]">{log.target}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
