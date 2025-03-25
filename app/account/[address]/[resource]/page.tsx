'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAccountData } from '../../../store/hooks';
import { store } from '../../../store';
import { LIBRA_DECIMALS } from '../../../../config';

// Format raw balance to LIBRA display format
function formatBalance(rawBalance: string | number): string {
    // Ensure we're working with a primitive value, not an observable
    if (typeof rawBalance === 'object' && rawBalance !== null && 'get' in rawBalance) {
        // Handle the case where an observable is passed
        try {
            // @ts-ignore - this is a legend-state observable
            rawBalance = rawBalance.get();
        } catch (e) {
            console.warn('Error accessing observable value:', e);
            rawBalance = '0';
        }
    }

    // Convert to string first to handle potential null/undefined
    const balanceStr = String(rawBalance || '0');

    try {
        const balance = BigInt(balanceStr);
        const divisor = BigInt(10 ** LIBRA_DECIMALS);

        const wholePart = balance / divisor;
        const fractionalPart = balance % divisor;

        // Format with proper decimal places
        // Pad the fractional part with leading zeros if needed
        const fractionalStr = fractionalPart.toString().padStart(LIBRA_DECIMALS, '0');

        // Trim trailing zeros but keep at least 2 decimal places
        const trimmedFractional = fractionalStr.replace(/0+$/, '').padEnd(2, '0');

        // Format whole part with thousands separators
        const wholePartFormatted = wholePart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        // Only show decimal part if it's non-zero
        return trimmedFractional === '00'
            ? wholePartFormatted
            : `${wholePartFormatted}.${trimmedFractional}`;
    } catch (e) {
        console.warn('Error formatting balance:', e);
        return '0';
    }
}

// Helper to get a clean slug from a resource type
function getSlugFromResourceType(resourceType: string): string {
    // Extract base type for slugs (e.g. "coinstore" from "0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>")
    const basePattern = /::([^:<]+)(?:<|$)/;
    const baseMatch = resourceType.match(basePattern);
    const baseType = baseMatch ? baseMatch[1].toLowerCase() : '';

    // Replace underscores with hyphens
    return baseType.replace(/_/g, '-');
}

// Helper to get the display name from a resource type
function getDisplayNameFromResourceType(resourceType: string): string {
    // Extract the base name (last part after ::)
    const baseName = resourceType.split('::').pop() || '';

    // For CoinStore types, extract the coin type
    if (baseName.startsWith('CoinStore<')) {
        // Extract coin type from the format: CoinStore<0x1::libra_coin::LibraCoin>
        const coinTypeMatch = resourceType.match(/CoinStore<(.+?)::([^:>]+?)(?:>|$)/);
        if (coinTypeMatch && coinTypeMatch[2]) {
            const coinType = coinTypeMatch[2];
            return `CoinStore (${coinType})`;
        }
    }

    // For other types with generics, remove the generic part
    let displayName = baseName;
    if (displayName.includes('<')) {
        displayName = displayName.split('<')[0];
    }

    // Format display name with spaces and proper capitalization
    return displayName.replace(/(_|^)[a-z]/g, match =>
        match.replace('_', ' ').toUpperCase()
    );
}

// Define interface for resource type
interface ResourceType {
    type: string;
    displayName: string;
}

// Define interface for resource
interface Resource {
    type: string;
    data: any;
}

// Find resource type from slug
function findResourceTypeFromSlug(slug: string, availableTypes: ResourceType[]): string | null {
    // Normalize the slug
    const normalizedSlug = slug.replace(/-/g, '_').toLowerCase();

    // Find the matching resource type
    const matchingResource = availableTypes.find(rt => {
        // Extract base type for matching
        const basePattern = /::([^:<]+)(?:<|$)/;
        const baseMatch = rt.type.match(basePattern);
        const baseType = baseMatch ? baseMatch[1].toLowerCase() : '';

        return baseType === normalizedSlug;
    });

    return matchingResource ? matchingResource.type : null;
}

// Only update the current resource type without triggering a full data fetch
function setCurrentResourceType(address: string, resourceType: string) {
    console.log(`Setting current resource for ${address} to ${resourceType}`);

    // Only update the current resource type without triggering a fetch
    store.currentAccount.currentResourceType.set(resourceType);
}

// Define interfaces for account data types
interface Account {
    address?: string;
    balance?: string | number;
    resources?: Resource[];
    lastFetched?: number;
    [key: string]: any; // Allow additional properties
}

export default function AccountResourcePage() {
    const params = useParams();
    const router = useRouter();
    const address = params.address as string;
    const slug = params.resource as string;

    // Use the account data hook - with our improved state management this will avoid refetching
    const { isLoading, error, resourceTypes, currentAccount, accountData } = useAccountData(address);

    // When resource types change or on initial load, find the matching resource type
    useEffect(() => {
        if (!isLoading.get() && !error.get() && resourceTypes.get().length > 0) {
            // Find the requested resource by slug
            const fullResourceType = findResourceTypeFromSlug(slug, resourceTypes.get());

            // If resource exists, set it as current without triggering a fetch
            if (fullResourceType) {
                setCurrentResourceType(address, fullResourceType);
            } else {
                // If requested resource doesn't exist, redirect to the first available resource
                const firstResourceType = resourceTypes.get()[0].type;
                const firstResourceSlug = getSlugFromResourceType(firstResourceType);
                router.replace(`/account/${address}/${firstResourceSlug}`);
            }
        }
    }, [resourceTypes, address, slug, isLoading, error, router]);

    // Function to render account data
    const renderAccountData = () => {
        if (isLoading.get()) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral"></div>
                </div>
            );
        }

        if (error.get()) {
            return (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error.get()}
                </div>
            );
        }

        return (
            <>
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
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold">Account Overview</h2>
                    </div>
                    <div className="p-6">
                        <div className="mb-4">
                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Balance:</span>
                            <p className="mt-1">
                                <span className="text-2xl font-semibold">
                                    {(() => {
                                        try {
                                            // Extract balance, handling observables
                                            const balance = typeof accountData?.balance?.get === 'function'
                                                ? accountData.balance.get()
                                                : accountData?.balance || 0;
                                            return formatBalance(balance.toString());
                                        } catch (e) {
                                            console.warn('Error rendering balance:', e);
                                            return '0';
                                        }
                                    })()}
                                </span>
                                <span className="ml-2 text-gray-500 dark:text-gray-400">LIBRA</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {(() => {
                                    try {
                                        // Extract raw balance for displaying in base units
                                        const rawBalance = typeof accountData?.balance?.get === 'function'
                                            ? accountData.balance.get()
                                            : accountData?.balance || 0;
                                        return String(rawBalance);
                                    } catch (e) {
                                        return '0';
                                    }
                                })()} base units
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Resources</h2>
                        <span className="text-sm text-gray-500">
                            {accountData?.resources?.length || 0} resources found
                        </span>
                    </div>

                    {/* Resource Type Tags Navigation */}
                    {resourceTypes.get().length > 0 && (
                        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap gap-2">
                                {resourceTypes.get().map((type) => {
                                    const resourceSlug = getSlugFromResourceType(type.type);
                                    const displayName = type.displayName || getDisplayNameFromResourceType(type.type);

                                    return (
                                        <Link
                                            key={type.type}
                                            href={`/account/${address}/${resourceSlug}`}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-md 
                                                ${findResourceTypeFromSlug(slug, [type]) === type.type
                                                    ? 'bg-libra-coral text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            {displayName}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Resource Content */}
                    <div className="p-6 space-y-6">
                        {(() => {
                            // Safely extract resources array
                            let resources: Resource[] = [];
                            try {
                                // Get the account data if it exists
                                const account = accountData || {} as Account;
                                // Extract resources array, handle both observable and regular objects
                                if (account) {
                                    const resourcesValue = typeof account.resources?.get === 'function'
                                        ? account.resources.get()
                                        : account.resources;

                                    resources = Array.isArray(resourcesValue) ? resourcesValue : [];
                                }
                            } catch (e) {
                                console.error('Error accessing resources:', e);
                            }

                            // If we have resources, filter and render them
                            if (resources.length > 0) {
                                // Find the current full resource type from slug
                                const currentResourceType = findResourceTypeFromSlug(slug, resourceTypes.get());

                                const filteredResources = resources.filter((res: Resource) => {
                                    try {
                                        return (res.type || '').toLowerCase() === (currentResourceType || '').toLowerCase();
                                    } catch (e) {
                                        console.error('Error comparing resource types:', e);
                                        return false;
                                    }
                                });

                                if (filteredResources.length > 0) {
                                    return filteredResources.map((resource: Resource, index: number) => (
                                        <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                                            <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                                <h4 className="font-medium text-gray-800 dark:text-gray-200">{resource.type || 'Unknown Resource'}</h4>
                                            </div>
                                            <div className="p-4">
                                                <pre className="text-sm overflow-auto whitespace-pre-wrap break-words">
                                                    {(() => {
                                                        // Special handling for CoinStore resources to display balance nicely
                                                        if (resource.type.includes('::coin::CoinStore<') && resource.data && resource.data.coin) {
                                                            // Extract coin type for display
                                                            let coinType = "LIBRA";
                                                            const coinTypeMatch = resource.type.match(/CoinStore<(.+?)::([^:>]+?)(?:>|$)/);
                                                            if (coinTypeMatch && coinTypeMatch[2]) {
                                                                coinType = coinTypeMatch[2];
                                                            }

                                                            const coinData = { ...resource.data };
                                                            // If this is a coin with balance, format it nicely
                                                            if (coinData.coin && coinData.coin.value) {
                                                                const rawBalance = coinData.coin.value;
                                                                const formattedBalance = formatBalance(rawBalance);
                                                                // Add formatted balance to the output
                                                                coinData.coin.formatted_balance = `${formattedBalance} ${coinType}`;

                                                                // Add a prominent display of the balance at the top
                                                                return (
                                                                    <>
                                                                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-md">
                                                                            <h4 className="text-lg font-semibold mb-1">{coinType} Balance:</h4>
                                                                            <div className="flex items-baseline">
                                                                                <span className="text-2xl mr-2 font-medium">{formattedBalance}</span>
                                                                                <span className="text-sm text-gray-500">{coinType}</span>
                                                                            </div>
                                                                            <div className="text-xs text-gray-500 mt-1">
                                                                                Raw Value: {rawBalance.toString()}
                                                                            </div>
                                                                        </div>
                                                                        {JSON.stringify(coinData, null, 2)}
                                                                    </>
                                                                );
                                                            }
                                                            return JSON.stringify(coinData, null, 2);
                                                        }
                                                        // Default display for other resources
                                                        return JSON.stringify(resource.data || {}, null, 2);
                                                    })()}
                                                </pre>
                                            </div>
                                        </div>
                                    ));
                                }
                            }

                            // Fallback for no resources
                            return (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <p>No resources found for this resource type.</p>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </>
        );
    };

    // Render the main component
    return renderAccountData();
} 