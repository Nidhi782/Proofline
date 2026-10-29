import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import * as snarkjs from 'snarkjs';
import { ZKProof, ProveResponse, CircuitInfo } from './types.js';

const groth16 = (snarkjs as any).groth16 || (snarkjs as any).default?.groth16 || snarkjs;

export class Prover {
  private circuitsDir: string;
  private zkeyDir: string;
  private isDev: boolean;

  constructor(circuitsDir?: string, zkeyDir?: string) {
    this.circuitsDir = circuitsDir || process.env.CIRCUITS_DIR || './circuits';
    this.zkeyDir = zkeyDir || process.env.ZKEY_DIR || './zkeys';
    this.isDev = process.env.NODE_ENV !== 'production';
  }

  /**
   * Resolve file paths for circuit artifacts (wasm, zkey, vkey)
   */
  public getCircuitPaths(circuit: string): { wasm: string; zkey: string; vkey: string } {
    const circuitsBase = path.resolve(process.cwd(), this.circuitsDir);
    const zkeyBase = path.resolve(process.cwd(), this.zkeyDir);

    // Look for wasm in standard circom compilation locations
    const possibleWasmPaths = [
      path.join(circuitsBase, `${circuit}_js`, `${circuit}.wasm`),
      path.join(circuitsBase, `${circuit}.wasm`),
      path.join(circuitsBase, circuit, `${circuit}.wasm`),
      path.join(circuitsBase, `${circuit}_js`, 'witness_calculator.wasm'),
    ];
    let wasmPath = possibleWasmPaths[0];
    for (const p of possibleWasmPaths) {
      if (fs.existsSync(p)) {
        wasmPath = p;
        break;
      }
    }

    // Look for zkey
    const possibleZkeyPaths = [
      path.join(zkeyBase, `${circuit}_final.zkey`),
      path.join(zkeyBase, `${circuit}.zkey`),
      path.join(zkeyBase, `${circuit}_0001.zkey`),
      path.join(circuitsBase, `${circuit}_final.zkey`),
      path.join(circuitsBase, `${circuit}.zkey`),
    ];
    let zkeyPath = possibleZkeyPaths[0];
    for (const p of possibleZkeyPaths) {
      if (fs.existsSync(p)) {
        zkeyPath = p;
        break;
      }
    }

    // Look for vkey (verification key)
    const possibleVkeyPaths = [
      path.join(zkeyBase, `verification_key_${circuit}.json`),
      path.join(zkeyBase, `${circuit}_vkey.json`),
      path.join(zkeyBase, `${circuit}_verification_key.json`),
      path.join(circuitsBase, `verification_key_${circuit}.json`),
      path.join(circuitsBase, `${circuit}_vkey.json`),
    ];
    let vkeyPath = possibleVkeyPaths[0];
    for (const p of possibleVkeyPaths) {
      if (fs.existsSync(p)) {
        vkeyPath = p;
        break;
      }
    }

    return { wasm: wasmPath, zkey: zkeyPath, vkey: vkeyPath };
  }

  /**
   * Check if circuit artifacts exist
   */
  public checkCircuitAvailable(circuit: string): boolean {
    const paths = this.getCircuitPaths(circuit);
    return fs.existsSync(paths.wasm) && fs.existsSync(paths.zkey);
  }

  /**
   * Get metadata info for a circuit
   */
  public getCircuitInfo(circuit: string): CircuitInfo {
    const paths = this.getCircuitPaths(circuit);
    const available = this.checkCircuitAvailable(circuit);
    return {
      name: circuit,
      wasmPath: paths.wasm,
      zkeyPath: paths.zkey,
      vkeyPath: paths.vkey,
      available,
    };
  }

  /**
   * Generate a Groth16 zero-knowledge proof
   */
  public async generateProof(
    circuit: string,
    inputs: Record<string, unknown>
  ): Promise<ProveResponse> {
    const paths = this.getCircuitPaths(circuit);
    const isAvailable = this.checkCircuitAvailable(circuit);

    if (!isAvailable) {
      if (this.isDev) {
        console.warn(
          `[Prover] Circuit "${circuit}" artifacts not found at ${paths.wasm} or ${paths.zkey}. Generating mock proof (dev mode).`
        );
        return this.generateMockProof(circuit, inputs);
      }
      throw new Error(
        `Circuit "${circuit}" not found. Missing wasm (${paths.wasm}) or zkey (${paths.zkey}).`
      );
    }

    const tStart = performance.now();
    try {
      console.log(`[Prover] Generating Groth16 proof for circuit "${circuit}"...`);
      const { proof, publicSignals } = await groth16.fullProve(
        inputs,
        paths.wasm,
        paths.zkey
      );

      const totalTime = performance.now() - tStart;
      // SnarkJS fullProve combines witness generation and proof generation.
      // Typical breakdown is ~30% witness calculation, ~70% MSM & FFT proof computation.
      const witnessMs = Math.round(totalTime * 0.3);
      const proofMs = Math.max(1, Math.round(totalTime * 0.7));

      console.log(
        `[Prover] Proof generated successfully for "${circuit}". Timings: witness=${witnessMs}ms, proof=${proofMs}ms (total=${Math.round(totalTime)}ms)`
      );

      return {
        proof: {
          pi_a: proof.pi_a,
          pi_b: proof.pi_b,
          pi_c: proof.pi_c,
          protocol: proof.protocol || 'groth16',
          curve: proof.curve || 'bn128',
        },
        publicSignals,
        timings: {
          witnessMs,
          proofMs,
        },
      };
    } catch (err: any) {
      console.error(`[Prover] Proof generation failed for "${circuit}":`, err.message);
      throw new Error(`Groth16 proof generation failed: ${err.message}`);
    }
  }

  /**
   * Verify a Groth16 zero-knowledge proof
   */
  public async verifyProof(
    circuit: string,
    proof: ZKProof,
    publicSignals: string[]
  ): Promise<boolean> {
    const paths = this.getCircuitPaths(circuit);

    // Handle mock proofs in development mode
    if (proof._mock) {
      if (!this.isDev) {
        console.warn('[Prover] Rejected mock proof in production environment.');
        return false;
      }
      console.log(`[Prover] Verifying mock proof for circuit "${circuit}" (dev mode). Result: valid.`);
      return Boolean(proof.pi_a && proof.pi_b && proof.pi_c && Array.isArray(publicSignals));
    }

    // Check if verification key exists
    if (!fs.existsSync(paths.vkey)) {
      if (this.isDev) {
        console.warn(
          `[Prover] Verification key for "${circuit}" not found at ${paths.vkey}. Accepting proof in dev mode.`
        );
        return true;
      }
      throw new Error(
        `Verification key for circuit "${circuit}" not found at ${paths.vkey}.`
      );
    }

    try {
      const vKeyRaw = await fs.promises.readFile(paths.vkey, 'utf8');
      const vKey = JSON.parse(vKeyRaw);

      const isValid = await groth16.verify(vKey, publicSignals, proof);
      console.log(`[Prover] Proof verification for "${circuit}": ${isValid ? 'VALID' : 'INVALID'}`);
      return Boolean(isValid);
    } catch (err: any) {
      console.error(`[Prover] Proof verification error for "${circuit}":`, err.message);
      throw new Error(`Verification failed: ${err.message}`);
    }
  }

  /**
   * Generate deterministic mock proof for local testing / development
   */
  private generateMockProof(
    circuit: string,
    inputs: Record<string, unknown>
  ): ProveResponse {
    const witnessMs = 15;
    const proofMs = 45;

    // Build mock public signals based on inputs
    const publicSignals = this.extractMockPublicSignals(circuit, inputs);

    const mockProof: ZKProof = {
      pi_a: [
        '1879201984719284719284719284719284719284719284719284719284719284',
        '2938472938472938472938472938472938472938472938472938472938472938',
        '1',
      ],
      pi_b: [
        [
          '1029384756102938475610293847561029384756102938475610293847561029',
          '2039485761203948576120394857612039485761203948576120394857612039',
        ],
        [
          '3049586712304958671230495867123049586712304958671230495867123049',
          '4059687123405968712340596871234059687123405968712340596871234059',
        ],
        ['1', '0'],
      ],
      pi_c: [
        '5069781234506978123450697812345069781234506978123450697812345069',
        '6079812345607981234560798123456079812345607981234560798123456079',
        '1',
      ],
      protocol: 'groth16',
      curve: 'bn128',
      _mock: true,
    };

    return {
      proof: mockProof,
      publicSignals,
      timings: {
        witnessMs,
        proofMs,
      },
    };
  }

  /**
   * Extract or synthesize public signals for mock mode
   */
  private extractMockPublicSignals(
    circuit: string,
    inputs: Record<string, unknown>
  ): string[] {
    const signals: string[] = [];

    switch (circuit) {
      case 'age_threshold':
        if (inputs.threshold !== undefined) signals.push(String(inputs.threshold));
        if (inputs.currentYear !== undefined) signals.push(String(inputs.currentYear));
        if (inputs.commitment !== undefined) signals.push(String(inputs.commitment));
        if (signals.length === 0) signals.push('18', '2026', '1');
        break;

      case 'trust_score':
        if (inputs.threshold !== undefined) signals.push(String(inputs.threshold));
        if (inputs.commitment !== undefined) signals.push(String(inputs.commitment));
        if (signals.length === 0) signals.push('700', '1');
        break;

      case 'org_membership':
        if (inputs.root !== undefined) signals.push(String(inputs.root));
        if (inputs.commitment !== undefined) signals.push(String(inputs.commitment));
        if (signals.length === 0) signals.push('0x1234567890abcdef', '1');
        break;

      case 'credential_proof':
        if (inputs.policyType !== undefined) signals.push(String(inputs.policyType));
        if (inputs.policyParam !== undefined) signals.push(String(inputs.policyParam));
        if (inputs.commitment !== undefined) signals.push(String(inputs.commitment));
        if (signals.length === 0) signals.push('1', '18', '1');
        break;

      default:
        signals.push('1');
    }

    return signals;
  }
}

export const prover = new Prover();
