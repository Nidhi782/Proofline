import crypto from 'node:crypto';
import { ethers } from 'ethers';
import { VerifiableCredential } from './types.js';

/**
 * Generate a did:ethr identifier from an Ethereum address or public key
 */
export function generateDID(address: string): string {
  let cleaned = address.trim();
  if (cleaned.startsWith('did:ethr:')) {
    cleaned = cleaned.replace('did:ethr:', '');
  }

  if (ethers.isAddress(cleaned)) {
    return `did:ethr:${ethers.getAddress(cleaned)}`;
  }

  // If not a standard 20-byte address, sanitize and return
  return `did:ethr:${cleaned}`;
}

/**
 * Create a W3C Verifiable Credential JSON-LD document
 */
export function createVC(
  issuerDID: string,
  subjectDID: string,
  type: string,
  attributes: Record<string, unknown>,
  expiryDays: number = 365
): VerifiableCredential {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

  const vc: VerifiableCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://schema.org',
    ],
    id: `urn:uuid:${crypto.randomUUID()}`,
    type: ['VerifiableCredential', type],
    issuer: {
      id: issuerDID,
    },
    issuanceDate: now.toISOString(),
    expirationDate: expirationDate.toISOString(),
    credentialSubject: {
      id: subjectDID,
      ...attributes,
    },
  };

  return vc;
}

/**
 * Recursively sort object keys for deterministic canonical JSON stringification
 */
function canonicalizeJson(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeJson);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, any> = {};
  for (const key of sortedKeys) {
    result[key] = canonicalizeJson(obj[key]);
  }
  return result;
}

/**
 * Compute canonical keccak256 hash of a Verifiable Credential (excluding proof)
 */
export function computeCredentialHash(vc: object): string {
  // Strip proof property if present
  const { proof, ...unsignedVC } = vc as any;
  const canonical = canonicalizeJson(unsignedVC);
  const jsonString = JSON.stringify(canonical);
  return ethers.keccak256(ethers.toUtf8Bytes(jsonString));
}

/**
 * Sign a Verifiable Credential using an Ethereum private key (secp256k1)
 */
export function signVC(
  vc: object,
  privateKey: string
): VerifiableCredential {
  let formattedKey = privateKey.trim();
  if (!formattedKey.startsWith('0x')) {
    formattedKey = `0x${formattedKey}`;
  }

  const wallet = new ethers.Wallet(formattedKey);
  const credHash = computeCredentialHash(vc);

  // Sign hash digest synchronously using signingKey
  const signatureObj = wallet.signingKey.sign(ethers.getBytes(credHash));
  const signature = signatureObj.serialized;

  const issuerId =
    typeof (vc as any).issuer === 'string'
      ? (vc as any).issuer
      : (vc as any).issuer?.id || `did:ethr:${wallet.address}`;

  const signedVC: VerifiableCredential = {
    ...(vc as any),
    proof: {
      type: 'EthereumEip712Signature2021',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: `${issuerId}#key-1`,
      proofValue: signature,
      signature: signature,
    },
  };

  return signedVC;
}

/**
 * Verify a signed Verifiable Credential's cryptographic signature
 */
export function verifyVCSignature(vc: VerifiableCredential): boolean {
  if (!vc.proof || (!vc.proof.signature && !vc.proof.proofValue)) {
    return false;
  }

  try {
    const signature = vc.proof.signature || vc.proof.proofValue!;
    const credHash = computeCredentialHash(vc);
    const recoveredAddress = ethers.recoverAddress(
      ethers.getBytes(credHash),
      signature
    );

    const issuerId =
      typeof vc.issuer === 'string' ? vc.issuer : vc.issuer.id;
    const issuerAddress = issuerId.replace('did:ethr:', '').toLowerCase();

    return recoveredAddress.toLowerCase() === issuerAddress;
  } catch (err) {
    console.warn('[DID] Error verifying VC signature:', err);
    return false;
  }
}
