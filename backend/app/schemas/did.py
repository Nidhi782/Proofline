from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class DIDCreateRequest(BaseModel):
    """Payload for creating and registering a new Decentralized Identifier."""

    owner_address: str = Field(..., description="Ethereum wallet address of DID owner")
    document: dict[str, Any] = Field(
        default_factory=dict,
        description="W3C DID Document structure including verification methods and services",
    )


class DIDUpdateRequest(BaseModel):
    """Payload for updating an existing DID document."""

    document: dict[str, Any] = Field(..., description="Updated W3C DID document")
    owner_address: str | None = Field(
        None, description="Optional address to transfer ownership to"
    )


class DIDResponse(BaseModel):
    """Standardized response format for DID records."""

    did: str
    owner_address: str
    document: dict[str, Any]
    active: bool
    created_at: datetime
    updated_at: datetime
    tx_hash: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DIDListResponse(BaseModel):
    """Paginated list of DID records."""

    items: list[DIDResponse]
    total: int
    page: int
    page_size: int
