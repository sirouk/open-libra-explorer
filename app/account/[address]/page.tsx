'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccountData } from '../../context/AccountDataContext';

// Simple loading component for the redirect page
function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral"></div>
        </div>
    );
}

export default function AccountPage({ params }: { params: { address: string } }) {
    const router = useRouter();
    const { isLoading, error, resourceTypes } = useAccountData();

    // Redirect to the first resource type (lowercase) once data is loaded
    useEffect(() => {
        if (!isLoading && !error && resourceTypes.length > 0) {
            // Navigate to the first resource type, ensuring lowercase
            router.replace(`/account/${params.address}/${resourceTypes[0].toLowerCase()}`);
        }
    }, [isLoading, error, resourceTypes, params.address, router]);

    // Show loading spinner while loading or redirecting
    if (isLoading || resourceTypes.length > 0) {
        return <LoadingSpinner />;
    }

    // In case we can't redirect (no resources), show a message
    return (
        <div className="mb-6">
            <h2 className="text-2xl font-semibold">Account Details</h2>
            <p className="text-gray-600 dark:text-gray-400 font-mono break-all">{params.address}</p>
            <div className="mt-4 text-center py-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                <h3 className="text-xl mb-2">No resources found for this account</h3>
                <p className="text-gray-600">This account may not have been initialized yet</p>
            </div>
        </div>
    );
} 