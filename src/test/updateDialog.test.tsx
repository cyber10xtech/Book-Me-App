import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { UpdateDialog, openStoreUrl } from '../components/UpdateDialog';
import * as updateService from '../services/updateService';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: vi.fn(),
    addListener: vi.fn().mockImplementation(() => Promise.resolve({ remove: vi.fn() })),
    openUrl: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('openStoreUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(CapApp.addListener).mockImplementation(() => Promise.resolve({ remove: vi.fn() }));
    vi.mocked(CapApp.openUrl).mockResolvedValue(undefined);
  });

  it('returns false if storeUrl is empty or undefined', async () => {
    expect(await openStoreUrl('')).toBe(false);
    expect(await openStoreUrl(undefined)).toBe(false);
  });

  it('delegates to CapApp.openUrl on native platform without embedding in WebView', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const openUrlSpy = vi.mocked(CapApp.openUrl).mockResolvedValue(undefined);

    const testUrl = 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1';
    const result = await openStoreUrl(testUrl);

    expect(result).toBe(true);
    expect(openUrlSpy).toHaveBeenCalledWith({ url: testUrl });
  });

  it('falls back to window.open on web platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    const testUrl = 'https://apps.apple.com/us/app/bookme-book-a-service/id6782405521';
    const result = await openStoreUrl(testUrl);

    expect(result).toBe(true);
    expect(windowOpenSpy).toHaveBeenCalledWith(testUrl, '_blank', 'noopener,noreferrer');
  });

  it('falls back gracefully to window.open(_system) if native openUrl throws', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.mocked(CapApp.openUrl).mockRejectedValue(new Error('ActivityNotFound'));
    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    const testUrl = 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1';
    const result = await openStoreUrl(testUrl);

    expect(result).toBe(true);
    expect(windowOpenSpy).toHaveBeenCalledWith(testUrl, '_system');
  });
});

describe('UpdateDialog Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(CapApp.addListener).mockImplementation(() => Promise.resolve({ remove: vi.fn() }));
    vi.mocked(CapApp.openUrl).mockResolvedValue(undefined);
  });

  it('renders nothing when status is up_to_date', async () => {
    vi.spyOn(updateService, 'checkUpdatePolicy').mockResolvedValue({
      status: 'up_to_date',
    });

    const { container } = render(<UpdateDialog />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders nothing when status is check_failed (fail-open)', async () => {
    vi.spyOn(updateService, 'checkUpdatePolicy').mockResolvedValue({
      status: 'check_failed',
    });

    const { container } = render(<UpdateDialog />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders optional update dialog with Later and Update Now buttons', async () => {
    vi.spyOn(updateService, 'checkUpdatePolicy').mockResolvedValue({
      status: 'update_available',
      storeUrl: 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1',
    });

    render(<UpdateDialog />);

    await waitFor(() => {
      expect(screen.getByText('Update Available')).toBeDefined();
      expect(screen.getByText('A newer version of BookMe is available.')).toBeDefined();
      expect(screen.getByText('Later')).toBeDefined();
      expect(screen.getByText('Update Now')).toBeDefined();
    });

    // Dismiss by clicking Later
    fireEvent.click(screen.getByText('Later'));
    await waitFor(() => {
      expect(screen.queryByText('Update Available')).toBeNull();
    });
  });

  it('renders mandatory update dialog without Later button and with Update BookMe button', async () => {
    vi.spyOn(updateService, 'checkUpdatePolicy').mockResolvedValue({
      status: 'update_required',
      storeUrl: 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1',
    });

    render(<UpdateDialog />);

    await waitFor(() => {
      expect(screen.getByText('Update Required')).toBeDefined();
      expect(screen.getByText('Your version of BookMe is no longer supported. Please update to continue.')).toBeDefined();
      expect(screen.queryByText('Later')).toBeNull();
      expect(screen.getByText('Update BookMe')).toBeDefined();
    });
  });

  it('triggers store redirection when update button is tapped', async () => {
    const storeUrl = 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1';
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const openUrlSpy = vi.mocked(CapApp.openUrl).mockResolvedValue(undefined);

    vi.spyOn(updateService, 'checkUpdatePolicy').mockResolvedValue({
      status: 'update_required',
      storeUrl,
    });

    render(<UpdateDialog />);

    await waitFor(() => {
      expect(screen.getByText('Update BookMe')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Update BookMe'));
    expect(openUrlSpy).toHaveBeenCalledWith({ url: storeUrl });
  });

  it('attaches appStateChange and backButton listeners on native platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const addListenerSpy = vi.mocked(CapApp.addListener);

    vi.spyOn(updateService, 'checkUpdatePolicy').mockResolvedValue({
      status: 'update_required',
      storeUrl: 'https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1',
    });

    render(<UpdateDialog />);

    await waitFor(() => {
      expect(addListenerSpy).toHaveBeenCalledWith('appStateChange', expect.any(Function));
      expect(addListenerSpy).toHaveBeenCalledWith('backButton', expect.any(Function));
    });
  });
});
