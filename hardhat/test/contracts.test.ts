import { ethers } from "hardhat";
import { expect } from "chai";
import type { DIDRegistry, CredentialRegistry, RevocationRegistry, GovernanceMultiSig, AuditLog } from "../typechain-types";

describe("ZKP-DID Framework — Smart Contract Tests", function () {
  // ─── Shared signers ─────────────────────────────────────────────────────
  let owner: any, peer1: any, peer2: any, peer3: any, user: any;

  before(async () => {
    [owner, peer1, peer2, peer3, user] = await ethers.getSigners();
  });

  // ─── DIDRegistry ──────────────────────────────────────────────────────────
  describe("DIDRegistry", () => {
    let registry: DIDRegistry;
    const testDID = "did:ethr:0x742d35Cc6634C0532925a3b8D4C9C2C8e4a3e1f";
    const testDoc = JSON.stringify({
      "@context": ["https://www.w3.org/ns/did/v1"],
      id: testDID,
      verificationMethod: [{
        id: `${testDID}#key-1`,
        type: "EcdsaSecp256k1VerificationKey2019",
        publicKeyHex: "0xaabbcc"
      }]
    });

    before(async () => {
      const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
      registry = await DIDRegistry.deploy() as DIDRegistry;
      await registry.waitForDeployment();
    });

    it("should register a new DID", async () => {
      await expect(registry.registerDID(testDID, testDoc))
        .to.emit(registry, "DIDRegistered")
        .withArgs(testDID, owner.address);
    });

    it("should resolve a registered DID", async () => {
      const resolved = await registry.resolveDID(testDID);
      expect(resolved.owner).to.equal(owner.address);
      expect(resolved.active).to.equal(true);
      expect(resolved.document).to.equal(testDoc);
    });

    it("should update a DID document", async () => {
      const updatedDoc = testDoc.replace("0xaabbcc", "0xddeeff");
      await expect(registry.updateDID(testDID, updatedDoc))
        .to.emit(registry, "DIDUpdated")
        .withArgs(testDID, owner.address);

      const resolved = await registry.resolveDID(testDID);
      expect(resolved.document).to.equal(updatedDoc);
    });

    it("should reject update from non-owner", async () => {
      await expect(
        registry.connect(user).updateDID(testDID, "bad doc")
      ).to.be.revertedWithCustomError(registry, "NotDIDOwner");
    });

    it("should deactivate a DID", async () => {
      await expect(registry.deactivateDID(testDID))
        .to.emit(registry, "DIDDeactivated")
        .withArgs(testDID, owner.address);

      const resolved = await registry.resolveDID(testDID);
      expect(resolved.active).to.equal(false);
    });

    it("should reject duplicate DID registration", async () => {
      const newDID = "did:ethr:0xNewAddress1234";
      await registry.registerDID(newDID, testDoc);
      await expect(
        registry.registerDID(newDID, testDoc)
      ).to.be.revertedWithCustomError(registry, "DIDAlreadyRegistered");
    });
  });

  // ─── CredentialRegistry ───────────────────────────────────────────────────
  describe("CredentialRegistry", () => {
    let credReg: CredentialRegistry;
    const credHash = ethers.keccak256(ethers.toUtf8Bytes("test-credential-001"));
    const ipfsCID = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
    const subjectDID = ethers.keccak256(ethers.toUtf8Bytes("did:ethr:subject"));

    before(async () => {
      const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
      credReg = await CredentialRegistry.deploy() as CredentialRegistry;
      await credReg.waitForDeployment();
    });

    it("should anchor a credential", async () => {
      await expect(credReg.anchorCredential(credHash, ipfsCID, subjectDID))
        .to.emit(credReg, "CredentialAnchored")
        .withArgs(credHash, owner.address, subjectDID);
    });

    it("should report credential as not revoked", async () => {
      expect(await credReg.isRevoked(credHash)).to.equal(false);
    });

    it("should return credential data", async () => {
      const cred = await credReg.getCredential(credHash);
      expect(cred.issuer).to.equal(owner.address);
      expect(cred.ipfsCID).to.equal(ipfsCID);
      expect(cred.revoked).to.equal(false);
    });

    it("should revoke a credential", async () => {
      await expect(credReg.revokeCredential(credHash))
        .to.emit(credReg, "CredentialRevoked")
        .withArgs(credHash, owner.address);

      expect(await credReg.isRevoked(credHash)).to.equal(true);
    });

    it("should reject revocation from non-issuer", async () => {
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("test-cred-002"));
      await credReg.anchorCredential(hash2, "QmAnother", subjectDID);

      await expect(
        credReg.connect(user).revokeCredential(hash2)
      ).to.be.revertedWithCustomError(credReg, "NotIssuer");
    });
  });

  // ─── RevocationRegistry ───────────────────────────────────────────────────
  describe("RevocationRegistry", () => {
    let revReg: RevocationRegistry;
    const testNullifier = ethers.keccak256(ethers.toUtf8Bytes("nullifier-001"));

    before(async () => {
      const RevocationRegistry = await ethers.getContractFactory("RevocationRegistry");
      revReg = await RevocationRegistry.deploy() as RevocationRegistry;
      await revReg.waitForDeployment();
    });

    it("should report nullifier as not revoked initially", async () => {
      expect(await revReg.isNullifierRevoked(testNullifier)).to.equal(false);
    });

    it("should revoke a nullifier", async () => {
      await expect(revReg.revokeNullifier(testNullifier))
        .to.emit(revReg, "NullifierRevoked")
        .withArgs(testNullifier, owner.address);

      expect(await revReg.isNullifierRevoked(testNullifier)).to.equal(true);
    });

    it("should reject revocation from non-owner", async () => {
      const nullifier2 = ethers.keccak256(ethers.toUtf8Bytes("nullifier-002"));
      await expect(
        revReg.connect(user).revokeNullifier(nullifier2)
      ).to.be.revertedWithCustomError(revReg, "OwnableUnauthorizedAccount");
    });

    it("should not double-revoke", async () => {
      await expect(
        revReg.revokeNullifier(testNullifier)
      ).to.be.revertedWithCustomError(revReg, "NullifierAlreadyRevoked");
    });
  });

  // ─── GovernanceMultiSig ───────────────────────────────────────────────────
  describe("GovernanceMultiSig", () => {
    let governance: GovernanceMultiSig;
    let requestId: string;

    before(async () => {
      const GovernanceMultiSig = await ethers.getContractFactory("GovernanceMultiSig");
      governance = await GovernanceMultiSig.deploy(
        [peer1.address, peer2.address, peer3.address],
        2
      ) as GovernanceMultiSig;
      await governance.waitForDeployment();
    });

    it("should have correct initial quorum", async () => {
      expect(await governance.quorum()).to.equal(2);
    });

    it("should submit a data request", async () => {
      const tx = await governance.connect(user).submitRequest(
        "healthcare",
        ["age", "qualification"],
        "Age verification for specialist consultation",
        "did:ethr:0xUserAddress"
      );
      const receipt = await tx.wait();

      // Find RequestSubmitted event
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = governance.interface.parseLog(log);
          return parsed?.name === "RequestSubmitted";
        } catch { return false; }
      });
      expect(event).to.not.be.undefined;

      const parsed = governance.interface.parseLog(event!);
      requestId = parsed?.args[0] as string;
      expect(requestId).to.not.be.undefined;
    });

    it("should be pending initially", async () => {
      const status = await governance.getRequestStatus(requestId);
      expect(status).to.equal(0); // PENDING
    });

    it("should not be approved before quorum", async () => {
      expect(await governance.isApproved(requestId)).to.equal(false);
    });

    it("should count one vote correctly", async () => {
      await governance.connect(peer1).vote(requestId, true);
      const req = await governance.requests(requestId);
      expect(req.approvals).to.equal(1n);
      expect(await governance.isApproved(requestId)).to.equal(false);
    });

    it("should approve after reaching quorum", async () => {
      await expect(governance.connect(peer2).vote(requestId, true))
        .to.emit(governance, "RequestApproved")
        .withArgs(requestId, 2n);

      expect(await governance.isApproved(requestId)).to.equal(true);
    });

    it("should reject double voting", async () => {
      await expect(
        governance.connect(peer1).vote(requestId, true)
      ).to.be.revertedWithCustomError(governance, "AlreadyVoted");
    });

    it("should reject PENDING request after quorum reached", async () => {
      await expect(
        governance.connect(peer3).vote(requestId, false)
      ).to.be.revertedWithCustomError(governance, "RequestNotPending");
    });

    it("should test rejection path (new request)", async () => {
      const tx2 = await governance.connect(user).submitRequest(
        "enterprise",
        ["fullName", "address", "ssn"],
        "Over-collection test",
        "did:ethr:0xUserAddress"
      );
      const receipt2 = await tx2.wait();
      const event2 = receipt2?.logs.find((log: any) => {
        try {
          return governance.interface.parseLog(log)?.name === "RequestSubmitted";
        } catch { return false; }
      });
      const parsed2 = governance.interface.parseLog(event2!);
      const requestId2 = parsed2?.args[0] as string;

      await governance.connect(peer1).vote(requestId2, false);
      await expect(governance.connect(peer2).vote(requestId2, false))
        .to.emit(governance, "RequestRejected");

      expect(await governance.isApproved(requestId2)).to.equal(false);
    });
  });

  // ─── AuditLog ─────────────────────────────────────────────────────────────
  describe("AuditLog", () => {
    let auditLog: AuditLog;
    const nullifier = ethers.keccak256(ethers.toUtf8Bytes("audit-nullifier-001"));
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof-hash-001"));

    before(async () => {
      const AuditLog = await ethers.getContractFactory("AuditLog");
      auditLog = await AuditLog.deploy(owner.address, owner.address) as AuditLog;
      await auditLog.waitForDeployment();
    });

    it("should log a PERMIT decision", async () => {
      await expect(auditLog.logDecision(nullifier, proofHash, "academic", true))
        .to.emit(auditLog, "DecisionLogged")
        .withArgs(0n, nullifier, "academic", true, proofHash, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
    });

    it("should retrieve entries by nullifier", async () => {
      const entries = await auditLog.getEntriesByNullifier(nullifier);
      expect(entries.length).to.equal(1);
      expect(entries[0].permitted).to.equal(true);
      expect(entries[0].domain).to.equal("academic");
    });

    it("should log a DENY decision", async () => {
      const nullifier2 = ethers.keccak256(ethers.toUtf8Bytes("nullifier-deny"));
      await auditLog.logDecision(nullifier2, proofHash, "iot", false);

      const entries = await auditLog.getEntriesByNullifier(nullifier2);
      expect(entries[0].permitted).to.equal(false);
    });

    it("should reject log from non-PDP address", async () => {
      await expect(
        auditLog.connect(user).logDecision(nullifier, proofHash, "test", true)
      ).to.be.revertedWithCustomError(auditLog, "AccessControlUnauthorizedAccount");
    });

    it("should return recent entries", async () => {
      const recent = await auditLog.getRecentEntries(5);
      expect(recent.length).to.be.lte(5);
    });

    it("should return correct entry count", async () => {
      expect(await auditLog.entryCount()).to.equal(2n);
    });
  });
});
