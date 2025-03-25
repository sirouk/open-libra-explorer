import { store, formatTransactionDate, Transaction } from './index';
import {
    getBlockHeight,
    getEpoch,
    getLatestTransactions,
    getAccountResources
} from '../services/libraService';
import { getTransactionByHash } from '../services/transactionService';
import { DEFAULT_TX_LIMIT, AUTO_REFRESH_INTERVAL } from '../../config';

// Define interface for resources
interface Resource {
    type: string;
    data: any;
}

// Action to fetch blockchain data (block height, epoch, and transactions)
export async function fetchBlockchainData() {
    try {
        store.transactions.isRefreshing.set(true);

        // Fetch all data in parallel
        const [height, currentEpoch, txData] = await Promise.all([
            getBlockHeight(),
            getEpoch(),
            getLatestTransactions(DEFAULT_TX_LIMIT)
        ]);

        // Skip further processing if we didn't get any data
        if (!height || !currentEpoch || !txData || txData.length === 0) {
            throw new Error('Incomplete blockchain data received from the server');
        }

        // Process and enhance transaction data
        const enhancedTransactions = txData.map(tx => ({
            ...tx,
            formattedDate: formatTransactionDate(tx.timestamp),
        }));

        // Sort transactions by blockHeight (desc), version (desc), and timestamp (desc)
        enhancedTransactions.sort((a, b) => {
            // First sort by block height
            const blockHeightA = a.blockHeight ? parseInt(a.blockHeight, 10) : 0;
            const blockHeightB = b.blockHeight ? parseInt(b.blockHeight, 10) : 0;
            if (blockHeightB !== blockHeightA) return blockHeightB - blockHeightA;

            // Then by version
            const versionA = a.version ? parseInt(a.version, 10) : 0;
            const versionB = b.version ? parseInt(b.version, 10) : 0;
            if (versionB !== versionA) return versionB - versionA;

            // Finally by timestamp
            return b.timestamp - a.timestamp;
        });

        // Update the store
        store.blockchain.blockHeight.set(height);
        store.blockchain.epoch.set(currentEpoch);
        store.transactions.list.set(enhancedTransactions);
        store.blockchain.lastUpdated.set(Date.now());
        store.transactions.error.set(null);
    } catch (err) {
        console.error('Error fetching blockchain data:', err);
        store.transactions.error.set('Failed to fetch blockchain data');
    } finally {
        store.transactions.isLoading.set(false);
        store.transactions.isRefreshing.set(false);
    }
}

// Action to fetch a specific transaction by hash
export async function fetchTransactionByHash(hash: string) {
    try {
        store.currentTransaction.isLoading.set(true);
        store.currentTransaction.error.set(null);

        const txData = await getTransactionByHash(hash);

        if (!txData) {
            throw new Error('Transaction not found');
        }

        store.currentTransaction.data.set(txData);
    } catch (err: any) {
        console.error(`Error fetching transaction ${hash}:`, err);
        store.currentTransaction.error.set(`Failed to fetch transaction: ${err.message || 'Unknown error'}`);
    } finally {
        store.currentTransaction.isLoading.set(false);
    }
}

// Action to fetch account data
export async function fetchAccountData(address: string) {
    try {
        // Set loading state for current account
        store.currentAccount.isLoading.set(true);
        store.currentAccount.error.set(null);
        store.currentAccount.address.set(address);

        // Fetch account resources
        const accountData = await getAccountResources(address);

        if (!accountData) {
            throw new Error('Account data not found');
        }

        // Extract resource types
        const resourceTypes = accountData.resources.map((resource: Resource) => {
            const typeParts = resource.type.split('::');
            const displayName = typeParts.length > 2 ? `${typeParts[1]}::${typeParts[2]}` : resource.type;

            return {
                type: resource.type,
                displayName
            };
        });

        // Store account data
        store.accounts[address].set({
            address: accountData.address,
            balance: accountData.balance,
            resources: accountData.resources
        });

        // Update current account state
        store.currentAccount.resourceTypes.set(resourceTypes);

        // Set first resource type as current if available
        if (resourceTypes.length > 0) {
            store.currentAccount.currentResourceType.set(resourceTypes[0].type);
        }
    } catch (err: any) {
        console.error(`Error fetching account data for ${address}:`, err);
        store.currentAccount.error.set(`Failed to fetch account data: ${err.message || 'Unknown error'}`);
    } finally {
        store.currentAccount.isLoading.set(false);
    }
}

// Setup auto-refresh for blockchain data
let refreshInterval: NodeJS.Timeout | null = null;

export function startBlockchainDataRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(fetchBlockchainData, AUTO_REFRESH_INTERVAL);
    return () => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    };
}

// Toggle dark mode
export function toggleDarkMode() {
    store.ui.darkMode.set(!store.ui.darkMode.get());
}