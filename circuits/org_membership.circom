pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/switcher.circom";

/*
 * MerkleTreeChecker
 * Verifies inclusion of a leaf in a Merkle tree of depth `levels`
 * using Poseidon hash and Switcher multiplexers.
 */
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component selectors[levels];
    component hashers[levels];

    signal currentHash[levels + 1];
    currentHash[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // Enforce pathIndices are strictly binary: 0 or 1
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        selectors[i] = Switcher();
        selectors[i].sel <== pathIndices[i];
        selectors[i].L <== currentHash[i];
        selectors[i].R <== pathElements[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== selectors[i].outL;
        hashers[i].inputs[1] <== selectors[i].outR;

        currentHash[i + 1] <== hashers[i].out;
    }

    // Root equality constraint
    root === currentHash[levels];
}

/*
 * OrgMembership
 * Proves that a user belongs to an authorized organization without revealing
 * the organization identifier, by verifying Merkle inclusion of orgId in a tree
 * of depth 10, alongside an attribute commitment.
 *
 * Private Inputs:
 *   - orgId: Organization identifier (scalar)
 *   - nonce: Blinding factor used in attribute commitment
 *   - pathElements[10]: Sibling hashes along the Merkle branch
 *   - pathIndices[10]: Branch direction bits (0 = left, 1 = right)
 *
 * Public Inputs:
 *   - merkleRoot: Expected root of the authorized organizations Merkle tree
 *   - commitment: Public Poseidon commitment of (orgId, nonce)
 */
template OrgMembership() {
    // ------------------------------------------------------------------------
    // Private Inputs
    // ------------------------------------------------------------------------
    signal input orgId;
    signal input nonce;
    signal input pathElements[10];
    signal input pathIndices[10];

    // ------------------------------------------------------------------------
    // Public Inputs
    // ------------------------------------------------------------------------
    signal input merkleRoot;
    signal input commitment;

    // ------------------------------------------------------------------------
    // 1. Merkle Inclusion Proof (Tree Depth = 10)
    // ------------------------------------------------------------------------
    component treeChecker = MerkleTreeChecker(10);
    treeChecker.leaf <== orgId;
    treeChecker.root <== merkleRoot;
    for (var i = 0; i < 10; i++) {
        treeChecker.pathElements[i] <== pathElements[i];
        treeChecker.pathIndices[i] <== pathIndices[i];
    }

    // ------------------------------------------------------------------------
    // 2. Commitment Verification
    // Verify commitment == Poseidon(orgId, nonce)
    // ------------------------------------------------------------------------
    component commitHasher = Poseidon(2);
    commitHasher.inputs[0] <== orgId;
    commitHasher.inputs[1] <== nonce;
    commitment === commitHasher.out;
}

component main {public [merkleRoot, commitment]} = OrgMembership();
