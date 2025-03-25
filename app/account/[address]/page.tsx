'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccountData } from '../../store/hooks';
import { fetchAccountData } from '../../store/actions';
import { store } from '../../store';
import Link from 'next/link';
import { LIBRA_DECIMALS } from '../../../config';

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
    // Extract the base name using regex pattern
    const basePattern = /::([^:<]+)(?:<|$)/;
    const baseMatch = resourceType.match(basePattern);
    const baseName = baseMatch ? baseMatch[1] : resourceType.split('::').pop() || 'Resource';

    // For CoinStore types, extract the coin type
    if (resourceType.includes('::coin::CoinStore<')) {
        // Extract coin type from the format: 0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>
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

// Find resource type from slug
function findResourceTypeFromSlug(slug: string, availableTypes: ResourceType[]): string | null {
    if (!slug) return null;

    // Normalize the slug
    const normalizedSlug = slug.replace(/-/g, '_').toLowerCase();
    console.log(`Finding resource for slug: ${slug} (normalized: ${normalizedSlug})`);

    // Debug all available types and their extracted base types
    availableTypes.forEach(rt => {
        const basePattern = /::([^:<]+)(?:<|$)/;
        const baseMatch = rt.type.match(basePattern);
        const baseType = baseMatch ? baseMatch[1].toLowerCase() : '';
        console.log(`Available type: ${rt.type} -> base: ${baseType}`);
    });

    // Try a more direct approach first - check for type ending with the slug
    const exactMatch = availableTypes.find(rt => {
        // For example, if slug is "jail", look for type ending with "::Jail" or "::jail"
        return rt.type.toLowerCase().endsWith(`:${normalizedSlug}`) ||
            rt.type.toLowerCase().endsWith(`::${normalizedSlug}`);
    });

    if (exactMatch) {
        console.log(`Found exact match for slug '${slug}':`, exactMatch.type);
        return exactMatch.type;
    }

    // Find the matching resource type by base name
    const matchingResource = availableTypes.find(rt => {
        // Extract base type for matching
        const basePattern = /::([^:<]+)(?:<|$)/;
        const baseMatch = rt.type.match(basePattern);
        const baseType = baseMatch ? baseMatch[1].toLowerCase() : '';

        return baseType === normalizedSlug;
    });

    if (matchingResource) {
        console.log(`Found base type match for slug '${slug}':`, matchingResource.type);
    } else {
        console.log(`No match found for slug '${slug}'`);
    }

    return matchingResource ? matchingResource.type : null;
}

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

// Define interfaces for account data types
interface Resource {
    type: string;
    data: any;
}

interface ResourceType {
    type: string;
    displayName: string;
}

interface Account {
    address?: string;
    balance?: string | number;
    resources?: any; // Can be an observable or regular array
    lastFetched?: number;
    [key: string]: any; // Allow additional properties
}

// Next.js dynamic segment for optional resource parameter
interface AccountPageParams {
    address: string;
    resource?: string;
    [key: string]: string | string[] | undefined;
}

// Function to safely filter resources based on current resource type
function filterResourcesByType(resources: Resource[], resourceType: string | null): Resource[] {
    if (!resourceType) return [];

    console.log(`Filtering resources for type: ${resourceType}`);

    return resources.filter(res => {
        try {
            // Simple case-insensitive string comparison
            return res.type.toLowerCase() === resourceType.toLowerCase();
        } catch (e) {
            console.error('Error comparing resource types:', e);
            return false;
        }
    });
}

export default function AccountPage() {
    const params = useParams<AccountPageParams>();
    const router = useRouter();
    const address = params.address as string;
    const resourceSlug = params.resource as string | undefined;

    // Local state for current resource type
    const [currentResourceType, setCurrentResourceType] = useState<string | null>(null);

    // Use the account data hook 
    const { isLoading, error, resourceTypes, accountData } = useAccountData(address);

    // Function to change the selected resource type
    const selectResourceType = (type: string) => {
        console.log(`Selecting resource type: ${type}`);
        setCurrentResourceType(type);

        // Update URL to reflect the selected resource without reloading the page
        const slug = getSlugFromResourceType(type);
        // Use history.pushState to update URL without navigation
        window.history.pushState({}, '', `/account/${address}/${slug}`);
    };

    // This effect runs when the component mounts to set the initial resource type
    useEffect(() => {
        // Log current state for debugging
        console.log(`Initial resource effect: loading=${isLoading.get()}, error=${error.get()}, resourceTypes=${resourceTypes.get().length}, slug=${resourceSlug}, currentType=${currentResourceType}`);

        if (!isLoading.get() && resourceTypes.get().length > 0) {
            if (resourceSlug) {
                // Try to find the resource type matching the slug
                const fullResourceType = findResourceTypeFromSlug(resourceSlug, resourceTypes.get());
                console.log(`Matching resource type for slug '${resourceSlug}':`, fullResourceType);

                if (fullResourceType) {
                    setCurrentResourceType(fullResourceType);
                } else {
                    // If slug doesn't match, use first resource and update URL
                    const firstType = resourceTypes.get()[0].type;
                    const slug = getSlugFromResourceType(firstType);
                    console.log(`Resource slug not found, using first type: ${firstType} (slug: ${slug})`);
                    setCurrentResourceType(firstType);
                    window.history.replaceState({}, '', `/account/${address}/${slug}`);
                }
            } else if (!currentResourceType) {
                // No slug in URL, set first resource and update URL
                const firstType = resourceTypes.get()[0].type;
                const slug = getSlugFromResourceType(firstType);
                console.log(`No resource slug, using first type: ${firstType} (slug: ${slug})`);
                setCurrentResourceType(firstType);
                window.history.replaceState({}, '', `/account/${address}/${slug}`);
            }
        }
        // We only want this effect to run on mount and when the resourceTypes change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, resourceTypes, resourceSlug, address]);

    // Function to render loading state
    const renderLoading = () => (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 ml-4">Loading account data...</p>
        </div>
    );

    // Function to render error state
    const renderError = () => (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-6 rounded-lg mb-6">
                <h2 className="text-2xl font-semibold mb-2">Error</h2>
                <p className="mb-4">{error.get()}</p>
                <div className="flex items-center space-x-4">
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

    // Function to render account data
    const renderAccountData = () => {
        // Safely extract resources array
        let resources: Resource[] = [];
        try {
            // Get the account data if it exists
            const account = accountData || {} as Account;

            // Safe access to resources (check if it's an observable or plain array)
            if (account && account.resources) {
                // Check if it's an observable with get method
                if (typeof (account.resources as any).get === 'function') {
                    try {
                        const resourcesData = (account.resources as any).get();
                        resources = Array.isArray(resourcesData) ? resourcesData : [];
                    } catch (e) {
                        console.error('Error getting observable resources:', e);
                        resources = [];
                    }
                } else {
                    // It's a plain array
                    resources = Array.isArray(account.resources) ? account.resources : [];
                }
            }
        } catch (e) {
            console.error('Error accessing resources:', e);
        }

        // If no resources found
        if (resources.length === 0) {
            return (
                <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h3 className="text-xl mb-4">No resources found for this account</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">This account may not exist or has not been initialized yet.</p>
                    <Link href="/"
                        className="px-4 py-2 bg-libra-coral hover:bg-libra-dark text-white rounded transition-colors"
                    >
                        Return to Home
                    </Link>
                </div>
            );
        }

        // Use useMemo to cache filtered resources and avoid re-filtering on every render
        const filteredResources = useMemo(() => {
            if (!currentResourceType) return [];

            console.log(`Filtering resources for type: ${currentResourceType}`);

            return resources.filter(res => {
                try {
                    // Simple case-insensitive string comparison
                    return res.type.toLowerCase() === currentResourceType.toLowerCase();
                } catch (e) {
                    console.error('Error comparing resource types:', e);
                    return false;
                }
            });
        }, [resources, currentResourceType]);

        console.log(`Found ${filteredResources.length} resources matching type ${currentResourceType}`);

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
                            {resources.length} resources found
                        </span>
                    </div>

                    {/* Resource Type Tabs */}
                    {resourceTypes.get().length > 0 && (
                        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap gap-2">
                                {resourceTypes.get().map((type) => {
                                    const displayName = type.displayName || getDisplayNameFromResourceType(type.type);

                                    return (
                                        <button
                                            key={type.type}
                                            onClick={() => {
                                                console.log(`Clicked resource button: ${type.type}`);
                                                selectResourceType(type.type);
                                            }}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-md 
                                                ${type.type === currentResourceType
                                                    ? 'bg-libra-coral text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            {displayName}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Resource Content */}
                    <div className="p-6 space-y-6">
                        {filteredResources.length > 0 ? (
                            filteredResources.map((resource: Resource, index: number) => (
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
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <p>No resources found for this resource type.</p>
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    };

    // Main render based on loading/error state
    if (isLoading.get()) {
        console.log('Rendering loading state');
        return renderLoading();
    }

    if (error.get()) {
        console.log('Rendering error state:', error.get());
        return renderError();
    }

    // Check if we have account data (safer check)
    const hasAccountData = !!accountData;

    if (!hasAccountData) {
        console.log('No account data found for address:', address);
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {renderAccountData()}
        </div>
    );
}