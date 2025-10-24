// frontend/types/index.ts
/**
 * Centralized type definitions for KarbonUyum Frontend
 * Type safety across all components and hooks
 */

// ==================== Dialog Types ====================

/**
 * Dialog'lar için kesin tip güvenliği.
 * Her dialog ne tür veri beklediğini tanımlıyoruz.
 */

export interface Company {
  id: number;
  name: string;
  industry_type?: string;
  tax_number?: string;
  facilities?: Facility[];
  members?: CompanyMember[];
  financials?: CompanyFinancial;
}

export interface Facility {
  id: number;
  name: string;
  facility_type?: string;
  address?: string;
  region?: string;
  activity_data?: ActivityData[];
}

export interface ActivityData {
  id: number;
  activity_type: string;
  quantity: number;
  unit: string;
  co2e_emissions?: number;
  start_date?: string;
  created_at?: string;
}

export interface CompanyMember {
  id: number;
  email: string;
  role: string;
}

export interface CompanyFinancial {
  id: number;
  revenue?: number;
  employees?: number;
  year?: number;
}

// ==================== UI Dialog Types ====================

export type DialogName = 
  | 'newCompany' 
  | 'editCompany' 
  | 'newFacility' 
  | 'addActivity' 
  | 'uploadCSV';

export interface DialogPayloads {
  newCompany: {};
  editCompany: { companyData: Company };
  newFacility: { companyId: number };
  addActivity: { facilityId: number; companyId: number };
  uploadCSV: { facilityId: number };
}

export interface UIState {
  activeDialog: { name: DialogName; data: DialogPayloads[DialogName] } | null;
}

// ==================== API Response Types ====================

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status?: number;
}

export interface CSVUploadResponse {
  successful_rows: number;
  failed_rows: number;
  errors?: Array<{ row: number; message: string }>;
}

export interface HealthCheckResponse {
  status: string;
  message: string;
}

// ==================== Form Types ====================

export interface CompanyFormData {
  name: string;
  industry_type?: string;
  tax_number?: string;
}

export interface FacilityFormData {
  name: string;
  facility_type?: string;
  address?: string;
  region?: string;
}

export interface ActivityDataFormData {
  activity_type: string;
  quantity: number;
  unit: string;
  start_date?: string;
}

// ==================== Hook Return Types ====================

export interface MutationContext {
  previousData: any;
  optimisticContext: any;
}

export interface OptimisticUpdateResult {
  newData: any;
  context: any;
}
