import { Router, Request, Response } from 'express';
import { performance } from 'node:perf_hooks';
import { prover } from '../prover.js';
import { VerifyRequest, VerifyResponse } from '../types.js';

export const verifyRouter = Router();

/**
 * POST /verify
 * Verify a Groth16 zero-knowledge proof locally
 */
verifyRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { circuit, proof, publicSignals } = req.body as VerifyRequest;

    if (!circuit || typeof circuit !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "circuit" string in request body.',
      });
    }

    if (!proof || typeof proof !== 'object') {
      return res.status(400).json({
        error: 'Missing or invalid "proof" object in request body.',
      });
    }

    if (!Array.isArray(publicSignals)) {
      return res.status(400).json({
        error: 'Missing or invalid "publicSignals" array in request body.',
      });
    }

    const tStart = performance.now();
    const valid = await prover.verifyProof(circuit, proof, publicSignals);
    const timingMs = Math.round(performance.now() - tStart);

    const response: VerifyResponse = {
      valid,
      timingMs,
    };

    return res.status(200).json(response);
  } catch (err: any) {
    console.error('[Route /verify] Error verifying proof:', err.message);
    return res.status(500).json({
      error: err.message || 'Proof verification failed.',
    });
  }
});
