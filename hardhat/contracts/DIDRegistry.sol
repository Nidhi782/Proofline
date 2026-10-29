// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title DIDRegistry
 * @dev On-chain registry for W3C did:ethr decentralized identity documents.
 * Enables identity holders to anchor, update, deactivate, and resolve their JSON-LD DID documents.
 */
contract DIDRegistry {
    // ------------------------------------------------------------------------
    // Types
    // ------------------------------------------------------------------------

    struct DIDDocument {
        address owner;
        string document; // JSON-LD DID document representation
        uint256 created;
        uint256 updated;
        bool active;
    }

    // ------------------------------------------------------------------------
    // State Variables
    // ------------------------------------------------------------------------

    mapping(string => DIDDocument) private _didDocuments;

    // ------------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------------

    event DIDRegistered(string did, address indexed owner, uint256 timestamp);
    event DIDUpdated(string did, address indexed owner, uint256 timestamp);
    event DIDDeactivated(string did, address indexed owner, uint256 timestamp);

    // ------------------------------------------------------------------------
    // Custom Errors
    // ------------------------------------------------------------------------

    error EmptyDIDString();
    error EmptyDocumentString();
    error DIDAlreadyRegistered(string did);
    error DIDNotFound(string did);
    error DIDNotActive(string did);
    error UnauthorizedDIDOwner(string did, address caller, address expectedOwner);

    // ------------------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------------------

    modifier onlyDIDOwner(string calldata did) {
        DIDDocument storage doc = _didDocuments[did];
        if (doc.owner == address(0)) {
            revert DIDNotFound(did);
        }
        if (doc.owner != msg.sender) {
            revert UnauthorizedDIDOwner(did, msg.sender, doc.owner);
        }
        if (!doc.active) {
            revert DIDNotActive(did);
        }
        _;
    }

    // ------------------------------------------------------------------------
    // External Functions
    // ------------------------------------------------------------------------

    /**
     * @notice Registers a new decentralized identifier (DID) and its corresponding JSON-LD document.
     * @param did The DID string (e.g., "did:ethr:0x...")
     * @param document The JSON-LD document representing the DID
     */
    function registerDID(string calldata did, string calldata document) external {
        if (bytes(did).length == 0) revert EmptyDIDString();
        if (bytes(document).length == 0) revert EmptyDocumentString();
        if (_didDocuments[did].owner != address(0)) revert DIDAlreadyRegistered(did);

        _didDocuments[did] = DIDDocument({
            owner: msg.sender,
            document: document,
            created: block.timestamp,
            updated: block.timestamp,
            active: true
        });

        emit DIDRegistered(did, msg.sender, block.timestamp);
    }

    /**
     * @notice Updates the JSON-LD document of an existing active DID.
     * @dev Can only be called by the DID owner.
     * @param did The DID string to update
     * @param document The updated JSON-LD document
     */
    function updateDID(string calldata did, string calldata document) external onlyDIDOwner(did) {
        if (bytes(document).length == 0) revert EmptyDocumentString();

        DIDDocument storage doc = _didDocuments[did];
        doc.document = document;
        doc.updated = block.timestamp;

        emit DIDUpdated(did, msg.sender, block.timestamp);
    }

    /**
     * @notice Deactivates a DID permanently.
     * @dev Can only be called by the DID owner.
     * @param did The DID string to deactivate
     */
    function deactivateDID(string calldata did) external onlyDIDOwner(did) {
        DIDDocument storage doc = _didDocuments[did];
        doc.active = false;
        doc.updated = block.timestamp;

        emit DIDDeactivated(did, msg.sender, block.timestamp);
    }

    /**
     * @notice Resolves a registered DID to its DIDDocument record.
     * @param did The DID string to resolve
     * @return doc DIDDocument struct containing owner, document, created, updated, and active status
     */
    function resolveDID(string calldata did) external view returns (DIDDocument memory doc) {
        doc = _didDocuments[did];
        if (doc.owner == address(0)) {
            revert DIDNotFound(did);
        }
        return doc;
    }

    /**
     * @notice Checks if a DID exists in the registry.
     * @param did The DID string
     * @return True if registered, false otherwise
     */
    function exists(string calldata did) external view returns (bool) {
        return _didDocuments[did].owner != address(0);
    }
}
