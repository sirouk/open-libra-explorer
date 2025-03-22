'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Simple in-memory cache for transaction data
const transactionCache: Record<string, any> = {};

interface TransactionContextType {
    transactionCache: Record<string, any>;
    addTransaction: (hash: string, data: any) => void;
    getTransaction: (hash: string) => any;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
    // Add a transaction to the cache
    const addTransaction = (hash: string, data: any) => {
        transactionCache[hash] = {
            data,
            timestamp: Date.now()
        };
    };

    // Get a transaction from the cache
    const getTransaction = (hash: string) => {
        return transactionCache[hash]?.data;
    };

    return (
        <TransactionContext.Provider value={{
            transactionCache,
            addTransaction,
            getTransaction
        }}>
            {children}
        </TransactionContext.Provider>
    );
}

export function useTransactionCache() {
    const context = useContext(TransactionContext);
    if (context === undefined) {
        throw new Error('useTransactionCache must be used within a TransactionProvider');
    }
    return context;
} 