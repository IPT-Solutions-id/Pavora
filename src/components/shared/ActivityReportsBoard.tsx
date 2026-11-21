import React, { useMemo, useState } from 'react';
import {
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import {
  ActivityProgressStatus,
  EmployeeActivityReportRecord,
  EmploymentCategory,
  buildActivityReportsCsv,
  filterActivityReports,
  formatIndonesianDate,
  summarizeActivityReports,
} from '../../data/masterAdminData';
import { formatGpsCoordinateText } from '../../utils/activityTimestampCamera';
import { buildGoogleMapsUrl } from '../../utils/mapsUrl';

interface ActivityReportsBoardProps {
  reports: EmployeeActivityReportRecord[];
  title?: string;
  subtitle?: string;
  csvFileNamePrefix?: string;
}

function getProgressTone(status: ActivityProgressStatus): string {
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

export const ActivityReportsBoard: React.FC<ActivityReportsBoardProps> = ({
  reports,
  title = 'Laporan Kegiatan Karyawan (Internal & Eksternal)',
  subtitle = 'Pantauan langsung catatan dan pembaruan aktivitas kerja harian karyawan sesuai unit, client, dan cabangnya.',
  csvFileNamePrefix = 'laporan-kegiatan-pevora',
}) => {
  const [query, setQuery] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState<EmploymentCategory | 'Semua'>('Semua');
  const [progressFilter, setProgressFilter] = useState<ActivityProgressStatus | 'Semua'>('Semua');
  const [entityFilter, setEntityFilter] = useState('Semua');
  const [detailReport, setDetailReport] = useState<EmployeeActivityReportRecord | null>(null);

  const summary = useMemo(() => summarizeActivityReports(reports), [reports]);

  const entityOptions = useMemo(() => {
    const names = new Set<string>();
    for (const r of reports) {
      if (r.targetEntityName) names.add(r.targetEntityName);
      if (r.entityName) names.add(r.entityName);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [reports]);

  const visibleReports = useMemo(
    () => filterActivityReports(reports, query, employmentFilter, progressFilter, entityFilter),
    [reports, query, employmentFilter, progressFilter, entityFilter]
  );

  const handleExportCsv = () => {
    const csv = buildActivityReportsCsv(visibleReports);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${csvFileNamePrefix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Total Laporan Kegiatan</p>
          <p
            data-testid="activity-kpi-total"
            className="text-2xl font-extrabold text-[#102B69] mt-1 tabular-nums"
          >
            {summary.total}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5 tabular-nums">
            {summary.internalCount} Internal · {summary.clientCount} Eksternal
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Selesai</p>
          <p
            data-testid="activity-kpi-completed"
            className="text-2xl font-extrabold text-[#16A36A] mt-1 tabular-nums"
          >
            {summary.completed}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">Kegiatan tuntas terlapor</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Sedang Berjalan</p>
          <p
            data-testid="activity-kpi-ongoing"
            className="text-2xl font-extrabold text-[#B87D00] mt-1 tabular-nums"
          >
            {summary.ongoing}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">Progres aktivitas aktif</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4">
          <p className="text-xs font-semibold text-[#64748B]">Terkendala</p>
          <p
            data-testid="activity-kpi-blocked"
            className="text-2xl font-extrabold text-[#DC3545] mt-1 tabular-nums"
          >
            {summary.blocked}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">Perlu koordinasi lapangan</p>
        </div>
      </div>

      {/* Main Board Section */}
      <section className="bg-white border border-[#E2E8F0] rounded-[6px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#102B69]">{title}</h2>
            <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={visibleReports.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ekspor CSV ({visibleReports.length})</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search
              className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, NIK, judul kegiatan, atau cabang..."
              aria-label="Cari laporan kegiatan karyawan"
              className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8]"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={employmentFilter}
              onChange={(e) => setEmploymentFilter(e.target.value as EmploymentCategory | 'Semua')}
              aria-label="Filter jalur karyawan"
              className="w-full px-2.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8] cursor-pointer"
            >
              <option value="Semua">Semua Jalur</option>
              <option value="Internal">Internal</option>
              <option value="Penempatan Klien">Eksternal (Client)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={progressFilter}
              onChange={(e) =>
                setProgressFilter(e.target.value as ActivityProgressStatus | 'Semua')
              }
              aria-label="Filter status progres kegiatan"
              className="w-full px-2.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8] cursor-pointer"
            >
              <option value="Semua">Semua Progres</option>
              <option value="Berjalan">Berjalan</option>
              <option value="Selesai">Selesai</option>
              <option value="Terkendala">Terkendala</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              aria-label="Filter unit atau client kegiatan"
              className="w-full px-2.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:border-[#1468E8] cursor-pointer"
            >
              <option value="Semua">Semua Unit &amp; Client</option>
              {entityOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reports Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F5F7FA]">
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B]">
                  Tanggal &amp; Pembaruan
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Karyawan &amp; Jalur
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Sasaran Unit / Client &amp; Cabang
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Kegiatan &amp; Rincian
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-[#64748B]">
                  Progres
                </th>
                <th scope="col" className="py-3 px-6 text-xs font-semibold text-[#64748B] text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {visibleReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-6 text-center text-[#64748B]">
                    Belum ada laporan kegiatan yang sesuai filter pencarian.
                  </td>
                </tr>
              ) : (
                visibleReports.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F5F7FA]/60 transition-colors align-top">
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <p className="font-bold text-[#102B69] tabular-nums">
                        {formatIndonesianDate(item.activityDate)}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-0.5 tabular-nums">
                        Update: {item.updatedAt}
                      </p>
                      {item.updateCount > 0 && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold text-[#1468E8] bg-[#EAF2FF] rounded-[4px] tabular-nums">
                          Diperbarui {item.updateCount}x
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-bold text-[#172033]">{item.employeeName}</p>
                      <p className="text-[11px] text-[#64748B] tabular-nums">
                        {item.employeeCode} · {item.position}
                      </p>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded-[4px] border ${
                          item.employmentType === 'Internal'
                            ? 'bg-[#EAF2FF] text-[#102B69] border-[#BFDBFE]'
                            : 'bg-[#F5F7FA] text-[#172033] border-[#CBD5E1]'
                        }`}
                      >
                        {item.employmentType === 'Internal' ? 'Internal' : 'Eksternal (Client)'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#102B69]">{item.targetEntityName}</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        Cabang/Lokasi: <strong className="text-[#172033]">{item.targetBranchName}</strong>
                      </p>
                      {item.targetEntityName !== item.entityName && (
                        <p className="text-[10px] text-[#64748B] mt-0.5">
                          Unit Induk: {item.entityName}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-[340px]">
                      <p className="font-bold text-[#172033]">{item.title}</p>
                      <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2">
                        {item.description}
                      </p>
                      {(item.attachmentFileName || item.photoCapturedAt) && (
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                          <span className="inline-flex items-center gap-1 font-semibold text-[#1468E8]">
                            <ImageIcon className="w-3 h-3" aria-hidden="true" />
                            <span>{item.attachmentFileName ?? 'Foto Timestamp'}</span>
                          </span>
                          {item.photoCapturedAt && (
                            <span className="inline-flex items-center gap-1 text-[#64748B] tabular-nums">
                              <Clock className="w-3 h-3" aria-hidden="true" />
                              <span>{item.photoCapturedAt}</span>
                            </span>
                          )}
                          {typeof item.photoGpsLat === 'number' &&
                            typeof item.photoGpsLng === 'number' && (
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
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 text-[11px] font-bold rounded-[4px] border ${getProgressTone(
                          item.progressStatus
                        )}`}
                      >
                        {item.progressStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDetailReport(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Read-Only Activity Report Detail Modal */}
      {detailReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="activity-detail-title"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 bg-[#102B69] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
                <h3 id="activity-detail-title" className="text-sm font-bold truncate">
                  Detail Laporan Kegiatan · {detailReport.employeeCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailReport(null)}
                aria-label="Tutup detail laporan kegiatan"
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] p-3.5">
                <div>
                  <p className="text-[11px] text-[#64748B]">Karyawan</p>
                  <p className="font-bold text-[#102B69] mt-0.5">
                    {detailReport.employeeName} ({detailReport.employeeCode})
                  </p>
                  <p className="text-[11px] text-[#64748B]">{detailReport.position}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#64748B]">Tanggal &amp; Progres</p>
                  <p className="font-bold text-[#172033] mt-0.5 tabular-nums">
                    {formatIndonesianDate(detailReport.activityDate)}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-[4px] border ${getProgressTone(
                      detailReport.progressStatus
                    )}`}
                  >
                    {detailReport.progressStatus}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-[#64748B]">Jalur Penempatan</p>
                  <p className="font-semibold text-[#172033] mt-0.5">
                    {detailReport.employmentType === 'Internal'
                      ? `Internal (${detailReport.entityName})`
                      : `Eksternal (${detailReport.entityName})`}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#64748B]">Sasaran Unit / Client &amp; Cabang</p>
                  <p className="font-semibold text-[#102B69] mt-0.5">
                    {detailReport.targetEntityName}
                  </p>
                  <p className="text-[11px] text-[#64748B]">{detailReport.targetBranchName}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#64748B]">Judul Kegiatan</p>
                <p className="text-sm font-bold text-[#102B69] mt-0.5">{detailReport.title}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#64748B]">Rincian &amp; Hasil Kegiatan</p>
                <p className="text-xs text-[#172033] leading-relaxed whitespace-pre-line mt-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] p-3">
                  {detailReport.description}
                </p>
              </div>

              {detailReport.attachmentDataUrl && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-[#64748B]">
                    Foto Live Timestamp Kamera ({detailReport.attachmentFileName})
                  </p>
                  <div className="border border-[#E2E8F0] rounded-[4px] bg-[#F8FAFC] p-2 flex justify-center">
                    <img
                      src={detailReport.attachmentDataUrl}
                      alt={detailReport.attachmentFileName || 'Dokumentasi kegiatan'}
                      className="max-h-64 w-auto object-contain rounded-[4px]"
                    />
                  </div>
                  {(detailReport.photoCapturedAt || detailReport.photoGpsStatus) && (
                    <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="space-y-0.5">
                        {detailReport.photoCapturedAt && (
                          <p className="font-semibold text-[#102B69] tabular-nums">
                            Timestamp Kamera: {detailReport.photoCapturedAt}
                          </p>
                        )}
                        <p
                          className={`font-semibold tabular-nums ${
                            detailReport.photoGpsStatus === 'locked'
                              ? 'text-[#16A36A]'
                              : detailReport.photoGpsStatus === 'denied'
                                ? 'text-[#B87D00]'
                                : 'text-[#64748B]'
                          }`}
                        >
                          Koordinat GPS:{' '}
                          {formatGpsCoordinateText(
                            detailReport.photoGpsLat,
                            detailReport.photoGpsLng,
                            detailReport.photoGpsAccuracyMeters,
                            detailReport.photoGpsStatus ?? 'unavailable'
                          )}
                        </p>
                        {detailReport.photoGpsAddress && (
                          <p className="font-medium text-[#172033] leading-snug">
                            Alamat Lokasi: {detailReport.photoGpsAddress}
                          </p>
                        )}
                      </div>
                      {typeof detailReport.photoGpsLat === 'number' &&
                        typeof detailReport.photoGpsLng === 'number' && (
                          <a
                            href={buildGoogleMapsUrl(
                              detailReport.photoGpsLat,
                              detailReport.photoGpsLng
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#1468E8] bg-white hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] whitespace-nowrap"
                          >
                            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Buka di Google Maps</span>
                          </a>
                        )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-[11px] text-[#64748B]">
                <span>
                  Dibuat: {detailReport.createdAt} · Terakhir diperbarui: {detailReport.updatedAt}
                </span>
                <button
                  type="button"
                  onClick={() => setDetailReport(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
