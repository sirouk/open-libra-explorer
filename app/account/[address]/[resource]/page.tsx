'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAccountData } from '../../../context/AccountDataContext';
import { LIBRA_DECIMALS } from '../../../../config';

// Format raw balance to LIBRA display format
function formatBalance(rawBalance: string | number): string {
    const balance = typeof rawBalance === 'string' ? BigInt(rawBalance) : BigInt(rawBalance);
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
}

export default function AccountResourcePage() {
    // Use useParams hook to get route parameters
    const params = useParams();
    const address = params.address as string;
    const resource = params.resource as string;

    const router = useRouter();
    const {
        accountData,
        isLoading,
        error,
        resourceTypes,
        getActiveResources,
    } = useAccountData();

    // Get the canonical lowercase version of the resource param
    const normalizedResource = resource.toLowerCase();

    // Find matching resource type (case-insensitive)
    const matchingResourceType = resourceTypes.find(
        type => type.toLowerCase() === normalizedResource
    );

    // Get resources for the active tag
    const activeResources = matchingResourceType
        ? getActiveResources(matchingResourceType)
        : [];

    // Redirect if resource doesn't exist or URL case doesn't match
    useEffect(() => {
        if (!isLoading && !error && resourceTypes.length > 0) {
            if (resource !== normalizedResource) {
                // Fix URL case to be lowercase
                router.replace(`/account/${address}/${normalizedResource}`);
            } else if (!matchingResourceType) {
                // Resource doesn't exist, redirect to first available resource
                router.replace(`/account/${address}/${resourceTypes[0].toLowerCase()}`);
            }
        }
    }, [
        isLoading,
        error,
        resourceTypes,
        resource,
        normalizedResource,
        matchingResourceType,
        address,
        router
    ]);

    // Show loading spinner while data is being fetched
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral"></div>
            </div>
        );
    }

    // Show error message if there was an error
    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
            </div>
        );
    }

    return (
        <>
            <div className="mb-6">
                <h2 className="text-2xl font-semibold">Account Details</h2>
                <p className="text-gray-600 dark:text-gray-400 font-mono break-all">{address}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold">Account Overview</h2>
                </div>
                <div className="p-6">
                    <div className="mb-4">
                        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Balance:</span>
                        <p className="mt-1">
                            <span className="text-2xl font-semibold">{formatBalance(accountData?.balance || 0)}</span>
                            <span className="ml-2 text-gray-500 dark:text-gray-400">LIBRA</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {accountData?.balance || 0} base units
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
                {resourceTypes.length > 0 && (
                    <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap gap-2">
                            {resourceTypes.map((type) => (
                                <Link
                                    key={type}
                                    href={`/account/${address}/${type.toLowerCase()}`}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md 
                                        ${type.toLowerCase() === normalizedResource
                                            ? 'bg-libra-coral text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {type}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Resource Content */}
                <div className="p-6 space-y-6">
                    {activeResources.length > 0 ? (
                        activeResources.map((resource: { type?: string, data?: Record<string, unknown> }, index: number) => (
                            <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                                <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="font-medium text-libra-coral break-all text-sm">
                                        {resource.type || 'Resource'}
                                    </h3>
                                </div>
                                <div className="p-4">
                                    <pre className="overflow-x-auto text-xs whitespace-pre-wrap">
                                        {JSON.stringify(resource.data || {}, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-6 text-gray-500">
                            {accountData?.resources?.length
                                ? 'No resources found for this type'
                                : 'No resources found for this account'
                            }
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 