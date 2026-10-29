pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/*
 * TrustScore
 * Proves that a user's trust score meets or exceeds a required threshold
 * without revealing the exact score.
 *
 * Private Inputs:
 *   - trustScore: Numerical trust score of the subject (e.g. 0 - 1000)
 *   - nonce: Blinding factor used in attribute commitment
 *
 * Public Inputs:
 *   - threshold: Minimum required trust score
 *   - commitment: Public Poseidon commitment of (trustScore, nonce)
 */
template TrustScore() {
    // ------------------------------------------------------------------------
    // Private Inputs
    // ------------------------------------------------------------------------
    signal input trustScore;
    signal input nonce;

    // ------------------------------------------------------------------------
    // Public Inputs
    // ------------------------------------------------------------------------
    signal input threshold;
    signal input commitment;

    // ------------------------------------------------------------------------
    // 1. Trust Score Threshold Check
    // Assert trustScore >= threshold using GreaterEqThan(16)
    // ------------------------------------------------------------------------
    component gte = GreaterEqThan(16);
    gte.in[0] <== trustScore;
    gte.in[1] <== threshold;
    gte.out === 1;

    // ------------------------------------------------------------------------
    // 2. Commitment Verification
    // Verify commitment == Poseidon(trustScore, nonce)
    // ------------------------------------------------------------------------
    component commitHasher = Poseidon(2);
    commitHasher.inputs[0] <== trustScore;
    commitHasher.inputs[1] <== nonce;
    commitment === commitHasher.out;
}

component main {public [threshold, commitment]} = TrustScore();
