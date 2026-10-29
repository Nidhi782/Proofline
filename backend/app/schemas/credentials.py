from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class CredentialIssueRequest(BaseModel):
    """Payload to issue a W3C Verifiable Credential."""

    issuer_did: str = Field(..., description="DID of the issuing authority")
    subject_did: str = Field(..., description="DID of the credential subject")
    credential_type: str = Field(..., description="e.g. IdentityCredential, DegreeCredential")
    attributes: dict[str, Any] = Field(..., description="Subject claims and identity attributes")
    expiry_days: int = Field(365, ge=1, le=3650, description="Credential validity duration in days")


class CredentialIssueResponse(BaseModel):
    """Result of issuing and anchoring a Verifiable Credential."""

    credential_id: str
    cred_hash: str
    ipfs_cid: str
    vc: dict[str, Any]
    tx_hash: str


class CredentialRevokeRequest(BaseModel):
    """Payload to revoke an issued credential."""

    cred_hash: str = Field(..., description="Cryptographic hash of the credential to revoke")
    reason: str = Field(..., description="Reason for revocation")


class CredentialRevokeResponse(BaseModel):
    """Result of credential revocation."""

    cred_hash: str
    revoked: bool
    revoked_at: datetime
    tx_hash: str | None = None


class CredentialStatusResponse(BaseModel):
    """Status details for an issued credential."""

    cred_hash: str
    issuer_did: str
    subject_did: str
    credential_type: str
    revoked: bool
    revoked_at: datetime | None = None
    revocation_reason: str | None = None
    issued_at: datetime
    ipfs_cid: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SubjectCredentialsResponse(BaseModel):
    """All credentials associated with a subject DID."""

    subject_did: str
    credentials: list[CredentialStatusResponse]
