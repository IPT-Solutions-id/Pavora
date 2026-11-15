export const COOKIE_CONSENT_STORAGE_KEY = 'pevora_cookie_consent_v1';
export const COOKIE_CONSENT_VERSION = 1;

export type CookieConsentDecisionType = 'all' | 'essential' | 'custom';

export interface CookieConsentPreferences {
  version: number;
  essential: true;
  preferences: boolean;
  analytics: boolean;
  decisionType: CookieConsentDecisionType;
  decidedAtIso: string;
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface CookieCategoryInfo {
  id: 'essential' | 'preferences' | 'analytics';
  title: string;
  statusLabel: string;
  required: boolean;
  description: string;
  examples: string;
}

export const COOKIE_CATEGORIES: readonly CookieCategoryInfo[] = [
  {
    id: 'essential',
    title: 'Esensial & Keamanan Sesi',
    statusLabel: 'Wajib · Selalu Aktif',
    required: true,
    description:
      'Menjaga autentikasi portal, keamanan sesi login, serta memastikan pengendalian akses lima peran PEVORA berjalan andal.',
    examples: 'Token sesi login, pengamanan rute portal, dan status persetujuan privasi.',
  },
  {
    id: 'preferences',
    title: 'Preferensi Antarmuka',
    statusLabel: 'Opsional',
    required: false,
    description:
      'Menyimpan kenyamanan penggunaan lokal seperti pengisian ulang ID Karyawan pada perangkat ini dan tata letak filter kerja.',
    examples: 'Opsi "Ingat ID pada perangkat ini" serta preferensi tampilan dashboard.',
  },
  {
    id: 'analytics',
    title: 'Analitik & Performa Platform',
    statusLabel: 'Opsional',
    required: false,
    description:
      'Membantu PT Iskandar Pratama Teknologi mengukur stabilitas dan keandalan antarmuka platform secara agregat tanpa pelacakan iklan.',
    examples: 'Metrik keandalan pemuatan halaman dan kestabilan modul operasional.',
  },
] as const;

function getBrowserStorage(override?: StorageLike | null): StorageLike | null {
  if (override !== undefined) {
    return override;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createAcceptAllConsent(
  nowIso: string = new Date().toISOString()
): CookieConsentPreferences {
  return {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    preferences: true,
    analytics: true,
    decisionType: 'all',
    decidedAtIso: nowIso,
  };
}

export function createEssentialOnlyConsent(
  nowIso: string = new Date().toISOString()
): CookieConsentPreferences {
  return {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    preferences: false,
    analytics: false,
    decisionType: 'essential',
    decidedAtIso: nowIso,
  };
}

export function createCustomConsent(
  options: { preferences: boolean; analytics: boolean },
  nowIso: string = new Date().toISOString()
): CookieConsentPreferences {
  const preferences = Boolean(options.preferences);
  const analytics = Boolean(options.analytics);
  const decisionType: CookieConsentDecisionType =
    preferences && analytics ? 'all' : !preferences && !analytics ? 'essential' : 'custom';

  return {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    preferences,
    analytics,
    decisionType,
    decidedAtIso: nowIso,
  };
}

export function parseCookieConsentJson(
  raw: string | null | undefined
): CookieConsentPreferences | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentPreferences> | null;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (parsed.version !== COOKIE_CONSENT_VERSION) {
      return null;
    }
    if (parsed.essential !== true) {
      return null;
    }
    if (typeof parsed.preferences !== 'boolean' || typeof parsed.analytics !== 'boolean') {
      return null;
    }
    if (
      parsed.decisionType !== 'all' &&
      parsed.decisionType !== 'essential' &&
      parsed.decisionType !== 'custom'
    ) {
      return null;
    }
    if (typeof parsed.decidedAtIso !== 'string' || parsed.decidedAtIso.trim().length === 0) {
      return null;
    }

    return {
      version: COOKIE_CONSENT_VERSION,
      essential: true,
      preferences: parsed.preferences,
      analytics: parsed.analytics,
      decisionType: parsed.decisionType,
      decidedAtIso: parsed.decidedAtIso,
    };
  } catch {
    return null;
  }
}

export function serializeCookieConsent(consent: CookieConsentPreferences): string {
  return JSON.stringify(consent);
}

export function loadCookieConsent(
  storage?: StorageLike | null
): CookieConsentPreferences | null {
  const target = getBrowserStorage(storage);
  if (!target) {
    return null;
  }
  try {
    return parseCookieConsentJson(target.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveCookieConsent(
  consent: CookieConsentPreferences,
  storage?: StorageLike | null
): CookieConsentPreferences {
  const target = getBrowserStorage(storage);
  if (target) {
    try {
      target.setItem(COOKIE_CONSENT_STORAGE_KEY, serializeCookieConsent(consent));
    } catch {
      // Ignore storage quota or private mode restrictions gracefully
    }
  }
  return consent;
}

export function clearCookieConsent(storage?: StorageLike | null): void {
  const target = getBrowserStorage(storage);
  if (!target) {
    return;
  }
  try {
    target.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    // Ignore storage restriction gracefully
  }
}

export function shouldShowCookieBanner(
  view: 'landing' | 'login' | 'dashboard',
  consent: CookieConsentPreferences | null
): boolean {
  if (view === 'dashboard') {
    return false;
  }
  return consent === null;
}
