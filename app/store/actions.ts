import { store, formatTransactionDate, Transaction, pruneTransactionCache } from './index';
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

            // Cache each transaction in the list
            enhancedTransactions.forEach((tx: any) => {
                store.transactions.cache[tx.id].set(tx);
            });

            // Update the transactions list
            store.transactions.list.set(enhancedTransactions);
            store.transactions.error.set(null);

            // Prune transaction cache for items no longer in list
            pruneTransactionCache();
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

        // Check if we have this transaction in our cache
        const cachedTx = store.transactions.cache[normalizedHash].get();
        if (cachedTx) {
            console.log(`Found transaction in cache: ${normalizedHash}`);
            store.currentTransaction.data.set(cachedTx);
            store.currentTransaction.isLoading.set(false);
            return;
        }

        // If not in cache, check if we have this transaction in our transactions list
        const txInList = store.transactions.list.get().find(tx =>
            tx.id === normalizedHash || tx.id === hash);

        if (txInList) {
            console.log(`Found transaction in list: ${normalizedHash}`);
            // Use data from list but still fetch full details in the background
            store.currentTransaction.data.set({
                ...txInList,
                hash: normalizedHash,
                success: true,
                displayType: txInList.type
            });
            store.currentTransaction.isLoading.set(false);

            // Background fetch for complete details
            setTimeout(() => {
                getTransactionByHash(normalizedHash).then(freshData => {
                    if (freshData) {
                        // Update current transaction
                        store.currentTransaction.data.set(freshData);
                        // Also cache the complete data
                        store.transactions.cache[normalizedHash].set(freshData);
                    }
                }).catch(err => {
                    console.warn(`Background refresh of transaction ${normalizedHash} failed:`, err);
                });
            }, 100);

            return;
        }

        // If not found in cache or list, fetch from API
        console.log(`Transaction ${normalizedHash} not in cache or list, fetching from API`);

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
            id: normalizedHash,
            // Ensure these fields are set to avoid UI errors
            success: txData.success === undefined ? true : txData.success,
            displayType: txData.displayType || txData.type || 'Unknown',
            type: txData.type || 'unknown',
            timestamp: txData.timestamp || Math.floor(Date.now() / 1000)
        };

        // Update current transaction
        store.currentTransaction.data.set(processedTxData);

        // Also cache this transaction for future use
        store.transactions.cache[normalizedHash].set(processedTxData);

    } catch (err: any) {
        console.error(`Error fetching transaction ${hash}:`, err);
        store.currentTransaction.error.set(
            err.message?.includes('timed out')
                ? 'Request timed out. The blockchain node may be experiencing high load.'
                : err.message || 'Failed to fetch transaction details'
        );
    } finally {
        store.currentTransaction.isLoading.set(false);
    }
}

// Action to fetch account data
export async function fetchAccountData(address: string) {
    // If already loading, don't trigger another fetch
    if (store.currentAccount.isLoading.get()) {
        return;
    }

    // Check if we already have recent data (within 30 seconds)
    const accountInStore = store.accounts[address].get();
    const lastFetched = store.currentAccount.lastFetched.get();
    const now = Date.now();

    // If we have data and it was fetched less than 30 seconds ago, use it
    if (accountInStore &&
        lastFetched &&
        now - lastFetched < 30000 &&
        store.currentAccount.address.get() === address) {
        // We already have fresh data, just set current address and return
        console.log(`Using cached account data for ${address} (fetched ${(now - lastFetched) / 1000}s ago)`);
        return;
    }

    try {
        // Set loading state
        store.currentAccount.isLoading.set(true);
        store.currentAccount.error.set(null);
        store.currentAccount.address.set(address);

        console.log(`Fetching account data for ${address}`);

        // Fetch account data with timeout for the main operation - 20 seconds
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
                () => reject(new Error(`Account fetch timed out after ${TIMEOUTS.ACCOUNT / 1000} seconds`)),
                TIMEOUTS.ACCOUNT
            );
        });

        // Race between the actual fetch and the timeout
        const accountData = await Promise.race([
            getAccountResources(address),
            timeoutPromise
        ]) as any;

        if (!accountData || !accountData.resources) {
            throw new Error('Failed to fetch account data: Empty response');
        }

        // DETAILED LOGGING - Log the full account data structure
        console.log(`=============== RAW ACCOUNT DATA FOR ${address} ===============`);
        console.log(JSON.stringify(accountData, null, 2));
        console.log(`=============== END RAW ACCOUNT DATA ===============`);

        // DETAILED LOGGING - Look specifically for CoinStore resources
        const coinStoreResources = accountData.resources.filter((resource: any) =>
            resource.type && resource.type.includes('CoinStore')
        );

        if (coinStoreResources.length > 0) {
            console.log(`=============== FOUND ${coinStoreResources.length} COINSTORE RESOURCES ===============`);
            coinStoreResources.forEach((resource: any, index: number) => {
                console.log(`CoinStore #${index + 1}: ${resource.type}`);
                console.log(JSON.stringify(resource.data, null, 2));
            });
            console.log(`=============== END COINSTORE RESOURCES ===============`);
        } else {
            console.log('No CoinStore resources found in account data');
        }

        console.log(`Successfully fetched account data for ${address} with ${accountData.resources.length} resources`);

        // Extract resource types
        const resourceTypes = accountData.resources
            .map((resource: any) => {
                const type = resource.type;
                // Extract the base name using regex pattern
                const basePattern = /::([^:<]+)(?:<|$)/;
                const baseMatch = type.match(basePattern);
                const baseName = baseMatch ? baseMatch[1] : type.split('::').pop() || 'Resource';

                // Special handling for CoinStore resources
                if (type.includes('::coin::CoinStore<')) {
                    // Extract coin type from the format: 0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>
                    const coinTypeMatch = type.match(/CoinStore<(.+?)::([^:>]+?)(?:>|$)/);
                    if (coinTypeMatch && coinTypeMatch[2]) {
                        const coinType = coinTypeMatch[2];
                        console.log(`CoinStore resource found: ${type} -> CoinStore (${coinType})`);
                        return {
                            type,
                            displayName: `CoinStore (${coinType})`
                        };
                    }
                }

                // For other generic types, remove the generic parameters
                let displayName = baseName;
                if (displayName.includes('<')) {
                    displayName = displayName.split('<')[0];
                }

                // Format the display name with proper spacing
                displayName = displayName.replace(/_/g, ' ')
                    .replace(/([A-Z])/g, ' $1').trim()  // Add space before capital letters
                    .replace(/\s+/g, ' ');              // Replace multiple spaces with one

                // Capitalize first letter
                displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

                // DETAILED LOGGING - Print processing of each resource type
                console.log(`Resource type: ${type} -> Display name: ${displayName}`);

                return { type, displayName };
            })
            .filter((rt: any, index: number, self: any[]) =>
                // Filter out duplicates
                index === self.findIndex((t) => t.type === rt.type)
            )
            .sort((a: any, b: any) => a.type.localeCompare(b.type));

        // Update store with the fetched data
        store.accounts[address].set({
            address: accountData.address,
            balance: accountData.balance,
            resources: accountData.resources,
            lastFetched: now
        });

        // Update current account state
        store.currentAccount.resourceTypes.set(resourceTypes);
        store.currentAccount.lastFetched.set(now);
        store.currentAccount.error.set(null);

        // If no resource types, set an error
        if (resourceTypes.length === 0) {
            store.currentAccount.error.set('No resources found for this account');
        }

        return accountData;
    } catch (err: any) {
        console.error(`Error fetching account ${address}:`, err);

        // Set error in the store
        store.currentAccount.error.set(
            err.message?.includes('timed out')
                ? 'Request timed out. The blockchain node may be experiencing high load.'
                : err.message || 'Failed to fetch account data'
        );

        throw err; // Re-throw to allow catch in UI components
    } finally {
        // Set loading state to false
        store.currentAccount.isLoading.set(false);
    }
}

// Start blockchain auto-refresh timer
export function startBlockchainDataRefresh() {
    const interval = setInterval(() => {
        // Only refresh if not currently refreshing
        if (!store.transactions.isRefreshing.get()) {
            fetchBlockchainData();
        }
    }, AUTO_REFRESH_INTERVAL);

    // Return cleanup function
    return () => clearInterval(interval);
}

// Toggle dark mode
export function toggleDarkMode() {
    store.ui.darkMode.set(current => !current);
}