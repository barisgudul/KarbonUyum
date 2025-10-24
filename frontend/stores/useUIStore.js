// frontend/stores/useUIStore.js
import { create } from 'zustand';

/**
 * Global UI State Management Store
 * Merkezi olarak tüm dialog/modal durumlarını yönetir
 * 
 * activeDialog format:
 * {
 *   name: 'dialogName',           // Dialog'un adı
 *   data: { /* context data / }  // Dialog'a geçilecek veri
 * }
 * 
 * Kullanım:
 * const { openDialog, closeDialog } = useUIStore();
 * openDialog('editCompany', { companyId: 123 });
 * closeDialog();
 */
export const useUIStore = create((set, get) => ({
  // Dialog durumu
  activeDialog: null,

  /**
   * Dialog'u aç
   * @param {string} name - Dialog'un adı (editCompany, newFacility, vb.)
   * @param {object} data - Dialog'a geçilecek context veri
   */
  openDialog: (name, data = {}) => 
    set({ activeDialog: { name, data } }),

  /**
   * Dialog'u kapat
   */
  closeDialog: () => 
    set({ activeDialog: null }),

  /**
   * Etkin dialog'un adını kontrol et
   * @param {string} name - Kontrol edilecek dialog adı
   * @returns {boolean}
   */
  isDialogOpen: (name) => 
    get().activeDialog?.name === name,

  /**
   * Etkin dialog'un context verisini al
   * @returns {object}
   */
  getDialogData: () => 
    get().activeDialog?.data || {},
}));
