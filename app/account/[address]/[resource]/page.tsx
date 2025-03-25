'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AccountPage from '../page';
import { fetchAccountData } from '../../../store/actions';

export default function ResourceRedirect() {
    // This component allows handling URLs like /account/[address]/[resource]
    // but uses the same component as the parent route
    const params = useParams();
    const address = params.address as string;
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Prefetch data for the account when this component renders
    useEffect(() => {
        if (address) {
            console.log(`ResourceRedirect: Prefetching data for ${address}`);
            setIsLoading(true);
            fetchAccountData(address)
                .then(() => {
                    console.log(`ResourceRedirect: Successfully prefetched data for ${address}`);
                    setIsLoading(false);
                })
                .catch(e => {
                    console.error(`Failed to prefetch account data: ${e.message}`);
                    setError(e.message);
                    setIsLoading(false);
                });
        }
    }, [address]);

    // Show loading state while we ensure data is loaded
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 ml-4">Loading account data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-6 rounded-lg mb-6">
                    <h2 className="text-2xl font-semibold mb-2">Error</h2>
                    <p className="mb-4">{error}</p>
                </div>
            </div>
        );
    }

    // Just render the AccountPage component which will handle the resource param
    return <AccountPage />;
} 