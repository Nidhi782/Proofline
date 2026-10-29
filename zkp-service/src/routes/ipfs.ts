import { Router, Request, Response } from 'express';
import { ipfsClient } from '../ipfs.js';

export const ipfsRouter = Router();

/**
 * POST /ipfs/upload
 * Upload JSON payload to IPFS (or local mock store) and return CID
 */
ipfsRouter.post('/upload', async (req: Request, res: Response) => {
  try {
    const payload = req.body?.data !== undefined ? req.body.data : req.body;

    if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
      return res.status(400).json({
        error: 'Missing or empty JSON body to upload.',
      });
    }

    const cid = await ipfsClient.uploadJSON(payload);

    return res.status(200).json({
      success: true,
      cid,
    });
  } catch (err: any) {
    console.error('[Route /ipfs/upload] Upload error:', err.message);
    return res.status(500).json({
      error: err.message || 'IPFS upload failed.',
    });
  }
});

/**
 * GET /ipfs/:cid
 * Retrieve and parse JSON payload from IPFS by CID
 */
ipfsRouter.get('/:cid', async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;

    if (!cid || typeof cid !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid CID parameter.',
      });
    }

    const data = await ipfsClient.downloadJSON(cid);

    return res.status(200).json(data);
  } catch (err: any) {
    console.warn(`[Route /ipfs/:cid] CID "${req.params.cid}" not found:`, err.message);
    return res.status(404).json({
      error: err.message || `CID "${req.params.cid}" not found.`,
    });
  }
});
