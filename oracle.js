// oracle.js
const { Connection } = require("@solana/web3.js");
const { ethers } = require("ethers");
require("dotenv").config();

// ----- Ethereum Setup -----
const ETH_PROVIDER_URL = process.env.ETH_PROVIDER_URL;
const provider = new ethers.providers.JsonRpcProvider(ETH_PROVIDER_URL);
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const oracleWallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const CONTRACT_ABI = [
  "function depositForUser(address user, string calldata userSolanaWallet, uint256 amount, bytes32 depositId) external",
  "event Withdrawal(address indexed user, string userSolanaWallet, uint256 amount, bytes32 withdrawalId)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, oracleWallet);

// ----- Solana Setup -----
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL;
const solanaConnection = new Connection(SOLANA_RPC_URL, "confirmed");
const SOLANA_TOKEN_ADDRESS = "EYv2Fz8gTwqjDKcZCAnB3nB2g4QWMx7APbPye6oqcaQz";

// ----- Demo Functions -----
async function monitorSolanaDeposits() {
  console.log("Monitoring Solana for Quantum Dubai token deposits...");

  // For demo: simulate deposit detection after 5 seconds.
  setTimeout(async () => {
    const userEthereumAddress = "0xUserEthereumAddress"; // Replace with a test user Ethereum address.
    const userSolanaWallet = "UserSolanaWalletAddress";   // Replace with a test Solana wallet.
    const amount = 1000; // Example deposit amount.
    const depositId = ethers.utils.id(Date.now().toString());

    console.log(`Detected deposit on Solana: ${amount} tokens from ${userSolanaWallet}`);

    try {
      const tx = await contract.depositForUser(userEthereumAddress, userSolanaWallet, amount, depositId);
      console.log("depositForUser called. Tx hash:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed on Ethereum.");
    } catch (err) {
      console.error("Error in depositForUser:", err);
    }
  }, 5000);
}

function monitorEthereumWithdrawals() {
  console.log("Subscribing to Ethereum Withdrawal events...");

  contract.on("Withdrawal", (user, userSolanaWallet, amount, withdrawalId, event) => {
    console.log(`Withdrawal event detected:
      User: ${user}
      Solana Wallet: ${userSolanaWallet}
      Amount: ${amount.toString()}
      Withdrawal ID: ${withdrawalId}`);
    // Here you could trigger the Solana release/burn process.
  });
}

async function main() {
  monitorEthereumWithdrawals();
  await monitorSolanaDeposits();
}

main();
