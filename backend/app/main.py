"""
ZKP-DID Framework — FastAPI Backend Entry Point

Starts the FastAPI application with:
  - CORS middleware (open in dev)
  - PEP (Policy Enforcement Point) middleware
  - DID, Credentials, Verify, Governance routers
  - Lifespan context for DB initialization
  - Health check endpoint
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import init_db
from app.core.pep import PEPMiddleware
from app.api import did, credentials, verify, governance


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup and clean up on shutdown."""
    # Startup
    await init_db()
    print(f"✅ {settings.APP_NAME} started (debug={settings.DEBUG})")
    yield
    # Shutdown
    print(f"🛑 {settings.APP_NAME} shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "ZKP-Enabled Decentralized Identity Verification Framework — "
        "Privacy-preserving access control using zk-SNARKs, W3C DIDs, "
        "Verifiable Credentials, and dual-chain blockchain architecture."
    ),
    openapi_tags=[
        {"name": "did",         "description": "W3C Decentralized Identifier management"},
        {"name": "credentials", "description": "Verifiable Credential issuance and revocation"},
        {"name": "verify",      "description": "Zero-Knowledge Proof verification and PDP decisions"},
        {"name": "governance",  "description": "Peer-review governance for verifier data requests"},
        {"name": "system",      "description": "Health and system endpoints"},
    ],
    lifespan=lifespan,
)

# ─── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(PEPMiddleware)

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(did.router,         prefix="/did",         tags=["did"])
app.include_router(credentials.router, prefix="/credentials", tags=["credentials"])
app.include_router(verify.router,      prefix="/verify",      tags=["verify"])
app.include_router(governance.router,  prefix="/governance",  tags=["governance"])


# ─── Root / Health ────────────────────────────────────────────────────────────

@app.get("/", tags=["system"])
async def root():
    """API root — redirect hint."""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["system"])
async def health_check():
    """Health check endpoint used by Docker and load balancers."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "debug": settings.DEBUG,
        "eth_rpc": settings.ETH_RPC_URL,
        "zkp_service": settings.ZKP_SERVICE_URL,
    }
