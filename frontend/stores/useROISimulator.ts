// frontend/stores/useROISimulator.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface ROISimulatorState {
  // Parameters
  solarKwp: number;
  electricityPriceIncrease: number;
  ledSavingsRate: number;
  
  // Data
  baseAnalysis: any | null;
  simulations: Record<string, any>;
  paybackTimeline: any[];
  charts: any;
  sliderRanges: Record<string, any>;
  
  // Loading & Errors
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setSolarKwp: (value: number) => void;
  setElectricityPriceIncrease: (value: number) => void;
  setLedSavingsRate: (value: number) => void;
  fetchROISimulation: (companyId: number) => Promise<void>;
  resetSimulation: () => void;
}

const initialState = {
  solarKwp: 100,
  electricityPriceIncrease: 0.10,
  ledSavingsRate: 0.60,
  baseAnalysis: null,
  simulations: {},
  paybackTimeline: [],
  charts: {},
  sliderRanges: {},
  isLoading: false,
  error: null,
};

export const useROISimulator = create<ROISimulatorState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    setSolarKwp: (value: number) => {
      set({ solarKwp: value });
      // Auto-fetch ROI simulator with new value
      const companyId = (window as any).__companyId;
      if (companyId) {
        get().fetchROISimulation(companyId);
      }
    },
    
    setElectricityPriceIncrease: (value: number) => {
      set({ electricityPriceIncrease: value });
      const companyId = (window as any).__companyId;
      if (companyId) {
        get().fetchROISimulation(companyId);
      }
    },
    
    setLedSavingsRate: (value: number) => {
      set({ ledSavingsRate: value });
      const companyId = (window as any).__companyId;
      if (companyId) {
        get().fetchROISimulation(companyId);
      }
    },
    
    fetchROISimulation: async (companyId: number) => {
      set({ isLoading: true, error: null });
      try {
        const state = get();
        const token = localStorage.getItem('token');
        
        const params = new URLSearchParams({
          solar_kwp: state.solarKwp.toString(),
          electricity_price_increase: state.electricityPriceIncrease.toString(),
          led_savings_rate: state.ledSavingsRate.toString(),
        });
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/roi-simulator?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          throw new Error('ROI simülasyonu yüklenemedi');
        }
        
        const data = await response.json();
        
        set({
          baseAnalysis: data.base_analysis,
          simulations: data.simulations,
          paybackTimeline: data.payback_timeline,
          charts: data.charts,
          sliderRanges: data.slider_ranges,
          isLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Bilinmeyen hata',
          isLoading: false,
        });
      }
    },
    
    resetSimulation: () => {
      set(initialState);
    },
  }))
);
