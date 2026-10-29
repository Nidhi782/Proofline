# ZKP-DID Framework — API Reference

## Base URL
- **Development**: `http://localhost:8000`
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Authentication

All endpoints on `/protected/*` require a `X-ZK-Proof` header containing a base64-encoded proof bundle:

```
X-ZK-Proof: base64({
  "proof": { "pi_a": [...], "pi_b": [[...],[...]], "pi_c": [...] },
  "publicSignals": ["1", "0x...", "0x..."],
  "domain": "academic",
  "credentialHash": "0x...",
  "nullifier": "0x..."
})
```

The Policy Enforcement Point (PEP) middleware validates this header and calls the PDP before forwarding the request.

---

## DID Endpoints

### `POST /did/create`

Register a new W3C DID.

**Request Body:**
```json
{
  "owner_address": "0x742d35Cc6634C0532925a3b8D4C9C2C8e4a3e1f",
  "document": {
    "@context": ["https://www.w3.org/ns/did/v1"],
    "verificationMethod": [{
      "id": "#key-1",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "publicKeyHex": "0x..."
    }]
  }
}
```

**Response `201`:**
```json
{
  "did": "did:ethr:0x742d35Cc6634C0532925a3b8D4C9C2C8e4a3e1f",
  "document": { ... },
  "tx_hash": "0x3d8f...",
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

### `GET /did/{did}`

Resolve a DID document.

**Response `200`:**
```json
{
  "did": "did:ethr:0x...",
  "document": { ... },
  "active": true,
  "created_at": "...",
  "updated_at": "..."
}
```

---

## Credentials Endpoints

### `POST /credentials/issue`

Issue a W3C Verifiable Credential.

**Request Body:**
```json
{
  "issuer_did": "did:ethr:0x...",
  "subject_did": "did:ethr:0x...",
  "credential_type": "AgeCredential",
  "attributes": {
    "birthYear": 1990
  },
  "expiry_days": 365
}
```

**Response `201`:**
```json
{
  "credential_id": "uuid",
  "cred_hash": "0xabc123...",
  "ipfs_cid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
  "vc": {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    "type": ["VerifiableCredential", "AgeCredential"],
    "issuer": "did:ethr:0x...",
    "issuanceDate": "2025-01-15T10:30:00Z",
    "expirationDate": "2026-01-15T10:30:00Z",
    "credentialSubject": {
      "id": "did:ethr:0x...",
      "birthYear": 1990
    },
    "proof": { ... }
  },
  "tx_hash": "0x..."
}
```

---

### `POST /credentials/revoke`

Revoke a credential.

**Request Body:**
```json
{
  "cred_hash": "0xabc123...",
  "reason": "Key compromise"
}
```

**Response `200`:**
```json
{
  "success": true,
  "tx_hash": "0x..."
}
```

---

## Verification Endpoints

### `POST /verify/proof`

Submit a ZK proof for access-control decision.

**Request Body:**
```json
{
  "proof": {
    "pi_a": ["12345...", "67890..."],
    "pi_b": [["11111...", "22222..."], ["33333...", "44444..."]],
    "pi_c": ["55555...", "66666..."],
    "protocol": "groth16",
    "curve": "bn128"
  },
  "public_signals": ["1", "0xcommitment...", "0xnullifier..."],
  "domain": "academic",
  "credential_hash": "0xcredhash...",
  "nullifier": "0xnullifier..."
}
```

**Response `200` — PERMIT:**
```json
{
  "permitted": true,
  "reason": "ZK proof valid; policy predicates satisfied",
  "audit_ref": "0xauditref...",
  "timestamp": "2025-01-15T10:30:01Z",
  "circuit_used": "credential_proof"
}
```

**Response `200` — DENY:**
```json
{
  "permitted": false,
  "reason": "Credential revoked on-chain",
  "audit_ref": "0xauditref...",
  "timestamp": "2025-01-15T10:30:01Z",
  "circuit_used": "credential_proof"
}
```

---

### `GET /verify/policy/{domain}`

Get access policy for a domain.

**Path params:** `domain` = `academic` | `iot` | `enterprise` | `healthcare`

**Response `200`:**
```json
{
  "domain": "academic",
  "predicates": [
    { "type": "age_gte", "threshold": 18 },
    { "type": "has_qualification", "qualification_code": 1 }
  ],
  "updated_at": "2025-01-15T10:00:00Z"
}
```

---

### `POST /verify/generate-challenge`

Generate a fresh nonce challenge for a proof session.

**Response `200`:**
```json
{
  "challenge": "0x3f4a8b2c...",
  "expires_at": "2025-01-15T10:35:00Z"
}
```

---

### `GET /verify/audit/{nullifier}`

Get audit trail for a nullifier.

**Response `200`:**
```json
[
  {
    "nullifier": "0x...",
    "domain": "academic",
    "permitted": true,
    "proof_hash": "0x...",
    "timestamp": "2025-01-15T10:30:01Z",
    "tx_hash": "0x..."
  }
]
```

---

## Governance Endpoints

### `POST /governance/request`

Submit a verifier data request for peer review.

**Request Body:**
```json
{
  "requester_did": "did:ethr:0x...",
  "domain": "healthcare",
  "data_fields": ["age", "qualification"],
  "justification": "Required for specialist consultation age verification"
}
```

**Response `201`:**
```json
{
  "request_id": "0xrequestid...",
  "status": "PENDING",
  "on_chain_tx": "0x..."
}
```

---

### `POST /governance/vote`

Cast a peer review vote.

**Request Body:**
```json
{
  "request_id": "0xrequestid...",
  "voter_address": "0x...",
  "approve": true,
  "comment": "Data fields are proportionate to stated purpose"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Human-readable error message",
  "error_code": "CREDENTIAL_REVOKED",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

| HTTP Code | Error Code | Meaning |
|-----------|-----------|---------|
| 400 | INVALID_PROOF | Proof format invalid |
| 403 | ACCESS_DENIED | PDP returned DENY |
| 403 | CREDENTIAL_REVOKED | Credential revoked on-chain |
| 403 | NULLIFIER_USED | Proof replay detected |
| 404 | DID_NOT_FOUND | DID not registered |
| 422 | VALIDATION_ERROR | Request body invalid |
| 500 | BLOCKCHAIN_ERROR | On-chain call failed |
