'use client';

import { CLIENT_SIDE_API, RPC_URL, DEBUG_MODE, DEFAULT_TX_LIMIT } from '../../config';
import * as serverActions from './libraServer';

// Types for client-side usage
export interface Transaction {
    id: string;
    type: string;
    amount: string;
    timestamp: number;
    sender?: string;
    recipient?: string;
    blockHeight?: string;
    version?: string;
}

export interface CoinStore {
    coin: {
        value: string;
    };
}

// Define mock data for client-side fallback if needed
export const MOCK_TRANSACTIONS: Transaction[] = [
    { id: '0xabc...', type: 'Transfer', amount: '100', timestamp: Date.now() - 1000 * 60 },
    { id: '0xdef...', type: 'Stake', amount: '500', timestamp: Date.now() - 1000 * 120 },
    { id: '0xghi...', type: 'Transfer', amount: '250', timestamp: Date.now() - 1000 * 180 },
];

// Client-side implementations
async function clientGetBlockHeight(): Promise<number> {
    try {
        // Try to load the SDK with better error handling for browser compatibility
        let sdk;
        try {
            sdk = await import('open-libra-sdk');
        } catch (sdkError) {
            console.error('Failed to import open-libra-sdk:', sdkError);
            throw new Error('The Open Libra SDK is not compatible with browser environments');
        }

        const client = new sdk.LibraClient(sdk.Network.MAINNET, RPC_URL);
        const blockHeight = await client.getChainId();
        return parseInt(blockHeight, 10) || 0;
    } catch (error) {
        console.error('Failed to get block height:', error);
        return 0;
    }
}

async function clientGetEpoch(): Promise<number> {
    try {
        // Try to load the SDK with better error handling for browser compatibility
        let sdk;
        try {
            sdk = await import('open-libra-sdk');
        } catch (sdkError) {
            console.error('Failed to import open-libra-sdk:', sdkError);
            throw new Error('The Open Libra SDK is not compatible with browser environments');
        }

        const client = new sdk.LibraClient(sdk.Network.MAINNET, RPC_URL);
        const result = await client.getEpoch();
        return parseInt(result, 10) || 0;
    } catch (error) {
        console.error('Failed to get epoch:', error);
        return 0;
    }
}

async function clientGetLatestTransactions(limit: number = DEFAULT_TX_LIMIT): Promise<Transaction[]> {
    try {
        // Try to load the SDK with better error handling for browser compatibility
        let sdk;
        try {
            sdk = await import('open-libra-sdk');
        } catch (sdkError) {
            console.error('Failed to import open-libra-sdk:', sdkError);
            throw new Error('The Open Libra SDK is not compatible with browser environments');
        }

        const client = new sdk.LibraClient(sdk.Network.MAINNET, RPC_URL);

        // Get the current block height
        const blockHeight = await client.getChainId();
        const currentBlock = parseInt(blockHeight, 10);

        const transactions: Transaction[] = [];
        let fetched = 0;
        let blockSkip = 1;
        let currentBlockToCheck = currentBlock;

        while (fetched < limit && currentBlockToCheck > 0) {
            try {
                const block = await client.getBlockByHeight({ blockHeight: currentBlockToCheck.toString() });

                if (block && block.transactions && Array.isArray(block.transactions)) {
                    for (const tx of block.transactions) {
                        if (fetched >= limit) break;

                        const txInfo: Transaction = {
                            id: tx.hash || `unknown-${fetched}`,
                            type: tx.type || 'Unknown',
                            amount: '0',
                            timestamp: block.block_timestamp ? parseInt(block.block_timestamp, 10) / 1000000 : Date.now() / 1000,
                            blockHeight: currentBlockToCheck.toString(),
                            version: tx.version?.toString() || '0'
                        };

                        // Type handling similar to server-side code
                        if (tx.type === 'user_transaction') {
                            // Add sender info
                            if (tx.sender) {
                                txInfo.sender = tx.sender;
                            } else if (tx.sender_account_address) {
                                txInfo.sender = tx.sender_account_address;
                            }

                            // Extract type from payload
                            if (tx.payload && typeof tx.payload === 'object') {
                                const payloadStr = JSON.stringify(tx.payload);

                                if (tx.payload.function) {
                                    const functionPath = tx.payload.function.toString();
                                    const parts = functionPath.split('::');
                                    if (parts.length >= 2) {
                                        txInfo.type = `${parts[parts.length - 2]}::${parts[parts.length - 1]}`;
                                    }
                                }

                                // Special handling for common transaction types
                                if (payloadStr.includes('::stake::')) {
                                    txInfo.type = 'Stake';
                                } else if (payloadStr.includes('::coin::transfer')) {
                                    txInfo.type = 'Transfer';
                                } else if (payloadStr.includes('::governance::')) {
                                    txInfo.type = 'Governance';
                                }
                            }
                        } else if (tx.type === 'block_metadata') {
                            txInfo.type = 'Block Metadata';
                        } else if (tx.type === 'state_checkpoint') {
                            txInfo.type = 'State Checkpoint';
                        }

                        transactions.push(txInfo);
                        fetched++;
                    }
                }

                currentBlockToCheck -= blockSkip;
            } catch (error) {
                console.error(`Error fetching block ${currentBlockToCheck}:`, error);
                currentBlockToCheck -= blockSkip;
            }
        }

        return transactions;
    } catch (error) {
        console.error('Failed to get latest transactions:', error);
        // Return mock data if there's an error
        return [
            { id: '0xabc...', type: 'Transfer', amount: '100', timestamp: Date.now() / 1000 - 60, blockHeight: '0', version: '0' },
            { id: '0xdef...', type: 'Stake', amount: '500', timestamp: Date.now() / 1000 - 120, blockHeight: '0', version: '0' },
            { id: '0xghi...', type: 'Transfer', amount: '250', timestamp: Date.now() / 1000 - 180, blockHeight: '0', version: '0' },
        ];
    }
}

async function clientGetAccountResources(address: string): Promise<any> {
    try {
        // Try to load the SDK with better error handling for browser compatibility
        let sdk;
        try {
            sdk = await import('open-libra-sdk');
        } catch (sdkError) {
            console.error('Failed to import open-libra-sdk:', sdkError);
            throw new Error('The Open Libra SDK is not compatible with browser environments');
        }

        const client = new sdk.LibraClient(sdk.Network.MAINNET, RPC_URL);

        // Normalize address
        const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
        const paddedAddress = cleanAddress.padStart(64, '0');
        const normalizedAddress = '0x' + paddedAddress;

        // Get coin resource
        let coinResource;
        try {
            coinResource = await client.getResource(
                normalizedAddress,
                "0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>"
            );
        } catch (e) {
            // If specific resource fails, continue to get all resources
        }

        // Get all resources
        const resources = await client.getAccountResources({ accountAddress: normalizedAddress });

        let totalBalance = coinResource?.coin?.value || '0';
        const resourcesData = resources.map((resource: any) => {
            // Check if this is the coin resource
            if (!totalBalance && resource.type.includes('0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>')) {
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
    } catch (error) {
        console.error(`Failed to get account resources for ${address}:`, error);
        return {
            address,
            balance: '0',
            resources: [],
        };
    }
}

// Conditional exports based on config
export const getBlockHeight = CLIENT_SIDE_API ? clientGetBlockHeight : serverActions.getBlockHeight;
export const getEpoch = CLIENT_SIDE_API ? clientGetEpoch : serverActions.getEpoch;
export const getLatestTransactions = CLIENT_SIDE_API ? clientGetLatestTransactions : serverActions.getLatestTransactions;
export const getAccountResources = CLIENT_SIDE_API ? clientGetAccountResources : serverActions.getAccountResources;
export const createWallet = serverActions.createWallet; // Always use server-side for wallet creation
