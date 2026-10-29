pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/*
 * AgeThreshold
 * Proves that a credential holder's age (currentYear - birthYear) meets or
 * exceeds a required threshold without revealing birthYear or exact age.
 *
 * Private Inputs:
 *   - birthYear: The subject's year of birth
 *   - nonce: Blinding factor used in attribute commitment
 *
 * Public Inputs:
 *   - currentYear: Current reference calendar year
 *   - threshold: Minimum required age (e.g. 18, 21)
 *   - commitment: Public Poseidon commitment of (birthYear, nonce)
 */
template AgeThreshold() {
    // ------------------------------------------------------------------------
    // Private Inputs
    // ------------------------------------------------------------------------
    signal input birthYear;
    signal input nonce;

    // ------------------------------------------------------------------------
    // Public Inputs
    // ------------------------------------------------------------------------
    signal input currentYear;
    signal input threshold;
    signal input commitment;

    // ------------------------------------------------------------------------
    // 1. Calculate Age
    // ------------------------------------------------------------------------
    signal age;
    age <== currentYear - birthYear;

    // ------------------------------------------------------------------------
    // 2. Age Threshold Verification
    // GreaterEqThan(16) checks if age >= threshold (up to 16-bit range, 0-65535)
    // ------------------------------------------------------------------------
    component gte = GreaterEqThan(16);
    gte.in[0] <== age;
    gte.in[1] <== threshold;
    gte.out === 1;

    // ------------------------------------------------------------------------
    // 3. Commitment Verification
    // Verify commitment == Poseidon(birthYear, nonce)
    // ------------------------------------------------------------------------
    component commitHasher = Poseidon(2);
    commitHasher.inputs[0] <== birthYear;
    commitHasher.inputs[1] <== nonce;
    commitment === commitHasher.out;
}

component main {public [currentYear, threshold, commitment]} = AgeThreshold();
