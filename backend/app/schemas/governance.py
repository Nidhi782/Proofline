from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class VoteDetail(BaseModel):
    """Detailed record of an individual peer review vote."""

    voter_address: str = Field(..., description="Ethereum wallet address of voting peer")
    approve: bool = Field(..., description="Approval (True) or Rejection (False)")
    comment: str = Field("", description="Optional rationalization or comment")
    timestamp: datetime = Field(..., description="Time vote was recorded")


class GovernanceRequestCreate(BaseModel):
    """Payload to submit a verifier data access request for peer review."""

    requester_did: str = Field(..., description="DID of the requesting entity")
    domain: str = Field(..., description="Domain requesting access to")
    data_fields: list[str] = Field(..., description="Requested identity credential attribute fields")
    justification: str = Field(..., description="Business or academic necessity statement")


class GovernanceVoteRequest(BaseModel):
    """Payload to cast a vote on a pending governance request."""

    request_id: str = Field(..., description="Hex identifier of the governance request")
    voter_address: str = Field(..., description="Ethereum wallet address of reviewer")
    approve: bool = Field(..., description="True to approve, False to reject")
    comment: str = Field("", description="Optional rationale or justification for vote")


class GovernanceRequestResponse(BaseModel):
    """Representation of a peer-reviewed governance request."""

    request_id: str
    requester_did: str
    domain: str
    data_fields: list[str]
    justification: str | None = None
    status: str
    votes: list[VoteDetail]
    created_at: datetime
    on_chain_tx: str | None = None

    model_config = ConfigDict(from_attributes=True)


class GovernanceStatsResponse(BaseModel):
    """Aggregated statistics across all governance proposals."""

    total_requests: int
    pending_requests: int
    approved_requests: int
    rejected_requests: int
    total_votes: int
