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
    addListener: vi.fn().mockImplementation(() => Promise.resolve({ remove: vi.fn() })),
    openUrl: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Customer Version Comparison & Parsing', () => {
  describe('isValidVersionString', () => {
    it('accepts standard semver and dot-separated integers', () => {
      expect(isValidVersionString('1.3')).toBe(true);
      expect(isValidVersionString('1.3.0')).toBe(true);
      expect(isValidVersionString('11.9.4')).toBe(true);
      expect(isValidVersionString('12.0.0')).toBe(true);
    });

    it('accepts versions with leading v or V prefix', () => {
      expect(isValidVersionString('v11.9.4')).toBe(true);
      expect(isValidVersionString('V12.0.0')).toBe(true);
    });

    it('rejects invalid or malformed strings', () => {
      expect(isValidVersionString('')).toBe(false);
      expect(isValidVersionString('invalid')).toBe(false);
      expect(isValidVersionString(null)).toBe(false);
    });
  });

  describe('parseVersion', () => {
    it('parses dot separated numbers into integer array', () => {
      expect(parseVersion('11.9.4')).toEqual([11, 9, 4]);
      expect(parseVersion('12.0.0')).toEqual([12, 0, 0]);
    });
  });

  describe('compareVersions', () => {
    it('handles 11.9.4 < 12.0.0 correctly', () => {
      expect(compareVersions('11.9.4', '12.0.0')).toBe(-1);
    });

    it('handles 12.0.0 = 12.0.0 correctly', () => {
      expect(compareVersions('12.0.0', '12.0.0')).toBe(0);
    });
  });
});

describe('Customer Update Policy Evaluation (checkUpdatePolicy)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns up_to_date immediately if running in web platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

    const result = await checkUpdatePolicy();
    expect(result).toEqual({ status: 'up_to_date' });
  });

  it('returns update_required when client version (11.9.4) is lower than minimum (11.9.5)', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(App.getInfo).mockResolvedValue({
      version: '11.9.4',
      build: '1194',
      name: 'BookMe Customer',
      id: 'com.bookmebusiness.customerapp1',
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await checkUpdatePolicy();
    expect(result.status).toBe('update_required');
    expect(result.currentVersion).toBe('11.9.4');
    expect(result.latestVersion).toBe('12.0.0');
    expect(result.minimumSupportedVersion).toBe('11.9.5');
    expect(result.storeUrl).toBe('https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1');
  });

  it('returns update_available when client version (11.9.5) equals minimum but is below latest (12.0.0)', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(App.getInfo).mockResolvedValue({
      version: '11.9.5',
      build: '1195',
      name: 'BookMe Customer',
      id: 'com.bookmebusiness.customerapp1',
    });

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const result = await checkUpdatePolicy();
    expect(result.status).toBe('update_available');
    expect(result.currentVersion).toBe('11.9.5');
    expect(result.minimumSupportedVersion).toBe('11.9.5');
  });
});
