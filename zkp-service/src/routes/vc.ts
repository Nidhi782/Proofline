import { Router, Request, Response } from 'express';
import {
  createVC,
  signVC,
  computeCredentialHash,
  verifyVCSignature,
} from '../did.js';
import { ipfsClient } from '../ipfs.js';
import { CreateVCRequest, CreateVCResponse } from '../types.js';

export const vcRouter = Router();

/**
 * POST /vc/create
 * Issue and optionally sign and upload a W3C Verifiable Credential JSON-LD document
 */
vcRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      issuerDID,
      subjectDID,
      type,
      attributes,
      expiryDays = 365,
      issuerPrivateKey,
    } = req.body as CreateVCRequest;

    if (!issuerDID || !subjectDID || !type || !attributes) {
      return res.status(400).json({
        error:
          'Missing required parameters: issuerDID, subjectDID, type, and attributes are required.',
      });
    }

    // 1. Create the base W3C VC
    let vc = createVC(issuerDID, subjectDID, type, attributes, expiryDays);

    // 2. Sign if private key provided
    if (issuerPrivateKey) {
      vc = signVC(vc, issuerPrivateKey);
    }

    // 3. Compute credential hash (keccak256 over unsigned canonical document)
    const credHash = computeCredentialHash(vc);

    // 4. Upload to IPFS / mock storage
    let ipfsCID: string | undefined;
    try {
      ipfsCID = await ipfsClient.uploadJSON(vc);
    } catch (err: any) {
      console.warn('[Route /vc/create] Failed to upload VC to IPFS:', err.message);
    }

    const response: CreateVCResponse = {
      vc,
      credHash,
      ipfsCID,
    };

    return res.status(201).json(response);
  } catch (err: any) {
    console.error('[Route /vc/create] Error creating VC:', err.message);
    return res.status(500).json({
      error: err.message || 'Verifiable Credential creation failed.',
    });
  }
});

/**
 * POST /vc/hash
 * Compute canonical keccak256 hash of a Verifiable Credential
 */
vcRouter.post('/hash', (req: Request, res: Response) => {
  try {
    const vc = req.body?.vc !== undefined ? req.body.vc : req.body;

    if (!vc || typeof vc !== 'object' || Object.keys(vc).length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid "vc" object in request body.',
      });
    }

    const credHash = computeCredentialHash(vc);

    return res.status(200).json({ credHash });
  } catch (err: any) {
    console.error('[Route /vc/hash] Error computing VC hash:', err.message);
    return res.status(500).json({
      error: err.message || 'Credential hash computation failed.',
    });
  }
});

/**
 * POST /vc/verify
 * Cryptographically verify a signed Verifiable Credential
 */
vcRouter.post('/verify', (req: Request, res: Response) => {
  try {
    const vc = req.body?.vc !== undefined ? req.body.vc : req.body;

    if (!vc || typeof vc !== 'object') {
      return res.status(400).json({
        error: 'Missing or invalid "vc" object in request body.',
      });
    }

    const valid = verifyVCSignature(vc);

    return res.status(200).json({ valid });
  } catch (err: any) {
    console.error('[Route /vc/verify] Error verifying VC signature:', err.message);
    return res.status(500).json({
      error: err.message || 'Verification failed.',
    });
  }
});
