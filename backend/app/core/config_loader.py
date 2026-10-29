import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Fallback ABIs matching the smart contract interfaces
FALLBACK_ABIS: dict[str, list[dict[str, Any]]] = {
    "DIDRegistry": [
        {
            "inputs": [
                {"internalType": "string", "name": "did", "type": "string"},
                {"internalType": "string", "name": "documentJson", "type": "string"},
            ],
            "name": "registerDID",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [{"internalType": "string", "name": "did", "type": "string"}],
            "name": "resolveDID",
            "outputs": [
                {"internalType": "string", "name": "documentJson", "type": "string"},
                {"internalType": "address", "name": "owner", "type": "address"},
                {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
                {"internalType": "bool", "name": "active", "type": "bool"},
            ],
            "stateMutability": "view",
            "type": "function",
        },
        {
            "inputs": [
                {"internalType": "string", "name": "did", "type": "string"},
                {"internalType": "string", "name": "documentJson", "type": "string"},
            ],
            "name": "updateDID",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [{"internalType": "string", "name": "did", "type": "string"}],
            "name": "deactivateDID",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
    ],
    "CredentialRegistry": [
        {
            "inputs": [
                {"internalType": "bytes32", "name": "credHash", "type": "bytes32"},
                {"internalType": "string", "name": "ipfsCid", "type": "string"},
                {"internalType": "string", "name": "subjectDid", "type": "string"},
            ],
            "name": "anchorCredential",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [
                {"internalType": "bytes32", "name": "credHash", "type": "bytes32"},
                {"internalType": "string", "name": "reason", "type": "string"},
            ],
            "name": "revokeCredential",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [{"internalType": "bytes32", "name": "credHash", "type": "bytes32"}],
            "name": "isRevoked",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function",
        },
        {
            "inputs": [{"internalType": "bytes32", "name": "credHash", "type": "bytes32"}],
            "name": "getCredential",
            "outputs": [
                {"internalType": "bytes32", "name": "credHash", "type": "bytes32"},
                {"internalType": "string", "name": "ipfsCid", "type": "string"},
                {"internalType": "string", "name": "subjectDid", "type": "string"},
                {"internalType": "address", "name": "issuer", "type": "address"},
                {"internalType": "uint256", "name": "issuedAt", "type": "uint256"},
                {"internalType": "bool", "name": "revoked", "type": "bool"},
            ],
            "stateMutability": "view",
            "type": "function",
        },
    ],
    "RevocationRegistry": [
        {
            "inputs": [{"internalType": "bytes32", "name": "nullifier", "type": "bytes32"}],
            "name": "revokeNullifier",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [{"internalType": "bytes32", "name": "nullifier", "type": "bytes32"}],
            "name": "isNullifierRevoked",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function",
        },
    ],
    "Verifier": [
        {
            "inputs": [
                {"internalType": "uint256[2]", "name": "a", "type": "uint256[2]"},
                {"internalType": "uint256[2][2]", "name": "b", "type": "uint256[2][2]"},
                {"internalType": "uint256[2]", "name": "c", "type": "uint256[2]"},
                {"internalType": "uint256[]", "name": "input", "type": "uint256[]"},
            ],
            "name": "verifyProof",
            "outputs": [{"internalType": "bool", "name": "r", "type": "bool"}],
            "stateMutability": "view",
            "type": "function",
        }
    ],
    "GovernanceMultiSig": [
        {
            "inputs": [
                {"internalType": "bytes32", "name": "requestId", "type": "bytes32"},
                {"internalType": "string", "name": "requesterDid", "type": "string"},
                {"internalType": "string", "name": "domain", "type": "string"},
                {"internalType": "string[]", "name": "dataFields", "type": "string[]"},
                {"internalType": "string", "name": "justification", "type": "string"},
            ],
            "name": "submitRequest",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [
                {"internalType": "bytes32", "name": "requestId", "type": "bytes32"},
                {"internalType": "bool", "name": "approve", "type": "bool"},
                {"internalType": "string", "name": "comment", "type": "string"},
            ],
            "name": "vote",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [{"internalType": "bytes32", "name": "requestId", "type": "bytes32"}],
            "name": "getRequest",
            "outputs": [
                {"internalType": "bytes32", "name": "requestId", "type": "bytes32"},
                {"internalType": "string", "name": "requesterDid", "type": "string"},
                {"internalType": "string", "name": "domain", "type": "string"},
                {"internalType": "uint8", "name": "status", "type": "uint8"},
                {"internalType": "uint256", "name": "approvals", "type": "uint256"},
                {"internalType": "uint256", "name": "rejections", "type": "uint256"},
            ],
            "stateMutability": "view",
            "type": "function",
        },
    ],
    "AuditLog": [
        {
            "inputs": [
                {"internalType": "bytes32", "name": "nullifier", "type": "bytes32"},
                {"internalType": "bytes32", "name": "proofHash", "type": "bytes32"},
                {"internalType": "string", "name": "domain", "type": "string"},
                {"internalType": "bool", "name": "permitted", "type": "bool"},
            ],
            "name": "logDecision",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function",
        },
        {
            "inputs": [{"internalType": "bytes32", "name": "nullifier", "type": "bytes32"}],
            "name": "getDecision",
            "outputs": [
                {"internalType": "bytes32", "name": "nullifier", "type": "bytes32"},
                {"internalType": "bytes32", "name": "proofHash", "type": "bytes32"},
                {"internalType": "string", "name": "domain", "type": "string"},
                {"internalType": "bool", "name": "permitted", "type": "bool"},
                {"internalType": "address", "name": "verifier", "type": "address"},
                {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
            ],
            "stateMutability": "view",
            "type": "function",
        },
    ],
}


def get_abi(contract_name: str) -> list[dict[str, Any]]:
    """
    Load contract ABI from hardhat artifacts directory.
    Searches:
      1. ../../hardhat/artifacts/contracts/<ContractName>.sol/<ContractName>.json
      2. ../../../hardhat/artifacts/contracts/<ContractName>.sol/<ContractName>.json
      3. Fallback built-in ABI if artifact is not found.
    """
    clean_name = contract_name.removesuffix(".sol").removesuffix(".json")

    base_dir = Path(__file__).resolve().parent
    search_roots = [
        base_dir.parent.parent.parent / "hardhat" / "artifacts" / "contracts",
        base_dir.parent.parent / "hardhat" / "artifacts" / "contracts",
        Path.cwd() / "hardhat" / "artifacts" / "contracts",
        Path.cwd().parent / "hardhat" / "artifacts" / "contracts",
    ]

    for search_root in search_roots:
        if not search_root.exists():
            continue
        # Search direct file or in subfolder *.sol/*.json
        direct_file = search_root / f"{clean_name}.sol" / f"{clean_name}.json"
        if direct_file.is_file():
            try:
                with open(direct_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "abi" in data and isinstance(data["abi"], list):
                        return data["abi"]
            except Exception as e:
                logger.warning(
                    "Failed to read artifact at %s: %s", direct_file, e
                )

        # Glob match for contract
        for candidate in search_root.rglob(f"{clean_name}.json"):
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "abi" in data and isinstance(data["abi"], list):
                        return data["abi"]
            except Exception as e:
                logger.warning("Failed reading ABI from %s: %s", candidate, e)

    # If artifact file not found, use fallback or return empty list
    if clean_name in FALLBACK_ABIS:
        logger.info(
            "Hardhat artifact for %s not found on disk; utilizing standard fallback ABI",
            clean_name,
        )
        return FALLBACK_ABIS[clean_name]

    logger.warning("Contract ABI for '%s' not found. Returning empty list.", clean_name)
    return []
