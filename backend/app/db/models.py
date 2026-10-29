from datetime import datetime
from typing import Any
from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class DIDRecord(Base):
    """Stores W3C Decentralized Identifiers and their associated DID documents."""

    __tablename__ = "did_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    did: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    owner_address: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    document: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class CredentialRecord(Base):
    """Stores issued and revoked Verifiable Credentials with IPFS CIDs and on-chain hashes."""

    __tablename__ = "credential_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cred_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    ipfs_cid: Mapped[str | None] = mapped_column(String(255), nullable=True)
    issuer_did: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    subject_did: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    credential_type: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revocation_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_credential: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)


class AccessPolicy(Base):
    """Stores domain-specific access policies and verification predicates."""

    __tablename__ = "access_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    domain: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    policy_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class GovernanceRequest(Base):
    """Stores data verification requests submitted for peer review in governance."""

    __tablename__ = "governance_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    requester_did: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    domain: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    data_fields: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    justification: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="PENDING", nullable=False
    )  # PENDING, APPROVED, REJECTED
    votes: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    on_chain_tx: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AuditEntry(Base):
    """Stores immutable audit trail records of access decisions made by the PDP."""

    __tablename__ = "audit_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nullifier: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    proof_hash: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    domain: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    permitted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    verifier_address: Mapped[str | None] = mapped_column(String(100), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    tx_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
