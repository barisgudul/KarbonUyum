# backend/tasks/reporting_tasks.py
"""
This module contains the reporting tasks for the backend.
"""
import json
import logging
import os
import uuid
from datetime import datetime, timedelta

import models
from celery_config import DBTask, app

logger = logging.getLogger(__name__)


@app.task(name='tasks.generate_cbam_report_async', base=DBTask, bind=True, max_retries=3)
def generate_cbam_report_async(self, report_id: int):
    db = self.db
    try:
        logger.info(f"📊 CBAM raporu oluşturuluyor: Report #{report_id}")
        report = db.query(models.Report).filter(models.Report.id == report_id).first()
        if not report:
            logger.error(f"❌ Rapor bulunamadı: #{report_id}")
            return {"status": "failed", "reason": "report_not_found"}

        report.status = models.ReportStatus.processing
        report.requested_at = datetime.utcnow()
        db.commit()

        from services.cbam_service import CBAMReportService
        cbam_service = CBAMReportService()
        xml_content = cbam_service.generate_cbam_report(
            company_id=report.company_id,
            start_date=report.start_date,
            end_date=report.end_date,
            reporting_period=report.period_name
        )

        report_dir = "/tmp/reports"
        os.makedirs(report_dir, exist_ok=True)
        filename = f"cbam_{report.company_id}_{uuid.uuid4()}.xml"
        file_path = os.path.join(report_dir, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(xml_content)

        file_size = os.path.getsize(file_path)
        report.status = models.ReportStatus.completed
        report.file_path = file_path
        report.file_size_bytes = file_size
        report.completed_at = datetime.utcnow()
        report.expires_at = datetime.utcnow() + timedelta(days=7)
        db.commit()

        logger.info(f"✅ CBAM raporu oluşturuldu: {filename} ({file_size} bytes)")

        if report.notify_user_when_ready:
            try:
                from services.notification_service import get_notification_service
                notif_service = get_notification_service()
                company = db.query(models.Company).filter(models.Company.id == report.company_id).first()
                if company:
                    notif_service.create_notification(
                        db=db,
                        user_id=report.user_id,
                        notification_type='report_ready',
                        title='📊 CBAM Raporunuz Hazır!',
                        message=f"{company.name} için {report.period_name or 'belirtilen dönem'} CBAM XML raporu hazır.",
                        company_id=report.company_id,
                        action_url=f"/dashboard/reports/{report_id}/download",
                        send_email=True
                    )
            except Exception as e:
                logger.error(f"⚠️ Rapor hazır bildirimi gönderilemedi: {e}")

        return {"status": "success", "report_id": report_id, "file_path": file_path, "file_size": file_size}
    except Exception as exc:
        logger.error(f"❌ CBAM rapor görev hatası: {exc}")
        if 'report' in locals() and report:
            report.status = models.ReportStatus.failed
            report.error_message = str(exc)
            db.commit()
        raise generate_cbam_report_async.retry(exc=exc, countdown=600)


@app.task(name='tasks.calculate_roi_analysis_async', base=DBTask, bind=True, max_retries=3)
def calculate_roi_analysis_async(self, report_id: int):
    db = self.db
    try:
        logger.info(f"💰 ROI analiz raporu oluşturuluyor: Report #{report_id}")
        report = db.query(models.Report).filter(models.Report.id == report_id).first()
        if not report:
            logger.error(f"❌ Rapor bulunamadı: #{report_id}")
            return {"status": "failed", "reason": "report_not_found"}

        report.status = models.ReportStatus.processing
        report.requested_at = datetime.utcnow()
        db.commit()

        from services.roi_calculator_service import ROICalculatorService
        roi_service = ROICalculatorService(db)
        period_months = 12
        roi_analysis = roi_service.calculate_roi_potential(company_id=report.company_id, period_months=period_months)

        report_dir = "/tmp/reports"
        os.makedirs(report_dir, exist_ok=True)
        filename = f"roi_{report.company_id}_{uuid.uuid4()}.json"
        file_path = os.path.join(report_dir, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(roi_analysis.dict(), f, ensure_ascii=False, indent=2, default=str)

        file_size = os.path.getsize(file_path)
        report.status = models.ReportStatus.completed
        report.file_path = file_path
        report.file_size_bytes = file_size
        report.total_savings_tl = roi_analysis.potential_annual_savings_tl
        report.completed_at = datetime.utcnow()
        report.expires_at = datetime.utcnow() + timedelta(days=7)
        db.commit()

        logger.info(f"✅ ROI raporu oluşturuldu: {filename} (Tasarruf: {roi_analysis.potential_annual_savings_tl:.0f} TL)")

        if report.notify_user_when_ready:
            try:
                from services.notification_service import get_notification_service
                notif_service = get_notification_service()
                company = db.query(models.Company).filter(models.Company.id == report.company_id).first()
                if company:
                    notif_service.create_notification(
                        db=db,
                        user_id=report.user_id,
                        notification_type='report_ready',
                        title='💰 ROI Analiz Raporunuz Hazır!'
                        ,
                        message=f"{company.name} için yıllık {roi_analysis.potential_annual_savings_tl:.0f} TL tasarruf potansiyeli tespit edildi!",
                        company_id=report.company_id,
                        action_url=f"/dashboard/reports/{report_id}/view",
                        send_email=True
                    )
            except Exception as e:
                logger.error(f"⚠️ ROI rapor bildirim gönderilemedi: {e}")

        return {"status": "success", "report_id": report_id, "file_path": file_path, "file_size": file_size, "total_savings_tl": roi_analysis.potential_annual_savings_tl}
    except Exception as exc:
        logger.error(f"❌ ROI rapor görev hatası: {exc}")
        if 'report' in locals() and report:
            report.status = models.ReportStatus.failed
            report.error_message = str(exc)
            db.commit()
        raise calculate_roi_analysis_async.retry(exc=exc, countdown=600)


@app.task(name='tasks.cleanup_expired_reports', base=DBTask, bind=True)
def cleanup_expired_reports(self):
    db = self.db
    logger.info("🧹 Süresi dolmuş raporlar temizleniyor...")
    expired_reports = db.query(models.Report).filter(
        models.Report.expires_at <= datetime.utcnow(),
        models.Report.status != models.ReportStatus.expired
    ).all()
    deleted_count = 0
    for report in expired_reports:
        try:
            if report.file_path and os.path.exists(report.file_path):
                os.remove(report.file_path)
                logger.debug(f"📁 Dosya silindi: {report.file_path}")
            report.status = models.ReportStatus.expired
            deleted_count += 1
        except Exception as e:
            logger.error(f"⚠️ Rapor temizleme hatası: {e}")
    db.commit()
    logger.info(f"✅ {deleted_count} süresi dolmuş rapor temizlendi")
    return {"cleaned_count": deleted_count}


