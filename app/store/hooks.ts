import { useEffect } from 'react';
import { store, selectTransactionCache } from './index';
import {
    fetchBlockchainData,
    fetchTransactionByHash,
    fetchAccountData,
    startBlockchainDataRefresh
} from './actions';

// Hook for blockchain data (block height, epoch, transactions)
export function useBlockchainData() {
    useEffect(() => {
        // Initial fetch only if we don't have data already
        if (store.transactions.list.get().length === 0) {
            fetchBlockchainData();
        }

        // Setup auto-refresh
        const cleanup = startBlockchainDataRefresh();

        // Cleanup on unmount
        return cleanup;
    }, []);

    return {
        blockHeight: store.blockchain.blockHeight,
        epoch: store.blockchain.epoch,
        chainId: store.blockchain.chainId,
        transactions: store.transactions.list,
        isLoading: store.transactions.isLoading,
        isRefreshing: store.transactions.isRefreshing,
        error: store.transactions.error,
        lastUpdated: store.blockchain.lastUpdated,
        refreshData: fetchBlockchainData
    };
}

// Hook for transaction details
export function useTransactionDetails(hash: string) {
    useEffect(() => {
        if (hash) {
            // Check if data already in the cache before fetching
            const normalizedHash = hash.startsWith('0x') ? hash : `0x${hash}`;
            const txCache = selectTransactionCache();

            if (!txCache[normalizedHash] && !store.currentTransaction.isLoading.get()) {
                fetchTransactionByHash(hash);
            }
        }
    }, [hash]);

    return {
        transaction: store.currentTransaction.data,
        isLoading: store.currentTransaction.isLoading,
        error: store.currentTransaction.error
    };
}

// Hook for account data
export function useAccountData(address?: string) {
    useEffect(() => {
        if (address) {
            // Only fetch if we don't have recent data (fetchAccountData handles the caching logic)
            fetchAccountData(address).catch(error => {
                // Error is already handled in the action
                console.log('Account data fetch failed, but error is handled:', error.message);
            });
        }
    }, [address]);

    return {
        accountData: address ? store.accounts[address] : undefined,
        currentAccount: store.currentAccount,
        isLoading: store.currentAccount.isLoading,
        error: store.currentAccount.error,
        resourceTypes: store.currentAccount.resourceTypes,
        currentResourceType: store.currentAccount.currentResourceType
    };
}

// Hook for UI preferences
export function useUIPreferences() {
    return {
        isDarkMode: store.ui.darkMode
    };
} 