// oracle.js
const { Connection, PublicKey } = require("@solana/web3.js");
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
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL; // e.g., "https://api.devnet.solana.com"
const solanaConnection = new Connection(SOLANA_RPC_URL, "confirmed");

// The Quantum Dubai token mint on Solana (provided)
const SOLANA_TOKEN_ADDRESS = "EYv2Fz8gTwqjDKcZCAnB3nB2g4QWMx7APbPye6oqcaQz";
// For reference, you provided this pool URL:
// const SOLANA_POOL_URL = "https://www.geckoterminal.com/solana/pools/EYv2Fz8gTwqjDKcZCAnB3nB2g4QWMx7APbPye6oqcaQz";

// The deposit wallet public key – this wallet receives token deposits on Solana.
const DEPOSIT_WALLET = process.env.DEPOSIT_WALLET; // e.g., "YourDepositWalletPublicKey"

// The Ethereum address to credit for deposits (in a real system this would come from a mapping)
const DEPOSIT_USER_ETH_ADDRESS = process.env.DEPOSIT_USER_ETH_ADDRESS; // e.g., "0xUserEthereumAddress"

// Variable to store the last observed balance of the deposit wallet's token account.
let lastBalance = 0;

// Polling interval in milliseconds (for demo, every 30 seconds)
const POLLING_INTERVAL = 30000;

/**
 * pollDepositWallet queries the Solana deposit wallet for its balance of the Quantum Dubai token.
 * If a higher balance is detected than the previous check, it treats the difference as a new deposit.
 */
async function pollDepositWallet() {
  if (!DEPOSIT_WALLET) {
    console.error("DEPOSIT_WALLET environment variable is not set.");
    return;
  }
  const ownerPubkey = new PublicKey(DEPOSIT_WALLET);
  const mintPubkey = new PublicKey(SOLANA_TOKEN_ADDRESS);

  try {
    // Get all token accounts for the deposit wallet with the specified mint.
    const tokenAccounts = await solanaConnection.getTokenAccountsByOwner(ownerPubkey, { mint: mintPubkey });
    if (tokenAccounts.value.length === 0) {
      console.log("No token accounts found for the deposit wallet.");
      return;
    }

    // For demo purposes, assume there is only one such token account.
    const tokenAccountPubkey = tokenAccounts.value[0].pubkey;
    const tokenBalanceResponse = await solanaConnection.getTokenAccountBalance(tokenAccountPubkey);
    // The amount is returned as a string. For simplicity, we convert it to a Number.
    const currentBalance = parseFloat(tokenBalanceResponse.value.amount);
    console.log(`Current deposit wallet token balance: ${currentBalance}`);

    if (currentBalance > lastBalance) {
      const depositAmount = currentBalance - lastBalance;
      console.log(`Detected new deposit: ${depositAmount} tokens.`);
      lastBalance = currentBalance;

      // Generate a unique deposit ID (for demo purposes using the current timestamp).
      const depositId = ethers.utils.id(Date.now().toString());

      // Call depositForUser on the Ethereum contract.
      try {
        const tx = await contract.depositForUser(DEPOSIT_USER_ETH_ADDRESS, DEPOSIT_WALLET, depositAmount, depositId);
        console.log("Called depositForUser on Ethereum. Transaction hash:", tx.hash);
        await tx.wait();
        console.log("Ethereum transaction confirmed. Minted tokens for the user.");
      } catch (err) {
        console.error("Error calling depositForUser:", err);
      }
    } else {
      console.log("No new deposit detected.");
    }
  } catch (err) {
    console.error("Error polling deposit wallet:", err);
  }
}

/**
 * monitorEthereumWithdrawals subscribes to Withdrawal events on the Ethereum contract.
 * In a production system, these events could be used to trigger the release or burn
 * of corresponding tokens on Solana.
 */
function monitorEthereumWithdrawals() {
  console.log("Subscribing to Ethereum Withdrawal events...");

  contract.on("Withdrawal", (user, userSolanaWallet, amount, withdrawalId, event) => {
    console.log(`Withdrawal event detected:
      - User Ethereum Address: ${user}
      - User Solana Wallet: ${userSolanaWallet}
      - Amount: ${amount.toString()}
      - Withdrawal ID: ${withdrawalId}`);
    // Here, you would trigger the corresponding Solana side action.
  });
}

/**
 * main sets up the Ethereum withdrawal listener and starts the polling loop
 * for detecting new deposits on the Solana deposit wallet.
 */
async function main() {
  monitorEthereumWithdrawals();
  // Start polling every POLLING_INTERVAL milliseconds.
  setInterval(pollDepositWallet, POLLING_INTERVAL);
}

main();
