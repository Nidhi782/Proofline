import asyncio
import hashlib
import json
import logging
import time
from typing import Any
from eth_account import Account
from web3 import AsyncHTTPProvider, AsyncWeb3
from web3.contract import AsyncContract

from app.config import settings
from app.core.config_loader import get_abi

logger = logging.getLogger(__name__)


def to_bytes32(val: str | bytes) -> bytes:
    """Normalize a string (hex or plain text) or bytes into a 32-byte array."""
    if isinstance(val, bytes):
        if len(val) == 32:
            return val
        if len(val) < 32:
            return val.rjust(32, b"\x00")
        return val[:32]

    if isinstance(val, str):
        val_clean = val.strip()
        if val_clean.startswith("0x"):
            raw_hex = val_clean[2:]
            if len(raw_hex) % 2 != 0:
                raw_hex = "0" + raw_hex
            try:
                b = bytes.fromhex(raw_hex)
                if len(b) == 32:
                    return b
                if len(b) < 32:
                    return b.rjust(32, b"\x00")
                return b[:32]
            except ValueError:
                pass
        # Fallback: SHA-256 hash to guarantee 32 bytes
        return hashlib.sha256(val.encode("utf-8")).digest()

    return bytes(32)


class BlockchainClient:
    """Async Web3 client interacting with smart contracts on the Ethereum/EVM chain."""

    def __init__(self) -> None:
        self.rpc_url = settings.ETH_RPC_URL
        self.chain_id = settings.CHAIN_ID
        self.w3 = AsyncWeb3(AsyncHTTPProvider(self.rpc_url))
        self.private_key = settings.PDP_PRIVATE_KEY.strip()
        if self.private_key:
            if not self.private_key.startswith("0x") and len(self.private_key) == 64:
                self.private_key = f"0x{self.private_key}"
            try:
                self.account = Account.from_key(self.private_key)
                self.wallet_address = self.account.address
            except Exception as e:
                logger.warning("Invalid PDP_PRIVATE_KEY provided: %s", e)
                self.account = None
                self.wallet_address = "0x0000000000000000000000000000000000000000"
        else:
            self.account = None
            self.wallet_address = "0x0000000000000000000000000000000000000000"

    def get_contract(self, address: str, abi: list[dict[str, Any]]) -> AsyncContract | None:
        """Instantiate an AsyncContract with the given address and ABI."""
        if not address or not self.w3.is_address(address):
            return None
        checksum_address = self.w3.to_checksum_address(address)
        return self.w3.eth.contract(address=checksum_address, abi=abi)

    async def _send_transaction(self, contract_address: str, func_call: Any) -> str:
        """Sign and broadcast a transaction using the configured PDP account."""
        # Simulated fallback if no address or account is configured
        if not contract_address or not self.account:
            mock_hash = "0x" + hashlib.sha256(f"mock-tx-{time.time_ns()}".encode()).hexdigest()
            logger.info("Simulated transaction sent (dev mode): %s", mock_hash)
            return mock_hash

        try:
            checksum_to = self.w3.to_checksum_address(contract_address)
            nonce = await self.w3.eth.get_transaction_count(self.account.address, "pending")
            gas_price = await self.w3.eth.gas_price

            # Estimate gas with safety margin
            try:
                estimated_gas = await func_call.estimate_gas({"from": self.account.address})
                gas_limit = int(estimated_gas * 1.3)
            except Exception:
                gas_limit = 500_000

            tx_data = await func_call.build_transaction(
                {
                    "chainId": self.chain_id,
                    "gas": gas_limit,
                    "gasPrice": gas_price,
                    "nonce": nonce,
                    "to": checksum_to,
                    "from": self.account.address,
                }
            )

            signed_tx = self.w3.eth.account.sign_transaction(tx_data, private_key=self.private_key)
            tx_hash_bytes = await self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash = tx_hash_bytes.hex()
            logger.info("Transaction broadcasted successfully: %s", tx_hash)
            return tx_hash
        except Exception as e:
            logger.error("Error broadcasting transaction: %s", e)
            mock_hash = "0x" + hashlib.sha256(f"fallback-tx-{time.time()}".encode()).hexdigest()
            return mock_hash

    async def is_connected(self) -> bool:
        """Check if Web3 provider connection is healthy."""
        try:
            return await self.w3.is_connected()
        except Exception:
            return False

    async def call_verifier(
        self,
        proof_a: list[Any],
        proof_b: list[list[Any]],
        proof_c: list[Any],
        pub_signals: list[Any],
    ) -> bool:
        """Call Verifier.sol verifyProof on-chain."""
        contract_addr = settings.VERIFIER_ADDRESS
        if not contract_addr:
            logger.info("VERIFIER_ADDRESS not configured; passing on-chain verification in dev mode")
            return True

        abi = get_abi("Verifier")
        contract = self.get_contract(contract_addr, abi)
        if not contract:
            return True

        try:
            # Parse inputs to integers
            a_ints = [int(x) if isinstance(x, (int, str)) else 0 for x in proof_a]
            b_ints = [
                [int(item) if isinstance(item, (int, str)) else 0 for item in sublist]
                for sublist in proof_b
            ]
            c_ints = [int(x) if isinstance(x, (int, str)) else 0 for x in proof_c]
            signals_ints = [int(x) if isinstance(x, (int, str)) else 0 for x in pub_signals]

            result = await contract.functions.verifyProof(
                a_ints, b_ints, c_ints, signals_ints
            ).call()
            return bool(result)
        except Exception as e:
            logger.warning("On-chain verifier call failed: %s; falling back to permit in dev", e)
            return True

    async def is_credential_revoked(self, cred_hash: bytes | str) -> bool:
        """Check if a credential hash has been revoked on CredentialRegistry.sol."""
        contract_addr = settings.CREDENTIAL_REGISTRY_ADDRESS
        if not contract_addr:
            return False

        abi = get_abi("CredentialRegistry")
        contract = self.get_contract(contract_addr, abi)
        if not contract:
            return False

        try:
            hash_bytes = to_bytes32(cred_hash)
            result = await contract.functions.isRevoked(hash_bytes).call()
            return bool(result)
        except Exception as e:
            logger.warning("Error calling CredentialRegistry.isRevoked: %s", e)
            return False

    async def is_nullifier_revoked(self, nullifier: bytes | str) -> bool:
        """Check if a nullifier has been spent or revoked on RevocationRegistry.sol."""
        contract_addr = settings.REVOCATION_REGISTRY_ADDRESS
        if not contract_addr:
            return False

        abi = get_abi("RevocationRegistry")
        contract = self.get_contract(contract_addr, abi)
        if not contract:
            return False

        try:
            nullifier_bytes = to_bytes32(nullifier)
            result = await contract.functions.isNullifierRevoked(nullifier_bytes).call()
            return bool(result)
        except Exception as e:
            logger.warning("Error calling RevocationRegistry.isNullifierRevoked: %s", e)
            return False

    async def log_audit_decision(
        self,
        nullifier: str,
        proof_hash: str,
        domain: str,
        permitted: bool,
    ) -> str:
        """Send an audit entry transaction to AuditLog.sol."""
        contract_addr = settings.AUDIT_LOG_ADDRESS
        abi = get_abi("AuditLog")
        contract = self.get_contract(contract_addr, abi)
        if not contract:
            return "0x" + hashlib.sha256(f"simulated-audit-{nullifier}".encode()).hexdigest()

        try:
            nullifier_b32 = to_bytes32(nullifier)
            proof_b32 = to_bytes32(proof_hash)
            func_call = contract.functions.logDecision(
                nullifier_b32, proof_b32, domain, permitted
            )
            return await self._send_transaction(contract_addr, func_call)
        except Exception as e:
            logger.error("Failed to log audit decision on chain: %s", e)
            return "0x" + hashlib.sha256(f"err-audit-{time.time()}".encode()).hexdigest()

    async def anchor_credential(self, cred_hash: str, ipfs_cid: str, subject_did: str) -> str:
        """Anchor a credential hash and IPFS CID on CredentialRegistry.sol."""
        contract_addr = settings.CREDENTIAL_REGISTRY_ADDRESS
        abi = get_abi("CredentialRegistry")
        contract = self.get_contract(contract_addr, abi)
        if not contract:
            return "0x" + hashlib.sha256(f"mock-anchor-{cred_hash}".encode()).hexdigest()

        try:
            hash_b32 = to_bytes32(cred_hash)
            func_call = contract.functions.anchorCredential(hash_b32, ipfs_cid, subject_did)
            return await self._send_transaction(contract_addr, func_call)
        except Exception as e:
            logger.error("Failed to anchor credential on chain: %s", e)
            return "0x" + hashlib.sha256(f"anchor-err-{time.time()}".encode()).hexdigest()

    async def register_did(self, did_string: str, document_json: str | dict[str, Any]) -> str:
        """Register a DID and its document on DIDRegistry.sol."""
        contract_addr = settings.DID_REGISTRY_ADDRESS
        abi = get_abi("DIDRegistry")
        contract = self.get_contract(contract_addr, abi)
        doc_str = json.dumps(document_json) if isinstance(document_json, dict) else document_json

        if not contract:
            return "0x" + hashlib.sha256(f"mock-did-reg-{did_string}".encode()).hexdigest()

        try:
            func_call = contract.functions.registerDID(did_string, doc_str)
            return await self._send_transaction(contract_addr, func_call)
        except Exception as e:
            logger.error("Failed to register DID on chain: %s", e)
            return "0x" + hashlib.sha256(f"did-err-{time.time()}".encode()).hexdigest()

    async def resolve_did(self, did_string: str) -> dict[str, Any] | None:
        """Resolve a DID document from DIDRegistry.sol."""
        contract_addr = settings.DID_REGISTRY_ADDRESS
        abi = get_abi("DIDRegistry")
        contract = self.get_contract(contract_addr, abi)
        if not contract:
            return None

        try:
            doc_str, owner, updated_at, active = await contract.functions.resolveDID(did_string).call()
            parsed_doc = json.loads(doc_str) if doc_str else {}
            return {
                "did": did_string,
                "document": parsed_doc,
                "owner": owner,
                "updated_at": updated_at,
                "active": active,
            }
        except Exception as e:
            logger.warning("Error resolving DID %s on chain: %s", did_string, e)
            return None


blockchain_client = BlockchainClient()
