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

        // Process the transaction data before returning
        if (txData) {
            // Try to extract address from changes if available
            if (txData.changes && Array.isArray(txData.changes) && txData.changes.length > 0) {
                // Look for the first available address in changes
                for (const change of txData.changes) {
                    if (change.address && !txData.sender) {
                        txData.sender = change.address;
                        break;
                    }
                }
            }

            // Extract sender for user transactions if not already set
            if (txData.type === 'user_transaction' && !txData.sender) {
                // The sender is already in the transaction data as 'sender'
                if (txData.sender_account_address) {
                    txData.sender = txData.sender_account_address;
                }
            }

            // Keep the original type as a separate property
            txData.originalType = txData.type;

            // Process transaction type to be more descriptive
            if (txData.type === 'user_transaction') {
                // Attempt to determine type from function name or payload
                if (txData.payload && typeof txData.payload === 'object') {
                    const payloadStr = JSON.stringify(txData.payload);

                    // Try to extract function name
                    let functionName = txData.type;

                    if (txData.payload.function) {
                        // Get full function path
                        const functionPath = txData.payload.function.toString();

                        // Extract just the module and function name (last two parts)
                        const parts = functionPath.split('::');
                        if (parts.length >= 2) {
                            // Format as "module::function"
                            functionName = `${parts[parts.length - 2]}::${parts[parts.length - 1]}`;
                        } else {
                            functionName = functionPath;
                        }

                        // Set the type based on the function name
                        txData.displayType = functionName;
                    }

                    // Special handling for common transaction types
                    if (payloadStr.includes('::stake::')) {
                        txData.displayType = 'Stake';
                    } else if (payloadStr.includes('::coin::transfer')) {
                        txData.displayType = 'Transfer';
                    } else if (payloadStr.includes('::governance::')) {
                        txData.displayType = 'Governance';
                    } else if (payloadStr.includes('::vouch::')) {
                        txData.displayType = 'Vouch';
                    } else if (!txData.payload.function) {
                        txData.displayType = 'Contract Call';
                    }
                }

                // Check for event types if we haven't determined a specific type yet
                if ((!txData.displayType || txData.displayType === 'user') && txData.events && Array.isArray(txData.events)) {
                    // Look through events for better type categorization
                    for (const event of txData.events) {
                        if (event.type) {
                            if (event.type.includes('::coin::WithdrawEvent')) {
                                txData.displayType = 'Coin Withdrawal';
                                break;
                            } else if (event.type.includes('::coin::DepositEvent')) {
                                txData.displayType = 'Coin Deposit';
                                break;
                            } else if (event.type.includes('::stake::')) {
                                txData.displayType = 'Stake';
                                break;
                            } else if (event.type.includes('::governance::')) {
                                txData.displayType = 'Governance';
                                break;
                            }
                        }
                    }
                }
            } else if (txData.type === 'block_metadata') {
                txData.displayType = 'Block Metadata';
            } else if (txData.type === 'state_checkpoint') {
                txData.displayType = 'State Checkpoint';
            }

            // Remove '_transaction' from the display type if present
            if (txData.displayType && typeof txData.displayType === 'string' && txData.displayType.endsWith('_transaction')) {
                txData.displayType = txData.displayType.replace('_transaction', '');
            } else if (!txData.displayType) {
                // Default display type if we couldn't determine a better one
                txData.displayType = txData.type;
            }
        }

        return txData;
    } catch (error) {
        console.error(`Failed to get transaction details for ${hash}:`, error);
        // Return null on error, and we'll handle this in the UI
        return null;
    }
} 