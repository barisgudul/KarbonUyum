# backend/celery_config.py

import os

import celery
from celery import Celery
from dotenv import load_dotenv

from database import SessionLocal

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

# Kuyruklar (routing)
app.conf.task_queues = {
    'q_ingestion': {},
    'q_invalid_data': {},
    'q_reports': {},
    'q_analytics': {},
    'q_dead_letter': {},
}


class DBTask(celery.Task):
    _db = None

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        if self._db is not None:
            self._db.close()
            self._db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db


class DeadLetterTask(DBTask):
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        try:
            # Orijinal event argümanı varsayımı: args[0]
            original_event = args[0] if args else {}
            # DLQ'ya yönlendir
            from celery_config import app as _app
            _app.send_task(
                name='tasks.system.handle_dead_letter',
                args=[self.name, original_event, str(exc)],
                queue='q_dead_letter'
            )
        except Exception:
            pass

if __name__ == '__main__':
    app.start()
