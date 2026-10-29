"""Celery entry point for asynchronous work; proof jobs are deliberately explicit."""

import json
import os
from urllib.request import Request, urlopen

from celery import Celery

broker = os.getenv("REDIS_URL", "redis://localhost:6379")
celery_app = Celery("zkp_did", broker=broker, backend=broker)


@celery_app.task(name="app.core.tasks.generate_proof")
def generate_proof(payload: dict) -> dict:
    """Forward a proof job to the configured ZKP service and return its response."""
    endpoint = os.getenv("ZKP_SERVICE_URL", "http://localhost:3001").rstrip("/") + "/prove"
    request = Request(endpoint, data=json.dumps(payload).encode(),
                      headers={"Content-Type": "application/json"}, method="POST")
    with urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode())
