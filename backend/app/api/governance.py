from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import GovernanceRequest
from app.schemas.governance import GovernanceRequestCreate, GovernanceVoteRequest

router = APIRouter()
QUORUM = 2


@router.get("/requests")
async def list_requests(db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(GovernanceRequest).order_by(GovernanceRequest.id.desc()))).all()
    return rows


@router.post("/request")
async def create_request(payload: GovernanceRequestCreate, db: AsyncSession = Depends(get_db)):
    row = GovernanceRequest(request_id="gov-" + uuid4().hex[:12], requester_did=payload.requester_did,
                            domain=payload.domain, data_fields=payload.data_fields,
                            justification=payload.justification, status="PENDING", votes=[])
    db.add(row)
    await db.flush()
    return row


@router.post("/vote")
async def vote(payload: GovernanceVoteRequest, db: AsyncSession = Depends(get_db)):
    row = await db.scalar(select(GovernanceRequest).where(GovernanceRequest.request_id == payload.request_id))
    if not row:
        raise HTTPException(404, "Governance request not found")
    if row.status != "PENDING":
        raise HTTPException(409, "This request is already resolved")
    votes = list(row.votes or [])
    if any(v["voter_address"].lower() == payload.voter_address.lower() for v in votes):
        raise HTTPException(409, "This reviewer has already voted")
    votes.append({"voter_address": payload.voter_address, "approve": payload.approve,
                  "comment": payload.comment, "timestamp": datetime.now(timezone.utc).isoformat()})
    row.votes = votes
    if len(votes) >= QUORUM:
        yes = sum(1 for v in votes if v["approve"])
        row.status = "APPROVED" if yes > len(votes) / 2 else "REJECTED"
    await db.flush()
    return row


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(GovernanceRequest))).all()
    return {"total_requests": len(rows), "pending_requests": sum(r.status == "PENDING" for r in rows),
            "approved_requests": sum(r.status == "APPROVED" for r in rows),
            "rejected_requests": sum(r.status == "REJECTED" for r in rows),
            "total_votes": sum(len(r.votes or []) for r in rows)}
