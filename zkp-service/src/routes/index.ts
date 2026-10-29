import { Router } from 'express';
import { proveRouter } from './prove.js';
import { verifyRouter } from './verify.js';
import { circuitsRouter } from './circuits.js';
import { ipfsRouter } from './ipfs.js';
import { vcRouter } from './vc.js';

export const router = Router();

router.use('/prove', proveRouter);
router.use('/verify', verifyRouter);
router.use('/circuits', circuitsRouter);
router.use('/ipfs', ipfsRouter);
router.use('/vc', vcRouter);

// Service info / health endpoint on API router
router.get('/info', (_req, res) => {
  res.status(200).json({
    service: 'zkp-service',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});
