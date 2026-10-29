import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * deploy.ts — Deployment script for all ZKP-DID Framework contracts.
 *
 * Deploys in dependency order:
 *   1. DIDRegistry
 *   2. CredentialRegistry
 *   3. RevocationRegistry
 *   4. Verifier (Groth16 ZK verifier)
 *   5. GovernanceMultiSig (M-of-N peer review)
 *   6. AuditLog (immutable decision log)
 *
 * Then writes deployed addresses and environment values into the hardhat workspace.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network localhost
 *   npx hardhat run scripts/deploy.ts --network amoy
 */
async function main() {
  const [deployer, peer1, peer2, peer3] = await ethers.getSigners();

  console.log("\n🚀 ZKP-DID Framework — Contract Deployment");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Deployer:  ", deployer.address);
  console.log("Network:   ", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:  ", (await ethers.provider.getNetwork()).chainId.toString());

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:   ", ethers.formatEther(balance), "ETH\n");

  // ─── 1. DIDRegistry ─────────────────────────────────────────────────────
  console.log("📋 Deploying DIDRegistry...");
  const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistry.deploy();
  await didRegistry.waitForDeployment();
  const didRegistryAddr = await didRegistry.getAddress();
  console.log("   ✅ DIDRegistry deployed at:", didRegistryAddr);

  // ─── 2. CredentialRegistry ───────────────────────────────────────────────
  console.log("📋 Deploying CredentialRegistry...");
  const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = await CredentialRegistry.deploy();
  await credentialRegistry.waitForDeployment();
  const credentialRegistryAddr = await credentialRegistry.getAddress();
  console.log("   ✅ CredentialRegistry deployed at:", credentialRegistryAddr);

  // ─── 3. RevocationRegistry ───────────────────────────────────────────────
  console.log("📋 Deploying RevocationRegistry...");
  const RevocationRegistry = await ethers.getContractFactory("RevocationRegistry");
  const revocationRegistry = await RevocationRegistry.deploy();
  await revocationRegistry.waitForDeployment();
  const revocationRegistryAddr = await revocationRegistry.getAddress();
  console.log("   ✅ RevocationRegistry deployed at:", revocationRegistryAddr);

  // ─── 4. Verifier ─────────────────────────────────────────────────────────
  console.log("📋 Deploying Verifier (Groth16)...");
  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();
  console.log("   ✅ Verifier deployed at:", verifierAddr);

  // ─── 5. GovernanceMultiSig ───────────────────────────────────────────────
  console.log("📋 Deploying GovernanceMultiSig (3-of-3 peer review, quorum=2)...");
  const peerAddresses = [peer1.address, peer2.address, peer3.address];
  const quorum = 2;
  const GovernanceMultiSig = await ethers.getContractFactory("GovernanceMultiSig");
  const governance = await GovernanceMultiSig.deploy(peerAddresses, quorum);
  await governance.waitForDeployment();
  const governanceAddr = await governance.getAddress();
  console.log("   ✅ GovernanceMultiSig deployed at:", governanceAddr);
  console.log("      Peers:", peerAddresses.join(", "));
  console.log("      Quorum:", quorum);

  // ─── 6. AuditLog ─────────────────────────────────────────────────────────
  console.log("📋 Deploying AuditLog...");
  const AuditLog = await ethers.getContractFactory("AuditLog");
  // Admin = deployer; PDP = deployer for dev (replace with actual PDP address in prod)
  const auditLog = await AuditLog.deploy(deployer.address, deployer.address);
  await auditLog.waitForDeployment();
  const auditLogAddr = await auditLog.getAddress();
  console.log("   ✅ AuditLog deployed at:", auditLogAddr);

  // ─── Summary ─────────────────────────────────────────────────────────────
  const addresses = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      DIDRegistry: didRegistryAddr,
      CredentialRegistry: credentialRegistryAddr,
      RevocationRegistry: revocationRegistryAddr,
      Verifier: verifierAddr,
      GovernanceMultiSig: governanceAddr,
      AuditLog: auditLogAddr,
    },
    peers: peerAddresses,
    quorum,
  };

  console.log("\n✅ All contracts deployed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(JSON.stringify(addresses.contracts, null, 2));

  // Write to project root
  const outputPath = join(__dirname, "../deployed-addresses.json");
  writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("\n📁 Addresses written to deployed-addresses.json");

  // Also write .env.addresses for Docker Compose
  const envContent = [
    `DID_REGISTRY_ADDRESS=${didRegistryAddr}`,
    `CREDENTIAL_REGISTRY_ADDRESS=${credentialRegistryAddr}`,
    `REVOCATION_REGISTRY_ADDRESS=${revocationRegistryAddr}`,
    `VERIFIER_ADDRESS=${verifierAddr}`,
    `GOVERNANCE_ADDRESS=${governanceAddr}`,
    `AUDIT_LOG_ADDRESS=${auditLogAddr}`,
    `PDP_DEPLOYER_ADDRESS=${deployer.address}`,
  ].join("\n");

  const envPath = join(__dirname, "../.env.addresses");
  writeFileSync(envPath, envContent);
  console.log("📁 .env.addresses written for Docker Compose\n");
  console.log("🔑 Copy contract addresses into backend/.env and frontend/.env");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
