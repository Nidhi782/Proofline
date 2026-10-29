export interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
  _mock?: boolean;
}

export interface ProveRequest {
  circuit: 'credential_proof' | 'age_threshold' | 'org_membership' | 'trust_score' | string;
  privateInputs: Record<string, unknown>;
  publicInputs: Record<string, unknown>;
}

export interface ProveResponse {
  proof: ZKProof;
  publicSignals: string[];
  timings: { witnessMs: number; proofMs: number };
}

export interface VerifyRequest {
  circuit: string;
  proof: ZKProof;
  publicSignals: string[];
}

export interface VerifyResponse {
  valid: boolean;
  timingMs: number;
}

export interface CircuitInfo {
  name: string;
  wasmPath: string;
  zkeyPath: string;
  vkeyPath: string;
  available: boolean;
}

export interface MerkleProof {
  root?: string;
  pathElements?: (string | bigint | number)[];
  pathIndices?: (number | string)[];
}

export interface VerifiableCredential {
  '@context': string[];
  id?: string;
  type: string[];
  issuer: { id: string } | string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: Record<string, unknown>;
  proof?: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    proofValue?: string;
    signature?: string;
  };
}

export interface CreateVCRequest {
  issuerDID: string;
  subjectDID: string;
  type: string;
  attributes: Record<string, unknown>;
  expiryDays?: number;
  issuerPrivateKey?: string;
}

export interface CreateVCResponse {
  vc: VerifiableCredential;
  credHash: string;
  ipfsCID?: string;
}
