// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AuditLog
 * @notice Immutable append-only log of every PDP access-control decision.
 * @dev Every PERMIT or DENY decision emitted by the Policy Decision Point is
 *      recorded here. The log is keyed by a ZK nullifier so that the decision
 *      history for a credential presentation can be retrieved without revealing
 *      which credential was used (nullifier is Poseidon(credHash, nonce)).
 */
contract AuditLog is AccessControl {
    // ─── Roles ────────────────────────────────────────────────────────────────

    bytes32 public constant PDP_ROLE = keccak256("PDP_ROLE");

    // ─── Types ────────────────────────────────────────────────────────────────

    struct AuditEntry {
        uint256 entryIndex;
        address verifierAddress;
        bytes32 nullifier;
        bytes32 proofHash;
        string  domain;
        bool    permitted;
        uint256 timestamp;
        bytes32 txRef;          // keccak256(block.number, block.timestamp) — non-unique but useful
    }

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice All audit entries in insertion order
    AuditEntry[] private _entries;

    /// @notice nullifier => list of entry indices
    mapping(bytes32 => uint256[]) private _nullifierIndex;

    /// @notice domain => list of entry indices
    mapping(string => uint256[]) private _domainIndex;

    /// @notice Total entries
    uint256 public entryCount;

    // ─── Events ───────────────────────────────────────────────────────────────

    event DecisionLogged(
        uint256 indexed entryIndex,
        bytes32 indexed nullifier,
        string  domain,
        bool    permitted,
        bytes32 proofHash,
        uint256 timestamp
    );

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param admin       Address granted DEFAULT_ADMIN_ROLE (can grant PDP_ROLE)
     * @param pdpAddress  Address of the Policy Decision Point backend
     */
    constructor(address admin, address pdpAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PDP_ROLE, pdpAddress);
    }

    // ─── Write Functions ──────────────────────────────────────────────────────

    /**
     * @notice Log a PDP access-control decision.
     * @dev Only callable by the authorized PDP backend (PDP_ROLE).
     *
     * @param nullifier       ZK nullifier = Poseidon(credHash, nonce)
     * @param proofHash       keccak256 of the serialized ZK proof
     * @param domain          Service domain that triggered the verification
     * @param permitted       True if access was granted, false if denied
     * @return entryIndex     Index of the newly created entry
     */
    function logDecision(
        bytes32 nullifier,
        bytes32 proofHash,
        string calldata domain,
        bool permitted
    ) external onlyRole(PDP_ROLE) returns (uint256 entryIndex) {
        entryIndex = entryCount;

        bytes32 txRef = keccak256(abi.encodePacked(block.number, block.timestamp, entryIndex));

        AuditEntry memory entry = AuditEntry({
            entryIndex:      entryIndex,
            verifierAddress: msg.sender,
            nullifier:       nullifier,
            proofHash:       proofHash,
            domain:          domain,
            permitted:       permitted,
            timestamp:       block.timestamp,
            txRef:           txRef
        });

        _entries.push(entry);
        _nullifierIndex[nullifier].push(entryIndex);
        _domainIndex[domain].push(entryIndex);
        entryCount++;

        emit DecisionLogged(entryIndex, nullifier, domain, permitted, proofHash, block.timestamp);
    }

    // ─── Read Functions ───────────────────────────────────────────────────────

    /**
     * @notice Get all audit entries for a given nullifier.
     * @param nullifier  The ZK nullifier to look up
     * @return entries   Array of matching audit entries
     */
    function getEntriesByNullifier(bytes32 nullifier)
        external
        view
        returns (AuditEntry[] memory entries)
    {
        uint256[] memory indices = _nullifierIndex[nullifier];
        entries = new AuditEntry[](indices.length);
        for (uint256 i = 0; i < indices.length; i++) {
            entries[i] = _entries[indices[i]];
        }
    }

    /**
     * @notice Get all audit entries for a given domain.
     * @param domain  The service domain to look up
     * @return entries Array of matching audit entries
     */
    function getEntriesByDomain(string calldata domain)
        external
        view
        returns (AuditEntry[] memory entries)
    {
        uint256[] memory indices = _domainIndex[domain];
        entries = new AuditEntry[](indices.length);
        for (uint256 i = 0; i < indices.length; i++) {
            entries[i] = _entries[indices[i]];
        }
    }

    /**
     * @notice Get a single audit entry by its index.
     */
    function getEntry(uint256 index) external view returns (AuditEntry memory) {
        require(index < entryCount, "AuditLog: index out of bounds");
        return _entries[index];
    }

    /**
     * @notice Get the most recent N audit entries.
     */
    function getRecentEntries(uint256 n)
        external
        view
        returns (AuditEntry[] memory entries)
    {
        uint256 count = n < entryCount ? n : entryCount;
        entries = new AuditEntry[](count);
        for (uint256 i = 0; i < count; i++) {
            entries[i] = _entries[entryCount - count + i];
        }
    }

    /**
     * @notice Get entry indices for a nullifier (lightweight version).
     */
    function getNullifierIndices(bytes32 nullifier)
        external
        view
        returns (uint256[] memory)
    {
        return _nullifierIndex[nullifier];
    }

    /**
     * @notice Get total number of decisions for a nullifier.
     */
    function getNullifierDecisionCount(bytes32 nullifier)
        external
        view
        returns (uint256)
    {
        return _nullifierIndex[nullifier].length;
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    /**
     * @notice Grant PDP_ROLE to a new PDP address.
     */
    function authorizePDP(address pdpAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(PDP_ROLE, pdpAddress);
    }

    /**
     * @notice Revoke PDP_ROLE from an address.
     */
    function revokePDP(address pdpAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(PDP_ROLE, pdpAddress);
    }
}
