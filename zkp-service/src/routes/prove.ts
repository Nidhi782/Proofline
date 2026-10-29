import { Router, Request, Response } from 'express';
import { prover } from '../prover.js';
import {
  buildAgeThresholdInputs,
  buildTrustScoreInputs,
  buildOrgMembershipInputs,
  buildCredentialProofInputs,
} from '../witness.js';

export const proveRouter = Router();

/**
 * POST /prove
 * Generate a Groth16 zero-knowledge proof for a given circuit
 */
proveRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { circuit, privateInputs, publicInputs, inputs } = req.body;

    if (!circuit || typeof circuit !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "circuit" name in request body.',
      });
    }

    // Merge provided input objects
    let combinedInputs: Record<string, unknown> = {
      ...(privateInputs || {}),
      ...(publicInputs || {}),
      ...(inputs || {}),
    };

    // Auto-augment with witness builder if recognized circuit and high-level params
    if (
      circuit === 'age_threshold' &&
      combinedInputs.birthYear !== undefined &&
      combinedInputs.currentYear !== undefined
    ) {
      combinedInputs = await buildAgeThresholdInputs(
        combinedInputs.birthYear as any,
        combinedInputs.currentYear as any,
        combinedInputs.threshold as any,
        (combinedInputs.nonce as any) || 123456789n
      );
    } else if (
      circuit === 'trust_score' &&
      combinedInputs.trustScore !== undefined &&
      combinedInputs.threshold !== undefined
    ) {
      combinedInputs = await buildTrustScoreInputs(
        combinedInputs.trustScore as any,
        combinedInputs.threshold as any,
        (combinedInputs.nonce as any) || 123456789n
      );
    } else if (circuit === 'org_membership' && combinedInputs.orgId !== undefined) {
      combinedInputs = await buildOrgMembershipInputs(
        combinedInputs.orgId as any,
        combinedInputs.merkleTree as any,
        (combinedInputs.nonce as any) || 123456789n
      );
    } else if (circuit === 'credential_proof' && combinedInputs.credHash !== undefined) {
      combinedInputs = await buildCredentialProofInputs(
        (combinedInputs.attributes as any) || [],
        combinedInputs.credHash as any,
        (combinedInputs.sigR8 as any) || ['0', '0'],
        (combinedInputs.sigS as any) || '0',
        (combinedInputs.issuerPubKey as any) || ['0', '0'],
        (combinedInputs.nonce as any) || 123456789n,
        (combinedInputs.policyType as any) || 1,
        (combinedInputs.policyParam as any) || 0
      );
    }

    const proofResult = await prover.generateProof(circuit, combinedInputs);

    return res.status(200).json(proofResult);
  } catch (err: any) {
    console.error('[Route /prove] Error generating proof:', err.message);
    return res.status(500).json({
      error: err.message || 'Proof generation failed.',
    });
  }
});
