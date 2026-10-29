// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GovernanceMultiSig
 * @notice M-of-N peer review contract for verifier data requests.
 * @dev Implements multi-party oversight to prevent verifiers from requesting
 *      more personal data than a given transaction requires. Any verifier must
 *      obtain quorum peer approval before accessing fields beyond the minimum
 *      required for their stated domain.
 */
contract GovernanceMultiSig is Ownable {
    // ─── Types ────────────────────────────────────────────────────────────────

    enum RequestStatus {
        PENDING,
        APPROVED,
        REJECTED,
        EXPIRED
    }

    struct DataRequest {
        bytes32 requestId;
        address requester;
        string requesterDID;
        string domain;
        string[] dataFields;
        string justification;
        uint256 createdAt;
        uint256 expiresAt;
        RequestStatus status;
        uint256 approvals;
        uint256 rejections;
        address[] approvedBy;
        address[] rejectedBy;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Minimum number of peer approvals required to approve a request
    uint256 public quorum;

    /// @notice Registered peer reviewers
    address[] public peers;

    /// @notice Time window within which votes must be cast
    uint256 public constant REQUEST_EXPIRY = 7 days;

    /// @notice Mapping from requestId to DataRequest
    mapping(bytes32 => DataRequest) public requests;

    /// @notice Whether an address is a registered peer
    mapping(address => bool) public isPeer;

    /// @notice Voter => requestId => has voted
    mapping(address => mapping(bytes32 => bool)) public hasVoted;

    /// @notice All request IDs (for enumeration)
    bytes32[] public allRequestIds;

    // ─── Events ───────────────────────────────────────────────────────────────

    event RequestSubmitted(
        bytes32 indexed requestId,
        address indexed requester,
        string domain,
        string[] dataFields
    );

    event VoteCast(
        bytes32 indexed requestId,
        address indexed voter,
        bool approve
    );

    event RequestApproved(bytes32 indexed requestId, uint256 approvals);

    event RequestRejected(bytes32 indexed requestId, uint256 rejections);

    event PeerAdded(address indexed peer);
    event PeerRemoved(address indexed peer);
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotAPeer(address caller);
    error AlreadyVoted(address voter, bytes32 requestId);
    error RequestNotPending(bytes32 requestId);
    error RequestNotFound(bytes32 requestId);
    error RequestExpired(bytes32 requestId);
    error InsufficientPeers(uint256 required, uint256 available);
    error InvalidQuorum(uint256 quorum, uint256 peerCount);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param initialPeers  Array of initial peer reviewer addresses
     * @param _quorum       Minimum approvals required (must be <= peers.length)
     */
    constructor(address[] memory initialPeers, uint256 _quorum) Ownable(msg.sender) {
        if (_quorum == 0 || _quorum > initialPeers.length) {
            revert InvalidQuorum(_quorum, initialPeers.length);
        }
        for (uint256 i = 0; i < initialPeers.length; i++) {
            require(initialPeers[i] != address(0), "GovernanceMultiSig: zero address peer");
            peers.push(initialPeers[i]);
            isPeer[initialPeers[i]] = true;
            emit PeerAdded(initialPeers[i]);
        }
        quorum = _quorum;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyPeer() {
        if (!isPeer[msg.sender]) revert NotAPeer(msg.sender);
        _;
    }

    // ─── External Functions ───────────────────────────────────────────────────

    /**
     * @notice Submit a data request for peer review.
     * @param domain        The service domain requesting the data
     * @param dataFields    Array of requested data field names
     * @param justification Plain-text justification for the request
     * @param requesterDID  W3C DID of the requester
     * @return requestId    Unique identifier for the created request
     */
    function submitRequest(
        string calldata domain,
        string[] calldata dataFields,
        string calldata justification,
        string calldata requesterDID
    ) external returns (bytes32 requestId) {
        requestId = keccak256(
            abi.encodePacked(msg.sender, domain, block.timestamp, block.prevrandao)
        );

        DataRequest storage req = requests[requestId];
        req.requestId    = requestId;
        req.requester    = msg.sender;
        req.requesterDID = requesterDID;
        req.domain       = domain;
        req.justification = justification;
        req.createdAt    = block.timestamp;
        req.expiresAt    = block.timestamp + REQUEST_EXPIRY;
        req.status       = RequestStatus.PENDING;

        for (uint256 i = 0; i < dataFields.length; i++) {
            req.dataFields.push(dataFields[i]);
        }

        allRequestIds.push(requestId);

        emit RequestSubmitted(requestId, msg.sender, domain, dataFields);
    }

    /**
     * @notice Cast a vote on a pending request.
     * @param requestId  The request to vote on
     * @param approve    True to approve, false to reject
     */
    function vote(bytes32 requestId, bool approve) external onlyPeer {
        DataRequest storage req = requests[requestId];

        if (req.requestId == bytes32(0)) revert RequestNotFound(requestId);
        if (req.status != RequestStatus.PENDING) revert RequestNotPending(requestId);
        if (block.timestamp > req.expiresAt) {
            req.status = RequestStatus.EXPIRED;
            revert RequestExpired(requestId);
        }
        if (hasVoted[msg.sender][requestId]) revert AlreadyVoted(msg.sender, requestId);

        hasVoted[msg.sender][requestId] = true;
        emit VoteCast(requestId, msg.sender, approve);

        if (approve) {
            req.approvals++;
            req.approvedBy.push(msg.sender);
            if (req.approvals >= quorum) {
                req.status = RequestStatus.APPROVED;
                emit RequestApproved(requestId, req.approvals);
            }
        } else {
            req.rejections++;
            req.rejectedBy.push(msg.sender);
            // Reject if enough rejections to make quorum impossible
            if (req.rejections > peers.length - quorum) {
                req.status = RequestStatus.REJECTED;
                emit RequestRejected(requestId, req.rejections);
            }
        }
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Check if a request has been approved by quorum.
     */
    function isApproved(bytes32 requestId) external view returns (bool) {
        return requests[requestId].status == RequestStatus.APPROVED;
    }

    /**
     * @notice Get all request IDs.
     */
    function getAllRequestIds() external view returns (bytes32[] memory) {
        return allRequestIds;
    }

    /**
     * @notice Get the status of a request.
     */
    function getRequestStatus(bytes32 requestId) external view returns (RequestStatus) {
        return requests[requestId].status;
    }

    /**
     * @notice Get approved-by addresses for a request.
     */
    function getApprovedBy(bytes32 requestId) external view returns (address[] memory) {
        return requests[requestId].approvedBy;
    }

    /**
     * @notice Get data fields for a request.
     */
    function getDataFields(bytes32 requestId) external view returns (string[] memory) {
        return requests[requestId].dataFields;
    }

    /**
     * @notice Get all peers.
     */
    function getPeers() external view returns (address[] memory) {
        return peers;
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    /**
     * @notice Add a new peer reviewer.
     */
    function addPeer(address peer) external onlyOwner {
        require(peer != address(0), "GovernanceMultiSig: zero address");
        require(!isPeer[peer], "GovernanceMultiSig: already a peer");
        peers.push(peer);
        isPeer[peer] = true;
        emit PeerAdded(peer);
    }

    /**
     * @notice Remove a peer reviewer.
     */
    function removePeer(address peer) external onlyOwner {
        require(isPeer[peer], "GovernanceMultiSig: not a peer");
        if (peers.length - 1 < quorum) {
            revert InsufficientPeers(quorum, peers.length - 1);
        }
        isPeer[peer] = false;
        // Remove from array
        for (uint256 i = 0; i < peers.length; i++) {
            if (peers[i] == peer) {
                peers[i] = peers[peers.length - 1];
                peers.pop();
                break;
            }
        }
        emit PeerRemoved(peer);
    }

    /**
     * @notice Update the quorum threshold.
     */
    function setQuorum(uint256 newQuorum) external onlyOwner {
        if (newQuorum == 0 || newQuorum > peers.length) {
            revert InvalidQuorum(newQuorum, peers.length);
        }
        emit QuorumUpdated(quorum, newQuorum);
        quorum = newQuorum;
    }
}
