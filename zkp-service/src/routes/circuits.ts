import { Router, Request, Response } from 'express';
import { prover } from '../prover.js';
import { CircuitInfo } from '../types.js';

export const circuitsRouter = Router();

const DEFAULT_CIRCUITS = [
  'age_threshold',
  'org_membership',
  'trust_score',
  'credential_proof',
];

/**
 * GET /circuits
 * List all supported circuits with availability status
 */
circuitsRouter.get('/', (req: Request, res: Response) => {
  try {
    const circuits: CircuitInfo[] = DEFAULT_CIRCUITS.map((name) =>
      prover.getCircuitInfo(name)
    );

    return res.status(200).json({
      count: circuits.length,
      circuits,
    });
  } catch (err: any) {
    console.error('[Route /circuits] Error listing circuits:', err.message);
    return res.status(500).json({
      error: err.message || 'Failed to list circuits.',
    });
  }
});

/**
 * GET /circuits/:name
 * Get details for a specific circuit
 */
circuitsRouter.get('/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Invalid circuit name parameter.' });
    }

    const info = prover.getCircuitInfo(name);

    return res.status(200).json(info);
  } catch (err: any) {
    console.error(`[Route /circuits/:name] Error fetching circuit "${req.params.name}":`, err.message);
    return res.status(500).json({
      error: err.message || 'Failed to fetch circuit info.',
    });
  }
});
