# backend/tasks/utils.py
"""
This module contains the utility functions for the backend.
"""
import os
import logging
from functools import wraps

import redis

logger = logging.getLogger(__name__)
redis_client = redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))


def idempotent_task(func):
    @wraps(func)
    def wrapper(self, event: dict, *args, **kwargs):
        try:
            event_id = (event or {}).get('event_id')
            if not event_id:
                logger.warning("Event has no event_id, idempotency not guaranteed.")
                return func(self, event, *args, **kwargs)

            lock_key = f"processed_event:{event_id}"
            # 1 saatlik TTL ile atomik set-if-not-exists
            if redis_client.set(lock_key, 1, ex=3600, nx=True):
                try:
                    return func(self, event, *args, **kwargs)
                except Exception:
                    # Retry edilebilmesi için kilidi aç
                    try:
                        redis_client.delete(lock_key)
                    except Exception:
                        pass
                    raise
            else:
                logger.info(f"Event {event_id} already processed. Skipping.")
                return {"status": "skipped", "reason": "idempotency_key_exists"}
        except Exception:
            # Güvenli tarafta kal: idempotency problemi olmaması için orijinal fonksiyona pas etmeyelim
            raise
    return wrapper


