# backend/services/invoice_ocr_service.py

import os
import io
from typing import Optional, Dict, Any
from google.cloud import vision
from pdf2image import convert_from_path, convert_from_bytes
from PIL import Image
import logging
from datetime import datetime, date

logger = logging.getLogger(__name__)

class InvoiceOCRService:
    """
    Faturalardan metin çıkarmak için Google Cloud Vision API kullanır.
    
    Desteklenen formatlar:
    - PDF (sayfalar arasında dolaşır)
    - JPEG, PNG (Google Vision ile direkt işler)
    
    Çıkarılan veriler:
    - Tüketim miktarı (kWh, m³, litre vs.)
    - Tarih aralığı
    - Fatura tutarı (TL)
    - Enerji türü (elektrik, doğalgaz, yakıt)
    """
    
    def __init__(self):
        """Google Cloud Vision istemcisini başlat"""
        try:
            # GOOGLE_APPLICATION_CREDENTIALS env var'ından credentials yükle
            self.client = vision.ImageAnnotatorClient()
            logger.info("✅ Google Cloud Vision istemcisi başlatıldı")
        except Exception as e:
            logger.error(f"❌ Google Cloud Vision başlatma hatası: {e}")
            self.client = None
    
    def extract_text_from_image(self, image_path: str) -> str:
        """
        Resimden metin çıkar (Google Vision Text Detection)
        
        Returns: Çıkarılan metin
        """
        if not self.client:
            raise RuntimeError("Google Cloud Vision istemcisi hazır değil")
        
        try:
            with open(image_path, 'rb') as image_file:
                image = vision.Image(content=image_file.read())
            
            response = self.client.text_detection(image=image)
            texts = response.text_annotations
            
            if texts:
                # İlk annotation tam metin içerir
                full_text = texts[0].description
                logger.info(f"✅ Metin çıkartıldı: {len(full_text)} karakter")
                return full_text
            else:
                logger.warning("⚠️ Metinde hiçbir yazı bulunmadı")
                return ""
                
        except Exception as e:
            logger.error(f"❌ Metin çıkarma hatası: {e}")
            raise
    
    def convert_pdf_to_images(self, pdf_path: str) -> list:
        """
        PDF dosyasını resime dönüştür
        
        Returns: Resim dosya yollarının listesi
        """
        try:
            images = convert_from_path(pdf_path, dpi=200)
            
            # Geçici dizine kaydet
            temp_images = []
            for i, image in enumerate(images):
                temp_path = f"/tmp/invoice_page_{i}.jpg"
                image.save(temp_path, 'JPEG')
                temp_images.append(temp_path)
            
            logger.info(f"✅ PDF dönüştürüldü: {len(images)} sayfa")
            return temp_images
            
        except Exception as e:
            logger.error(f"❌ PDF dönüştürme hatası: {e}")
            raise
    
    def parse_invoice_data(self, extracted_text: str) -> Dict[str, Any]:
        """
        OCR metinden yapılandırılmış veri çıkar
        
        Aranılan düzenler:
        - Tüketim: "kWh", "m³", "m3", "litre"
        - Tarih: "01/01/2024", "01-01-2024" vs.
        - Tutar: Sayılar (TL)
        
        Returns: {
            'activity_type': 'electricity' | 'natural_gas' | 'diesel_fuel',
            'quantity': float,
            'cost_tl': float,
            'start_date': 'YYYY-MM-DD',
            'end_date': 'YYYY-MM-DD',
            'extracted_text': str,
            'confidence': float (0-1)
        }
        """
        
        import re
        
        result = {
            'activity_type': None,
            'quantity': None,
            'cost_tl': None,
            'start_date': None,
            'end_date': None,
            'extracted_text': extracted_text,
            'confidence': 0.0
        }
        
        text = extracted_text.lower()
        confidence_score = 0.0
        
        # 1. Enerji türü tespit et
        if re.search(r'kwh|kw\s*h|elektrik', text):
            result['activity_type'] = 'electricity'
            confidence_score += 0.3
        elif re.search(r'm³|m3|m\s*³|doğalgaz|dogalgaz|gas', text):
            result['activity_type'] = 'natural_gas'
            confidence_score += 0.3
        elif re.search(r'litre|liter|l\s*\.|yakıt|yakit|dizel|diesel', text):
            result['activity_type'] = 'diesel_fuel'
            confidence_score += 0.3
        
        # 2. Tüketim miktarı çıkar
        quantity_pattern = r'([\d.,]+)\s*(?:kWh|kwh|m³|m3|litre|liter)'
        quantity_match = re.search(quantity_pattern, extracted_text, re.IGNORECASE)
        
        if quantity_match:
            qty_str = quantity_match.group(1).replace('.', '').replace(',', '.')
            try:
                result['quantity'] = float(qty_str)
                confidence_score += 0.2
            except ValueError:
                pass
        
        # 3. Fatura tutarı çıkar (TL)
        # Örn: "1.234,56 TL" veya "1234.56 TL"
        cost_pattern = r'([\d.,]+)\s*(?:TL|tl|₺)'
        cost_match = re.search(cost_pattern, extracted_text)
        
        if cost_match:
            cost_str = cost_match.group(1).replace('.', '').replace(',', '.')
            try:
                result['cost_tl'] = float(cost_str)
                confidence_score += 0.2
            except ValueError:
                pass
        
        # 4. Tarih aralığı çıkar
        date_pattern = r'(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})'
        dates = re.findall(date_pattern, extracted_text)
        
        if dates:
            try:
                # İlk tarih başlangıç, son tarih bitiş
                first_date = datetime(int(dates[0][2]), int(dates[0][1]), int(dates[0][0]))
                result['start_date'] = first_date.strftime('%Y-%m-%d')
                
                if len(dates) > 1:
                    last_date = datetime(int(dates[-1][2]), int(dates[-1][1]), int(dates[-1][0]))
                    result['end_date'] = last_date.strftime('%Y-%m-%d')
                else:
                    # Eğer sadece bir tarih varsa, ay sonuna ayarla
                    if first_date.month == 12:
                        end_date = datetime(first_date.year + 1, 1, 1)
                    else:
                        end_date = datetime(first_date.year, first_date.month + 1, 1)
                    from datetime import timedelta
                    end_date = end_date - timedelta(days=1)
                    result['end_date'] = end_date.strftime('%Y-%m-%d')
                
                confidence_score += 0.2
            except (ValueError, IndexError):
                pass
        
        result['confidence'] = min(confidence_score, 1.0)
        
        logger.info(
            f"✅ Veri çıkarıldı: "
            f"{result['activity_type']} - "
            f"{result['quantity']} - "
            f"{result['cost_tl']} TL - "
            f"Güven: {result['confidence']:.0%}"
        )
        
        return result
    
    def process_invoice(self, file_path: str) -> Dict[str, Any]:
        """
        Faturayı işle: PDF → Resim → OCR → Parse → Sonuç
        
        Args:
            file_path: Fatura dosyasının yolu (PDF, JPEG, PNG)
        
        Returns: Çıkarılan verilerin sözlüğü
        """
        
        if not self.client:
            raise RuntimeError("Google Cloud Vision istemcisi hazır değil")
        
        try:
            # Dosya tipini kontrol et
            is_pdf = file_path.lower().endswith('.pdf')
            
            if is_pdf:
                # PDF → Resim
                temp_images = self.convert_pdf_to_images(file_path)
                all_text = ""
                
                for img_path in temp_images:
                    text = self.extract_text_from_image(img_path)
                    all_text += "\n" + text
                
                # Geçici dosyaları sil
                import os
                for img_path in temp_images:
                    try:
                        os.remove(img_path)
                    except:
                        pass
            else:
                # JPEG/PNG → direkt OCR
                all_text = self.extract_text_from_image(file_path)
            
            # Metni parse et
            parsed = self.parse_invoice_data(all_text)
            
            return parsed
            
        except Exception as e:
            logger.error(f"❌ Fatura işleme hatası: {e}")
            raise


# Singleton instance
_ocr_service = None

def get_ocr_service() -> InvoiceOCRService:
    """OCR servisi singleton'ı al"""
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = InvoiceOCRService()
    return _ocr_service
