export interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export interface Credential {
  id: string;
  credHash: string;
  type: string;
  issuerDID: string;
  subjectDID: string;
  attributes: Record<string, unknown>;
  issuedAt: string;
  expiryDate: string;
  revoked: boolean;
  ipfsCID: string;
}

export interface PDPDecision {
  permitted: boolean;
  reason: string;
  auditRef: string;
  timestamp: string;
  circuitUsed: string;
}

export interface GovernanceVote {
  address: string;
  approve: boolean;
  comment?: string;
  timestamp?: string;
}

export interface GovernanceRequest {
  requestId: string;
  requesterDID: string;
  domain: string;
  dataFields: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  votes: GovernanceVote[];
  createdAt: string;
  justification?: string;
  approvalsCount?: number;
  rejectionsCount?: number;
  quorum?: number;
}

export interface AuditEntry {
  nullifier: string;
  domain: string;
  permitted: boolean;
  timestamp: string;
  proofHash: string;
  credentialHash?: string;
  circuitUsed?: string;
  reason?: string;
}

export interface DIDDocument {
  did: string;
  ownerAddress: string;
  document: Record<string, unknown>;
  createdAt: string;
  active: boolean;
}

export interface PolicyPredicate {
  predicate: string;
  threshold?: number | string;
  allowedValues?: string[];
  description: string;
  type: 'comparison' | 'membership' | 'range' | 'equality';
}

export interface DomainPolicy {
  domain: string;
  name: string;
  description: string;
  predicates: PolicyPredicate[];
  circuit: string;
  requiredFields: string[];
}

export interface ProofHistoryItem {
  id: string;
  domain: string;
  credentialHash: string;
  timestamp: string;
  proof: ZKProof;
  publicSignals: string[];
  nullifier: string;
  status: 'PERMITTED' | 'DENIED' | 'VERIFIED';
}
