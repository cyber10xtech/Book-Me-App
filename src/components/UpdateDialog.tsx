import React, { useEffect, useState } from 'react';
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

export const UpdateDialog: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchUpdateInfo = async () => {
      const info = await checkUpdatePolicy();
      if (info.status === 'update_available' || info.status === 'update_required') {
        setUpdateInfo(info);
        setIsOpen(true);
      }
    };
    fetchUpdateInfo();
  }, []);

  if (!updateInfo || !isOpen) return null;

  const isRequired = updateInfo.status === 'update_required';

  const handleUpdate = () => {
    if (updateInfo.storeUrl) {
      window.location.href = updateInfo.storeUrl;
    }
  };

  const handleClose = () => {
    if (!isRequired) {
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
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
