### backend/services/data_analysis_service.py
from datetime import date
from typing import Tuple

from dateutil.relativedelta import relativedelta
from fastapi import Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from database import get_db


class DataAnalysisService:
    def __init__(self, db: Session):
        self.db = db

    def get_monthly_activity_data_summary(
        self, facility_id: int, activity_type: models.ActivityType, months_ago: int = 12
    ) -> Tuple[int, float]:
        """
        Belirli bir tesis ve aktivite tipi için aylık veri yeterliliğini ve ortalama aylık miktarı döndürür.
        Dönüş değeri: (verinin olduğu ay sayısı, ortalama aylık miktar)
        """
        end_date = date.today()
        start_date = end_date - relativedelta(months=months_ago)

        distinct_months_query = self.db.query(
            func.count(func.distinct(func.to_char(models.ActivityData.start_date, 'YYYY-MM')))
        ).filter(
            models.ActivityData.facility_id == facility_id,
            models.ActivityData.activity_type == activity_type,
            models.ActivityData.start_date >= start_date
        )
        months_with_data = distinct_months_query.scalar() or 0

        if months_with_data == 0:
            return 0, 0.0

        monthly_avg_quantity_query = self.db.query(
            func.sum(models.ActivityData.quantity) / func.count(func.distinct(func.to_char(models.ActivityData.start_date, 'YYYY-MM')))
        ).filter(
            models.ActivityData.facility_id == facility_id,
            models.ActivityData.activity_type == activity_type,
            models.ActivityData.start_date >= start_date
        )
        avg_monthly_quantity = monthly_avg_quantity_query.scalar() or 0.0
        
        return months_with_data, avg_monthly_quantity

def get_data_analysis_service(db: Session = Depends(get_db)) -> DataAnalysisService:
    return DataAnalysisService(db)
