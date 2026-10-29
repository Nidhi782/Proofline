// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RevocationRegistry
 * @dev Sparse Merkle Tree (SMT) accumulator-based nullifier revocation registry.
 * Enables zero-knowledge credentials to be revoked via nullifiers without revealing
 * credential identity or linkability on-chain.
 */
contract RevocationRegistry is Ownable {
    // ------------------------------------------------------------------------
    // State Variables
    // ------------------------------------------------------------------------

    /// @notice Tracks individual revoked nullifier hashes
    mapping(bytes32 => bool) private _revokedNullifiers;

    /// @notice Current root of the off-chain Sparse Merkle Tree accumulator
    bytes32 public smtRoot;

    // ------------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------------

    event NullifierRevoked(bytes32 indexed nullifier, uint256 timestamp);
    event SMTRootUpdated(bytes32 indexed oldRoot, bytes32 indexed newRoot, uint256 timestamp);

    // ------------------------------------------------------------------------
    // Custom Errors
    // ------------------------------------------------------------------------

    error InvalidNullifier();
    error NullifierAlreadyRevoked(bytes32 nullifier);

    // ------------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------------

    /**
     * @notice Initializes the registry setting the deployer as initial owner.
     */
    constructor() Ownable(msg.sender) {}

    // ------------------------------------------------------------------------
    // External Functions
    // ------------------------------------------------------------------------

    /**
     * @notice Marks a nullifier as revoked.
     * @dev Only callable by contract owner / authorized revocation authority.
     * @param nullifier Cryptographic nullifier hash to revoke
     */
    function revokeNullifier(bytes32 nullifier) external onlyOwner {
        if (nullifier == bytes32(0)) revert InvalidNullifier();
        if (_revokedNullifiers[nullifier]) revert NullifierAlreadyRevoked(nullifier);

        _revokedNullifiers[nullifier] = true;

        emit NullifierRevoked(nullifier, block.timestamp);
    }

    /**
     * @notice Revokes a nullifier and simultaneously updates the SMT accumulator root.
     * @param nullifier Cryptographic nullifier hash to revoke
     * @param newSMTRoot The updated root hash of the Sparse Merkle Tree
     */
    function revokeNullifierWithRoot(bytes32 nullifier, bytes32 newSMTRoot) external onlyOwner {
        if (nullifier == bytes32(0)) revert InvalidNullifier();
        if (_revokedNullifiers[nullifier]) revert NullifierAlreadyRevoked(nullifier);

        _revokedNullifiers[nullifier] = true;
        bytes32 oldRoot = smtRoot;
        smtRoot = newSMTRoot;

        emit NullifierRevoked(nullifier, block.timestamp);
        emit SMTRootUpdated(oldRoot, newSMTRoot, block.timestamp);
    }

    /**
     * @notice Updates the Sparse Merkle Tree accumulator root.
     * @param newSMTRoot The new root hash
     */
    function updateSMTRoot(bytes32 newSMTRoot) external onlyOwner {
        bytes32 oldRoot = smtRoot;
        smtRoot = newSMTRoot;
        emit SMTRootUpdated(oldRoot, newSMTRoot, block.timestamp);
    }

    /**
     * @notice Queries whether a given nullifier has been revoked.
     * @param nullifier Cryptographic nullifier hash to check
     * @return True if revoked, false otherwise
     */
    function isNullifierRevoked(bytes32 nullifier) external view returns (bool) {
        return _revokedNullifiers[nullifier];
    }
}
