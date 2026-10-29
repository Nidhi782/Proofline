import hashlib
import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import CredentialRecord
from app.schemas.credentials import CredentialIssueRequest, CredentialRevokeRequest

router = APIRouter()


@router.post("/issue")
async def issue(payload: CredentialIssueRequest, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    vc = {"@context": ["https://www.w3.org/2018/credentials/v1"], "id": f"urn:uuid:{uuid4()}",
          "type": ["VerifiableCredential", payload.credential_type], "issuer": payload.issuer_did,
          "issuanceDate": now.isoformat(), "expirationDate": (now + timedelta(days=payload.expiry_days)).isoformat(),
          "credentialSubject": {"id": payload.subject_did, **payload.attributes}}
    digest = hashlib.sha256(json.dumps(vc, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    row = CredentialRecord(cred_hash=digest, issuer_did=payload.issuer_did, subject_did=payload.subject_did,
                           credential_type=payload.credential_type, raw_credential=vc, ipfs_cid=None)
    db.add(row)
    return {"credential_id": vc["id"], "cred_hash": digest, "ipfs_cid": "local:" + digest[:16], "vc": vc,
            "tx_hash": "local-demo"}


@router.get("")
async def list_credentials(subject_did: str | None = None, db: AsyncSession = Depends(get_db)):
    query = select(CredentialRecord).order_by(CredentialRecord.id.desc()).limit(100)
    if subject_did:
        query = query.where(CredentialRecord.subject_did == subject_did)
    rows = (await db.scalars(query)).all()
    return [{"cred_hash": r.cred_hash, "issuer_did": r.issuer_did, "subject_did": r.subject_did,
             "credential_type": r.credential_type, "revoked": r.revoked, "issued_at": r.issued_at,
             "ipfs_cid": r.ipfs_cid, "vc": r.raw_credential} for r in rows]


@router.post("/revoke")
async def revoke(payload: CredentialRevokeRequest, db: AsyncSession = Depends(get_db)):
    row = await db.scalar(select(CredentialRecord).where(CredentialRecord.cred_hash == payload.cred_hash))
    if not row:
        raise HTTPException(404, "Credential not found")
    row.revoked, row.revoked_at, row.revocation_reason = True, datetime.now(timezone.utc), payload.reason
    return {"cred_hash": row.cred_hash, "revoked": True, "revoked_at": row.revoked_at, "tx_hash": None}
