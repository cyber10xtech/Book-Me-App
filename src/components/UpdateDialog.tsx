import React, { useEffect, useState, useRef, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { checkUpdatePolicy, UpdateCheckResult } from '@/services/updateService';

/**
 * Handles opening the backend-controlled store URL via native Capacitor platform handler,
 * preventing any attempt to render the store web page inside the WebView.
 */
export async function openStoreUrl(storeUrl?: string): Promise<boolean> {
  if (!storeUrl) return false;

  try {
    if (Capacitor.isNativePlatform()) {
      await CapApp.openUrl({ url: storeUrl });
      return true;
    } else {
      window.open(storeUrl, '_blank', 'noopener,noreferrer');
      return true;
    }
  } catch (err) {
    console.error('[UpdateDialog] Native openUrl failed, falling back to window.open:', err);
    try {
      window.open(storeUrl, '_system');
      return true;
    } catch (fallbackErr) {
      console.error('[UpdateDialog] Fallback store redirection failed:', fallbackErr);
      return false;
    }
  }
}

export const UpdateDialog: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const isCheckingRef = useRef(false);

  const evaluatePolicy = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const info = await checkUpdatePolicy();
      if (info.status === 'update_available' || info.status === 'update_required') {
        setUpdateInfo(info);
        setIsOpen(true);
      } else if (info.status === 'up_to_date') {
        // Automatically dismiss optional update if user updated or policy relaxed
        setIsOpen(false);
        setUpdateInfo(null);
      }
    } catch (err) {
      console.error('[UpdateDialog] Error during policy evaluation:', err);
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  // Initial non-blocking check on mount and app foreground re-check
  useEffect(() => {
    let isMounted = true;
    let appStateHandle: { remove: () => Promise<void> | void } | null = null;

    evaluatePolicy();

    if (Capacitor.isNativePlatform()) {
      (async () => {
        try {
          const handle = await CapApp.addListener('appStateChange', ({ isActive }) => {
            if (isActive && isMounted) {
              evaluatePolicy();
            }
          });
          if (isMounted) {
            appStateHandle = handle;
          } else if (handle && typeof handle.remove === 'function') {
            handle.remove();
          }
        } catch (err) {
          console.warn('[UpdateDialog] Failed to register appStateChange listener:', err);
        }
      })();
    }

    return () => {
      isMounted = false;
      if (appStateHandle && typeof appStateHandle.remove === 'function') {
        try {
          appStateHandle.remove();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [evaluatePolicy]);

  const isRequired = updateInfo?.status === 'update_required';

  // Lock Android hardware / gesture back button during mandatory update
  useEffect(() => {
    if (!isRequired || !isOpen || !Capacitor.isNativePlatform()) return;

    let isMounted = true;
    let backButtonHandle: { remove: () => Promise<void> | void } | null = null;

    (async () => {
      try {
        const handle = await CapApp.addListener('backButton', () => {
          // Intentionally intercept and consume back button to prevent dismissing mandatory update lock
        });
        if (isMounted) {
          backButtonHandle = handle;
        } else if (handle && typeof handle.remove === 'function') {
          handle.remove();
        }
      } catch (err) {
        console.warn('[UpdateDialog] Failed to attach backButton lock listener:', err);
      }
    })();

    return () => {
      isMounted = false;
      if (backButtonHandle && typeof backButtonHandle.remove === 'function') {
        try {
          backButtonHandle.remove();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [isRequired, isOpen]);

  if (!updateInfo || !isOpen) return null;

  const handleUpdate = () => {
    openStoreUrl(updateInfo.storeUrl);
  };

  const handleClose = () => {
    if (!isRequired) {
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent
        onEscapeKeyDown={(e) => {
          if (isRequired) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isRequired) e.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isRequired ? 'Update Required' : 'Update Available'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isRequired
              ? 'Your version of BookMe is no longer supported. Please update to continue.'
              : 'A newer version of BookMe is available.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!isRequired && (
            <AlertDialogCancel onClick={handleClose}>Later</AlertDialogCancel>
          )}
          <AlertDialogAction onClick={handleUpdate}>
            {isRequired ? 'Update BookMe' : 'Update Now'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
