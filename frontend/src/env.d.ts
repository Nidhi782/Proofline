/// <reference types="vite/client" />

declare module 'snarkjs' {
  export const groth16: {
    fullProve(input: Record<string, unknown>, wasm: string, zkey: string): Promise<any>;
    verify(vkey: unknown, publicSignals: string[], proof: unknown): Promise<boolean>;
  };
}
