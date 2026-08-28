import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../integrations/supabase/client';

export type UpdateStatus = 'up_to_date' | 'update_available' | 'update_required' | 'check_failed';

export interface UpdateCheckResult {
  status: UpdateStatus;
  storeUrl?: string;
}

export async function checkUpdatePolicy(): Promise<UpdateCheckResult> {
  if (!Capacitor.isNativePlatform()) {
    return { status: 'up_to_date' };
  }

  try {
    const info = await App.getInfo();
    const currentVersion = info.version;
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
    const app = 'customer';

    const { data, error } = await supabase
      .from('app_update_config')
      .select('*')
      .eq('app', app)
      .eq('platform', platform)
      .single();

    if (error || !data) {
      console.error('Update check failed, failing open', error);
      return { status: 'check_failed' };
    }

    const { latest_version, minimum_supported_version, store_url } = data;

    const isRequired = compareVersions(currentVersion, minimum_supported_version) < 0;
    if (isRequired) {
      return { status: 'update_required', storeUrl: store_url };
    }

    const isAvailable = compareVersions(currentVersion, latest_version) < 0;
    if (isAvailable) {
      return { status: 'update_available', storeUrl: store_url };
    }

    return { status: 'up_to_date' };
  } catch (err) {
    console.error('Unexpected error checking update', err);
    return { status: 'check_failed' };
  }
}

export function compareVersions(v1: string, v2: string): number {
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}
