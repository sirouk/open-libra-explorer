'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getBlockHeight, getEpoch, getLatestTransactions } from '../services/libraService';
import { AUTO_REFRESH_INTERVAL, DEBUG_MODE } from '../../config';

// Define transaction interface with additional properties
export interface EnhancedTransaction {
    id: string;
    type: string;
    amount: string;
    timestamp: number;
    sender?: string;
    recipient?: string;
    blockHeight?: string;
    version?: string;
    formattedDate?: string;
}

interface BlockchainDataContextType {
    blockHeight: number;
    epoch: number;
    transactions: EnhancedTransaction[];
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
    lastUpdated: Date;
    refreshData: () => Promise<void>;
}

const BlockchainDataContext = createContext<BlockchainDataContextType | undefined>(undefined);

export function BlockchainDataProvider({ children }: { children: ReactNode }) {
    const [blockHeight, setBlockHeight] = useState<number>(0);
    const [epoch, setEpoch] = useState<number>(0);
    const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // Format date properly from Unix timestamp (in microseconds)
    const formatTransactionDate = (timestamp: number): string => {
        // Timestamp is in seconds (from microseconds division on server)
        // No need for additional conversion, just create the date
        const date = new Date(timestamp * 1000); // Convert seconds to milliseconds for JS Date

        if (DEBUG_MODE) {
            console.log(`Formatting timestamp ${timestamp} to date: ${date.toISOString()}`);
        }

        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Function to fetch all blockchain data
    const fetchData = async () => {
        try {
            setIsRefreshing(true);

            // Fetch all data in parallel
            const [height, currentEpoch, txData] = await Promise.all([
                getBlockHeight(),
                getEpoch(),
                getLatestTransactions(10)
            ]);

            // Log transaction data for debugging if enabled
            if (DEBUG_MODE && txData.length > 0) {
                console.log('Transaction Data (First 3):', txData.slice(0, 3));
                console.log('Raw timestamp examples:');
                txData.slice(0, 3).forEach((tx, i) => {
                    console.log(`TX ${i} timestamp: ${tx.timestamp} (${typeof tx.timestamp})`);
                    // Try different conversion methods to see what works
                    const date1 = new Date(tx.timestamp).toISOString();
                    const date2 = new Date(tx.timestamp * 1000).toISOString();
                    const date3 = new Date(tx.timestamp / 1000).toISOString();
                    console.log(`- As-is: ${date1}`);
                    console.log(`- *1000: ${date2}`);
                    console.log(`- /1000: ${date3}`);
                });
            }

            // Process and enhance transaction data
            const enhancedTransactions = txData.map(tx => ({
                ...tx,
                formattedDate: formatTransactionDate(tx.timestamp),
                // Block height and version might be coming from the API, if not they'll be undefined
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

            setBlockHeight(height);
            setEpoch(currentEpoch);
            setTransactions(enhancedTransactions);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error('Error fetching blockchain data:', err);
            setError('Failed to fetch blockchain data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Manual refresh function
    const refreshData = async () => {
        await fetchData();
    };

    // Initial data fetch
    useEffect(() => {
        fetchData();
    }, []);

    // Set up auto-refresh
    useEffect(() => {
        const intervalId = setInterval(fetchData, AUTO_REFRESH_INTERVAL);

        // Clean up interval on unmount
        return () => clearInterval(intervalId);
    }, []);

    return (
        <BlockchainDataContext.Provider value={{
            blockHeight,
            epoch,
            transactions,
            isLoading,
            isRefreshing,
            error,
            lastUpdated,
            refreshData
        }}>
            {children}
        </BlockchainDataContext.Provider>
    );
}

export function useBlockchainData() {
    const context = useContext(BlockchainDataContext);
    if (context === undefined) {
        throw new Error('useBlockchainData must be used within a BlockchainDataProvider');
    }
    return context;
} 