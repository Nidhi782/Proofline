from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings loaded from environment or .env file."""

    APP_NAME: str = "ZKP-DID Backend"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-zkp-did-super-secure-change-in-prod"
    DATABASE_URL: str = "sqlite+aiosqlite:///./zkp_did.db"
    ETH_RPC_URL: str = "http://localhost:8545"
    CHAIN_ID: int = 31337
    ZKP_SERVICE_URL: str = "http://localhost:3001"
    IPFS_API_URL: str = "http://localhost:5001"
    REDIS_URL: str = "redis://localhost:6379"

    # Deployed contract addresses
    DID_REGISTRY_ADDRESS: str = ""
    CREDENTIAL_REGISTRY_ADDRESS: str = ""
    REVOCATION_REGISTRY_ADDRESS: str = ""
    VERIFIER_ADDRESS: str = ""
    GOVERNANCE_ADDRESS: str = ""
    AUDIT_LOG_ADDRESS: str = ""
    PDP_PRIVATE_KEY: str = ""

    # Path to default policies
    DEFAULT_POLICIES_PATH: str = str(
        Path(__file__).resolve().parent / "core" / "default_policies.json"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
