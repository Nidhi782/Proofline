from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class ZKProof(BaseModel):
    """Groth16 zero-knowledge proof bundle."""

    a: list[str] = Field(..., description="G1 point (x, y)")
    b: list[list[str]] = Field(..., description="G2 point 2x2 matrix coordinates")
    c: list[str] = Field(..., description="G1 point (x, y)")
    protocol: str = Field("groth16", description="Proving protocol")
    curve: str = Field("bn128", description="Elliptic curve family")


class VerificationRequest(BaseModel):
    """Proof verification and access evaluation payload submitted to the PDP."""

    proof: ZKProof = Field(..., description="The Groth16 zero-knowledge proof")
    public_signals: list[str] = Field(..., description="Public signal values from circuit")
    domain: str = Field(..., description="Target security domain (e.g. academic, enterprise)")
    credential_hash: str = Field(..., description="Hash of the credential being proven")
    nullifier: str = Field(..., description="Unique nullifier preventing double-spend / replay")


class PDPDecision(BaseModel):
    """Policy Decision Point access resolution output."""

    permitted: bool = Field(..., description="Final access decision: True=PERMIT, False=DENY")
    reason: str = Field(..., description="Detailed rationale for the decision")
    audit_ref: str = Field(..., description="Identifier or transaction hash in audit log")
    timestamp: datetime = Field(..., description="Timestamp when decision was evaluated")
    circuit_used: str | None = Field("credential_verifier", description="Circuit identifier evaluated")


class PolicyUpdateRequest(BaseModel):
    """Request to define or update access predicates for a domain."""

    domain: str = Field(..., description="Domain name (e.g. academic, iot, enterprise)")
    description: str | None = Field(None, description="Human readable policy description")
    predicates: list[dict[str, Any]] = Field(..., description="List of access predicate rules")


class ChallengeResponse(BaseModel):
    """Fresh cryptographic nonce challenge generated for a verification session."""

    challenge: str = Field(..., description="Random hex nonce challenge")
    domain: str = Field(..., description="Target domain for the challenge")
    expires_at: datetime = Field(..., description="Expiration timestamp")


class AuditResponse(BaseModel):
    """Audit entry representation returned from log query."""

    nullifier: str
    proof_hash: str
    domain: str
    permitted: bool
    verifier_address: str | None = None
    timestamp: datetime
    tx_hash: str | None = None
    reason: str | None = None

    model_config = ConfigDict(from_attributes=True)
