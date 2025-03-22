'use client';

// Re-export the server actions
export {
    getBlockHeight,
    getEpoch,
    getLatestTransactions,
    getAccountResources,
    createWallet
} from './libraServer';

// Types for client-side usage
export interface Transaction {
    id: string;
    type: string;
    amount: string;
    timestamp: number;
    sender?: string;
    recipient?: string;
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
