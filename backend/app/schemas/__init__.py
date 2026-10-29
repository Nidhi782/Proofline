"""Pydantic v2 schemas for all API payloads and internal contracts."""

from app.schemas.credentials import (
    CredentialIssueRequest,
    CredentialIssueResponse,
    CredentialRevokeRequest,
    CredentialRevokeResponse,
    CredentialStatusResponse,
    SubjectCredentialsResponse,
)
from app.schemas.did import (
    DIDCreateRequest,
    DIDListResponse,
    DIDResponse,
    DIDUpdateRequest,
)
from app.schemas.governance import (
    GovernanceRequestCreate,
    GovernanceRequestResponse,
    GovernanceStatsResponse,
    GovernanceVoteRequest,
    VoteDetail,
)
from app.schemas.verify import (
    AuditResponse,
    ChallengeResponse,
    PDPDecision,
    PolicyUpdateRequest,
    VerificationRequest,
    ZKProof,
)

__all__ = [
    "DIDCreateRequest",
    "DIDResponse",
    "DIDUpdateRequest",
    "DIDListResponse",
    "CredentialIssueRequest",
    "CredentialIssueResponse",
    "CredentialRevokeRequest",
    "CredentialRevokeResponse",
    "CredentialStatusResponse",
    "SubjectCredentialsResponse",
    "ZKProof",
    "VerificationRequest",
    "PDPDecision",
    "PolicyUpdateRequest",
    "ChallengeResponse",
    "AuditResponse",
    "GovernanceRequestCreate",
    "GovernanceVoteRequest",
    "VoteDetail",
    "GovernanceRequestResponse",
    "GovernanceStatsResponse",
]
