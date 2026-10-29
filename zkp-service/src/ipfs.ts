import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { ethers } from 'ethers';

export class IPFSClient {
  private helia: any | null = null;
  private fs: any | null = null;
  private mockStore: Map<string, string> = new Map();
  private isIpfsEnabled: boolean;
  private initialized: boolean = false;

  constructor() {
    this.isIpfsEnabled = process.env.IPFS_ENABLED === 'true';
  }

  /**
   * Lazily initialize Helia node if IPFS is enabled
   */
  public async init(): Promise<void> {
    if (this.initialized) return;

    if (this.isIpfsEnabled) {
      try {
        console.log('[IPFS] Initializing Helia node...');
        this.helia = await createHelia();
        this.fs = unixfs(this.helia);
        console.log('[IPFS] Helia node initialized successfully.');
      } catch (err: any) {
        console.warn(
          '[IPFS] Failed to initialize Helia, falling back to local memory store:',
          err.message
        );
        this.helia = null;
        this.fs = null;
      }
    } else {
      console.log('[IPFS] IPFS_ENABLED is false; using local in-memory mock store.');
    }

    this.initialized = true;
  }

  /**
   * Upload JSON data to IPFS (or local mock store) and return CID
   */
  public async uploadJSON(data: object): Promise<string> {
    await this.init();
    const jsonStr = JSON.stringify(data);

    if (this.helia && this.fs) {
      try {
        const bytes = new TextEncoder().encode(jsonStr);
        const cid = await this.fs.addBytes(bytes);
        const cidStr = cid.toString();
        console.log(`[IPFS] Uploaded JSON to Helia. CID: ${cidStr}`);
        return cidStr;
      } catch (err: any) {
        console.warn(`[IPFS] Helia upload failed (${err.message}), falling back to mock store.`);
      }
    }

    // Mock CID generation (standard Qm prefix with keccak256 hash derivative)
    const hashHex = ethers.keccak256(ethers.toUtf8Bytes(jsonStr));
    const cid = `Qm${hashHex.slice(2, 46)}`;
    this.mockStore.set(cid, jsonStr);
    console.log(`[IPFS Mock] Stored JSON to memory. Mock CID: ${cid}`);
    return cid;
  }

  /**
   * Download and parse JSON data from IPFS by CID
   */
  public async downloadJSON(cid: string): Promise<object> {
    await this.init();

    // Check mock store first if available
    if (this.mockStore.has(cid)) {
      const raw = this.mockStore.get(cid)!;
      return JSON.parse(raw);
    }

    if (this.helia && this.fs) {
      try {
        const chunks: Uint8Array[] = [];
        for await (const chunk of this.fs.cat(cid)) {
          chunks.push(chunk);
        }

        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const merged = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }

        const text = new TextDecoder().decode(merged);
        return JSON.parse(text);
      } catch (err: any) {
        console.error(`[IPFS] Error downloading CID "${cid}" from Helia:`, err.message);
        throw new Error(`Failed to download CID "${cid}" from IPFS: ${err.message}`);
      }
    }

    throw new Error(`CID "${cid}" not found in IPFS or mock storage.`);
  }

  /**
   * Check if IPFS client is available
   */
  public async isAvailable(): Promise<boolean> {
    await this.init();
    return Boolean(this.helia) || !this.isIpfsEnabled;
  }

  /**
   * Gracefully stop the Helia node
   */
  public async stop(): Promise<void> {
    if (this.helia) {
      try {
        await this.helia.stop();
        console.log('[IPFS] Helia node stopped.');
      } catch (err: any) {
        console.warn('[IPFS] Error stopping Helia node:', err.message);
      }
      this.helia = null;
      this.fs = null;
      this.initialized = false;
    }
  }
}

export const ipfsClient = new IPFSClient();
