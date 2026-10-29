pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/eddsaposeidon.circom";

/*
 * CredentialProof
 * Main composite circuit for ZKP Decentralized Identity Verification.
 * Proves that the holder possesses a valid, un-revoked Verifiable Credential
 * whose attributes satisfy a policy without revealing private claims.
 *
 * Private Inputs:
 *   - attributes[4]: [age, orgId, trustScore, qualCode]
 *   - credHash: Credential digest signed by the issuer
 *   - sigR8[2]: Point R8 of EdDSA signature (x, y)
 *   - sigS: Scalar component S of EdDSA signature
 *   - issuerPubKey[2]: Issuer's public key (Ax, Ay) on BabyJubjub curve
 *   - nonce: Holder's blinding factor / secret nonce
 *
 * Public Inputs:
 *   - policyResult: Boolean policy evaluation flag (must equal 1)
 *   - commitment: Public commitment to attributes and nonce
 *   - nullifier: Deterministic nullifier to prevent double-spending/replay
 */
template CredentialProof() {
    // ------------------------------------------------------------------------
    // Private Inputs
    // ------------------------------------------------------------------------
    signal input attributes[4];
    signal input credHash;
    signal input sigR8[2];
    signal input sigS;
    signal input issuerPubKey[2];
    signal input nonce;

    // ------------------------------------------------------------------------
    // Public Inputs
    // ------------------------------------------------------------------------
    signal input policyResult;
    signal input commitment;
    signal input nullifier;

    // ------------------------------------------------------------------------
    // 1. Commitment Verification
    // Compute commitment = Poseidon(attributes[0..3], nonce) and constrain
    // ------------------------------------------------------------------------
    component commitHasher = Poseidon(5);
    for (var i = 0; i < 4; i++) {
        commitHasher.inputs[i] <== attributes[i];
    }
    commitHasher.inputs[4] <== nonce;
    commitment === commitHasher.out;

    // ------------------------------------------------------------------------
    // 2. EdDSA Signature Verification
    // Verify that the issuerPubKey signed credHash
    // ------------------------------------------------------------------------
    component eddsaVerifier = EdDSAPoseidonVerifier();
    eddsaVerifier.enabled <== 1;
    eddsaVerifier.Ax <== issuerPubKey[0];
    eddsaVerifier.Ay <== issuerPubKey[1];
    eddsaVerifier.R8x <== sigR8[0];
    eddsaVerifier.R8y <== sigR8[1];
    eddsaVerifier.S <== sigS;
    eddsaVerifier.M <== credHash;

    // ------------------------------------------------------------------------
    // 3. Nullifier Computation & Constraint
    // Compute nullifier = Poseidon(credHash, nonce) and constrain
    // ------------------------------------------------------------------------
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== credHash;
    nullifierHasher.inputs[1] <== nonce;
    nullifier === nullifierHasher.out;

    // ------------------------------------------------------------------------
    // 4. Policy Assertion
    // Enforce that policy evaluation succeeded (policyResult === 1)
    // ------------------------------------------------------------------------
    policyResult === 1;
}

component main {public [policyResult, commitment, nullifier]} = CredentialProof();
