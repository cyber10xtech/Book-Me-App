import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isValidVersionString,
  parseVersion,
  compareVersions,
  checkUpdatePolicy,
} from '../services/updateService';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '../integrations/supabase/client';

vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: vi.fn(),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    openUrl: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Version Comparison & Parsing', () => {
  describe('isValidVersionString', () => {
    it('accepts standard semver and dot-separated integers', () => {
      expect(isValidVersionString('1.0')).toBe(true);
      expect(isValidVersionString('1.0.0')).toBe(true);
      expect(isValidVersionString('11.9.3')).toBe(true);
      expect(isValidVersionString('10.0.0.1')).toBe(true);
      expect(isValidVersionString('0.1.2')).toBe(true);
    });

    it('accepts versions with leading v or V prefix', () => {
      expect(isValidVersionString('v1.0')).toBe(true);
      expect(isValidVersionString('V11.9.3')).toBe(true);
      expect(isValidVersionString('  v1.0.0  ')).toBe(true);
    });

    it('rejects invalid or malformed strings and non-strings', () => {
      expect(isValidVersionString('')).toBe(false);
      expect(isValidVersionString('   ')).toBe(false);
      expect(isValidVersionString('invalid')).toBe(false);
      expect(isValidVersionString('1.0.0-beta')).toBe(false);
      expect(isValidVersionString('1.0.0.preview')).toBe(false);
      expect(isValidVersionString('1..0')).toBe(false);
      expect(isValidVersionString('.1.0')).toBe(false);
      expect(isValidVersionString('1.0.')).toBe(false);
      expect(isValidVersionString(null)).toBe(false);
      expect(isValidVersionString(undefined)).toBe(false);
      expect(isValidVersionString(123)).toBe(false);
      expect(isValidVersionString({})).toBe(false);
    });
  });

  describe('parseVersion', () => {
    it('parses dot separated numbers into integer array', () => {
      expect(parseVersion('1.0')).toEqual([1, 0]);
      expect(parseVersion('11.9.3')).toEqual([11, 9, 3]);
      expect(parseVersion('v2.4.6.8')).toEqual([2, 4, 6, 8]);
    });

    it('returns null for invalid versions', () => {
      expect(parseVersion('bad.version')).toBeNull();
      expect(parseVersion('')).toBeNull();
      expect(parseVersion(null)).toBeNull();
    });
  });

  describe('compareVersions', () => {
    it('handles 9.9.0 < 10.0.0 correctly', () => {
      expect(compareVersions('9.9.0', '10.0.0')).toBe(-1);
    });

    it('handles 10.0.0 > 9.9.0 correctly', () => {
      expect(compareVersions('10.0.0', '9.9.0')).toBe(1);
    });

    it('handles 11.9.3 = 11.9.3 correctly', () => {
      expect(compareVersions('11.9.3', '11.9.3')).toBe(0);
    });

    it('handles 1.0 = 1.0.0 correctly (trailing zeros)', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0', '1.0')).toBe(0);
      expect(compareVersions('2.0.0.0', '2.0')).toBe(0);
    });

    it('handles minor and patch differences accurately', () => {
      expect(compareVersions('1.1.0', '1.2.0')).toBe(-1);
      expect(compareVersions('1.2.1', '1.2.0')).toBe(1);
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(compareVersions('2.0.1', '2.1.0')).toBe(-1);
    });

    it('handles leading v prefixes symmetrically', () => {
      expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('v10.1.0', 'v10.1.0')).toBe(0);
      expect(compareVersions('v9.9.0', '10.0.0')).toBe(-1);
    });

    it('returns null when either version is malformed', () => {
      expect(compareVersions('1.0.0', 'invalid')).toBeNull();
      expect(compareVersions('invalid', '1.0.0')).toBeNull();
      expect(compareVersions('1.0.0-beta', '1.0.0')).toBeNull();
      expect(compareVersions('', '1.0.0')).toBeNull();
      expect(compareVersions(null, '1.0.0')).toBeNull();
    });
  });
});

describe('Update Policy Evaluation (checkUpdatePolicy)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns up_to_date immediately if running in web platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

    const result = await checkUpdatePolicy();
    expect(result).toEqual({ status: 'up_to_date' });
  });

  it('returns check_failed (fail-open) if client version is malformed', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.mocked(App.getInfo).mockResolvedValue({
      version: 'corrupt-version',
      build: '1',
      name: 'BookMe',
      id: 'com.bookmebusiness.customerapp1',
    });

    const result = await checkUpdatePolicy();
    expect(result.status).toBe('check_failed');
  });

  it('returns up_to_date when current version equals latest version', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(App.getInfo).mockResolvedValue({
      version: '11.9.3',
      build: '1193',
      name: 'BookMe',
      id: 'com.bookmebusiness.customerapp1',
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                latest_version: '11.9.3',
                minimum_supported_version: '11.9.3',
                store_url: 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1',
              },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await checkUpdatePolicy();
    expect(result.status).toBe('up_to_date');
    expect(result.currentVersion).toBe('11.9.3');
  });

  it('returns up_to_date when current version is higher than latest version (e.g. dev build)', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(App.getInfo).mockResolvedValue({
      version: '12.0.0',
      build: '1200',
      name: 'BookMe',
      id: 'com.bookmebusiness.customerapp1',
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                latest_version: '11.9.3',
                minimum_supported_version: '11.9.3',
                store_url: 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1',
              },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await checkUpdatePolicy();
    expect(result.status).toBe('up_to_date');
  });

  it('returns update_available (optional) when current >= minimum but < latest', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(App.getInfo).mockResolvedValue({
      version: '11.9.0',
      build: '1190',
      name: 'BookMe',
      id: 'com.bookmebusiness.customerapp1',
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                latest_version: '11.9.3',
                minimum_supported_version: '11.8.0',
                store_url: 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1',
              },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await checkUpdatePolicy();
    expect(result.status).toBe('update_available');
    expect(result.storeUrl).toBe('https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1');
  });

  it('returns update_required (mandatory) when current < minimum', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(App.getInfo).mockResolvedValue({
      version: '10.5.0',
      build: '1050',
      name: 'BookMe',
      id: 'com.bookmebusiness.customerapp1',
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                latest_version: '11.9.3',
                minimum_supported_version: '11.0.0',
                store_url: 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1',
              },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await checkUpdatePolicy();
    expect(result.status).toBe('update_required');
    expect(result.storeUrl).toBe('https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1');
  });

  it('fails open (returns check_failed) on database or network error', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(App.getInfo).mockResolvedValue({
      version: '11.9.3',
      build: '1193',
      name: 'BookMe',
      id: 'com.bookmebusiness.customerapp1',
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: null,
              error: { message: 'Network timeout', code: 'PGRST000' },
            }),
          }),
        }),
      }),
    } as any);

    const result = await checkUpdatePolicy();
    expect(result.status).toBe('check_failed');
  });

  it('fails open (returns check_failed) if backend version config is malformed', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(App.getInfo).mockResolvedValue({
      version: '11.9.3',
      build: '1193',
      name: 'BookMe',
      id: 'com.bookmebusiness.customerapp1',
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                latest_version: 'corrupted-backend-version',
                minimum_supported_version: '11.0.0',
                store_url: 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1',
              },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await checkUpdatePolicy();
    expect(result.status).toBe('check_failed');
  });
});
