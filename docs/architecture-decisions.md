# ZKP-DID Framework — Architecture Decision Records

## ADR-001: Groth16 over PLONK/STARKs

**Decision**: Use Groth16 (SnarkJS) as the ZK proving system.

**Context**: Three main ZK proving systems are candidates:
- **Groth16** (pairing-based SNARK, trusted setup, O(1) proof size)
- **PLONK** (universal trusted setup, larger proofs, more flexible)
- **STARKs** (no trusted setup, post-quantum, large proofs)

**Rationale**:
- Groth16 produces the smallest proofs (3 group elements — ~200 bytes) and the fastest on-chain verification (single pairing check — ~5ms vs 700ms for EVM)
- SnarkJS is the most mature JS library, enabling browser-side proving
- Berrios Moya et al. demonstrate 5.74ms Groth16 on-chain verification vs 703.9ms without ZK
- Trusted setup (Powers of Tau) can be reused across circuits of same constraint size

**Trade-off**: Trusted setup ceremony required. Mitigated by using the public Hermez ceremony (1000+ participants).

---

## ADR-002: Poseidon over SHA-256 in circuits

**Decision**: Use Poseidon hash for all in-circuit hashing.

**Rationale**: Poseidon is designed for ZK circuits — ~50 constraints vs ~25,000 for SHA-256 in R1CS. This makes commitment computation and Merkle tree verification 500× cheaper in terms of circuit size and proving time.

---

## ADR-003: Baby Jubjub EdDSA for credential signatures

**Decision**: Use EdDSA on the Baby Jubjub curve for signing credentials.

**Rationale**: Baby Jubjub is defined over the BN128 scalar field, making EdDSA signature verification natively expressible as R1CS constraints in Circom. This allows the ZK circuit to verify the issuer's signature over the credential hash inside the proof — proving the credential is genuine without revealing it.

---

## ADR-004: did:ethr over did:web or did:key

**Decision**: Use `did:ethr` as the DID method.

**Rationale**:
- Anchored to Ethereum — same chain used for credential registry, natural fit
- Widely supported by resolver libraries
- Key rotation supported through DID document updates on-chain
- `did:key` has no revocation support; `did:web` reintroduces centralization

---

## ADR-005: Dual-chain architecture

**Decision**: Use two logical chains — Chain A (public Verifiable Data Registry) and Chain B (governance/audit).

**Rationale**: Separating governance votes and audit logs from the DID/credential anchoring chain:
- Prevents governance spam from bloating the credential registry
- Allows different permission models (open write for DID registration, restricted write for governance)
- In development, simulated as two Hardhat network instances

---

## ADR-006: Off-chain credential storage via IPFS

**Decision**: Store raw VC JSON-LD documents on IPFS; only anchor the CID + Poseidon hash on-chain.

**Rationale**:
- GDPR/data-minimisation compliance — raw PII never touches the immutable ledger
- CID provides content-addressable integrity — tampering with IPFS document changes CID, invalidating on-chain anchor
- Holder can pin their own CID on their own IPFS node for self-sovereignty

---

## ADR-007: Nullifier pattern for replay prevention

**Decision**: Derive a `nullifier = Poseidon(credHash, nonce)` and track used nullifiers in RevocationRegistry.sol.

**Rationale**: Prevents the same credential proof from being replayed across multiple sessions. The nonce is session-specific (issued as a challenge by the verifier), making each proof unique. The nullifier reveals nothing about the underlying credential (Poseidon preimage resistance).

---

## ADR-008: Policy Decision Point / Policy Enforcement Point separation

**Decision**: Implement PDP and PEP as separate, independently testable modules.

**Rationale**: Follows the XACML architectural pattern. PEP is a middleware layer that intercepts requests; PDP is the pure logic that evaluates proofs against policies. This separation enables:
- Unit-testing PDP logic without HTTP concerns
- Swapping PEP implementations (gRPC, REST, WebSocket) without touching policy logic
- Future integration with OPA (Open Policy Agent) as a PDP backend

---

## ADR-009: FastAPI (Python) + Node.js ZKP microservice

**Decision**: Split the backend into a Python FastAPI service (business logic, blockchain calls) and a Node.js microservice (ZKP proof generation).

**Rationale**: SnarkJS is JavaScript-native and significantly faster than Python bindings. The Python backend handles all business logic, database operations, and blockchain calls using web3.py. The Node.js service is called over HTTP for proof generation/verification. This maintains language-idiomatic performance for each task.
