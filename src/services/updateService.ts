import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../integrations/supabase/client';

export type UpdateStatus = 'up_to_date' | 'update_available' | 'update_required' | 'check_failed';

export interface UpdateCheckResult {
  status: UpdateStatus;
  currentVersion?: string;
  latestVersion?: string;
  minimumSupportedVersion?: string;
  storeUrl?: string;
}

/**
 * Validates whether a version string matches standard dot-separated integer format.
 * Format accepted: X.Y, X.Y.Z, X.Y.Z.W (e.g. "1.3", "11.8.1", "10.0.0").
 * Optional leading "v" or "V" is permitted and stripped.
 */
export function isValidVersionString(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const clean = v.trim().replace(/^v/i, '');
  if (!clean) return false;
  const parts = clean.split('.');
  return parts.length > 0 && parts.every((part) => /^\d+$/.test(part));
}

/**
 * Parses a valid version string into an array of integers.
 * Returns null if the version string is malformed or invalid.
 */
export function parseVersion(v: unknown): number[] | null {
  if (!isValidVersionString(v)) return null;
  const clean = v.trim().replace(/^v/i, '');
  return clean.split('.').map((p) => parseInt(p, 10));
}

/**
 * Deterministic semantic-style version comparison.
 * Returns:
 *   1  if v1 > v2
 *  -1  if v1 < v2
 *   0  if v1 === v2
 *  null if either version string is invalid/malformed.
 *
 * Trailing zeros are treated as equivalent (e.g. 1.0 === 1.0.0).
 */
export function compareVersions(v1: unknown, v2: unknown): number | null {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);

  if (!p1 || !p2) {
    return null;
  }

  const maxLength = Math.max(p1.length, p2.length);
  for (let i = 0; i < maxLength; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Queries the remote Supabase `app_update_config` table and compares the
 * current native application version against the backend policy.
 *
 * Always fails open with { status: 'check_failed' } on error or invalid config.
 */
export async function checkUpdatePolicy(): Promise<UpdateCheckResult> {
  if (!Capacitor.isNativePlatform()) {
    return { status: 'up_to_date' };
  }

  try {
    const info = await App.getInfo();
    const currentVersion = info.version;
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
    const app = 'customer';

    if (!isValidVersionString(currentVersion)) {
      console.warn('[UpdateService] Client native version is not a valid format:', currentVersion);
      return { status: 'check_failed', currentVersion };
    }

    const { data: dbData, error } = await supabase
      .from('app_update_config')
      .select('*')
      .eq('app', app)
      .eq('platform', platform)
      .single();

    const data = dbData || {
      latest_version: '12.0.0',
      minimum_supported_version: '11.9.5',
      store_url: platform === 'ios'
        ? 'https://apps.apple.com/us/app/bookme-book-a-service/id6782405521'
        : 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1'
    };

    if (error && !dbData) {
      console.error('[UpdateService] Update check query failed, failing open:', error);
      return { status: 'check_failed', currentVersion };
    }

    const { latest_version, minimum_supported_version, store_url } = data;

    // Validate backend configuration before comparing
    if (!isValidVersionString(latest_version) || !isValidVersionString(minimum_supported_version)) {
      console.error('[UpdateService] Backend version config is malformed, failing open:', {
        latest_version,
        minimum_supported_version,
      });
      return { status: 'check_failed', currentVersion };
    }

    const cmpMin = compareVersions(currentVersion, minimum_supported_version);
    const cmpLatest = compareVersions(currentVersion, latest_version);

    if (cmpMin === null || cmpLatest === null) {
      console.error('[UpdateService] Version comparison failed unexpectedly, failing open');
      return { status: 'check_failed', currentVersion };
    }

    if (cmpMin < 0) {
      return {
        status: 'update_required',
        currentVersion,
        latestVersion: latest_version,
        minimumSupportedVersion: minimum_supported_version,
        storeUrl: store_url,
      };
    }

    if (cmpLatest < 0) {
      return {
        status: 'update_available',
        currentVersion,
        latestVersion: latest_version,
        minimumSupportedVersion: minimum_supported_version,
        storeUrl: store_url,
      };
    }

    return {
      status: 'up_to_date',
      currentVersion,
      latestVersion: latest_version,
      minimumSupportedVersion: minimum_supported_version,
    };
  } catch (err) {
    console.error('[UpdateService] Unexpected error checking update, failing open:', err);
    return { status: 'check_failed' };
  }
}
