# Proofline: Privacy-Preserving Digital Identity Verification with Zero-Knowledge Proofs

Proofline is a prototype for decentralized identity and selective-disclosure access control. It combines a React dashboard, FastAPI policy decision service, Node.js Groth16 service, Circom circuits, and Solidity registries. An alternate Express/MongoDB API is also included for a Node.js-only local run. The current local demo supports credential issuance, holder records, policy verification requests, audit entries, and demo peer votes.

> **Prototype status:** this is a research/demo codebase, not a production identity or security product. Do not enter real personal data, use the development signing keys, or deploy the included contracts to a public network. The FastAPI backend stores credentials as JSON in SQLite; the alternate Node API stores them in MongoDB. IPFS upload, on-chain writes, secure wallet encryption, and production-grade DID/VC signatures need further integration. Access fails closed if real proof verification is unavailable.

## Technology stack

| Layer | Technology | Use in this project |
|---|---|---|
| ZK circuits | Circom 2, circomlib, Poseidon | Age, membership, trust-score, and credential proof circuit sources |
| Proofs | SnarkJS 0.7, Groth16 / BN254 | Node service proving and verifying compiled circuits |
| Smart contracts | Solidity 0.8.24, Hardhat 2, ethers.js 6, OpenZeppelin 5 | Local DID, credential, revocation, governance, verifier, and audit contracts |
| API / PDP | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, aiosqlite | REST endpoints, policy decisions, local metadata and audit storage |
| Alternate API | Node.js, Express, Mongoose | Optional Node-only local API backed by MongoDB (`backend-node/`) |
| ZK service | Node.js 20, TypeScript 5, Express | Proof, verification, circuit, VC and storage service endpoints |
| Dashboard | React 18, TypeScript 5, Vite 5, Tailwind CSS 3, Lucide | Issuer, holder, verifier, governance, and overview screens |
| Client libraries | Axios, ethers.js 6, SnarkJS, Zustand | API requests, wallet and proof helpers; not all are wired into the current screens |
| Storage | SQLite / SQLAlchemy or MongoDB / Mongoose, depending on API mode | Local metadata; decentralized IPFS upload is an integration point |
| Operations | Docker Compose, Redis, Celery | Local service orchestration and queue dependencies; proof jobs are not yet queued |
| Dev tooling | pnpm workspaces, TypeScript, Ruff, pytest, Vitest, Hardhat | Package management and project test/tooling configuration |

## Run the dashboard and services

### Node.js and MongoDB local mode

This is the simplest option if you want to run the project with Node.js and inspect data in MongoDB Compass. It uses the additional `backend-node/` API. Start MongoDB first, then open separate VS Code terminals for the API, proof service, and frontend. The services stay running in each terminal.

```powershell
# Terminal 1: if MongoDB is not already running as a Windows service, start it locally.
New-Item -ItemType Directory -Force .mongodb-data | Out-Null
mongod --dbpath .mongodb-data --bind_ip 127.0.0.1 --port 27017
# In Compass, connect to mongodb://127.0.0.1:27017

# Terminal 2: Node API (MongoDB database name: zkp_did)
cd backend-node
npm.cmd install
npm.cmd run dev

# Terminal 3: ZKP service
cd zkp-service
npm.cmd install
npm.cmd run dev

# Terminal 4: frontend
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`. Check API status at `http://localhost:8000/health` and proof-service status at `http://localhost:3001/health`. In Compass, refresh the connection to `127.0.0.1:27017`; `zkp_did` appears after the first successful database write. Keep only one copy of each service running to avoid port conflicts (`EADDRINUSE`).

The Node/Mongo API is a local demo backend. It is not the same implementation as the Python/FastAPI + SQLite backend described below. Pick one API implementation for a run; both use port 8000 by default and cannot run at the same time on that port.

### Docker Compose

Install Docker Desktop, then from this folder:

```powershell
docker compose up --build
```

Open the dashboard at `http://localhost:5173`, the backend docs at `http://localhost:8000/docs`, and the ZKP service health endpoint at `http://localhost:3001/health`.

The Compose file currently starts a local Hardhat node, Redis, ZKP service, FastAPI backend and dashboard. The chain is a development network with throwaway accounts. Compose orchestration does not imply that each API currently writes to the chain.

### Run the dashboard locally

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Run the backend separately with Python 3.12 and its dependencies installed:

```powershell
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

The proof service can be run separately with Node.js 20:

```powershell
cd zkp-service
npm.cmd install
npm.cmd run dev
```

Compiled circuit artifacts and their trusted setup files are not checked into this repository. A usable proving/verifying setup requires compiling circuits and producing trusted-setup artifacts for the intended circuit version; never reuse development ceremony output for production.

## Demo workflow

1. Use **Issuer** to create a fictional credential record. The Node/Mongo demo does not cryptographically sign the credential.
2. Open **Holder wallet** and choose the record to copy its hash into the verifier form. The dashboard does not currently generate a proof from the form.
3. To submit a presentation under **Verifier**, provide a real generated proof and its public signals. The API checks credential status, calls the ZKP service, evaluates the selected domain policy, and records a decision. If verification keys are missing, or the selected policy predicates are not bound into the circuit, the result is DENY.
4. Create and review a data request under **Governance**. Two distinct reviewer IDs are required for a decision. This is demo governance logic, not authenticated or on-chain voting.

## API surface

- `GET /health`, `GET /docs`
- `POST /did/create`, `GET /did`, `GET /did/{did}`, `PUT /did/{did}`
- `POST /credentials/issue`, `GET /credentials`, `POST /credentials/revoke`
- `GET /verify/policies`, `GET /verify/policy/{domain}`, `POST /verify/proof`, `GET /verify/audit`, `GET /verify/audit/{nullifier}`
- `GET /governance/requests`, `POST /governance/request`, `POST /governance/vote`, `GET /governance/stats`
- ZKP service: `GET /health`, `POST /prove`, `POST /verify`, `GET /circuits`, `POST /vc`, `POST /ipfs`

## Repository map

- `frontend/` React dashboard and browser helpers
- `backend/app/api/` FastAPI routes; `backend/app/core/` policy, PEP and ZKP bridge
- `zkp-service/src/` Express service and SnarkJS bridge
- `circuits/` Circom circuit sources
- `hardhat/contracts/` Solidity registries and governance/audit contracts
- `docs/` architecture, circuit and API notes
- [Project guide](docs/PROJECT_GUIDE.md) architecture, local run steps, actual validation observations, and remaining work

## Before production use

Use a reviewed DID method and VC data model with issuer signature verification; keep subject claims encrypted in a holder-controlled wallet; bind proofs to the request, domain, credential status and nullifier in reviewed circuits; use a properly documented trusted setup or a transparent proof system; authenticate and authorize API and governance actors; and complete independent contract, circuit, privacy and threat-model reviews. Configure a real chain and storage provider only after those controls are in place.
