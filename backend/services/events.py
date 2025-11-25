# backend/services/events.py
"""
This module contains the events service for the backend.
"""
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from celery_config import app as celery_app
from services.validation_service import EmissionRow, ValidationIssue


class BaseEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    source: str = "backend"
    occurred_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    idempotency_key: Optional[str] = None


class ActivityValidatedEvent(BaseEvent):
    event_type: str = "activity.validated"
    payload: EmissionRow
    context: Dict[str, Any] = Field(default_factory=lambda: {"facility_id": None, "user_id": None})


class ActivityInvalidEvent(BaseEvent):
    event_type: str = "activity.invalid"
    payload: Dict[str, Any]
    error: ValidationIssue


class InvoiceVerifiedEvent(BaseEvent):
    event_type: str = "invoice.verified"
    payload: Dict[str, Any]


def publish_event(event: BaseEvent, queue: Optional[str] = None) -> str:
    routing_key = queue or {
        "activity.validated": "q_ingestion",
        "activity.invalid": "q_invalid_data",
        "invoice.verified": "q_ingestion",
    }.get(event.event_type, "q_ingestion")

    task = celery_app.send_task(
        name="tasks.ingestion.handle_event",
        args=[event.model_dump()],
        queue=routing_key,
    )
    return task.id


