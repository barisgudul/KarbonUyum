# backend/tasks/analytics_tasks.py
"""
This module contains the analytics tasks for the backend.
"""
import logging
from datetime import datetime, timedelta

from sqlalchemy import func

import models
from celery_config import DBTask, app

logger = logging.getLogger(__name__)


@app.task(name='tasks.update_industry_benchmarks', base=DBTask, bind=True, max_retries=3)
def update_industry_benchmarks(self):
    db = self.db
    try:
        logger.info("🔄 Benchmark güncelleme başladı...")
        industry_templates = db.query(models.IndustryTemplate).all()
        updated_count = 0
        for template in industry_templates:
            try:
                companies_in_industry = db.query(models.Company).filter(models.Company.industry_type == template.industry_type).all()
                if not companies_in_industry:
                    logger.warning(f"⚠️ {template.industry_name} için şirket yok")
                    continue
                cutoff_date = datetime.now().date() - timedelta(days=30)
                electricity_data = db.query(
                    func.sum(models.ActivityData.quantity).label('total_kwh'),
                    models.Facility.company_id
                ).filter(
                    models.ActivityData.activity_type == models.ActivityType.electricity,
                    models.ActivityData.is_simulation == False,
                    models.ActivityData.start_date >= cutoff_date,
                    models.Facility.id == models.ActivityData.facility_id,
                    models.Facility.company_id.in_([c.id for c in companies_in_industry])
                ).group_by(models.Facility.company_id).all()
                if not electricity_data:
                    logger.warning(f"⚠️ {template.industry_name} için son 30 günde veri yok")
                    continue
                consumptions = [float(d.total_kwh) for d in electricity_data if d.total_kwh]
                if consumptions:
                    avg_consumption = sum(consumptions) / len(consumptions)
                    sorted_consumptions = sorted(consumptions)
                    best_20_percent_threshold = sorted_consumptions[int(len(sorted_consumptions) * 0.2)]
                    template.average_electricity_kwh = avg_consumption
                    template.best_in_class_electricity_kwh = best_20_percent_threshold
                    db.commit()
                    updated_count += 1
                    logger.info(f"✅ {template.industry_name}: Ortalama={avg_consumption:.0f} kWh, Best %20={best_20_percent_threshold:.0f} kWh")
            except Exception as e:
                logger.error(f"❌ {template.industry_name} güncellenirken hata: {e}")
                continue
        logger.info(f"✅ Benchmark güncelleme tamamlandı: {updated_count} sektör güncellendi")
        return {"updated": updated_count, "timestamp": datetime.now().isoformat()}
    except Exception as exc:
        logger.error(f"❌ Benchmark görevi hatası: {exc}")
        raise update_industry_benchmarks.retry(exc=exc, countdown=300)


@app.task(name='tasks.detect_anomalies', base=DBTask, bind=True, max_retries=2)
def detect_anomalies(self):
    db = self.db
    try:
        logger.info("🔍 Anomali tespiti başladı...")
        anomaly_count = 0
        for company in db.query(models.Company).all():
            try:
                cutoff_date = datetime.now().date() - timedelta(days=30)
                historical_avg = db.query(func.avg(models.ActivityData.quantity)).filter(
                    models.ActivityData.activity_type == models.ActivityType.electricity,
                    models.ActivityData.is_simulation == False,
                    models.ActivityData.start_date >= cutoff_date,
                    models.Facility.company_id == company.id,
                    models.Facility.id == models.ActivityData.facility_id
                ).scalar()
                if not historical_avg:
                    continue
                recent = db.query(models.ActivityData).filter(
                    models.ActivityData.activity_type == models.ActivityType.electricity,
                    models.ActivityData.is_simulation == False,
                    models.ActivityData.start_date >= cutoff_date,
                    models.Facility.company_id == company.id,
                    models.Facility.id == models.ActivityData.facility_id
                ).order_by(models.ActivityData.end_date.desc()).limit(1).first()
                if recent and historical_avg:
                    deviation = (recent.quantity - historical_avg) / historical_avg if historical_avg > 0 else 0
                    if deviation > 0.20:
                        logger.warning(f"⚠️ ANOMALI: {company.name} elektrik tüketimi +{deviation*100:.1f}%")
                        anomaly_count += 1
                        try:
                            from services.notification_service import get_notification_service
                            notif_service = get_notification_service()
                            owner_id = company.owner_id
                            if owner_id:
                                notif_service.create_notification(
                                    db=db,
                                    user_id=owner_id,
                                    notification_type='anomaly',
                                    title=f"⚠️ {company.name}: Elektrik Tüketimi Anormal!",
                                    message=f"Bu ay elektrik tüketimi geçen aya göre {deviation*100:.1f}% artmış.",
                                    company_id=company.id,
                                    action_url=f"/dashboard/companies/{company.id}/anomalies",
                                    send_email=True
                                )
                        except Exception as e:
                            logger.error(f"❌ Anomali bildirimi hatası: {e}")
            except Exception as e:
                logger.error(f"❌ {company.name} anomali kontrolü hatası: {e}")
                continue
        logger.info(f"✅ Anomali tespiti tamamlandı: {anomaly_count} anomali")
        return {"anomalies_detected": anomaly_count, "timestamp": datetime.now().isoformat()}
    except Exception as exc:
        logger.error(f"❌ Anomali tespiti hatası: {exc}")
        raise detect_anomalies.retry(exc=exc, countdown=300)


@app.task(name='tasks.calculate_supplier_benchmarks', base=DBTask, bind=True, max_retries=3)
def calculate_supplier_benchmarks(self):
    db = self.db
    try:
        logger.info("🔄 Tedarikçi benchmark hesaplama başladı...")
        categories = db.query(models.ProductFootprint.product_category).distinct().all()
        benchmark_results = {}
        for (category,) in categories:
            if not category:
                continue
            products = db.query(models.ProductFootprint).filter(
                models.ProductFootprint.product_category == category,
                models.ProductFootprint.co2e_per_unit_kg > 0
            ).all()
            if not products:
                continue
            co2e_values = [p.co2e_per_unit_kg for p in products]
            if not co2e_values:
                continue
            avg_co2e = sum(co2e_values) / len(co2e_values)
            sorted_values = sorted(co2e_values)
            mid = len(sorted_values) // 2
            median_co2e = (sorted_values[mid] + sorted_values[~mid]) / 2 if len(sorted_values) > 0 else 0
            percentile_25_index = int(len(sorted_values) * 0.25)
            best_in_class = sorted_values[percentile_25_index] if percentile_25_index < len(sorted_values) else sorted_values[0]
            benchmark_results[category] = {
                "category": category,
                "avg_co2e_per_unit": round(avg_co2e, 3),
                "median_co2e_per_unit": round(median_co2e, 3),
                "best_in_class": round(best_in_class, 3),
                "product_count": len(products),
                "updated_at": datetime.utcnow().isoformat()
            }
            logger.info(f"📊 {category}: Ort={avg_co2e:.2f}, Medyan={median_co2e:.2f}, Best={best_in_class:.2f} kg CO2e ({len(products)} ürün)")
        logger.info(f"✅ {len(benchmark_results)} kategori için benchmark hesaplandı")
        return {"success": True, "categories_processed": len(benchmark_results), "benchmarks": benchmark_results}
    except Exception as exc:
        logger.error(f"❌ Benchmark hesaplama hatası: {exc}")
        raise calculate_supplier_benchmarks.retry(exc=exc, countdown=60)


