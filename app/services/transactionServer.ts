'use server';

import { RPC_URL } from '../../config';

// Helper function to normalize hashes and addresses
function normalizeHexString(hexString: string): string {
    // Remove 0x prefix if present
    const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;

    // Pad to 64 characters with leading zeros
    const paddedHex = cleanHex.padStart(64, '0');

    // Return with 0x prefix
    return '0x' + paddedHex;
}

// Fetch transaction details by hash
export async function getTransactionByHash(hash: string): Promise<any> {
    try {
        // This code will only run on the server
        const libraSDK = require('open-libra-sdk');

        // Normalize the transaction hash if it's too short
        const normalizedHash = normalizeHexString(hash);
        console.log(`Using normalized transaction hash: ${normalizedHash} (original: ${hash})`);

        const client = new libraSDK.LibraClient(libraSDK.Network.MAINNET, RPC_URL);

        // Fetch transaction by hash
        const txData = await client.getTransactionByHash({
            transactionHash: normalizedHash
        });

        // Extract sender for user transactions
        if (txData && txData.type === 'user_transaction') {
            // The sender is already in the transaction data as 'sender'
            if (!txData.sender && txData.sender_account_address) {
                txData.sender = txData.sender_account_address;
            }
        }

        return txData;
    } catch (error) {
        console.error(`Failed to get transaction details for ${hash}:`, error);
        // Return null on error, and we'll handle this in the UI
        return null;
    }
} 