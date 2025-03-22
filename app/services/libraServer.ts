'use server';

import { RPC_URL, DEFAULT_NETWORK, DEFAULT_TX_LIMIT } from '../../config';

// Interface for transaction responses
interface Transaction {
    id: string;
    type: string;
    amount: string;
    timestamp: number;
    sender?: string;
    recipient?: string;
}

// Interface for coin resources
interface CoinStore {
    coin: {
        value: string;
    };
}

// Helper function to normalize account addresses
function normalizeAddress(address: string): string {
    // Remove 0x prefix if present
    const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;

    // Pad address to 64 characters with leading zeros
    const paddedAddress = cleanAddress.padStart(64, '0');

    // Return with 0x prefix
    return '0x' + paddedAddress;
}

// Get the current block height
export async function getBlockHeight(): Promise<number> {
    try {
        // This code will only run on the server
        const libraSDK = require('open-libra-sdk');

        const client = new libraSDK.LibraClient(libraSDK.Network.MAINNET, RPC_URL);
        const ledgerInfo = await client.getLedgerInfo();
        return parseInt(ledgerInfo.block_height, 10);
    } catch (error) {
        console.error('Failed to get block height:', error);
        // Fallback to mock data for client-side
        return 100;
    }
}

// Get the current epoch
export async function getEpoch(): Promise<number> {
    try {
        // This code will only run on the server
        const libraSDK = require('open-libra-sdk');

        const client = new libraSDK.LibraClient(libraSDK.Network.MAINNET, RPC_URL);
        const ledgerInfo = await client.getLedgerInfo();
        return parseInt(ledgerInfo.epoch, 10);
    } catch (error) {
        console.error('Failed to get epoch:', error);
        // Fallback to mock data for client-side
        return 1;
    }
}

// Get the latest transactions
export async function getLatestTransactions(limit: number = DEFAULT_TX_LIMIT): Promise<Transaction[]> {
    try {
        // This code will only run on the server
        const libraSDK = require('open-libra-sdk');

        const client = new libraSDK.LibraClient(libraSDK.Network.MAINNET, RPC_URL);

        // Get current block height
        const ledgerInfo = await client.getLedgerInfo();
        const blockHeight = parseInt(ledgerInfo.block_height, 10);

        // Try to get transactions from the latest blocks
        const transactions: Transaction[] = [];
        let fetched = 0;
        let currentBlock = blockHeight;
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 5;
        let blockSkip = 1;

        while (fetched < limit && currentBlock > 0 && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
            try {
                // Get block data with transactions
                const block = await client.getBlockByHeight({
                    blockHeight: BigInt(currentBlock),
                    options: { withTransactions: true }
                });

                // Reset consecutive errors counter on successful block fetch
                consecutiveErrors = 0;

                if (block && block.transactions && block.transactions.length > 0) {
                    // Process each transaction in the block
                    for (const tx of block.transactions) {
                        if (fetched >= limit) break;

                        try {
                            // For simplicity, we'll classify all transactions as "Transfer" for now
                            const txInfo: Transaction = {
                                id: tx.hash,
                                type: 'Transfer', // Default type
                                amount: '0', // Default amount
                                timestamp: parseInt(block.block_timestamp, 10) / 1000000, // Convert to milliseconds
                            };

                            // In a real implementation, we would parse the events to get the transaction details
                            if (tx.type === 'user_transaction') {
                                // Attempt to determine type from function name or payload
                                if (tx.payload && typeof tx.payload === 'object') {
                                    const payloadStr = JSON.stringify(tx.payload);

                                    if (payloadStr.includes('::stake::')) {
                                        txInfo.type = 'Stake';
                                    } else if (payloadStr.includes('::coin::')) {
                                        txInfo.type = 'Transfer';
                                    } else {
                                        txInfo.type = 'Contract Call';
                                    }

                                    // Try to extract amount from transaction data
                                    const amountMatch = payloadStr.match(/"amount":"(\d+)"/);
                                    if (amountMatch && amountMatch[1]) {
                                        txInfo.amount = amountMatch[1];
                                    }
                                }
                            }

                            transactions.push(txInfo);
                            fetched++;
                        } catch (txError) {
                            console.error('Error processing transaction:', txError);
                            // Continue to the next transaction
                        }
                    }
                }

                // If block has no transactions, increase skip value to search more efficiently
                if (!block.transactions || block.transactions.length === 0) {
                    blockSkip = Math.min(blockSkip + 1, 10); // Gradually increase skip up to 10
                } else {
                    blockSkip = 1; // Reset skip value when we find transactions
                }

            } catch (blockError) {
                // Increase skip value on error to avoid repeatedly hitting missing blocks
                blockSkip = Math.min(blockSkip + 2, 20);
                consecutiveErrors++;

                // Log error but don't spam console with the same errors
                if (consecutiveErrors <= 2) {
                    console.error(`Error fetching block ${currentBlock}:`, blockError);
                } else if (consecutiveErrors === MAX_CONSECUTIVE_ERRORS) {
                    console.error(`Too many consecutive errors fetching blocks, stopping search.`);
                }
            }

            // Skip blocks by the current skip value
            currentBlock -= blockSkip;
        }

        return transactions;
    } catch (error) {
        console.error('Failed to get latest transactions:', error);
        // Return mock data if there's an error
        return [
            { id: '0xabc...', type: 'Transfer', amount: '100', timestamp: Date.now() - 1000 * 60 },
            { id: '0xdef...', type: 'Stake', amount: '500', timestamp: Date.now() - 1000 * 120 },
            { id: '0xghi...', type: 'Transfer', amount: '250', timestamp: Date.now() - 1000 * 180 },
        ];
    }
}

// Get account resources
export async function getAccountResources(address: string): Promise<any> {
    try {
        // This code will only run on the server
        const libraSDK = require('open-libra-sdk');

        // Normalize the address by padding with zeros if needed
        const normalizedAddress = normalizeAddress(address);
        console.log(`Using normalized address: ${normalizedAddress} (original: ${address})`);

        const client = new libraSDK.LibraClient(libraSDK.Network.MAINNET, RPC_URL);

        try {
            // Use the getResource method with type parameter as shown in documentation
            const coinResource = await client.getResource(
                normalizedAddress,
                "0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>"
            );

            // Get all resources
            const resources = await client.getAccountResources({ accountAddress: normalizedAddress });

            const resourcesData = resources.map((resource: any) => ({
                type: resource.type,
                data: resource.data
            }));

            return {
                address: normalizedAddress,
                balance: coinResource?.coin?.value || '0',
                resources: resourcesData,
            };
        } catch (resourceError) {
            console.error('Error fetching specific resources:', resourceError);

            // Fallback: just get all resources if the specific coin resource fetch fails
            const resources = await client.getAccountResources({ accountAddress: normalizedAddress });

            // Look for coin resources to determine balance
            let totalBalance = '0';
            const resourcesData = resources.map((resource: any) => {
                // Check if this is a coin resource
                if (resource.type.includes('0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>')) {
                    if (resource.data && resource.data.coin && resource.data.coin.value) {
                        totalBalance = resource.data.coin.value.toString();
                    }
                }

                return {
                    type: resource.type,
                    data: resource.data
                };
            });

            return {
                address: normalizedAddress,
                balance: totalBalance,
                resources: resourcesData,
            };
        }
    } catch (error) {
        console.error(`Failed to get account resources for ${address}:`, error);
        // Return mock data for client-side rendering
        return {
            address,
            balance: '0',
            resources: [],
        };
    }
}

// Create a wallet (not used in the Explorer, but for reference)
export async function createWallet(mnemonic?: string): Promise<any> {
    try {
        const libraSDK = require('open-libra-sdk');

        if (mnemonic) {
            // Create a wallet from an existing mnemonic
            return libraSDK.LibraWallet.fromMnemonic(mnemonic, libraSDK.Network.MAINNET, RPC_URL);
        } else {
            // Generate a new mnemonic and wallet
            const newMnemonic = libraSDK.generateMnemonic();
            console.log('Generated mnemonic:', newMnemonic);

            return libraSDK.LibraWallet.fromMnemonic(newMnemonic, libraSDK.Network.MAINNET, RPC_URL);
        }
    } catch (error) {
        console.error('Failed to create wallet:', error);
        return null;
    }
} 