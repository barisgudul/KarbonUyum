# backend/celery_config.py

from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

# Celery uygulamasını oluştur
app = Celery('karbonuyum')

# Redis'i mesaj broker ve result backend olarak ayarla
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

app.conf.update(
    broker_url=REDIS_URL,
    result_backend=REDIS_URL,
    
    # Task Ayarları
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,
    
    # Retry politikası
    task_autoretry_for={
        'exc': (Exception,),
        'max_retries': 3,
        'countdown': 60
    },
    
    # Periyodik görev ayarları (Beat)
    beat_scheduler='celery.beat:PersistentScheduler',
    beat_schedule={
        'update_industry_benchmarks_weekly': {
            'task': 'tasks.update_industry_benchmarks',
            'schedule': 604800.0,  # 7 gün (saniye cinsinden)
        },
        'detect_anomalies_daily': {
            'task': 'tasks.detect_anomalies',
            'schedule': 86400.0,  # 1 gün (saniye cinsinden)
        },
    }
)

if __name__ == '__main__':
    app.start()
