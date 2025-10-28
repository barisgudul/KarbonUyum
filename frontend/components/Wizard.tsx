// frontend/components/Wizard.tsx

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { 
  Zap, Flame, Truck, ChevronRight, ChevronLeft, 
  Check, FileText, TrendingUp, Award, AlertCircle,
  Calendar, Receipt, Calculator, Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WizardData {
  electricity: {
    consumption: number;
    cost: number;
    startDate: string;
    endDate: string;
  };
  gas: {
    consumption: number;
    cost: number;
    startDate: string;
    endDate: string;
  };
  fuel: {
    consumption: number;
    cost: number;
    startDate: string;
    endDate: string;
  };
}

interface WizardProps {
  companyId: number;
  facilityId: number;
  onComplete?: (data: WizardData) => void;
}

export default function Wizard({ companyId, facilityId, onComplete }: WizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<WizardData>({
    electricity: {
      consumption: 0,
      cost: 0,
      startDate: '',
      endDate: ''
    },
    gas: {
      consumption: 0,
      cost: 0,
      startDate: '',
      endDate: ''
    },
    fuel: {
      consumption: 0,
      cost: 0,
      startDate: '',
      endDate: ''
    }
  });
  
  const steps = [
    {
      id: 1,
      title: 'Elektrik Tüketimi',
      icon: Zap,
      color: 'yellow',
      description: 'Elektrik faturanızdan tüketim ve maliyet bilgilerini girin'
    },
    {
      id: 2,
      title: 'Doğalgaz Tüketimi',
      icon: Flame,
      color: 'blue',
      description: 'Doğalgaz faturanızdan tüketim ve maliyet bilgilerini girin'
    },
    {
      id: 3,
      title: 'Yakıt Tüketimi',
      icon: Truck,
      color: 'purple',
      description: 'Araç yakıt tüketimi ve maliyet bilgilerini girin'
    },
    {
      id: 4,
      title: 'Tamamlandı!',
      icon: Award,
      color: 'emerald',
      description: 'Verileriniz kaydedildi, raporunuz hazır!'
    }
  ];
  
  const currentStepData = steps[currentStep - 1];
  
  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // API çağrısı
      const token = localStorage.getItem('token');
      const dataItems = [];
      
      // Elektrik verisi
      if (formData.electricity.consumption > 0) {
        dataItems.push({
          activity_type: 'electricity',
          quantity: formData.electricity.consumption,
          cost: formData.electricity.cost,
          start_date: formData.electricity.startDate,
          end_date: formData.electricity.endDate
        });
      }
      
      // Doğalgaz verisi
      if (formData.gas.consumption > 0) {
        dataItems.push({
          activity_type: 'natural_gas',
          quantity: formData.gas.consumption,
          cost: formData.gas.cost,
          start_date: formData.gas.startDate,
          end_date: formData.gas.endDate
        });
      }
      
      // Yakıt verisi
      if (formData.fuel.consumption > 0) {
        dataItems.push({
          activity_type: 'diesel_fuel',
          quantity: formData.fuel.consumption,
          cost: formData.fuel.cost,
          start_date: formData.fuel.startDate,
          end_date: formData.fuel.endDate
        });
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wizard/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          company_id: companyId,
          facility_id: facilityId,
          data_items: dataItems,
          clear_simulation: true
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setCurrentStep(4);
        setShowConfetti(true);
        
        // 5 saniye sonra confetti'yi kapat
        setTimeout(() => setShowConfetti(false), 5000);
        
        if (onComplete) {
          onComplete(formData);
        }
        
        // 3 saniye sonra dashboard'a yönlendir
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        throw new Error('Veri gönderimi başarısız');
      }
    } catch (error) {
      console.error('Wizard submit error:', error);
      // Hata mesajı göster
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const updateFormData = (category: keyof WizardData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };
  
  // Step progress calculation
  const progressPercentage = ((currentStep - 1) / 3) * 100;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8 relative">
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          colors={['#10b981', '#06b6d4', '#a855f7', '#f59e0b']}
          numberOfPieces={300}
          recycle={false}
        />
      )}
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-white mb-4">
            Faturadan Rapora Sihirbazı
          </h1>
          <p className="text-xl text-emerald-200">
            Sadece 3 adımda karbon ayak izinizi hesaplayın
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {steps.slice(0, 3).map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg transition-all
                  ${currentStep > step.id 
                    ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-white shadow-lg shadow-emerald-500/30' 
                    : currentStep === step.id
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-xl shadow-emerald-500/50 animate-pulse'
                    : 'bg-slate-700 text-emerald-300/50'
                  }
                `}>
                  {currentStep > step.id ? <Check className="w-6 h-6" /> : step.id}
                </div>
                {index < 2 && (
                  <div className={`
                    h-1 w-24 mx-3 rounded-full transition-all
                    ${currentStep > step.id 
                      ? 'bg-gradient-to-r from-emerald-400 to-cyan-400' 
                      : 'bg-slate-700'
                    }
                  `} />
                )}
              </div>
            ))}
          </div>
          
          {/* Progress Labels */}
          <div className="flex justify-between">
            {steps.slice(0, 3).map((step) => (
              <div key={step.id} className="text-center">
                <p className={`
                  text-sm font-semibold transition-all
                  ${currentStep >= step.id ? 'text-emerald-300' : 'text-emerald-300/50'}
                `}>
                  {step.title}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <AnimatePresence mode="wait">
          {currentStep < 4 ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-slate-800/50 border-2 border-emerald-500/30 rounded-3xl p-8 backdrop-blur"
            >
              {/* Step Header */}
              <div className="flex items-center gap-4 mb-8">
                <div className={`
                  p-4 rounded-2xl
                  ${currentStep === 1 ? 'bg-yellow-500/20' : 
                    currentStep === 2 ? 'bg-blue-500/20' : 
                    'bg-purple-500/20'}
                `}>
                  <currentStepData.icon className={`
                    w-8 h-8
                    ${currentStep === 1 ? 'text-yellow-400' : 
                      currentStep === 2 ? 'text-blue-400' : 
                      'text-purple-400'}
                  `} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{currentStepData.title}</h2>
                  <p className="text-emerald-300/70">{currentStepData.description}</p>
                </div>
              </div>
              
              {/* Form Fields */}
              <div className="space-y-6">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-emerald-300 font-semibold mb-2">
                      <Calendar className="inline w-4 h-4 mr-2" />
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      value={
                        currentStep === 1 ? formData.electricity.startDate :
                        currentStep === 2 ? formData.gas.startDate :
                        formData.fuel.startDate
                      }
                      onChange={(e) => updateFormData(
                        currentStep === 1 ? 'electricity' : 
                        currentStep === 2 ? 'gas' : 'fuel',
                        'startDate',
                        e.target.value
                      )}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-emerald-500/30 rounded-xl text-white focus:outline-none focus:border-emerald-400 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-emerald-300 font-semibold mb-2">
                      <Calendar className="inline w-4 h-4 mr-2" />
                      Bitiş Tarihi
                    </label>
                    <input
                      type="date"
                      value={
                        currentStep === 1 ? formData.electricity.endDate :
                        currentStep === 2 ? formData.gas.endDate :
                        formData.fuel.endDate
                      }
                      onChange={(e) => updateFormData(
                        currentStep === 1 ? 'electricity' : 
                        currentStep === 2 ? 'gas' : 'fuel',
                        'endDate',
                        e.target.value
                      )}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-emerald-500/30 rounded-xl text-white focus:outline-none focus:border-emerald-400 transition-all"
                    />
                  </div>
                </div>
                
                {/* Consumption */}
                <div>
                  <label className="block text-emerald-300 font-semibold mb-2">
                    <Calculator className="inline w-4 h-4 mr-2" />
                    Tüketim Miktarı
                    <span className="text-emerald-400/70 ml-2 text-sm">
                      ({currentStep === 1 ? 'kWh' : currentStep === 2 ? 'm³' : 'Litre'})
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={
                      currentStep === 1 ? 'Örn: 5000' :
                      currentStep === 2 ? 'Örn: 800' :
                      'Örn: 500'
                    }
                    value={
                      currentStep === 1 ? formData.electricity.consumption || '' :
                      currentStep === 2 ? formData.gas.consumption || '' :
                      formData.fuel.consumption || ''
                    }
                    onChange={(e) => updateFormData(
                      currentStep === 1 ? 'electricity' : 
                      currentStep === 2 ? 'gas' : 'fuel',
                      'consumption',
                      parseFloat(e.target.value) || 0
                    )}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-emerald-500/30 rounded-xl text-white text-lg focus:outline-none focus:border-emerald-400 transition-all"
                  />
                </div>
                
                {/* Cost */}
                <div>
                  <label className="block text-emerald-300 font-semibold mb-2">
                    <Receipt className="inline w-4 h-4 mr-2" />
                    Fatura Tutarı (TL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Örn: 2500"
                    value={
                      currentStep === 1 ? formData.electricity.cost || '' :
                      currentStep === 2 ? formData.gas.cost || '' :
                      formData.fuel.cost || ''
                    }
                    onChange={(e) => updateFormData(
                      currentStep === 1 ? 'electricity' : 
                      currentStep === 2 ? 'gas' : 'fuel',
                      'cost',
                      parseFloat(e.target.value) || 0
                    )}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-emerald-500/30 rounded-xl text-white text-lg focus:outline-none focus:border-emerald-400 transition-all"
                  />
                </div>
                
                {/* Helper Text */}
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="text-emerald-300 text-sm font-semibold mb-1">İpucu</p>
                      <p className="text-emerald-200/70 text-sm">
                        {currentStep === 1 ? 
                          'Elektrik faturanızda "Aktif Tüketim" veya "Toplam Tüketim (kWh)" değerini arayın.' :
                          currentStep === 2 ?
                          'Doğalgaz faturanızda "Tüketim (m³)" veya "Sm³" değerini girin.' :
                          'Yakıt fişlerinizden toplam litre miktarını hesaplayın.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all
                    ${currentStep === 1
                      ? 'bg-slate-700/30 text-emerald-300/30 cursor-not-allowed'
                      : 'bg-slate-700/50 text-emerald-300 hover:bg-slate-700/70 border border-emerald-500/30'
                    }
                  `}
                >
                  <ChevronLeft className="w-5 h-5" />
                  Önceki
                </button>
                
                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="
                    flex items-center gap-2 px-8 py-3
                    bg-gradient-to-r from-emerald-500 to-cyan-500
                    hover:from-emerald-600 hover:to-cyan-600
                    text-white font-semibold rounded-xl
                    shadow-lg hover:shadow-emerald-500/50
                    transition-all transform hover:scale-105 active:scale-95
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {currentStep === 3 ? (
                    isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        Tamamla
                        <Sparkles className="w-5 h-5" />
                      </>
                    )
                  ) : (
                    <>
                      Sonraki
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            /* Success Screen */
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full mb-8 shadow-2xl shadow-emerald-500/50"
              >
                <Award className="w-16 h-16 text-white" />
              </motion.div>
              
              <h2 className="text-5xl font-black text-white mb-4">
                Tebrikler! 🎉
              </h2>
              
              <p className="text-2xl text-emerald-200 mb-8">
                Verileriniz başarıyla kaydedildi ve raporunuz hazır!
              </p>
              
              <div className="inline-block p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mb-8">
                <p className="text-emerald-300 font-semibold mb-2">Hesaplanan Değerler:</p>
                <div className="grid grid-cols-3 gap-6 text-left">
                  <div>
                    <p className="text-emerald-400/70 text-sm">Elektrik</p>
                    <p className="text-white font-bold">{formData.electricity.consumption} kWh</p>
                  </div>
                  <div>
                    <p className="text-emerald-400/70 text-sm">Doğalgaz</p>
                    <p className="text-white font-bold">{formData.gas.consumption} m³</p>
                  </div>
                  <div>
                    <p className="text-emerald-400/70 text-sm">Yakıt</p>
                    <p className="text-white font-bold">{formData.fuel.consumption} L</p>
                  </div>
                </div>
              </div>
              
              <p className="text-emerald-300 text-lg animate-pulse">
                Dashboard&apos;a yönlendiriliyorsunuz...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
