import 'dotenv/config';
import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';

const app = express();
const port = Number(process.env.PORT || 8000);
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zkp_did';
const zkpUrl = (process.env.ZKP_SERVICE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));

const credentialSchema = new mongoose.Schema({
  cred_hash: { type: String, unique: true, index: true }, issuer_did: String,
  subject_did: { type: String, index: true }, credential_type: String,
  issued_at: { type: Date, default: Date.now }, revoked: { type: Boolean, default: false },
  revoked_at: Date, revocation_reason: String, ipfs_cid: String, vc: mongoose.Schema.Types.Mixed,
});
const didSchema = new mongoose.Schema({
  did: { type: String, unique: true, index: true }, owner_address: String,
  document: mongoose.Schema.Types.Mixed, active: { type: Boolean, default: true },
}, { timestamps: true });
const governanceSchema = new mongoose.Schema({
  request_id: { type: String, unique: true, index: true }, requester_did: String,
  domain: String, data_fields: [String], justification: String,
  status: { type: String, default: 'PENDING' }, votes: { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { timestamps: true });
const auditSchema = new mongoose.Schema({
  nullifier: { type: String, unique: true, index: true }, proof_hash: String,
  domain: String, permitted: Boolean, reason: String, timestamp: { type: Date, default: Date.now },
});
const Credential = mongoose.model('Credential', credentialSchema);
const DID = mongoose.model('DID', didSchema);
const GovernanceRequest = mongoose.model('GovernanceRequest', governanceSchema);
const Audit = mongoose.model('Audit', auditSchema);

const policies = {
  academic: { domain: 'academic', description: 'Academic access: holder presents a valid academic credential and satisfies the configured predicates.', predicates: [{ type: 'age_gte', threshold: 18 }, { type: 'trust_score_gte', threshold: 0.8 }] },
  enterprise: { domain: 'enterprise', description: 'Enterprise access policy.', predicates: [{ type: 'trust_score_gte', threshold: 0.85 }] },
  iot: { domain: 'iot', description: 'IoT device access policy.', predicates: [{ type: 'trust_score_gte', threshold: 0.75 }] },
  healthcare: { domain: 'healthcare', description: 'Healthcare access policy.', predicates: [{ type: 'age_gte', threshold: 18 }] },
};

app.get('/', (_req, res) => res.json({ name: 'Proofline Node API', version: '1.0.0', docs: '/health' }));
app.get('/health', (_req, res) => res.json({ status: mongoose.connection.readyState === 1 ? 'healthy' : 'starting', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', app: 'Proofline Node API' }));

app.post('/did/create', async (req, res, next) => {
  try {
    const owner = String(req.body.owner_address || '').trim();
    if (!owner) return res.status(400).json({ detail: 'owner_address is required' });
    const did = `did:ethr:31337:${owner.toLowerCase()}`;
    const document = { '@context': ['https://www.w3.org/ns/did/v1'], ...(req.body.document || {}), id: did };
    const record = await DID.create({ did, owner_address: owner, document });
    return res.status(201).json({ did: record.did, owner_address: record.owner_address, document: record.document, active: true, created_at: record.createdAt, updated_at: record.updatedAt });
  } catch (err) { if (err.code === 11000) return res.status(409).json({ detail: 'DID already registered' }); next(err); }
});
app.get('/did', async (_req, res, next) => { try { const rows = await DID.find({ active: true }).sort({ createdAt: -1 }).limit(100).lean(); res.json({ items: rows, total: rows.length, page: 1, page_size: 100 }); } catch (e) { next(e); } });
app.get('/did/:did', async (req, res, next) => { try { const row = await DID.findOne({ did: req.params.did, active: true }).lean(); if (!row) return res.status(404).json({ detail: 'DID not found' }); res.json({ did: row.did, owner_address: row.owner_address, document: row.document, active: row.active, created_at: row.createdAt, updated_at: row.updatedAt }); } catch (e) { next(e); } });
app.put('/did/:did', async (req, res, next) => { try { const row = await DID.findOneAndUpdate({ did: req.params.did }, { document: { ...(req.body.document || {}), id: req.params.did }, ...(req.body.owner_address ? { owner_address: req.body.owner_address } : {}) }, { new: true }); if (!row) return res.status(404).json({ detail: 'DID not found' }); res.json({ did: row.did, owner_address: row.owner_address, document: row.document, active: row.active }); } catch (e) { next(e); } });

app.post('/credentials/issue', async (req, res, next) => {
  try {
    const issuer_did = String(req.body.issuer_did || '').trim();
    const subject_did = String(req.body.subject_did || '').trim();
    const credential_type = String(req.body.credential_type || '').trim();
    const attributes = req.body.attributes ?? {};
    const expiry_days = req.body.expiry_days ?? 365;
    if (!issuer_did || !subject_did || !credential_type || !attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return res.status(400).json({ detail: 'issuer_did, subject_did, credential_type and an attributes object are required' });
    if (!Number.isInteger(Number(expiry_days)) || Number(expiry_days) < 1 || Number(expiry_days) > 3650) return res.status(400).json({ detail: 'expiry_days must be an integer between 1 and 3650' });
    const now = new Date();
    const vc = { '@context': ['https://www.w3.org/2018/credentials/v1'], id: `urn:uuid:${crypto.randomUUID()}`, type: ['VerifiableCredential', credential_type], issuer: issuer_did, issuanceDate: now.toISOString(), expirationDate: new Date(now.getTime() + Number(expiry_days) * 86400000).toISOString(), credentialSubject: { ...attributes, id: subject_did } };
    const cred_hash = crypto.createHash('sha256').update(JSON.stringify(vc)).digest('hex');
    await Credential.create({ cred_hash, issuer_did, subject_did, credential_type, vc, ipfs_cid: `local:${cred_hash.slice(0, 16)}` });
    res.status(201).json({ credential_id: vc.id, cred_hash, storage: 'mongodb-local', vc, transaction_hash: null });
  } catch (e) { next(e); }
});
app.get('/credentials', async (req, res, next) => { try { const filter = req.query.subject_did ? { subject_did: req.query.subject_did } : {}; const rows = await Credential.find(filter).sort({ issued_at: -1 }).limit(100).lean(); res.json(rows); } catch (e) { next(e); } });
app.post('/credentials/revoke', async (req, res, next) => { try { const row = await Credential.findOneAndUpdate({ cred_hash: req.body.cred_hash }, { revoked: true, revoked_at: new Date(), revocation_reason: req.body.reason || 'Revoked by issuer' }, { new: true }); if (!row) return res.status(404).json({ detail: 'Credential not found' }); res.json({ cred_hash: row.cred_hash, revoked: true, revoked_at: row.revoked_at }); } catch (e) { next(e); } });

app.get('/verify/policies', (_req, res) => res.json(policies));
app.get('/verify/policy/:domain', (req, res) => { const policy = policies[req.params.domain.toLowerCase()]; return policy ? res.json(policy) : res.status(404).json({ detail: 'No policy configured for this domain' }); });
app.get('/verify/audit', async (req, res, next) => {
  try {
    const parsedLimit = Number.parseInt(String(req.query.limit || '10'), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 10;
    const rows = await Audit.find().sort({ timestamp: -1 }).limit(limit).lean();
    res.json(rows);
  } catch (e) { next(e); }
});
app.get('/verify/audit/:nullifier', async (req, res, next) => { try { const row = await Audit.findOne({ nullifier: req.params.nullifier }).lean(); return row ? res.json(row) : res.status(404).json({ detail: 'Audit entry not found' }); } catch (e) { next(e); } });
app.post('/verify/proof', async (req, res, next) => {
  try {
    const { proof, public_signals = [], domain, credential_hash, nullifier } = req.body;
    if (!proof || !domain || !credential_hash || !nullifier || !Array.isArray(public_signals)) return res.status(400).json({ detail: 'proof, public_signals, domain, credential_hash and nullifier are required' });
    if (await Audit.exists({ nullifier })) return res.status(409).json({ detail: 'Nullifier has already been used' });
    const credential = await Credential.findOne({ cred_hash: credential_hash, revoked: false }).lean();
    const policy = policies[String(domain).toLowerCase()];
    let verified = false;
    if (credential && policy) {
      try {
        const piProof = { pi_a: proof.pi_a || proof.a, pi_b: proof.pi_b || proof.b, pi_c: proof.pi_c || proof.c, protocol: proof.protocol || 'groth16', curve: proof.curve || 'bn128' };
        const response = await fetch(`${zkpUrl}/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ circuit: 'credential_proof', proof: piProof, publicSignals: public_signals }), signal: AbortSignal.timeout(12000) });
        if (response.ok) verified = Boolean((await response.json()).valid);
      } catch { verified = false; }
    }
    // The prototype does not allow a client-supplied signal to substitute for
    // predicates that have not yet been cryptographically bound into a circuit.
    const permitted = Boolean(credential && !credential.revoked && policy && verified && policy.predicates.length === 1 && String(public_signals[0]) === '1');
    const reason = !credential ? 'Credential is unknown or revoked' : !policy ? 'No access policy is configured for this domain' : !verified ? 'Proof could not be cryptographically verified; access denied' : !permitted ? 'This policy requires circuit-specific predicate binding; access denied' : 'Proof verified and policy satisfied';
    const proof_hash = crypto.createHash('sha256').update(JSON.stringify(proof)).digest('hex');
    const audit = await Audit.create({ nullifier, proof_hash, domain, permitted, reason });
    res.json({ permitted, decision: permitted ? 'PERMIT' : 'DENY', reason, audit_ref: String(audit._id), timestamp: audit.timestamp, circuit_used: 'credential_proof', proof_verified: verified });
  } catch (e) { if (e.code === 11000) return res.status(409).json({ detail: 'Nullifier has already been used' }); next(e); }
});

app.get('/governance/requests', async (_req, res, next) => { try { res.json(await GovernanceRequest.find().sort({ createdAt: -1 }).lean()); } catch (e) { next(e); } });
app.post('/governance/request', async (req, res, next) => {
  try {
    const requester_did = String(req.body.requester_did || '').trim();
    const domain = String(req.body.domain || '').trim().toLowerCase();
    const justification = String(req.body.justification || '').trim();
    const data_fields = Array.isArray(req.body.data_fields)
      ? [...new Set(req.body.data_fields.filter((field) => typeof field === 'string').map((field) => field.trim()).filter(Boolean))]
      : [];
    if (!requester_did || !policies[domain] || data_fields.length === 0 || !justification) {
      return res.status(400).json({ detail: 'A requester DID, configured domain, at least one data field, and justification are required' });
    }
    const row = await GovernanceRequest.create({ request_id: `gov-${crypto.randomUUID().slice(0, 12)}`, requester_did, domain, data_fields, justification });
    res.status(201).json(row);
  } catch (e) { next(e); }
});
app.post('/governance/vote', async (req, res, next) => {
  try {
    const row = await GovernanceRequest.findOne({ request_id: req.body.request_id });
    if (!row) return res.status(404).json({ detail: 'Governance request not found' });
    if (row.status !== 'PENDING') return res.status(409).json({ detail: 'This request is already resolved' });
    const voter = String(req.body.voter_address || '').trim();
    if (!voter) return res.status(400).json({ detail: 'voter_address is required' });
    if (typeof req.body.approve !== 'boolean') return res.status(400).json({ detail: 'approve must be a boolean' });
    if (row.votes.some(v => String(v.voter_address).toLowerCase() === voter.toLowerCase())) return res.status(409).json({ detail: 'This reviewer has already voted' });
    row.votes.push({ voter_address: voter, approve: Boolean(req.body.approve), comment: req.body.comment || '', timestamp: new Date() });
    if (row.votes.length >= 2) { const approvals = row.votes.filter(v => v.approve).length; row.status = approvals > row.votes.length / 2 ? 'APPROVED' : 'REJECTED'; }
    await row.save(); res.json(row);
  } catch (e) { next(e); }
});
app.get('/governance/stats', async (_req, res, next) => { try { const rows = await GovernanceRequest.find().lean(); res.json({ total_requests: rows.length, pending_requests: rows.filter(x => x.status === 'PENDING').length, approved_requests: rows.filter(x => x.status === 'APPROVED').length, rejected_requests: rows.filter(x => x.status === 'REJECTED').length, total_votes: rows.reduce((n, x) => n + x.votes.length, 0) }); } catch (e) { next(e); } });

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
  const detail = status === 400 && err.type === 'entity.parse.failed' ? 'Malformed JSON request body' : 'Server error';
  res.status(status).json({ detail, message: process.env.NODE_ENV === 'production' ? undefined : err.message });
});

await mongoose.connect(mongoUri);
app.listen(port, '127.0.0.1', () => console.log(`Proofline Node API listening at http://localhost:${port} (MongoDB connected)`));
