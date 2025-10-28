# backend/services/roi_calculator_service.py

"""
ROI (Return on Investment) Hesaplama Servisi
KOBİ'lere somut TL bazlı tasarruf potansiyeli gösterir
"""

import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
import schemas

logger = logging.getLogger(__name__)


class ROICalculatorService:
    """
    ROI ve tasarruf potansiyeli hesaplama servisi
    Sektör benchmark'ları ile karşılaştırma yaparak
    somut TL değerleri üretir
    """
    
    # Enerji verimliliği iyileştirme potansiyelleri (%)
    IMPROVEMENT_POTENTIALS = {
        "lighting_upgrade": 0.30,  # LED dönüşümü
        "hvac_optimization": 0.25,  # HVAC optimizasyonu
        "insulation_improvement": 0.20,  # Yalıtım iyileştirmesi
        "solar_panel": 0.40,  # Güneş paneli kurulumu
        "energy_management": 0.15,  # Enerji yönetim sistemi
        "process_optimization": 0.18,  # Süreç optimizasyonu
    }
    
    # Yatırım maliyetleri (TL/kW veya TL/m²)
    INVESTMENT_COSTS = {
        "lighting_upgrade": 500,  # TL/kW
        "hvac_optimization": 1200,  # TL/kW
        "insulation_improvement": 150,  # TL/m²
        "solar_panel": 8000,  # TL/kWp
        "energy_management": 50000,  # Sabit maliyet
        "process_optimization": 100000,  # Ortalama maliyet
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_roi_potential(
        self,
        company_id: int,
        period_months: int = 12
    ) -> schemas.ROIAnalysisResponse:
        """
        Şirket için ROI potansiyelini hesapla
        
        Args:
            company_id: Şirket ID'si
            period_months: Analiz dönemi (ay)
        
        Returns:
            ROI analiz sonuçları
        """
        
        # Şirket ve finansal bilgileri al
        company = self.db.query(models.Company).filter(
            models.Company.id == company_id
        ).first()
        
        if not company:
            raise ValueError(f"Şirket bulunamadı: {company_id}")
        
        financials = self.db.query(models.CompanyFinancials).filter(
            models.CompanyFinancials.company_id == company_id
        ).first()
        
        # Mevcut tüketim ve maliyetleri hesapla
        current_consumption = self._calculate_current_consumption(company, period_months)
        current_costs = self._calculate_current_costs(current_consumption, financials)
        
        # Sektör benchmark'larını al
        benchmarks = self._get_industry_benchmarks(company.industry_type)
        
        # Tasarruf fırsatlarını hesapla
        savings_opportunities = self._identify_savings_opportunities(
            company, current_consumption, current_costs, benchmarks
        )
        
        # En iyi 3 fırsatı seç
        top_opportunities = sorted(
            savings_opportunities,
            key=lambda x: x["annual_savings_tl"],
            reverse=True
        )[:3]
        
        # Toplam potansiyel tasarrufu hesapla
        total_potential_savings = sum(opp["annual_savings_tl"] for opp in top_opportunities)
        total_investment_required = sum(opp["investment_tl"] for opp in top_opportunities)
        
        # Ortalama geri ödeme süresi
        avg_payback_months = (total_investment_required / total_potential_savings * 12) if total_potential_savings > 0 else 0
        
        return schemas.ROIAnalysisResponse(
            company_id=company_id,
            analysis_period_months=period_months,
            current_annual_cost_tl=current_costs["total"],
            potential_annual_savings_tl=total_potential_savings,
            savings_percentage=((total_potential_savings / current_costs["total"] * 100) if current_costs["total"] > 0 else 0),
            total_investment_required_tl=total_investment_required,
            payback_period_months=round(avg_payback_months, 1),
            top_opportunities=top_opportunities,
            benchmark_comparison=self._create_benchmark_comparison(
                current_consumption, benchmarks
            ),
            quick_wins=self._identify_quick_wins(savings_opportunities),
            message=self._generate_roi_message(total_potential_savings, avg_payback_months)
        )
    
    def calculate_specific_measure_roi(
        self,
        company_id: int,
        measure_type: str,
        custom_parameters: Optional[Dict] = None
    ) -> Dict:
        """
        Belirli bir enerji verimliliği önlemi için ROI hesapla
        
        Args:
            company_id: Şirket ID'si
            measure_type: Önlem tipi (lighting_upgrade, solar_panel vb.)
            custom_parameters: Özel parametreler
        
        Returns:
            Önlem bazlı ROI analizi
        """
        
        if measure_type not in self.IMPROVEMENT_POTENTIALS:
            raise ValueError(f"Geçersiz önlem tipi: {measure_type}")
        
        company = self.db.query(models.Company).filter(
            models.Company.id == company_id
        ).first()
        
        financials = self.db.query(models.CompanyFinancials).filter(
            models.CompanyFinancials.company_id == company_id
        ).first()
        
        # Mevcut tüketimi hesapla
        current_consumption = self._calculate_current_consumption(company, 12)
        
        # Önlem bazlı tasarruf hesapla
        if measure_type == "solar_panel":
            return self._calculate_solar_roi(
                company, current_consumption, financials, custom_parameters
            )
        elif measure_type == "lighting_upgrade":
            return self._calculate_lighting_roi(
                company, current_consumption, financials, custom_parameters
            )
        elif measure_type == "insulation_improvement":
            return self._calculate_insulation_roi(
                company, current_consumption, financials, custom_parameters
            )
        else:
            # Genel hesaplama
            improvement_rate = self.IMPROVEMENT_POTENTIALS[measure_type]
            
            # Elektrik tasarrufu
            electricity_savings_kwh = current_consumption["electricity_kwh"] * improvement_rate
            electricity_savings_tl = electricity_savings_kwh * (financials.avg_electricity_cost_kwh if financials else 4.5)
            
            # Yatırım maliyeti
            base_cost = self.INVESTMENT_COSTS[measure_type]
            if measure_type in ["lighting_upgrade", "hvac_optimization"]:
                # kW bazlı hesaplama
                peak_power_kw = current_consumption["electricity_kwh"] / (365 * 8)  # 8 saat/gün varsayım
                investment_cost = base_cost * peak_power_kw
            else:
                investment_cost = base_cost
            
            # Geri ödeme süresi
            payback_months = (investment_cost / electricity_savings_tl * 12) if electricity_savings_tl > 0 else 999
            
            # Net bugünkü değer (NPV) - 5 yıl, %15 iskonto oranı
            npv = self._calculate_npv(electricity_savings_tl, investment_cost, years=5, discount_rate=0.15)
            
            # İç verim oranı (IRR) - basitleştirilmiş
            irr = (electricity_savings_tl / investment_cost - 1) if investment_cost > 0 else 0
            
            return {
                "measure_type": measure_type,
                "measure_name": self._get_measure_name(measure_type),
                "annual_savings_kwh": electricity_savings_kwh,
                "annual_savings_tl": electricity_savings_tl,
                "investment_tl": investment_cost,
                "payback_months": round(payback_months, 1),
                "npv_5_years": round(npv, 0),
                "irr_percentage": round(irr * 100, 1),
                "co2_reduction_tons": electricity_savings_kwh * 0.42 / 1000,
                "implementation_difficulty": self._get_implementation_difficulty(measure_type)
            }
    
    def _calculate_current_consumption(
        self,
        company: models.Company,
        period_months: int
    ) -> Dict[str, float]:
        """
        Şirketin mevcut enerji tüketimini hesapla
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=period_months * 30)
        
        consumption = {
            "electricity_kwh": 0,
            "natural_gas_m3": 0,
            "diesel_liters": 0,
            "total_co2_tons": 0
        }
        
        for facility in company.facilities:
            activity_data = self.db.query(models.ActivityData).filter(
                models.ActivityData.facility_id == facility.id,
                models.ActivityData.start_date >= start_date,
                models.ActivityData.end_date <= end_date,
                models.ActivityData.is_simulation == False
            ).all()
            
            for data in activity_data:
                if data.activity_type == models.ActivityType.electricity:
                    consumption["electricity_kwh"] += data.quantity
                elif data.activity_type == models.ActivityType.natural_gas:
                    consumption["natural_gas_m3"] += data.quantity
                elif data.activity_type == models.ActivityType.diesel_fuel:
                    consumption["diesel_liters"] += data.quantity
                
                if data.calculated_co2e_kg:
                    consumption["total_co2_tons"] += data.calculated_co2e_kg / 1000
        
        # Yıllık değerlere normalize et
        if period_months != 12:
            factor = 12 / period_months
            for key in consumption:
                consumption[key] *= factor
        
        return consumption
    
    def _calculate_current_costs(
        self,
        consumption: Dict[str, float],
        financials: Optional[models.CompanyFinancials]
    ) -> Dict[str, float]:
        """
        Mevcut enerji maliyetlerini hesapla
        """
        # Default birim maliyetler (2024 Türkiye)
        default_electricity_cost = 4.5  # TL/kWh
        default_gas_cost = 15.0  # TL/m³
        default_diesel_cost = 35.0  # TL/litre
        
        electricity_cost_per_kwh = financials.avg_electricity_cost_kwh if financials else default_electricity_cost
        gas_cost_per_m3 = financials.avg_gas_cost_m3 if financials else default_gas_cost
        
        costs = {
            "electricity": consumption["electricity_kwh"] * electricity_cost_per_kwh,
            "natural_gas": consumption["natural_gas_m3"] * gas_cost_per_m3,
            "diesel": consumption["diesel_liters"] * default_diesel_cost,
            "total": 0
        }
        
        costs["total"] = costs["electricity"] + costs["natural_gas"] + costs["diesel"]
        
        return costs
    
    def _get_industry_benchmarks(
        self,
        industry_type: Optional[models.IndustryType]
    ) -> Dict:
        """
        Sektör benchmark değerlerini al
        """
        if not industry_type:
            # Default değerler
            return {
                "best_in_class_kwh_per_m2": 100,
                "average_kwh_per_m2": 150,
                "best_in_class_gas_m3_per_m2": 15,
                "efficiency_gap_percentage": 0.25
            }
        
        # Sektör template'ini al
        template = self.db.query(models.IndustryTemplate).filter(
            models.IndustryTemplate.industry_type == industry_type
        ).first()
        
        if template:
            return {
                "best_in_class_kwh_per_employee": template.best_in_class_electricity_kwh,
                "average_kwh_per_employee": template.average_electricity_kwh,
                "typical_electricity_ratio": template.typical_electricity_cost_ratio,
                "efficiency_gap_percentage": 0.20  # En iyi %20'lik dilim ile fark
            }
        
        return {
            "best_in_class_kwh_per_m2": 100,
            "average_kwh_per_m2": 150,
            "best_in_class_gas_m3_per_m2": 15,
            "efficiency_gap_percentage": 0.25
        }
    
    def _identify_savings_opportunities(
        self,
        company: models.Company,
        consumption: Dict,
        costs: Dict,
        benchmarks: Dict
    ) -> List[Dict]:
        """
        Tasarruf fırsatlarını belirle
        """
        opportunities = []
        
        # 1. Elektrik verimliliği
        if consumption["electricity_kwh"] > 0:
            # LED dönüşümü
            lighting_savings = consumption["electricity_kwh"] * 0.15  # Aydınlatma %15 varsayım
            opportunities.append({
                "measure": "lighting_upgrade",
                "name": "LED Aydınlatma Dönüşümü",
                "description": "Tüm aydınlatmaların LED'e dönüştürülmesi",
                "annual_savings_kwh": lighting_savings * self.IMPROVEMENT_POTENTIALS["lighting_upgrade"],
                "annual_savings_tl": lighting_savings * self.IMPROVEMENT_POTENTIALS["lighting_upgrade"] * (costs["electricity"] / consumption["electricity_kwh"]),
                "investment_tl": lighting_savings / 2000 * self.INVESTMENT_COSTS["lighting_upgrade"],  # 2000 saat/yıl
                "payback_months": 18,
                "difficulty": "Kolay",
                "co2_reduction_tons": lighting_savings * self.IMPROVEMENT_POTENTIALS["lighting_upgrade"] * 0.42 / 1000
            })
            
            # Güneş paneli
            roof_area = sum(f.surface_area_m2 or 1000 for f in company.facilities) * 0.3  # Çatının %30'u
            solar_capacity_kwp = roof_area / 7  # 7 m²/kWp
            solar_production_kwh = solar_capacity_kwp * 1400  # Türkiye ortalaması 1400 saat/yıl
            
            if solar_production_kwh > consumption["electricity_kwh"] * 0.1:  # En az %10 karşılama
                solar_savings = min(solar_production_kwh, consumption["electricity_kwh"] * 0.5)
                opportunities.append({
                    "measure": "solar_panel",
                    "name": "Güneş Enerjisi Sistemi (GES)",
                    "description": f"{solar_capacity_kwp:.0f} kWp güneş paneli kurulumu",
                    "annual_savings_kwh": solar_savings,
                    "annual_savings_tl": solar_savings * (costs["electricity"] / consumption["electricity_kwh"]),
                    "investment_tl": solar_capacity_kwp * self.INVESTMENT_COSTS["solar_panel"],
                    "payback_months": (solar_capacity_kwp * self.INVESTMENT_COSTS["solar_panel"]) / (solar_savings * costs["electricity"] / consumption["electricity_kwh"] / 12) if solar_savings > 0 else 999,
                    "difficulty": "Orta",
                    "co2_reduction_tons": solar_savings * 0.42 / 1000
                })
        
        # 2. Doğalgaz verimliliği
        if consumption["natural_gas_m3"] > 0:
            # Yalıtım iyileştirmesi
            total_area = sum(f.surface_area_m2 or 1000 for f in company.facilities)
            gas_savings_m3 = consumption["natural_gas_m3"] * self.IMPROVEMENT_POTENTIALS["insulation_improvement"]
            
            opportunities.append({
                "measure": "insulation_improvement",
                "name": "Isı Yalıtımı İyileştirmesi",
                "description": "Dış cephe ve çatı yalıtımı güçlendirmesi",
                "annual_savings_kwh": 0,
                "annual_savings_tl": gas_savings_m3 * (costs["natural_gas"] / consumption["natural_gas_m3"]) if consumption["natural_gas_m3"] > 0 else 0,
                "annual_savings_m3": gas_savings_m3,
                "investment_tl": total_area * self.INVESTMENT_COSTS["insulation_improvement"],
                "payback_months": 36,
                "difficulty": "Orta",
                "co2_reduction_tons": gas_savings_m3 * 2.03 / 1000
            })
        
        # 3. Enerji Yönetim Sistemi
        if costs["total"] > 500000:  # Yıllık 500K TL üzeri enerji maliyeti
            ems_savings = costs["total"] * self.IMPROVEMENT_POTENTIALS["energy_management"]
            opportunities.append({
                "measure": "energy_management",
                "name": "Enerji İzleme ve Yönetim Sistemi",
                "description": "IoT tabanlı enerji izleme ve optimizasyon sistemi",
                "annual_savings_tl": ems_savings,
                "annual_savings_kwh": consumption["electricity_kwh"] * self.IMPROVEMENT_POTENTIALS["energy_management"],
                "investment_tl": self.INVESTMENT_COSTS["energy_management"],
                "payback_months": (self.INVESTMENT_COSTS["energy_management"] / ems_savings * 12) if ems_savings > 0 else 999,
                "difficulty": "Kolay",
                "co2_reduction_tons": (consumption["total_co2_tons"] * self.IMPROVEMENT_POTENTIALS["energy_management"])
            })
        
        return opportunities
    
    def _calculate_solar_roi(
        self,
        company: models.Company,
        consumption: Dict,
        financials: Optional[models.CompanyFinancials],
        params: Optional[Dict]
    ) -> Dict:
        """
        Güneş enerjisi yatırımı için detaylı ROI hesaplama
        """
        # Parametreler
        capacity_kwp = params.get("capacity_kwp", 100) if params else 100
        installation_cost_per_kwp = params.get("cost_per_kwp", self.INVESTMENT_COSTS["solar_panel"]) if params else self.INVESTMENT_COSTS["solar_panel"]
        
        # Üretim tahmini (Türkiye ortalaması)
        annual_production_kwh = capacity_kwp * 1400  # 1400 tam güneş saati/yıl
        self_consumption_rate = min(0.7, consumption["electricity_kwh"] / annual_production_kwh) if annual_production_kwh > 0 else 0
        
        # Tasarruflar
        self_consumed_kwh = annual_production_kwh * self_consumption_rate
        grid_feed_kwh = annual_production_kwh * (1 - self_consumption_rate)
        
        electricity_cost_per_kwh = financials.avg_electricity_cost_kwh if financials else 4.5
        feed_in_tariff = electricity_cost_per_kwh * 0.7  # Şebekeye satış tarifesi
        
        annual_savings = (self_consumed_kwh * electricity_cost_per_kwh) + (grid_feed_kwh * feed_in_tariff)
        
        # Yatırım maliyeti
        total_investment = capacity_kwp * installation_cost_per_kwp
        
        # 25 yıllık analiz
        total_savings_25_years = 0
        for year in range(1, 26):
            # Panel verimliliği yıllık %0.5 düşüş
            efficiency = 1 - (year * 0.005)
            yearly_savings = annual_savings * efficiency
            
            # Elektrik fiyat artışı yıllık %10
            price_increase = (1.10 ** year)
            yearly_savings *= price_increase
            
            # İskonto oranı %15
            discount_factor = 1 / ((1.15) ** year)
            total_savings_25_years += yearly_savings * discount_factor
        
        npv = total_savings_25_years - total_investment
        payback_years = total_investment / annual_savings if annual_savings > 0 else 999
        
        return {
            "measure_type": "solar_panel",
            "measure_name": f"{capacity_kwp} kWp Güneş Enerjisi Sistemi",
            "capacity_kwp": capacity_kwp,
            "annual_production_kwh": annual_production_kwh,
            "self_consumption_kwh": self_consumed_kwh,
            "grid_feed_kwh": grid_feed_kwh,
            "annual_savings_tl": annual_savings,
            "investment_tl": total_investment,
            "payback_years": round(payback_years, 1),
            "npv_25_years": round(npv, 0),
            "irr_percentage": round(((total_savings_25_years / total_investment) ** (1/25) - 1) * 100, 1),
            "co2_reduction_tons": annual_production_kwh * 0.42 / 1000,
            "lcoe_tl_kwh": round(total_investment / (annual_production_kwh * 25), 2)  # Levelized cost
        }
    
    def _calculate_lighting_roi(
        self,
        company: models.Company,
        consumption: Dict,
        financials: Optional[models.CompanyFinancials],
        params: Optional[Dict]
    ) -> Dict:
        """
        LED aydınlatma dönüşümü ROI hesaplama
        """
        # Aydınlatma tüketimini tahmin et (%15-20)
        lighting_percentage = params.get("lighting_percentage", 0.18) if params else 0.18
        current_lighting_kwh = consumption["electricity_kwh"] * lighting_percentage
        
        # LED tasarruf oranı (%50-70)
        led_savings_rate = params.get("savings_rate", 0.60) if params else 0.60
        annual_savings_kwh = current_lighting_kwh * led_savings_rate
        
        # Maliyet hesaplama
        electricity_cost_per_kwh = financials.avg_electricity_cost_kwh if financials else 4.5
        annual_savings_tl = annual_savings_kwh * electricity_cost_per_kwh
        
        # Yatırım maliyeti (armatür sayısına göre)
        total_area = sum(f.surface_area_m2 or 1000 for f in company.facilities)
        fixtures_count = total_area / 10  # Her 10 m² için 1 armatür
        cost_per_fixture = params.get("cost_per_fixture", 500) if params else 500
        total_investment = fixtures_count * cost_per_fixture
        
        payback_months = (total_investment / annual_savings_tl * 12) if annual_savings_tl > 0 else 999
        
        return {
            "measure_type": "lighting_upgrade",
            "measure_name": "LED Aydınlatma Dönüşümü",
            "current_lighting_kwh": current_lighting_kwh,
            "annual_savings_kwh": annual_savings_kwh,
            "annual_savings_tl": annual_savings_tl,
            "fixtures_count": int(fixtures_count),
            "investment_tl": total_investment,
            "payback_months": round(payback_months, 1),
            "co2_reduction_tons": annual_savings_kwh * 0.42 / 1000,
            "implementation_difficulty": "Kolay"
        }
    
    def _calculate_insulation_roi(
        self,
        company: models.Company,
        consumption: Dict,
        financials: Optional[models.CompanyFinancials],
        params: Optional[Dict]
    ) -> Dict:
        """
        Isı yalıtımı iyileştirmesi ROI hesaplama
        """
        # Isıtma/soğutma tüketimi (doğalgaz + elektrik HVAC)
        heating_gas_m3 = consumption["natural_gas_m3"] * 0.85  # Doğalgazın %85'i ısıtma
        hvac_electricity_kwh = consumption["electricity_kwh"] * 0.25  # Elektriğin %25'i HVAC
        
        # Yalıtım tasarruf oranı (%15-30)
        insulation_savings_rate = params.get("savings_rate", 0.22) if params else 0.22
        
        gas_savings_m3 = heating_gas_m3 * insulation_savings_rate
        electricity_savings_kwh = hvac_electricity_kwh * insulation_savings_rate
        
        # Maliyet hesaplama
        gas_cost_per_m3 = financials.avg_gas_cost_m3 if financials else 15.0
        electricity_cost_per_kwh = financials.avg_electricity_cost_kwh if financials else 4.5
        
        annual_savings_tl = (gas_savings_m3 * gas_cost_per_m3) + (electricity_savings_kwh * electricity_cost_per_kwh)
        
        # Yatırım maliyeti
        total_area = sum(f.surface_area_m2 or 1000 for f in company.facilities)
        wall_area = total_area * 0.6  # Duvar alanı tahmin
        cost_per_m2 = params.get("cost_per_m2", self.INVESTMENT_COSTS["insulation_improvement"]) if params else self.INVESTMENT_COSTS["insulation_improvement"]
        total_investment = wall_area * cost_per_m2
        
        payback_months = (total_investment / annual_savings_tl * 12) if annual_savings_tl > 0 else 999
        
        # CO2 azaltımı
        co2_reduction = (gas_savings_m3 * 2.03 + electricity_savings_kwh * 0.42) / 1000
        
        return {
            "measure_type": "insulation_improvement",
            "measure_name": "Isı Yalıtımı İyileştirmesi",
            "insulation_area_m2": wall_area,
            "gas_savings_m3": gas_savings_m3,
            "electricity_savings_kwh": electricity_savings_kwh,
            "annual_savings_tl": annual_savings_tl,
            "investment_tl": total_investment,
            "payback_months": round(payback_months, 1),
            "co2_reduction_tons": co2_reduction,
            "implementation_difficulty": "Orta"
        }
    
    def _create_benchmark_comparison(
        self,
        consumption: Dict,
        benchmarks: Dict
    ) -> Dict:
        """
        Sektör benchmark karşılaştırması oluştur
        """
        comparison = {
            "industry_average_gap": 0,
            "best_in_class_gap": 0,
            "efficiency_score": 0,
            "message": ""
        }
        
        if "average_kwh_per_employee" in benchmarks and benchmarks["average_kwh_per_employee"]:
            # Çalışan sayısı tahmini (her 100 kWh/ay için 1 çalışan)
            estimated_employees = consumption["electricity_kwh"] / (benchmarks["average_kwh_per_employee"] or 5000)
            
            if estimated_employees > 0:
                current_kwh_per_employee = consumption["electricity_kwh"] / estimated_employees
                
                # Sektör ortalaması ile fark
                avg_gap = ((current_kwh_per_employee - benchmarks["average_kwh_per_employee"]) / 
                          benchmarks["average_kwh_per_employee"] * 100)
                comparison["industry_average_gap"] = round(avg_gap, 1)
                
                # En iyi uygulamalar ile fark
                if benchmarks.get("best_in_class_kwh_per_employee"):
                    best_gap = ((current_kwh_per_employee - benchmarks["best_in_class_kwh_per_employee"]) / 
                               benchmarks["best_in_class_kwh_per_employee"] * 100)
                    comparison["best_in_class_gap"] = round(best_gap, 1)
                
                # Verimlilik skoru (0-100)
                if avg_gap <= 0:
                    comparison["efficiency_score"] = min(100, 85 + abs(avg_gap) * 0.5)
                else:
                    comparison["efficiency_score"] = max(0, 70 - avg_gap * 0.5)
                
                # Mesaj
                if avg_gap < -10:
                    comparison["message"] = "Tebrikler! Sektör ortalamasının çok üzerindesiniz."
                elif avg_gap < 0:
                    comparison["message"] = "Sektör ortalamasından daha verimlisiniz."
                elif avg_gap < 20:
                    comparison["message"] = "Sektör ortalamasına yakınsınız, iyileştirme fırsatları var."
                else:
                    comparison["message"] = "Önemli tasarruf potansiyeli mevcut!"
        
        return comparison
    
    def _identify_quick_wins(
        self,
        opportunities: List[Dict]
    ) -> List[Dict]:
        """
        Hızlı kazanımları belirle (düşük yatırım, hızlı geri dönüş)
        """
        quick_wins = []
        
        for opp in opportunities:
            payback = opp.get("payback_months", 999)
            investment = opp.get("investment_tl", 0)
            
            # 12 ay altı geri ödeme veya 50K TL altı yatırım
            if payback <= 12 or (investment <= 50000 and payback <= 24):
                quick_wins.append({
                    "name": opp["name"],
                    "savings_tl": opp["annual_savings_tl"],
                    "investment_tl": investment,
                    "payback_months": payback,
                    "priority": "Yüksek" if payback <= 6 else "Orta"
                })
        
        return sorted(quick_wins, key=lambda x: x["payback_months"])[:3]
    
    def _calculate_npv(
        self,
        annual_cash_flow: float,
        initial_investment: float,
        years: int = 5,
        discount_rate: float = 0.15
    ) -> float:
        """
        Net Bugünkü Değer (NPV) hesaplama
        """
        npv = -initial_investment
        
        for year in range(1, years + 1):
            discounted_cash_flow = annual_cash_flow / ((1 + discount_rate) ** year)
            npv += discounted_cash_flow
        
        return npv
    
    def _get_measure_name(self, measure_type: str) -> str:
        """
        Önlem tipi için Türkçe isim
        """
        names = {
            "lighting_upgrade": "LED Aydınlatma Dönüşümü",
            "hvac_optimization": "HVAC Sistem Optimizasyonu",
            "insulation_improvement": "Isı Yalıtımı İyileştirmesi",
            "solar_panel": "Güneş Enerjisi Sistemi",
            "energy_management": "Enerji Yönetim Sistemi",
            "process_optimization": "Süreç Optimizasyonu"
        }
        return names.get(measure_type, measure_type)
    
    def _get_implementation_difficulty(self, measure_type: str) -> str:
        """
        Uygulama zorluğu seviyesi
        """
        difficulty = {
            "lighting_upgrade": "Kolay",
            "hvac_optimization": "Orta",
            "insulation_improvement": "Orta",
            "solar_panel": "Zor",
            "energy_management": "Kolay",
            "process_optimization": "Zor"
        }
        return difficulty.get(measure_type, "Orta")
    
    def _generate_roi_message(
        self,
        total_savings: float,
        payback_months: float
    ) -> str:
        """
        ROI analizi özet mesajı
        """
        if total_savings <= 0:
            return "Yeterli veri bulunmamaktadır. Lütfen enerji tüketim verilerinizi güncelleyin."
        
        savings_formatted = f"{total_savings:,.0f}".replace(",", ".")
        
        if payback_months <= 12:
            return f"Mükemmel! Yıllık {savings_formatted} TL tasarruf potansiyeli ile yatırımlarınız 1 yıl içinde kendini amorti edecek."
        elif payback_months <= 24:
            return f"Çok iyi! Yıllık {savings_formatted} TL tasarruf ile yatırımlarınız 2 yıl içinde geri dönecek."
        elif payback_months <= 36:
            return f"İyi bir fırsat! Yıllık {savings_formatted} TL tasarruf potansiyeliniz var. Geri ödeme süresi 3 yıl."
        else:
            return f"Yıllık {savings_formatted} TL tasarruf potansiyeliniz bulunuyor. Detaylı analiz için uzmanlarımızla görüşün."
