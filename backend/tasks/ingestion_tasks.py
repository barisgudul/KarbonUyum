# backend/tasks/ingestion_tasks.py
"""
This module contains the ingestion tasks for the backend.
"""
import logging
from datetime import date

from celery_config import app, DBTask, DeadLetterTask
import models

from services.events import ActivityValidatedEvent, ActivityInvalidEvent, InvoiceVerifiedEvent
from tasks.utils import idempotent_task

logger = logging.getLogger(__name__)


@app.task(name='tasks.ingestion.handle_event', base=DeadLetterTask, bind=True, max_retries=3)
@idempotent_task
def handle_event(self, event: dict):
    try:
        event_type = event.get('event_type')
        if event_type == 'activity.validated':
            return _process_activity_validated(event)
        if event_type == 'activity.invalid':
            return _process_activity_invalid(event)
        if event_type == 'invoice.verified':
            return _process_invoice_verified(event)
        logger.warning(f"Bilinmeyen event_type: {event_type}")
        return {"status": "ignored", "event_type": event_type}
    except Exception as exc:
        logger.error(f"❌ Event işleme hatası: {exc}")
        raise self.retry(exc=exc, countdown=60)


def _process_activity_validated(event_dict: dict):
    ev = ActivityValidatedEvent.model_validate(event_dict)
    payload = ev.payload
    facility_id = (ev.context or {}).get('facility_id')

    db_activity = models.ActivityData(
        facility_id=facility_id,
        activity_type=models.ActivityType(payload.activity_id),
        quantity=payload.quantity,
        unit=payload.unit,
        start_date=payload.start_date,
        end_date=payload.end_date,
        scope=models.ScopeType.scope_2 if payload.activity_id == models.ActivityType.electricity.value else models.ScopeType.scope_1,
        is_simulation=False,
        is_fallback_calculation=False,
    )
    handle_event.request.task.db.add(db_activity)  # type: ignore
    handle_event.request.task.db.commit()  # type: ignore
    return {"status": "ok", "id": db_activity.id}


def _process_activity_invalid(event_dict: dict):
    ev = ActivityInvalidEvent.model_validate(event_dict)
    logger.warning(f"DQ: invalid activity: {ev.error.code} | {ev.error.message} | {ev.payload}")
    return {"status": "recorded"}


def _process_invoice_verified(event_dict: dict):
    _ = InvoiceVerifiedEvent.model_validate(event_dict)
    logger.info("Invoice verified event alındı")
    return {"status": "ok"}


