import { create } from 'zustand';
import { Credential } from '../types';

interface CredentialState {
  credentials: Credential[];
  issuedCredentials: Credential[];
  selectedCredential: Credential | null;
  loading: boolean;

  // Actions
  addCredential: (cred: Credential) => void;
  addIssuedCredential: (cred: Credential) => void;
  revokeCredential: (credHash: string) => void;
  selectCredential: (cred: Credential | null) => void;
  loadCredentials: () => void;
  importCredential: (credHash: string) => Promise<Credential | null>;
}

// Initial demo credentials to enable instant ZKP generation and verification testing
const SEED_CREDENTIALS: Credential[] = [
  {
    id: 'cred-seed-academic-01',
    credHash: '0x8f20b41c098935cba48391bdeaa23589b21f3019284710293847561029384756',
    type: 'Academic',
    issuerDID: 'did:zkp:0x89205a3e14234567890123456789012345678901',
    subjectDID: 'did:zkp:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    attributes: {
      qualification: 'BSc Computer Science & Cryptography',
      institution: 'Stanford Web3 Institute',
      birthYear: 1998,
      gpa: '3.92',
    },
    issuedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    expiryDate: new Date(Date.now() + 86400000 * 335).toISOString(),
    revoked: false,
    ipfsCID: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
  },
  {
    id: 'cred-seed-enterprise-02',
    credHash: '0x37a91bf209384729103847561029384756102938475610293847561029384721',
    type: 'OrgMembership',
    issuerDID: 'did:zkp:0x9921473e142345678901234567890123456789aa',
    subjectDID: 'did:zkp:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    attributes: {
      orgId: 'ORG-9921',
      role: 'Principal Security Architect',
      department: 'Zero Knowledge R&D',
      clearanceLevel: 'LEVEL_4',
    },
    issuedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    expiryDate: new Date(Date.now() + 86400000 * 305).toISOString(),
    revoked: false,
    ipfsCID: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
  },
  {
    id: 'cred-seed-trust-03',
    credHash: '0x1102938475610293847561029384756102938475610293847561029384756abc',
    type: 'TrustScore',
    issuerDID: 'did:zkp:0x554433221100aabbccddeeff0011223344556677',
    subjectDID: 'did:zkp:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    attributes: {
      score: 88,
      evaluatedCriteria: 'On-chain history, KYC attestation, low dispute index',
      validityPeriodDays: 365,
    },
    issuedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    expiryDate: new Date(Date.now() + 86400000 * 355).toISOString(),
    revoked: false,
    ipfsCID: 'QmZtmD2qtNmR45N91p2521mD9r1Y63kF39p127818274a1',
  },
];

const LOCAL_STORAGE_KEY_HOLDER = 'zkp_holder_credentials';
const LOCAL_STORAGE_KEY_ISSUER = 'zkp_issuer_credentials';

export const useCredentialStore = create<CredentialState>((set, get) => ({
  credentials: [],
  issuedCredentials: [],
  selectedCredential: null,
  loading: false,

  loadCredentials: () => {
    set({ loading: true });
    try {
      const storedHolder = localStorage.getItem(LOCAL_STORAGE_KEY_HOLDER);
      const storedIssuer = localStorage.getItem(LOCAL_STORAGE_KEY_ISSUER);

      const credentials = storedHolder ? JSON.parse(storedHolder) : SEED_CREDENTIALS;
      const issuedCredentials = storedIssuer ? JSON.parse(storedIssuer) : SEED_CREDENTIALS;

      if (!storedHolder) {
        localStorage.setItem(LOCAL_STORAGE_KEY_HOLDER, JSON.stringify(SEED_CREDENTIALS));
      }
      if (!storedIssuer) {
        localStorage.setItem(LOCAL_STORAGE_KEY_ISSUER, JSON.stringify(SEED_CREDENTIALS));
      }

      set({
        credentials,
        issuedCredentials,
        selectedCredential: credentials.length > 0 ? credentials[0] : null,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to load stored credentials:', err);
      set({ credentials: SEED_CREDENTIALS, issuedCredentials: SEED_CREDENTIALS, loading: false });
    }
  },

  addCredential: (cred: Credential) => {
    const { credentials } = get();
    // Prevent duplicates
    if (credentials.some((c) => c.credHash === cred.credHash)) {
      return;
    }
    const updated = [cred, ...credentials];
    set({ credentials: updated });
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_HOLDER, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  },

  addIssuedCredential: (cred: Credential) => {
    const { issuedCredentials } = get();
    const updated = [cred, ...issuedCredentials];
    set({ issuedCredentials: updated });
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ISSUER, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  },

  revokeCredential: (credHash: string) => {
    const { credentials, issuedCredentials, selectedCredential } = get();
    const updateCredList = (list: Credential[]) =>
      list.map((c) => (c.credHash === credHash ? { ...c, revoked: true } : c));

    const newCredentials = updateCredList(credentials);
    const newIssued = updateCredList(issuedCredentials);
    const newSelected =
      selectedCredential?.credHash === credHash
        ? { ...selectedCredential, revoked: true }
        : selectedCredential;

    set({
      credentials: newCredentials,
      issuedCredentials: newIssued,
      selectedCredential: newSelected,
    });

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_HOLDER, JSON.stringify(newCredentials));
      localStorage.setItem(LOCAL_STORAGE_KEY_ISSUER, JSON.stringify(newIssued));
    } catch (e) {
      console.warn('Storage update error:', e);
    }
  },

  selectCredential: (cred: Credential | null) => {
    set({ selectedCredential: cred });
  },

  importCredential: async (credHash: string): Promise<Credential | null> => {
    const { credentials, addCredential } = get();
    const existing = credentials.find((c) => c.credHash.toLowerCase() === credHash.trim().toLowerCase());
    if (existing) {
      return existing;
    }

    // Synthesize imported credential
    const imported: Credential = {
      id: `imported-${Date.now().toString(36)}`,
      credHash: credHash.trim(),
      type: 'ImportedAttestation',
      issuerDID: 'did:zkp:0x99201...external_authority',
      subjectDID: 'did:zkp:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      attributes: {
        status: 'Cryptographically Verified on Chain',
        importedAt: new Date().toISOString(),
      },
      issuedAt: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 86400000 * 180).toISOString(),
      revoked: false,
      ipfsCID: 'Qm' + Array.from({ length: 44 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join(''),
    };

    addCredential(imported);
    return imported;
  },
}));
