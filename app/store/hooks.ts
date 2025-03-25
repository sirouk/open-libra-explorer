import { useEffect } from 'react';
import { store } from './index';
import {
    fetchBlockchainData,
    fetchTransactionByHash,
    fetchAccountData,
    startBlockchainDataRefresh
} from './actions';

// Hook for blockchain data (block height, epoch, transactions)
export function useBlockchainData() {
    useEffect(() => {
        // Initial fetch
        fetchBlockchainData();

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
            fetchTransactionByHash(hash);
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
            fetchAccountData(address);
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