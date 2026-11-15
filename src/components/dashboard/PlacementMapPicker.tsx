import React, { useCallback, useEffect, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  MapMouseEvent,
  Pin,
  useApiIsLoaded,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps';
import { Crosshair, ExternalLink, MapPin, RotateCcw } from 'lucide-react';
import { buildGoogleMapsUrl, Coordinates } from '../../utils/mapsUrl';

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';

// Regional geographic viewport center (Jakarta / Jabodetabek) used strictly as initial camera view
const INDONESIA_DEFAULT_VIEW: Coordinates = {
  lat: -6.2088,
  lng: 106.8456,
};

interface PlacementMapPickerProps {
  placementName: string;
  areaLabel: string;
  lat?: number;
  lng?: number;
  mapsUrl: string;
  onSelectCoordinates: (lat: number, lng: number, generatedMapsUrl: string) => void;
}

interface InnerMapCanvasProps {
  pinPosition: Coordinates | null;
  cameraCenter: Coordinates;
  cameraZoom: number;
  placementLabel: string;
  onPinMove: (lat: number, lng: number) => void;
  onCameraUpdate: (center: Coordinates, zoom: number) => void;
}

const InnerMapCanvas: React.FC<InnerMapCanvasProps> = ({
  pinPosition,
  cameraCenter,
  cameraZoom,
  placementLabel,
  onPinMove,
  onCameraUpdate,
}) => {
  const isLoaded = useApiIsLoaded();
  const loadingStatus = useApiLoadingStatus();

  const handleMapClick = useCallback(
    (ev: MapMouseEvent) => {
      const clicked = ev.detail?.latLng;
      if (!clicked) return;
      onPinMove(clicked.lat, clicked.lng);
    },
    [onPinMove]
  );

  const handleMarkerDragEnd = useCallback(
    (ev: { latLng?: { lat: () => number; lng: () => number } | null }) => {
      if (!ev.latLng) return;
      onPinMove(ev.latLng.lat(), ev.latLng.lng());
    },
    [onPinMove]
  );

  if (
    loadingStatus === APILoadingStatus.FAILED ||
    loadingStatus === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <div className="h-[260px] w-full flex flex-col items-center justify-center bg-[#FEF2F2] border border-[#FECACA] rounded-[4px] p-4 text-center">
        <p className="text-xs font-bold text-[#DC3545]">
          Peta interaktif gagal dimuat sementara.
        </p>
        <p className="text-[11px] text-[#64748B] mt-1 max-w-md">
          Anda tetap dapat menyalin dan menempelkan tautan Google Maps secara langsung pada kolom
          Link Google Maps di atas.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[260px] rounded-[4px] overflow-hidden border border-[#CBD5E1] bg-[#E2E8F0]">
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F8FAFC]/90 text-xs font-semibold text-[#102B69]">
          Memuat peta interaktif Google Maps...
        </div>
      )}
      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        center={cameraCenter}
        zoom={cameraZoom}
        onCameraChanged={(ev) => {
          onCameraUpdate(ev.detail.center, ev.detail.zoom);
        }}
        onClick={handleMapClick}
        gestureHandling="greedy"
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        {pinPosition && (
          <AdvancedMarker
            position={pinPosition}
            draggable
            onDragEnd={handleMarkerDragEnd}
            title={placementLabel || 'Titik Lokasi Penempatan'}
          >
            <Pin background="#1468E8" borderColor="#102B69" glyphColor="#FFFFFF" scale={1.1} />
          </AdvancedMarker>
        )}
      </GoogleMap>
    </div>
  );
};

export const PlacementMapPicker: React.FC<PlacementMapPickerProps> = ({
  placementName,
  areaLabel,
  lat,
  lng,
  mapsUrl,
  onSelectCoordinates,
}) => {
  const hasPinned =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const [cameraCenter, setCameraCenter] = useState<Coordinates>(
    hasPinned ? { lat, lng } : INDONESIA_DEFAULT_VIEW
  );
  const [cameraZoom, setCameraZoom] = useState<number>(hasPinned ? 15 : 11);
  const [geoNotice, setGeoNotice] = useState<string>('');

  useEffect(() => {
    if (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      setCameraCenter({ lat, lng });
      setCameraZoom((prev) => (prev < 13 ? 15 : prev));
    }
  }, [lat, lng]);

  const handlePinMove = useCallback(
    (nextLat: number, nextLng: number) => {
      setGeoNotice('');
      const generatedUrl = buildGoogleMapsUrl(nextLat, nextLng);
      onSelectCoordinates(nextLat, nextLng, generatedUrl);
    },
    [onSelectCoordinates]
  );

  const handleUseCurrentLocation = () => {
    setGeoNotice('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoNotice('Browser tidak mendukung deteksi GPS perangkat.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        setCameraCenter({ lat: nextLat, lng: nextLng });
        setCameraZoom(16);
        handlePinMove(nextLat, nextLng);
      },
      () => {
        setGeoNotice(
          'Izin lokasi perangkat ditolak atau tidak tersedia. Klik langsung pada peta untuk menandai titik.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleResetView = () => {
    setGeoNotice('');
    setCameraCenter(INDONESIA_DEFAULT_VIEW);
    setCameraZoom(11);
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-[4px] text-[11px] text-[#92400E]">
        Kunci Google Maps (`VITE_GOOGLE_MAPS_API_KEY`) belum aktif pada lingkungan ini. Tempelkan
        tautan Google Maps pada kolom di atas untuk menyimpan koordinat penempatan.
      </div>
    );
  }

  const labelText = [placementName.trim(), areaLabel.trim()].filter(Boolean).join(' · ');

  return (
    <div
      className="mt-2 p-3 bg-white border border-[#C9DDFB] rounded-[4px] space-y-2.5"
      data-testid="placement-interactive-map"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#102B69]">
          <MapPin className="w-3.5 h-3.5 text-[#1468E8] shrink-0" aria-hidden="true" />
          <span>
            Klik di peta atau geser pin untuk menandai lokasi
            {labelText ? `: ${labelText}` : ''}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#102B69] bg-[#F5F7FA] hover:bg-[#EAF2FF] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
          >
            <Crosshair className="w-3 h-3 text-[#1468E8]" aria-hidden="true" />
            <span>Lokasi Saya</span>
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#64748B] hover:text-[#102B69] bg-[#F5F7FA] border border-[#E2E8F0] rounded-[4px] cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            <span>Reset Peta</span>
          </button>
        </div>
      </div>

      {geoNotice && (
        <p className="text-[11px] text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-1.5 rounded-[4px]">
          {geoNotice}
        </p>
      )}

      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        libraries={['marker']}
        language="id"
        region="ID"
      >
        <InnerMapCanvas
          pinPosition={hasPinned ? { lat, lng } : null}
          cameraCenter={cameraCenter}
          cameraZoom={cameraZoom}
          placementLabel={labelText}
          onPinMove={handlePinMove}
          onCameraUpdate={(center, zoom) => {
            setCameraCenter(center);
            setCameraZoom(zoom);
          }}
        />
      </APIProvider>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
        <span className="tabular-nums">
          {hasPinned
            ? `Koordinat terpilih: ${lat.toFixed(6)}, ${lng.toFixed(6)} (otomatis mengisi Link Maps)`
            : 'Belum ada pin dipilih — klik area cabang pada peta di atas.'}
        </span>
        {mapsUrl.trim() && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[#1468E8] hover:underline"
          >
            <span>Buka di Google Maps</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
};
