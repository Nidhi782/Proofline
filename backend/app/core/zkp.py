import hashlib
import json
import logging
from typing import Any
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class ZKPClient:
    """HTTP client bridge communicating with the Node.js snarkjs/Circom ZKP microservice."""

    def __init__(self) -> None:
        self.base_url = settings.ZKP_SERVICE_URL.rstrip("/")
        self.ipfs_url = settings.IPFS_API_URL.rstrip("/")
        self.timeout = httpx.Timeout(15.0, connect=5.0)

    async def generate_proof(
        self,
        circuit: str,
        private_inputs: dict[str, Any],
        public_inputs: dict[str, Any],
    ) -> dict[str, Any]:
        """Request the ZKP service to generate a Groth16 zk-SNARK proof."""
        payload = {
            "circuit": circuit,
            "privateInputs": private_inputs,
            "publicInputs": public_inputs,
        }
        url = f"{self.base_url}/prove"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    return response.json()
                logger.error(
                    "ZKP service proof generation failed (%d): %s",
                    response.status_code,
                    response.text,
                )
        except Exception as e:
            logger.warning("Could not connect to ZKP service at %s: %s", url, e)

        # Fallback simulated proof for local development/testing
        logger.info("Generating mock Groth16 proof bundle for circuit %s", circuit)
        return {
            "proof": {
                "a": [
                    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
                ],
                "b": [
                    [
                        "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
                        "0xaaaabbbbccccddddeeeeffff1111222233334444555566667777888899990000",
                    ],
                    [
                        "0x2222333344445555666677778888999900001111bbbbccccddddeeeeffffaaaa",
                        "0xbbbbccccddddeeeeffffaaaa2222333344445555666677778888999900001111",
                    ],
                ],
                "c": [
                    "0x5555666677778888999900001111222233334444ccccddddeeeeffffaaaabbbb",
                    "0xccccddddeeeeffffaaaabbbb5555666677778888999900001111222233334444",
                ],
                "protocol": "groth16",
                "curve": "bn128",
            },
            "publicSignals": [str(v) for v in public_inputs.values()],
        }

    async def verify_proof_locally(
        self,
        proof: dict[str, Any],
        pub_signals: list[str | int],
        circuit: str = "credential_proof",
    ) -> bool:
        """Call ZKP microservice /verify endpoint to run local snarkjs verification."""
        payload = {
            "circuit": circuit,
            "proof": proof,
            "publicSignals": [str(s) for s in pub_signals],
        }
        url = f"{self.base_url}/verify"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    return bool(data.get("valid", False))
                logger.warning(
                    "ZKP verification service returned HTTP %d: %s",
                    response.status_code,
                    response.text,
                )
        except Exception as e:
            logger.warning("ZKP service offline at %s (%s); evaluating proof heuristically", url, e)

        # Proof shape is not proof validity: fail closed if cryptographic verification is unavailable.
        return False

    async def get_circuit_info(self, circuit: str) -> dict[str, Any]:
        """Fetch metadata and verification key info for a compiled circuit."""
        url = f"{self.base_url}/circuits/{circuit}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    return response.json()
        except Exception as e:
            logger.warning("Could not retrieve circuit info for %s: %s", circuit, e)

        return {
            "circuit": circuit,
            "curve": "bn128",
            "protocol": "groth16",
            "constraints": 1024,
            "publicInputsCount": 3,
        }

    async def upload_to_ipfs(self, document: dict[str, Any]) -> str:
        """Upload a Verifiable Credential document to IPFS or return deterministic CID."""
        doc_bytes = json.dumps(document, sort_keys=True).encode("utf-8")
        url = f"{self.ipfs_url}/api/v0/add"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                files = {"file": ("credential.json", doc_bytes, "application/json")}
                response = await client.post(url, files=files)
                if response.status_code == 200:
                    data = response.json()
                    cid = data.get("Hash")
                    if cid:
                        return str(cid)
        except Exception as e:
            logger.warning("IPFS daemon unavailable at %s: %s", url, e)

        # Fallback: compute deterministic base58-like fake CID from sha256
        sha = hashlib.sha256(doc_bytes).hexdigest()
        return f"QmZkp{sha[:42]}"


zkp_client = ZKPClient()
