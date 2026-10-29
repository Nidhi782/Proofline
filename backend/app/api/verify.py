import hashlib
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.policy import PolicyEngine
from app.core.zkp import zkp_client
from app.db.database import get_db
from app.db.models import AccessPolicy, AuditEntry, CredentialRecord
from app.schemas.verify import VerificationRequest

router = APIRouter()
engine = PolicyEngine()


@router.get("/policy/{domain}")
async def get_policy(domain: str, db: AsyncSession = Depends(get_db)):
    row = await db.scalar(select(AccessPolicy).where(AccessPolicy.domain == domain.lower()))
    policy = row.policy_json if row else engine.get_default_policy(domain)
    if policy is None:
        raise HTTPException(404, "No policy configured for this domain")
    return policy


@router.get("/policies")
async def policies():
    return engine.default_policies


@router.post("/proof")
async def verify(request: VerificationRequest, db: AsyncSession = Depends(get_db)):
    previous = await db.scalar(select(AuditEntry).where(AuditEntry.nullifier == request.nullifier))
    if previous:
        raise HTTPException(409, "Nullifier has already been used")
    credential = await db.scalar(select(CredentialRecord).where(CredentialRecord.cred_hash == request.credential_hash))
    policy_row = await db.scalar(select(AccessPolicy).where(AccessPolicy.domain == request.domain.lower()))
    policy = policy_row.policy_json if policy_row else engine.get_default_policy(request.domain)
    permitted, reason = False, "Credential is unknown or revoked"
    verified = False
    if credential and not credential.revoked and policy:
        proof_payload = request.proof.model_dump()
        proof_payload = {"pi_a": proof_payload["a"], "pi_b": proof_payload["b"],
                         "pi_c": proof_payload["c"], "protocol": proof_payload["protocol"],
                         "curve": proof_payload["curve"]}
        verified = await zkp_client.verify_proof_locally(proof_payload, request.public_signals, "credential_proof")
        if verified:
            permitted, reason = engine.evaluate(policy, request.public_signals)
        else:
            reason = "Proof could not be cryptographically verified; access denied"
    elif not policy:
        reason = "No access policy is configured for this domain"
    proof_hash = hashlib.sha256(json.dumps(request.proof.model_dump(), sort_keys=True).encode()).hexdigest()
    entry = AuditEntry(nullifier=request.nullifier, proof_hash=proof_hash, domain=request.domain,
                       permitted=permitted, reason=reason)
    db.add(entry)
    await db.flush()
    return {"permitted": permitted, "decision": "PERMIT" if permitted else "DENY", "reason": reason,
            "audit_ref": str(entry.id), "timestamp": datetime.now(timezone.utc),
            "circuit_used": "credential_verifier", "proof_verified": verified}


@router.get("/audit/{nullifier}")
async def audit(nullifier: str, db: AsyncSession = Depends(get_db)):
    row = await db.scalar(select(AuditEntry).where(AuditEntry.nullifier == nullifier))
    if not row:
        raise HTTPException(404, "Audit entry not found")
    return row
