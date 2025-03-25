'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAccountData } from '../../store/hooks';
import Link from 'next/link';
import { fetchAccountData } from '../../store/actions';
import { store } from '../../store';

// Helper to get a clean slug from a resource type
function getSlugFromResourceType(resourceType: string): string {
    // Get the last part after ::
    const parts = resourceType.split('::');
    const lastPart = parts[parts.length - 1].toLowerCase();
    // Replace underscores with hyphens
    return lastPart.replace(/_/g, '-');
}

// Simple loading component for the redirect page
function LoadingSpinner({ message = "Loading account data..." }) {
    return (
        <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{message}</p>
        </div>
    );
}

export default function AccountPage() {
    // Use useParams hook to get route parameters
    const params = useParams();
    const address = params.address as string;

    const router = useRouter();
    const { isLoading, error, resourceTypes } = useAccountData(address);

    // Redirect to the first resource type using the new slug format once data is loaded
    useEffect(() => {
        if (!isLoading.get() && !error.get() && resourceTypes.get().length > 0) {
            const firstResourceType = resourceTypes.get()[0].type;
            const resourceSlug = getSlugFromResourceType(firstResourceType);

            console.log(`Redirecting to first resource: ${firstResourceType} (slug: ${resourceSlug})`);

            // Navigate to the first resource using the slug
            router.replace(`/account/${address}/${resourceSlug}`);
        }
    }, [isLoading, error, resourceTypes, address, router]);

    // Show loading spinner while loading
    if (isLoading.get()) {
        return <LoadingSpinner />;
    }

    // Show error state if there's an error
    if (error.get()) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-6 rounded-lg mb-6">
                    <h2 className="text-2xl font-semibold mb-2">Error</h2>
                    <p className="mb-4">{error.get()}</p>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={() => {
                                // Manually refresh the account data
                                store.currentAccount.error.set(null);
                                store.currentAccount.isLoading.set(true);
                                fetchAccountData(address);
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            Try Again
                        </button>
                        <Link href="/"
                            className="px-4 py-2 bg-libra-coral hover:bg-libra-dark text-white rounded transition-colors"
                        >
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // If redirecting to resource type, don't show spinner again
    if (resourceTypes.get().length > 0) {
        return <LoadingSpinner message="Redirecting to account details..." />;
    }

    // In case we can't redirect (no resources), show a message
    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-semibold mb-4">Account Details</h2>
            <div className="flex items-center mb-4">
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
            <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow">
                <h3 className="text-xl mb-4">No resources found for this account</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">This account may not exist or has not been initialized yet.</p>
                <Link href="/"
                    className="px-4 py-2 bg-libra-coral hover:bg-libra-dark text-white rounded transition-colors"
                >
                    Return to Home
                </Link>
            </div>
        </div>
    );
}