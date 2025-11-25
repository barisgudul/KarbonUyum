# backend/tasks/system_tasks.py
"""
This module contains the system tasks for the backend.
"""
import logging

from celery_config import DBTask, app

logger = logging.getLogger(__name__)


@app.task(name='tasks.system.handle_dead_letter', base=DBTask, bind=True)
def handle_dead_letter(self, failed_task_name: str, original_event: dict, error_message: str):
    """
    Kalıcı olarak başarısız olan görevleri kaydeder.
    İleride DB tablosuna yazma veya alarm mekanizması eklenebilir.
    """
    logger.critical(
        f"DEAD LETTER: Task={failed_task_name} Error={error_message} "
        f"EventID={original_event.get('event_id')} Type={original_event.get('event_type')}"
    )
    # TODO: models.EventLog / DataQualityIssue içine kalıcı kayıt eklenebilir
    return {"status": "dead_letter_recorded"}


