# backend/services/cbam_service.py

"""
CBAM (Carbon Border Adjustment Mechanism) XML Rapor Servisi
AB'nin CBAM düzenlemelerine uygun XML rapor üretimi
"""

import logging
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from lxml import etree
from sqlalchemy.orm import Session

import models
from services.calculation_interface import ICalculationService

logger = logging.getLogger(__name__)


class CBAMReportService:
    """
    CBAM XML rapor üretim servisi
    AB'nin resmi CBAM XML şemasına uygun rapor üretir
    """
    
    CBAM_NAMESPACE = "urn:eu:cbam:report:v1"
    CBAM_SCHEMA_LOCATION = "https://ec.europa.eu/taxation_customs/cbam/schemas/cbam_report_v1.xsd"
    
    # CBAM ürün kodları (CN kodları)
    PRODUCT_CODES = {
        "electricity": "2716000000",  # Elektrik enerjisi
        "cement": "2523",  # Çimento
        "iron_steel": "72",  # Demir ve çelik
        "aluminium": "76",  # Alüminyum
        "fertilizers": "31",  # Gübreler
        "hydrogen": "2804100000",  # Hidrojen
    }
    
    def __init__(self, db: Session, calc_service: ICalculationService):
        self.db = db
        self.calc_service = calc_service
    
    def generate_cbam_report(
        self, 
        company_id: int,
        start_date: date,
        end_date: date,
        reporting_period: str = None
    ) -> str:
        """
        Belirtilen şirket ve dönem için CBAM XML raporu üretir
        
        Args:
            company_id: Şirket ID'si
            start_date: Raporlama başlangıç tarihi
            end_date: Raporlama bitiş tarihi
            reporting_period: Raporlama dönemi (örn: "2024-Q1")
        
        Returns:
            XML string formatında CBAM raporu
        """
        
        # Şirket bilgilerini al
        company = self.db.query(models.Company).filter(
            models.Company.id == company_id
        ).first()
        
        if not company:
            raise ValueError(f"Şirket bulunamadı: {company_id}")
        
        # Raporlama dönemi
        if not reporting_period:
            reporting_period = f"{start_date.year}-Q{(start_date.month-1)//3+1}"
        
        # XML root element
        root = etree.Element(
            "{%s}CBAMReport" % self.CBAM_NAMESPACE,
            nsmap={None: self.CBAM_NAMESPACE},
            version="1.0"
        )
        
        # Report Header
        header = etree.SubElement(root, "ReportHeader")
        etree.SubElement(header, "ReportID").text = f"CBAM-TR-{company_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        etree.SubElement(header, "ReportingPeriod").text = reporting_period
        etree.SubElement(header, "SubmissionDate").text = datetime.now().strftime("%Y-%m-%d")
        etree.SubElement(header, "ReportType").text = "QUARTERLY"  # QUARTERLY veya ANNUAL
        
        # Declarant (Beyan Eden) Bilgileri
        declarant = etree.SubElement(root, "Declarant")
        etree.SubElement(declarant, "Name").text = company.name
        etree.SubElement(declarant, "TaxNumber").text = company.tax_number or f"TR{company.id:010d}"
        etree.SubElement(declarant, "Country").text = "TR"
        etree.SubElement(declarant, "ContactEmail").text = company.owner.email if company.owner else "info@example.com"
        
        # Installations (Tesisler)
        installations = etree.SubElement(root, "Installations")
        
        for facility in company.facilities:
            installation = etree.SubElement(installations, "Installation")
            etree.SubElement(installation, "InstallationID").text = f"TR-FAC-{facility.id}"
            etree.SubElement(installation, "Name").text = facility.name
            etree.SubElement(installation, "City").text = facility.city or "Unknown"
            etree.SubElement(installation, "Country").text = "TR"
            
            # Installation Emissions
            emissions_data = self._calculate_facility_emissions(
                facility, start_date, end_date
            )
            
            if emissions_data:
                emissions = etree.SubElement(installation, "Emissions")
                
                # Direct Emissions (Scope 1)
                if emissions_data.get("scope1_total", 0) > 0:
                    direct = etree.SubElement(emissions, "DirectEmissions")
                    etree.SubElement(direct, "CO2").text = f"{emissions_data['scope1_total']:.2f}"
                    etree.SubElement(direct, "Unit").text = "tCO2e"
                    
                    # Yakıt detayları
                    if emissions_data.get("natural_gas_co2", 0) > 0:
                        fuel = etree.SubElement(direct, "FuelType")
                        etree.SubElement(fuel, "Type").text = "NATURAL_GAS"
                        etree.SubElement(fuel, "Consumption").text = f"{emissions_data['natural_gas_m3']:.2f}"
                        etree.SubElement(fuel, "Unit").text = "m3"
                        etree.SubElement(fuel, "EmissionFactor").text = "2.03"
                    
                    if emissions_data.get("diesel_co2", 0) > 0:
                        fuel = etree.SubElement(direct, "FuelType")
                        etree.SubElement(fuel, "Type").text = "DIESEL"
                        etree.SubElement(fuel, "Consumption").text = f"{emissions_data['diesel_liters']:.2f}"
                        etree.SubElement(fuel, "Unit").text = "liters"
                        etree.SubElement(fuel, "EmissionFactor").text = "2.68"
                
                # Indirect Emissions (Scope 2 - Elektrik)
                if emissions_data.get("scope2_total", 0) > 0:
                    indirect = etree.SubElement(emissions, "IndirectEmissions")
                    electricity = etree.SubElement(indirect, "Electricity")
                    etree.SubElement(electricity, "Consumption").text = f"{emissions_data['electricity_kwh']:.2f}"
                    etree.SubElement(electricity, "Unit").text = "MWh"
                    etree.SubElement(electricity, "CO2").text = f"{emissions_data['scope2_total']:.2f}"
                    etree.SubElement(electricity, "EmissionFactor").text = f"{emissions_data.get('electricity_factor', 0.42):.3f}"
                    etree.SubElement(electricity, "GridMix").text = "TR_NATIONAL_GRID"
        
        # Goods (İthal Edilen Ürünler - Opsiyonel)
        # Bu kısım, şirket ithalat yapıyorsa doldurulacak
        goods = etree.SubElement(root, "ImportedGoods")
        
        # Elektrik ithalatı örneği (varsa)
        if self._has_electricity_imports(company, start_date, end_date):
            good = etree.SubElement(goods, "Good")
            etree.SubElement(good, "CNCode").text = self.PRODUCT_CODES["electricity"]
            etree.SubElement(good, "Description").text = "Imported Electricity"
            etree.SubElement(good, "Quantity").text = "0"  # İthalat miktarı
            etree.SubElement(good, "Unit").text = "MWh"
            etree.SubElement(good, "OriginCountry").text = "EU"  # Menşe ülke
            etree.SubElement(good, "EmbeddedEmissions").text = "0"  # Gömülü emisyonlar
        
        # Summary (Özet)
        summary = etree.SubElement(root, "Summary")
        total_emissions = self._calculate_total_emissions(company, start_date, end_date)
        
        etree.SubElement(summary, "TotalDirectEmissions").text = f"{total_emissions['scope1']:.2f}"
        etree.SubElement(summary, "TotalIndirectEmissions").text = f"{total_emissions['scope2']:.2f}"
        etree.SubElement(summary, "TotalEmissions").text = f"{total_emissions['total']:.2f}"
        etree.SubElement(summary, "Unit").text = "tCO2e"
        
        # Verification (Doğrulama) Bilgileri
        verification = etree.SubElement(root, "Verification")
        etree.SubElement(verification, "Status").text = "PENDING"  # PENDING, VERIFIED, REJECTED
        etree.SubElement(verification, "VerifierName").text = "KarbonUyum Platform"
        etree.SubElement(verification, "VerificationDate").text = datetime.now().strftime("%Y-%m-%d")
        etree.SubElement(verification, "VerificationMethod").text = "CALCULATION_BASED"
        
        # XML'i string'e çevir
        xml_string = etree.tostring(
            root, 
            pretty_print=True, 
            xml_declaration=True, 
            encoding='UTF-8'
        ).decode('utf-8')
        
        logger.info(f"CBAM raporu üretildi: Company={company_id}, Period={reporting_period}")
        
        return xml_string
    
    def _calculate_facility_emissions(
        self, 
        facility: models.Facility, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, float]:
        """
        Tesis için emisyon hesaplamaları
        """
        emissions = {
            "scope1_total": 0,
            "scope2_total": 0,
            "electricity_kwh": 0,
            "natural_gas_m3": 0,
            "diesel_liters": 0,
            "natural_gas_co2": 0,
            "diesel_co2": 0,
            "electricity_factor": 0.42  # Default TR grid factor
        }
        
        # Aktivite verilerini al
        activity_data = self.db.query(models.ActivityData).filter(
            models.ActivityData.facility_id == facility.id,
            models.ActivityData.start_date >= start_date,
            models.ActivityData.end_date <= end_date,
            models.ActivityData.is_simulation == False  # Gerçek veri
        ).all()
        
        for data in activity_data:
            co2_kg = data.calculated_co2e_kg or 0
            co2_tons = co2_kg / 1000  # tCO2e'ye çevir
            
            if data.scope == models.ScopeType.scope_1:
                emissions["scope1_total"] += co2_tons
                
                if data.activity_type == models.ActivityType.natural_gas:
                    emissions["natural_gas_m3"] += data.quantity
                    emissions["natural_gas_co2"] += co2_tons
                elif data.activity_type == models.ActivityType.diesel_fuel:
                    emissions["diesel_liters"] += data.quantity
                    emissions["diesel_co2"] += co2_tons
                    
            elif data.scope == models.ScopeType.scope_2:
                emissions["scope2_total"] += co2_tons
                
                if data.activity_type == models.ActivityType.electricity:
                    emissions["electricity_kwh"] += data.quantity
                    
                    # Emisyon faktörünü hesapla (kg CO2/kWh)
                    if data.quantity > 0:
                        factor = (co2_kg / data.quantity)
                        if factor > 0:
                            emissions["electricity_factor"] = factor
        
        return emissions
    
    def _calculate_total_emissions(
        self, 
        company: models.Company,
        start_date: date,
        end_date: date
    ) -> Dict[str, float]:
        """
        Şirket toplam emisyonlarını hesapla
        """
        totals = {
            "scope1": 0,
            "scope2": 0,
            "scope3": 0,
            "total": 0
        }
        
        for facility in company.facilities:
            emissions = self._calculate_facility_emissions(facility, start_date, end_date)
            totals["scope1"] += emissions.get("scope1_total", 0)
            totals["scope2"] += emissions.get("scope2_total", 0)
        
        totals["total"] = totals["scope1"] + totals["scope2"] + totals["scope3"]
        
        return totals
    
    def _has_electricity_imports(
        self,
        company: models.Company,
        start_date: date,
        end_date: date
    ) -> bool:
        """
        Şirketin elektrik ithalatı olup olmadığını kontrol et
        Şu an için False dönüyor, gelecekte ithalat modülü eklenebilir
        """
        return False
    
    def validate_cbam_report(self, xml_string: str) -> bool:
        """
        Üretilen XML'in CBAM şemasına uygun olup olmadığını doğrula
        
        Args:
            xml_string: Doğrulanacak XML string
        
        Returns:
            True eğer geçerli, False değilse
        """
        try:
            # XML'i parse et
            doc = etree.fromstring(xml_string.encode('utf-8'))
            
            # Temel yapı kontrolü
            if doc.tag != "{%s}CBAMReport" % self.CBAM_NAMESPACE:
                logger.error("Root element CBAMReport değil")
                return False
            
            # Zorunlu elementleri kontrol et
            required_elements = [
                "ReportHeader",
                "Declarant",
                "Installations",
                "Summary"
            ]
            
            for element_name in required_elements:
                if doc.find(".//{%s}%s" % (self.CBAM_NAMESPACE, element_name)) is None:
                    logger.error(f"Zorunlu element eksik: {element_name}")
                    return False
            
            logger.info("CBAM raporu doğrulama başarılı")
            return True
            
        except Exception as e:
            logger.error(f"CBAM raporu doğrulama hatası: {e}")
            return False
