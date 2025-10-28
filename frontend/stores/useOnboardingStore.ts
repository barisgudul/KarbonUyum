// frontend/stores/useOnboardingStore.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type OnboardingStep = 
  | 'welcome'
  | 'industry_selection' 
  | 'company_details'
  | 'simulation_review' 
  | 'wizard_start'
  | 'completed';

export interface IndustryTemplate {
  id: number;
  industry_name: string;
  industry_type: 'manufacturing' | 'services' | 'retail' | 'other';
  description: string;
  typical_electricity_kwh_per_employee: number;
  typical_gas_m3_per_employee: number;
  typical_fuel_liters_per_vehicle: number;
  icon?: string;
}

interface OnboardingData {
  selectedIndustry: IndustryTemplate | null;
  employeeCount: number;
  vehicleCount: number;
  facilityName: string;
  facilityCity: string;
  companyId: number | null;
  facilityId: number | null;
  simulatedDataCount: number;
}

interface OnboardingStore {
  // State
  currentStep: OnboardingStep;
  data: OnboardingData;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  
  // Data setters
  selectIndustry: (industry: IndustryTemplate) => void;
  setCompanyDetails: (details: Partial<OnboardingData>) => void;
  setOnboardingResult: (result: { companyId: number; facilityId: number; simulatedDataCount: number }) => void;
  
  // Utils
  reset: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'industry_selection',
  'company_details',
  'simulation_review',
  'wizard_start',
  'completed'
];

const initialData: OnboardingData = {
  selectedIndustry: null,
  employeeCount: 10,
  vehicleCount: 2,
  facilityName: 'Ana Tesis',
  facilityCity: 'İstanbul',
  companyId: null,
  facilityId: null,
  simulatedDataCount: 0
};

export const useOnboardingStore = create<OnboardingStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentStep: 'welcome',
        data: initialData,
        isLoading: false,
        error: null,
        
        // Step navigation
        setStep: (step) => set({ currentStep: step }),
        
        nextStep: () => {
          const { currentStep } = get();
          const currentIndex = STEP_ORDER.indexOf(currentStep);
          if (currentIndex < STEP_ORDER.length - 1) {
            set({ currentStep: STEP_ORDER[currentIndex + 1] });
          }
        },
        
        previousStep: () => {
          const { currentStep } = get();
          const currentIndex = STEP_ORDER.indexOf(currentStep);
          if (currentIndex > 0) {
            set({ currentStep: STEP_ORDER[currentIndex - 1] });
          }
        },
        
        // Data management
        selectIndustry: (industry) => 
          set(state => ({
            data: { ...state.data, selectedIndustry: industry }
          })),
        
        setCompanyDetails: (details) =>
          set(state => ({
            data: { ...state.data, ...details }
          })),
        
        setOnboardingResult: (result) =>
          set(state => ({
            data: { 
              ...state.data, 
              companyId: result.companyId,
              facilityId: result.facilityId,
              simulatedDataCount: result.simulatedDataCount
            }
          })),
        
        // Utils
        reset: () => set({
          currentStep: 'welcome',
          data: initialData,
          isLoading: false,
          error: null
        }),
        
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error })
      }),
      {
        name: 'onboarding-storage',
        partialize: (state) => ({
          currentStep: state.currentStep,
          data: state.data
        })
      }
    )
  )
);

// Selector hooks for common use cases
export const useOnboardingStep = () => useOnboardingStore(state => state.currentStep);
export const useOnboardingData = () => useOnboardingStore(state => state.data);
export const useOnboardingProgress = () => {
  const currentStep = useOnboardingStore(state => state.currentStep);
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  return {
    current: currentIndex + 1,
    total: STEP_ORDER.length,
    percentage: ((currentIndex + 1) / STEP_ORDER.length) * 100
  };
};

// Industry templates (Türkiye piyasası için)
export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 1,
    industry_name: 'Tekstil ve Konfeksiyon',
    industry_type: 'manufacturing',
    description: 'Tekstil üretim, dokuma ve konfeksiyon tesisleri',
    typical_electricity_kwh_per_employee: 8500,
    typical_gas_m3_per_employee: 1200,
    typical_fuel_liters_per_vehicle: 2500,
    icon: '🧵'
  },
  {
    id: 2,
    industry_name: 'Metal İşleme',
    industry_type: 'manufacturing',
    description: 'Metal işleme, döküm ve kaynak atölyeleri',
    typical_electricity_kwh_per_employee: 12000,
    typical_gas_m3_per_employee: 1800,
    typical_fuel_liters_per_vehicle: 3000,
    icon: '⚙️'
  },
  {
    id: 3,
    industry_name: 'Gıda ve İçecek',
    industry_type: 'manufacturing',
    description: 'Gıda üretim, işleme ve paketleme tesisleri',
    typical_electricity_kwh_per_employee: 6500,
    typical_gas_m3_per_employee: 900,
    typical_fuel_liters_per_vehicle: 2000,
    icon: '🍞'
  },
  {
    id: 4,
    industry_name: 'Plastik ve Kauçuk',
    industry_type: 'manufacturing',
    description: 'Plastik enjeksiyon ve ekstrüzyon tesisleri',
    typical_electricity_kwh_per_employee: 10000,
    typical_gas_m3_per_employee: 1500,
    typical_fuel_liters_per_vehicle: 2800,
    icon: '🔧'
  },
  {
    id: 5,
    industry_name: 'Kimya ve İlaç',
    industry_type: 'manufacturing',
    description: 'Kimyasal üretim ve ilaç tesisleri',
    typical_electricity_kwh_per_employee: 15000,
    typical_gas_m3_per_employee: 2200,
    typical_fuel_liters_per_vehicle: 3500,
    icon: '⚗️'
  },
  {
    id: 6,
    industry_name: 'Yazılım ve BT',
    industry_type: 'services',
    description: 'Yazılım geliştirme ve bilişim hizmetleri',
    typical_electricity_kwh_per_employee: 2500,
    typical_gas_m3_per_employee: 300,
    typical_fuel_liters_per_vehicle: 800,
    icon: '💻'
  },
  {
    id: 7,
    industry_name: 'Lojistik ve Depolama',
    industry_type: 'services',
    description: 'Kargo, nakliye ve depolama hizmetleri',
    typical_electricity_kwh_per_employee: 3500,
    typical_gas_m3_per_employee: 500,
    typical_fuel_liters_per_vehicle: 5000,
    icon: '📦'
  },
  {
    id: 8,
    industry_name: 'Perakende Mağaza',
    industry_type: 'retail',
    description: 'Perakende satış mağazaları ve zincirler',
    typical_electricity_kwh_per_employee: 4000,
    typical_gas_m3_per_employee: 600,
    typical_fuel_liters_per_vehicle: 1500,
    icon: '🛍️'
  },
  {
    id: 9,
    industry_name: 'E-ticaret',
    industry_type: 'retail',
    description: 'Online satış ve e-ticaret işletmeleri',
    typical_electricity_kwh_per_employee: 2000,
    typical_gas_m3_per_employee: 250,
    typical_fuel_liters_per_vehicle: 3000,
    icon: '🛒'
  },
  {
    id: 10,
    industry_name: 'Otel ve Konaklama',
    industry_type: 'services',
    description: 'Otel, pansiyon ve konaklama tesisleri',
    typical_electricity_kwh_per_employee: 5500,
    typical_gas_m3_per_employee: 800,
    typical_fuel_liters_per_vehicle: 1800,
    icon: '🏨'
  },
  {
    id: 11,
    industry_name: 'Sağlık Hizmetleri',
    industry_type: 'services',
    description: 'Hastane, klinik ve sağlık merkezleri',
    typical_electricity_kwh_per_employee: 7000,
    typical_gas_m3_per_employee: 1000,
    typical_fuel_liters_per_vehicle: 2200,
    icon: '🏥'
  },
  {
    id: 12,
    industry_name: 'Eğitim Kurumları',
    industry_type: 'services',
    description: 'Özel okul ve eğitim kurumları',
    typical_electricity_kwh_per_employee: 3000,
    typical_gas_m3_per_employee: 450,
    typical_fuel_liters_per_vehicle: 1200,
    icon: '🎓'
  },
  {
    id: 13,
    industry_name: 'İnşaat ve Yapı',
    industry_type: 'other',
    description: 'İnşaat şirketleri ve müteahhitler',
    typical_electricity_kwh_per_employee: 2800,
    typical_gas_m3_per_employee: 400,
    typical_fuel_liters_per_vehicle: 4500,
    icon: '🏗️'
  },
  {
    id: 14,
    industry_name: 'Tarım ve Hayvancılık',
    industry_type: 'other',
    description: 'Tarımsal üretim ve hayvancılık işletmeleri',
    typical_electricity_kwh_per_employee: 4500,
    typical_gas_m3_per_employee: 200,
    typical_fuel_liters_per_vehicle: 3800,
    icon: '🌾'
  },
  {
    id: 15,
    industry_name: 'Otomotiv Yan Sanayi',
    industry_type: 'manufacturing',
    description: 'Otomotiv parça üreticileri',
    typical_electricity_kwh_per_employee: 9000,
    typical_gas_m3_per_employee: 1400,
    typical_fuel_liters_per_vehicle: 2600,
    icon: '🚗'
  }
];
