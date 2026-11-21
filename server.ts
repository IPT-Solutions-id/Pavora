import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import type { PkwtDocumentPayload } from './src/utils/pkwtDocument.ts';
import {
  buildPkwtDownloadFilename,
  generatePkwtPdfBytes,
} from './src/utils/pkwtPdfGenerator.ts';
import type { PkwtPdfAssets } from './src/utils/pkwtPdfGenerator.ts';
import {
  formatReverseGeocodeAddress,
  type ReverseGeocodeAddressParts,
} from './src/utils/activityTimestampCamera.ts';

interface ReverseGeocodeCacheEntry {
  address: string;
  expiresAt: number;
}

const REVERSE_GEOCODE_CACHE = new Map<string, ReverseGeocodeCacheEntry>();
const REVERSE_GEOCODE_TTL_MS = 30 * 60 * 1000;
const REVERSE_GEOCODE_MAX_ENTRIES = 500;

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = process.cwd();

let cachedServerAssets: PkwtPdfAssets | null = null;

function getServerPkwtAssets(): PkwtPdfAssets {
  if (!cachedServerAssets) {
    const readPublic = (relPath: string): Uint8Array =>
      new Uint8Array(fs.readFileSync(path.join(ROOT_DIR, 'public', relPath)));

    cachedServerAssets = {
      regularFont: readPublic('fonts/carlito-latin-400-normal.ttf'),
      boldFont: readPublic('fonts/carlito-latin-700-normal.ttf'),
      italicFont: readPublic('fonts/carlito-latin-400-italic.ttf'),
      boldItalicFont: readPublic('fonts/carlito-latin-700-italic.ttf'),
      logoPng: readPublic('assets/pkwt/swapro-logo.png'),
      footerJpg: readPublic('assets/pkwt/footer-bar.jpg'),
      parafPng: readPublic('assets/pkwt/swapro-paraf.png'),
      stampP3Jpg: readPublic('assets/pkwt/stamp-p3.jpg'),
      stampP4Jpg: readPublic('assets/pkwt/stamp-p4.jpg'),
    };
  }
  return cachedServerAssets;
}

function decodeBase64UrlJson(encoded: string): unknown {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padLen);
  const jsonText = Buffer.from(base64, 'base64').toString('utf8');
  return JSON.parse(jsonText);
}

function sanitizePkwtPayload(raw: unknown): PkwtDocumentPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Payload PKWT tidak valid.');
  }
  const obj = raw as Record<string, unknown>;
  const asStr = (key: string, fallback = ''): string =>
    typeof obj[key] === 'string' ? obj[key] : fallback;

  const employeeName = asStr('employeeName').trim();
  const pkwtNumber = asStr('pkwtNumber').trim();
  if (!employeeName || !pkwtNumber) {
    throw new Error('Nama karyawan dan nomor PKWT wajib diisi.');
  }

  return {
    pkwtNumber,
    signerName: asStr('signerName', 'Farid Usman, S.Psi.'),
    signerPosition: asStr('signerPosition', 'Direktur Operasional'),
    clientLegalName: asStr('clientLegalName', 'PT Bussan Auto Finance'),
    employeeName,
    ktpNumber: asStr('ktpNumber', '-'),
    birthPlaceDate: asStr('birthPlaceDate', '-'),
    ageYears: Number(obj.ageYears) || 21,
    gender: obj.gender === 'Perempuan' ? 'Perempuan' : 'Laki-Laki',
    address: asStr('address', '-'),
    departmentDivision: asStr('departmentDivision', '-'),
    position: asStr('position', '-'),
    placementLocation: asStr('placementLocation', '-'),
    placementShort: asStr('placementShort', '-'),
    startDateText: asStr('startDateText', '-'),
    endDateText: asStr('endDateText', '-'),
    employeeInternalId: asStr('employeeInternalId', '-'),
    signingCity: asStr('signingCity', 'Jakarta Pusat'),
    signingDateText: asStr('signingDateText', '-'),
    monthlySalary: Math.max(0, Number(obj.monthlySalary) || 0),
    incentiveClientNote: asStr('incentiveClientNote', 'Sesuai ketentuan Klien'),
    overtimeClientNote: asStr('overtimeClientNote', 'Sesuai ketentuan Klien'),
  };
}

function getGeminiOcrClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', aiVisionAvailable: Boolean(process.env.GEMINI_API_KEY?.trim()) });
  });

  app.get('/api/geocode/reverse', async (req, res) => {
    const rawLat = typeof req.query.lat === 'string' ? req.query.lat.trim() : '';
    const rawLng = typeof req.query.lng === 'string' ? req.query.lng.trim() : '';
    const lat = Number(rawLat);
    const lng = Number(rawLng);

    if (
      !rawLat ||
      !rawLng ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      res.status(400).json({ ok: false, error: 'Koordinat lat/lng tidak valid.' });
      return;
    }

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const now = Date.now();
    const cached = REVERSE_GEOCODE_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.json({ ok: true, address: cached.address, cached: true });
      return;
    }

    try {
      const upstreamUrl = new URL('https://nominatim.openstreetmap.org/reverse');
      upstreamUrl.searchParams.set('format', 'jsonv2');
      upstreamUrl.searchParams.set('lat', lat.toFixed(6));
      upstreamUrl.searchParams.set('lon', lng.toFixed(6));
      upstreamUrl.searchParams.set('zoom', '18');
      upstreamUrl.searchParams.set('addressdetails', '1');
      upstreamUrl.searchParams.set('accept-language', 'id');

      const upstreamRes = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'PEVORA-HRIS/1.0 (PT Iskandar Pratama Teknologi; reverse-geocode)',
        },
        signal: AbortSignal.timeout(6500),
      });

      if (!upstreamRes.ok) {
        res.status(502).json({
          ok: false,
          address: '',
          error: 'Layanan alamat lokasi sedang sibuk.',
        });
        return;
      }

      const payload = (await upstreamRes.json()) as {
        address?: ReverseGeocodeAddressParts;
        display_name?: string;
      };
      const formattedAddress = formatReverseGeocodeAddress(
        payload.address,
        payload.display_name
      );

      if (formattedAddress) {
        if (REVERSE_GEOCODE_CACHE.size >= REVERSE_GEOCODE_MAX_ENTRIES) {
          const oldestKey = REVERSE_GEOCODE_CACHE.keys().next().value;
          if (oldestKey) REVERSE_GEOCODE_CACHE.delete(oldestKey);
        }
        REVERSE_GEOCODE_CACHE.set(cacheKey, {
          address: formattedAddress,
          expiresAt: now + REVERSE_GEOCODE_TTL_MS,
        });
      }

      res.setHeader('Cache-Control', 'private, max-age=300');
      res.json({ ok: true, address: formattedAddress, cached: false });
    } catch {
      res.status(504).json({
        ok: false,
        address: '',
        error: 'Timeout saat mengambil alamat lokasi.',
      });
    }
  });

  app.post('/api/ocr/identity', async (req, res) => {
    try {
      const documentType = req.body?.documentType === 'kk' ? 'kk' : 'ktp';
      const mimeType =
        typeof req.body?.mimeType === 'string' && req.body.mimeType.trim()
          ? req.body.mimeType.trim()
          : 'image/jpeg';
      const rawBase64 = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64 : '';
      const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '').trim();

      if (!cleanBase64) {
        res.status(400).json({ error: 'Berkas gambar/PDF KTP atau KK belum dipilih.' });
        return;
      }

      const ai = getGeminiOcrClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Kunci AI Vision (GEMINI_API_KEY) belum terpasang di Settings > Secrets. Silakan isi data secara manual pada formulir.',
        });
        return;
      }

      const imagePart = {
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      };

      if (documentType === 'ktp') {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              imagePart,
              {
                text:
                  'Ekstrak seluruh data e-KTP Indonesia dari dokumen ini secara akurat. ' +
                  'Format tanggal lahir ke YYYY-MM-DD jika terbaca, ubah jenis kelamin menjadi tepat "Laki-laki" atau "Perempuan", ' +
                  'dan status perkawinan menjadi salah satu dari "Belum Kawin", "Kawin", "Cerai Hidup", atau "Cerai Mati". ' +
                  'Jika suatu kolom tidak terbaca, kembalikan string kosong "".',
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                nik: { type: Type.STRING, description: '16 digit NIK angka tanpa spasi' },
                fullName: { type: Type.STRING, description: 'Nama lengkap sesuai KTP' },
                birthPlace: { type: Type.STRING, description: 'Kota/Kabupaten tempat lahir' },
                birthDate: { type: Type.STRING, description: 'Tanggal lahir format YYYY-MM-DD' },
                gender: { type: Type.STRING, description: 'Laki-laki atau Perempuan' },
                religion: { type: Type.STRING, description: 'Agama pada KTP' },
                maritalStatus: { type: Type.STRING, description: 'Status perkawinan pada KTP' },
                bloodType: { type: Type.STRING, description: 'Golongan darah (A, B, AB, O, atau -)' },
                street: { type: Type.STRING, description: 'Alamat jalan/blok/dusun' },
                rtRw: { type: Type.STRING, description: 'RT/RW format 000/000' },
                kelurahan: { type: Type.STRING, description: 'Kelurahan atau Desa' },
                kecamatan: { type: Type.STRING, description: 'Kecamatan' },
                city: { type: Type.STRING, description: 'Kota atau Kabupaten' },
                province: { type: Type.STRING, description: 'Provinsi' },
                postalCode: { type: Type.STRING, description: 'Kode pos jika ada' },
              },
            },
          },
        });

        const parsed = JSON.parse((response.text ?? '{}').trim());
        res.json({ ok: true, documentType: 'ktp', data: parsed });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            imagePart,
            {
              text:
                'Ekstrak data Kartu Keluarga (KK) Indonesia dari dokumen ini secara akurat. ' +
                'Ambil Nomor KK (16 digit angka), Nama Kepala Keluarga, alamat lengkap KK, dan daftar anggota keluarga ' +
                'dengan relasi salah satu dari "Pasangan", "Anak", "Orang Tua", atau "Saudara Kandung" serta tanggal lahir YYYY-MM-DD. ' +
                'Jika suatu kolom tidak terbaca, kembalikan string kosong "".',
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              kkNumber: { type: Type.STRING, description: '16 digit nomor Kartu Keluarga' },
              headOfFamily: { type: Type.STRING, description: 'Nama Kepala Keluarga' },
              street: { type: Type.STRING, description: 'Alamat jalan/perumahan pada KK' },
              rtRw: { type: Type.STRING, description: 'RT/RW format 000/000' },
              kelurahan: { type: Type.STRING, description: 'Kelurahan atau Desa' },
              kecamatan: { type: Type.STRING, description: 'Kecamatan' },
              city: { type: Type.STRING, description: 'Kota atau Kabupaten' },
              province: { type: Type.STRING, description: 'Provinsi' },
              postalCode: { type: Type.STRING, description: 'Kode pos' },
              familyMembers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    relation: { type: Type.STRING },
                    birthDate: { type: Type.STRING },
                    nik: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ ok: true, documentType: 'kk', data: parsed });
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : '';
      const isQuotaOrBilling =
        rawMsg.includes('PERMISSION_DENIED') ||
        rawMsg.includes('free tier') ||
        rawMsg.includes('RESOURCE_EXHAUSTED') ||
        rawMsg.includes('API key');

      if (isQuotaOrBilling) {
        res.status(503).json({
          error:
            'Layanan AI Vision Gemini belum tersedia pada kunci proyek saat ini (akses tier/billing belum aktif). Dokumen tetap tercatat dan Anda dapat mengisi/mengedit biodata secara manual.',
        });
        return;
      }

      res.status(500).json({
        error: rawMsg
          ? `Pemindaian AI Vision OCR gagal: ${rawMsg}`
          : 'Gagal memindai dokumen via AI Vision.',
      });
    }
  });

  app.get('/api/pkwt/download', async (req, res) => {
    try {
      const encoded = typeof req.query.d === 'string' ? req.query.d : '';
      if (!encoded) {
        res.status(400).json({ error: 'Parameter dokumen PKWT tidak ditemukan.' });
        return;
      }
      const raw = decodeBase64UrlJson(encoded);
      const payload = sanitizePkwtPayload(raw);
      const pdfBytes = await generatePkwtPdfBytes(payload, getServerPkwtAssets());
      const filename = buildPkwtDownloadFilename(payload);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', String(pdfBytes.byteLength));
      res.send(Buffer.from(pdfBytes));
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Gagal membuat file PDF PKWT.',
      });
    }
  });

  app.post('/api/pkwt/download', async (req, res) => {
    try {
      const raw =
        typeof req.body?.payload === 'string' ? JSON.parse(req.body.payload) : req.body;
      const payload = sanitizePkwtPayload(raw);
      const pdfBytes = await generatePkwtPdfBytes(payload, getServerPkwtAssets());
      const filename = buildPkwtDownloadFilename(payload);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', String(pdfBytes.byteLength));
      res.send(Buffer.from(pdfBytes));
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Gagal membuat file PDF PKWT.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
