// frontend/components/ConfirmDialog.js
'use client';

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

/**
 * Reusable confirmation dialog component
 * Replaces window.confirm() with a styled AlertDialog
 * 
 * @param {Object} props
 * @param {boolean} props.open - Dialog açık mı
 * @param {function} props.onOpenChange - Dialog state setter
 * @param {function} props.onConfirm - Onayla butonuna tıklandığında
 * @param {string} props.title - Dialog başlığı
 * @param {string} props.description - Dialog açıklaması
 * @param {string} props.confirmText - Onayla butonu metni (default: "Onayla")
 * @param {string} props.cancelText - İptal butonu metni (default: "İptal")
 * @param {boolean} props.isLoading - İşlem devam ediyor mu (disabled state)
 * @param {string} props.variant - Confirm butonu variant (default: "default", "destructive" için silme)
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  isLoading = false,
  variant = 'default',
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={
              variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : ''
            }
          >
            {isLoading ? 'İşleniyor...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
