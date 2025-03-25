import { store, formatTransactionDate, Transaction } from './index';
import {
    getBlockHeight,
    getEpoch,
    getLatestTransactions,
    getAccountResources
} from '../services/libraService';
import { getTransactionByHash } from '../services/transactionService';
import {
    DEFAULT_TX_LIMIT,
    AUTO_REFRESH_INTERVAL,
    TIMEOUTS,
    MAX_RETRY_ATTEMPTS
} from '../../config';

// Define interface for resources
interface Resource {
    type: string;
    data: any;
}

// Utility function to fetch with timeout and retry
async function fetchWithTimeout<T>(fetchPromise: Promise<T>, name: string): Promise<T> {
    // Use the timeout from config
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`${name} request timed out after ${TIMEOUTS.BLOCKCHAIN / 1000} seconds`)),
            TIMEOUTS.BLOCKCHAIN);
    });

    try {
        // Race between the actual fetch and the timeout
        return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
        console.warn(`${name} fetch failed:`, error);
        // Retry once with a shorter timeout if the first attempt fails
        if (!name.includes('retry') && MAX_RETRY_ATTEMPTS > 0) {
            console.log(`Retrying ${name}...`);
            const retryPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`${name} retry timed out after ${TIMEOUTS.RETRY / 1000} seconds`)),
                    TIMEOUTS.RETRY);
            });
            return Promise.race([fetchPromise, retryPromise]);
        }
        throw error;
    }
}

// Action to fetch blockchain data (block height, epoch, and transactions)
export async function fetchBlockchainData() {
    // Set refreshing state immediately
    store.transactions.isRefreshing.set(true);

    try {
        // Add error tracking for individual data points
        let blockHeightFailed = false;
        let epochFailed = false;
        let transactionsFailed = false;

        // Fetch blockchain stats separately to ensure we get as much data as possible
        let height: number | null = null;
        try {
            height = await fetchWithTimeout(getBlockHeight(), 'Block height');
            console.log('Successfully fetched block height:', height);
        } catch (err) {
            console.error('Failed to fetch block height:', err);
            blockHeightFailed = true;
        }

        let currentEpoch: number | null = null;
        try {
            currentEpoch = await fetchWithTimeout(getEpoch(), 'Epoch');
            console.log('Successfully fetched epoch:', currentEpoch);
        } catch (err) {
            console.error('Failed to fetch epoch:', err);
            epochFailed = true;
        }

        let txData: any[] = [];
        try {
            txData = await fetchWithTimeout(getLatestTransactions(DEFAULT_TX_LIMIT), 'Transactions');
            console.log(`Successfully fetched ${txData.length} transactions`);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
            transactionsFailed = true;
        }

        // Update any stats we were able to get
        if (height !== null) {
            store.blockchain.blockHeight.set(height);
        }

        if (currentEpoch !== null) {
            store.blockchain.epoch.set(currentEpoch);
        }

        // Update the timestamp regardless of success/failure
        store.blockchain.lastUpdated.set(Date.now());

        // Only process transactions if we got them
        if (txData && Array.isArray(txData) && txData.length > 0) {
            // Process and enhance transaction data
            const enhancedTransactions = txData.map((tx: any) => ({
                ...tx,
                id: tx.id || tx.hash || `unknown-${Math.random().toString(36).substring(2, 9)}`,
                type: tx.type || 'Unknown',
                blockHeight: tx.blockHeight || '0',
                version: tx.version || '0',
                timestamp: tx.timestamp || Math.floor(Date.now() / 1000),
                formattedDate: formatTransactionDate(tx.timestamp || Math.floor(Date.now() / 1000)),
            }));

            // Sort transactions by blockHeight (desc), version (desc), and timestamp (desc)
            enhancedTransactions.sort((a: any, b: any) => {
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

            store.transactions.list.set(enhancedTransactions);
            store.transactions.error.set(null);
        } else if (transactionsFailed) {
            store.transactions.error.set('Unable to fetch recent transactions. Please try again later.');
        }

        // Create a summary error message if multiple things failed
        if (blockHeightFailed && epochFailed && transactionsFailed) {
            store.transactions.error.set('Network connection issues. Unable to fetch blockchain data.');
        } else if (blockHeightFailed && epochFailed) {
            store.transactions.error.set('Unable to fetch blockchain statistics. Some data may be outdated.');
        }
    } catch (err: any) {
        console.error('Error in fetchBlockchainData:', err);
        const errorMessage = err.message?.includes('timed out')
            ? 'Network request timed out. The blockchain node may be experiencing high load.'
            : 'Failed to fetch blockchain data';

        store.transactions.error.set(errorMessage);
    } finally {
        // Small delay before turning off the refreshing state to ensure animation is visible
        setTimeout(() => {
            store.transactions.isLoading.set(false);
            store.transactions.isRefreshing.set(false);
        }, 500);
    }
}

// Action to fetch a specific transaction by hash
export async function fetchTransactionByHash(hash: string) {
    try {
        store.currentTransaction.isLoading.set(true);
        store.currentTransaction.error.set(null);

        // Normalize hash to ensure consistent lookup
        const normalizedHash = hash.startsWith('0x') ? hash : `0x${hash}`;
        console.log(`Fetching transaction details for: ${normalizedHash}`);

        // Check if we have this transaction in our already fetched transactions list
        const cachedTransaction = store.transactions.list.get().find(tx =>
            tx.id === normalizedHash || tx.id === hash);

        if (cachedTransaction) {
            console.log(`Found transaction in cache: ${normalizedHash}`);
            // Use cached data but still fetch full details in the background
            setTimeout(() => {
                getTransactionByHash(normalizedHash).then(freshData => {
                    if (freshData) {
                        store.currentTransaction.data.set(freshData);
                    }
                }).catch(err => {
                    console.warn(`Background refresh of transaction ${normalizedHash} failed:`, err);
                });
            }, 100);

            // Return cached data immediately
            store.currentTransaction.data.set({
                ...cachedTransaction,
                // Set minimum fields needed for display
                hash: normalizedHash,
                success: true,
                displayType: cachedTransaction.type
            });
            return;
        }

        // Add timeout to prevent hanging requests - 20 seconds for transaction details
        const fetchWithTimeout = async () => {
            // First try - use transaction timeout from config
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(
                    () => reject(new Error(`Transaction fetch timed out after ${TIMEOUTS.TRANSACTION / 1000} seconds`)),
                    TIMEOUTS.TRANSACTION
                );
            });

            try {
                // Race between the actual fetch and the timeout
                return await Promise.race([
                    getTransactionByHash(normalizedHash),
                    timeoutPromise
                ]) as Promise<any>;
            } catch (error) {
                console.warn(`Transaction fetch failed for ${normalizedHash}, will retry:`, error);

                // Retry once with a shorter timeout
                const retryPromise = new Promise((_, reject) => {
                    setTimeout(
                        () => reject(new Error(`Transaction retry timed out after ${TIMEOUTS.RETRY / 1000} seconds`)),
                        TIMEOUTS.RETRY
                    );
                });

                return await Promise.race([
                    getTransactionByHash(normalizedHash),
                    retryPromise
                ]) as Promise<any>;
            }
        };

        // Fetch transaction with timeout
        const txData = await fetchWithTimeout();

        if (!txData) {
            throw new Error('Transaction not found');
        }

        // Log successful data retrieval
        console.log(`Successfully fetched transaction data for ${normalizedHash}:`,
            txData.displayType || txData.type);

        // Ensure the required fields are present or provide defaults
        const processedTxData = {
            ...txData,
            hash: normalizedHash,
            // Ensure these fields are set to avoid UI errors
            success: txData.success === undefined ? true : txData.success,
            displayType: txData.displayType || txData.type || 'Unknown',
            type: txData.type || 'unknown',
            timestamp: txData.timestamp || Math.floor(Date.now() / 1000)
        };

        store.currentTransaction.data.set(processedTxData);
    } catch (err: any) {
        console.error(`Error fetching transaction ${hash}:`, err);

        // Set a user-friendly error message
        const errorMessage = err.message?.includes('timed out')
            ? 'The transaction request timed out. The network may be congested, or this transaction may not exist.'
            : `Failed to fetch transaction: ${err.message || 'Unknown error'}`;

        store.currentTransaction.error.set(errorMessage);
    } finally {
        store.currentTransaction.isLoading.set(false);
    }
}

// Action to fetch account data
export async function fetchAccountData(address: string) {
    try {
        // Check cache for the address
        const existingAccount = store.accounts[address]?.get();
        const now = Date.now();
        const lastFetched = store.currentAccount.lastFetched.get();
        const isCacheValid = existingAccount &&
            lastFetched &&
            (now - lastFetched < 30000) && // Cache for 30 seconds
            store.currentAccount.address.get() === address;

        // Use cache if valid
        if (isCacheValid) {
            console.log(`Using cached account data for ${address}`);
            return;
        }

        // Set loading state
        store.currentAccount.isLoading.set(true);
        store.currentAccount.error.set(null);
        store.currentAccount.address.set(address);

        // Simple timeout Promise for the fetch
        const fetchWithTimeout = async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.ACCOUNT);

            try {
                const result = await getAccountResources(address);
                clearTimeout(timeoutId);
                return result;
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error(`Account data request timed out after ${TIMEOUTS.ACCOUNT / 1000} seconds`);
                }
                throw error;
            }
        };

        // Fetch account data
        const accountData = await fetchWithTimeout();

        if (!accountData) {
            throw new Error('No account data found');
        }

        // Ensure resources is an array
        const resources = Array.isArray(accountData.resources) ? accountData.resources : [];

        // Extract resource types for navigation
        const resourceTypes = resources.map(resource => {
            const type = resource.type || '';
            const parts = type.split('::');
            let displayName = type;

            // Create a shorter display name
            if (parts.length >= 3) {
                displayName = `${parts[1]}::${parts[2]}`;
            }

            return {
                type,
                displayName
            };
        });

        // Store the data in global state
        store.accounts[address].set({
            address: accountData.address || address,
            balance: accountData.balance || '0',
            resources: resources
        });

        // Update current account state
        store.currentAccount.resourceTypes.set(resourceTypes);
        store.currentAccount.lastFetched.set(Date.now());

        // Set current resource type if we have resources
        if (resourceTypes.length > 0) {
            store.currentAccount.currentResourceType.set(resourceTypes[0].type);
        }
    } catch (error) {
        console.error(`Error fetching account data for ${address}:`, error);

        // Clear resources to show empty state
        store.currentAccount.resourceTypes.set([]);

        // Set error message
        const errorMessage = error.message?.includes('timed out')
            ? 'Request timed out. The network may be slow or this account may not exist.'
            : `Failed to fetch account data: ${error.message || 'Unknown error'}`;

        store.currentAccount.error.set(errorMessage);
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