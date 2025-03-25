'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAccountData } from '../../store/hooks';

// Simple loading component for the redirect page
function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral"></div>
        </div>
    );
}

export default function AccountPage() {
    // Use useParams hook to get route parameters
    const params = useParams();
    const address = params.address as string;

    const router = useRouter();
    const { isLoading, error, resourceTypes } = useAccountData(address);

    // Redirect to the first resource type (lowercase) once data is loaded
    useEffect(() => {
        if (!isLoading.get() && !error.get() && resourceTypes.get().length > 0) {
            // Navigate to the first resource type, ensuring lowercase
            router.replace(`/account/${address}/${resourceTypes.get()[0].type.toLowerCase()}`);
        }
    }, [isLoading, error, resourceTypes, address, router]);

    // Show loading spinner while loading or redirecting
    if (isLoading.get() || resourceTypes.get().length > 0) {
        return <LoadingSpinner />;
    }

    // In case we can't redirect (no resources), show a message
    return (
        <div className="mb-6">
            <h2 className="text-2xl font-semibold">Account Details</h2>
            <div className="flex items-center">
                <p className="text-gray-600 dark:text-gray-400 font-mono break-all mr-2">{address}</p>
                <button
                    onClick={() => {
                        try {
                            const addressToCopy = address?.startsWith('0x') ?
                                address.substring(2) : address;
                            navigator.clipboard.writeText(addressToCopy);
                            const button = document.getElementById('copy-address-btn');
                            if (button) {
                                button.classList.add('text-green-500');
                                setTimeout(() => button.classList.remove('text-green-500'), 1000);
                            }
                        } catch (err) {
                            console.error('Failed to copy:', err);
                        }
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    title="Copy account address without 0x prefix"
                    id="copy-address-btn"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
            <div className="mt-4 text-center py-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                <h3 className="text-xl mb-2">No resources found for this account</h3>
                <p className="text-gray-600">This account may not have been initialized yet</p>
            </div>
        </div>
    );
} 