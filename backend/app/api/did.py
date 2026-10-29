from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import DIDRecord
from app.schemas.did import DIDCreateRequest, DIDUpdateRequest

router = APIRouter()


@router.post("/create")
async def create_did(payload: DIDCreateRequest, db: AsyncSession = Depends(get_db)):
    address = payload.owner_address.strip()
    did = f"did:ethr:31337:{address.lower()}"
    existing = await db.scalar(select(DIDRecord).where(DIDRecord.did == did))
    if existing:
        raise HTTPException(409, "DID already registered")
    document = payload.document or {"@context": ["https://www.w3.org/ns/did/v1"], "id": did,
                                    "verificationMethod": [], "authentication": []}
    document["id"] = did
    record = DIDRecord(did=did, owner_address=address, document=document)
    db.add(record)
    await db.flush()
    return {"did": did, "owner_address": address, "document": document, "active": True,
            "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc), "tx_hash": None}


@router.get("")
async def list_dids(db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(DIDRecord).order_by(DIDRecord.id.desc()).limit(100))).all()
    return {"items": rows, "total": len(rows), "page": 1, "page_size": 100}


@router.get("/{did:path}")
async def resolve_did(did: str, db: AsyncSession = Depends(get_db)):
    row = await db.scalar(select(DIDRecord).where(DIDRecord.did == did))
    if not row or not row.active:
        raise HTTPException(404, "DID not found or deactivated")
    return {"did": row.did, "owner_address": row.owner_address, "document": row.document,
            "active": row.active, "created_at": row.created_at, "updated_at": row.updated_at}


@router.put("/{did:path}")
async def update_did(did: str, payload: DIDUpdateRequest, db: AsyncSession = Depends(get_db)):
    row = await db.scalar(select(DIDRecord).where(DIDRecord.did == did))
    if not row:
        raise HTTPException(404, "DID not found")
    row.document = {**payload.document, "id": did}
    if payload.owner_address:
        row.owner_address = payload.owner_address
    return {"did": row.did, "owner_address": row.owner_address, "document": row.document, "active": row.active}
