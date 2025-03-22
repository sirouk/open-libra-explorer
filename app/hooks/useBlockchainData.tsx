'use client';

import { useState, useEffect } from 'react';
import { getBlockHeight, getEpoch, getLatestTransactions, type Transaction } from '../services/libraService';
import { AUTO_REFRESH_INTERVAL, DEFAULT_TX_LIMIT } from '../../config';

interface BlockchainData {
    blockHeight: number;
    epoch: number;
    transactions: Transaction[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date;
}

export function useBlockchainData(refreshInterval = AUTO_REFRESH_INTERVAL) {
    const [data, setData] = useState<BlockchainData>({
        blockHeight: 0,
        epoch: 0,
        transactions: [],
        isLoading: true,
        error: null,
        lastUpdated: new Date()
    });

    const fetchData = async () => {
        try {
            setData(prev => ({ ...prev, isLoading: true, error: null }));

            // Fetch all data in parallel
            const [blockHeight, epoch, transactions] = await Promise.all([
                getBlockHeight(),
                getEpoch(),
                getLatestTransactions(DEFAULT_TX_LIMIT)
            ]);

            setData({
                blockHeight,
                epoch,
                transactions,
                isLoading: false,
                error: null,
                lastUpdated: new Date()
            });
        } catch (error) {
            console.error('Error fetching blockchain data:', error);
            setData(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'An error occurred while fetching data'
            }));
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, []);

    // Set up periodic refresh
    useEffect(() => {
        const intervalId = setInterval(fetchData, refreshInterval);

        // Clean up on unmount
        return () => clearInterval(intervalId);
    }, [refreshInterval]);

    // Function to manually refresh data
    const refreshData = () => {
        fetchData();
    };

    return {
        ...data,
        refreshData
    };
} 