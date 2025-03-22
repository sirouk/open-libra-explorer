'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAccountResources } from '../services/libraService';

interface AccountDataContextType {
    accountData: any;
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    getSimpleResourceType: (fullType: string) => string;
    resourceTypes: string[];
    resourcesByType: Record<string, any[]>;
    getActiveResources: (resourceType: string) => any[];
}

const AccountDataContext = createContext<AccountDataContextType | undefined>(undefined);

export function AccountDataProvider({
    children,
    address
}: {
    children: ReactNode;
    address: string;
}) {
    const [accountData, setAccountData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper function to extract simple resource type
    const getSimpleResourceType = (fullType: string): string => {
        const parts = fullType.split('::');
        return parts.length >= 3 ? parts[2].split('<')[0] : fullType;
    };

    // Extract unique resource types and sort them alphabetically
    const resourceTypes = accountData?.resources
        ? [...new Set(accountData.resources.map((r: any) => getSimpleResourceType(r.type)) as string[])].sort()
        : [];

    // Group resources by type
    const resourcesByType = accountData?.resources?.reduce((acc: Record<string, any[]>, resource: any) => {
        const simpleName = getSimpleResourceType(resource.type);

        if (!acc[simpleName]) {
            acc[simpleName] = [];
        }

        acc[simpleName].push(resource);
        return acc;
    }, {} as Record<string, any[]>) || {};

    // Get resources for a specific type and sort them by type name for consistency
    const getActiveResources = (resourceType: string) => {
        return resourceType && resourcesByType[resourceType]
            ? [...resourcesByType[resourceType]].sort((a, b) => a.type.localeCompare(b.type))
            : [];
    };

    // Function to fetch account data
    const fetchAccountData = async () => {
        try {
            setIsLoading(true);
            const data = await getAccountResources(address);
            setAccountData(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching account data:', err);
            setError('Failed to fetch account data');
        } finally {
            setIsLoading(false);
        }
    };

    // Refresh function for manual refresh
    const refreshData = async () => {
        await fetchAccountData();
    };

    // Initial data fetch
    useEffect(() => {
        fetchAccountData();
    }, [address]);

    return (
        <AccountDataContext.Provider value={{
            accountData,
            isLoading,
            error,
            refreshData,
            getSimpleResourceType,
            resourceTypes,
            resourcesByType,
            getActiveResources
        }}>
            {children}
        </AccountDataContext.Provider>
    );
}

export function useAccountData() {
    const context = useContext(AccountDataContext);
    if (context === undefined) {
        throw new Error('useAccountData must be used within an AccountDataProvider');
    }
    return context;
} 