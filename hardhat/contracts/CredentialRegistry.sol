// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title CredentialRegistry
 * @dev Anchors cryptographic hashes and IPFS metadata CIDs of Verifiable Credentials on-chain.
 * Provides immutable provenance, issuance metadata, and issuer-controlled revocation checks.
 */
contract CredentialRegistry {
    // ------------------------------------------------------------------------
    // Types
    // ------------------------------------------------------------------------

    struct Credential {
        bytes32 credHash;
        string ipfsCID;
        address issuer;
        bytes32 subjectDID;
        uint256 issuedAt;
        bool revoked;
    }

    // ------------------------------------------------------------------------
    // State Variables
    // ------------------------------------------------------------------------

    mapping(bytes32 => Credential) private _credentials;

    // ------------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------------

    event CredentialAnchored(
        bytes32 indexed credHash,
        address indexed issuer,
        bytes32 indexed subjectDID,
        string ipfsCID,
        uint256 timestamp
    );

    event CredentialRevoked(
        bytes32 indexed credHash,
        address indexed issuer,
        uint256 timestamp
    );

    // ------------------------------------------------------------------------
    // Custom Errors
    // ------------------------------------------------------------------------

    error InvalidCredentialHash();
    error EmptyIPFSCID();
    error CredentialAlreadyExists(bytes32 credHash);
    error CredentialNotFound(bytes32 credHash);
    error OnlyIssuerCanRevoke(bytes32 credHash, address caller, address issuer);
    error CredentialAlreadyRevoked(bytes32 credHash);

    // ------------------------------------------------------------------------
    // External Functions
    // ------------------------------------------------------------------------

    /**
     * @notice Anchors a verifiable credential on-chain by registering its cryptographic hash.
     * @param credHash The cryptographic hash of the credential (e.g. Poseidon or SHA-256)
     * @param ipfsCID IPFS content identifier pointing to encrypted/public metadata
     * @param subjectDID Identifier hash of the credential subject
     */
    function anchorCredential(
        bytes32 credHash,
        string calldata ipfsCID,
        bytes32 subjectDID
    ) external {
        if (credHash == bytes32(0)) revert InvalidCredentialHash();
        if (bytes(ipfsCID).length == 0) revert EmptyIPFSCID();
        if (_credentials[credHash].issuer != address(0)) {
            revert CredentialAlreadyExists(credHash);
        }

        _credentials[credHash] = Credential({
            credHash: credHash,
            ipfsCID: ipfsCID,
            issuer: msg.sender,
            subjectDID: subjectDID,
            issuedAt: block.timestamp,
            revoked: false
        });

        emit CredentialAnchored(credHash, msg.sender, subjectDID, ipfsCID, block.timestamp);
    }

    /**
     * @notice Revokes a previously anchored credential.
     * @dev Only the original issuing address can revoke the credential.
     * @param credHash The credential hash to revoke
     */
    function revokeCredential(bytes32 credHash) external {
        Credential storage cred = _credentials[credHash];
        if (cred.issuer == address(0)) {
            revert CredentialNotFound(credHash);
        }
        if (cred.issuer != msg.sender) {
            revert OnlyIssuerCanRevoke(credHash, msg.sender, cred.issuer);
        }
        if (cred.revoked) {
            revert CredentialAlreadyRevoked(credHash);
        }

        cred.revoked = true;

        emit CredentialRevoked(credHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Checks whether a credential hash has been marked as revoked.
     * @param credHash The credential hash to inspect
     * @return True if revoked, false otherwise
     */
    function isRevoked(bytes32 credHash) external view returns (bool) {
        Credential memory cred = _credentials[credHash];
        if (cred.issuer == address(0)) {
            revert CredentialNotFound(credHash);
        }
        return cred.revoked;
    }

    /**
     * @notice Retrieves the full Credential details for a given credential hash.
     * @param credHash The credential hash to query
     * @return cred Credential struct containing metadata and status
     */
    function getCredential(bytes32 credHash) external view returns (Credential memory cred) {
        cred = _credentials[credHash];
        if (cred.issuer == address(0)) {
            revert CredentialNotFound(credHash);
        }
        return cred;
    }

    /**
     * @notice Checks if a credential hash has been registered in the registry.
     * @param credHash The credential hash to check
     * @return True if registered, false otherwise
     */
    function exists(bytes32 credHash) external view returns (bool) {
        return _credentials[credHash].issuer != address(0);
    }
}
