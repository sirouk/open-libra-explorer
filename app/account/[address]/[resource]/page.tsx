'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAccountResources } from '../../../services/libraService';
import { LIBRA_DECIMALS } from '../../../../config';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';

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

export default function AccountResourcePage({ params }: { params: { address: string; resource: string } }) {
    const router = useRouter();

    const [accountData, setAccountData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper function to extract simple resource type
    const getSimpleResourceType = (fullType: string): string => {
        const parts = fullType.split('::');
        return parts.length >= 3 ? parts[2].split('<')[0] : fullType;
    };

    useEffect(() => {
        const fetchAccountData = async () => {
            try {
                setIsLoading(true);
                const data = await getAccountResources(params.address);
                setAccountData(data);
                setIsLoading(false);
            } catch (err) {
                console.error('Error fetching account data:', err);
                setError('Failed to fetch account data');
                setIsLoading(false);
            }
        };

        fetchAccountData();
    }, [params.address]);

    // Extract unique resource types and sort them alphabetically
    const resourceTypes = accountData?.resources
        ? [...new Set(accountData.resources.map((r: any) => getSimpleResourceType(r.type)) as string[])].sort()
        : [];

    // Group resources by type
    const resourcesByType = accountData?.resources?.reduce((acc: any, resource: any) => {
        const simpleName = getSimpleResourceType(resource.type);

        if (!acc[simpleName]) {
            acc[simpleName] = [];
        }

        acc[simpleName].push(resource);
        return acc;
    }, {}) || {};

    // Get resources for the active tag and sort them by type name for consistency
    const activeResources = params.resource
        ? [...(resourcesByType[params.resource] || [])].sort((a, b) => a.type.localeCompare(b.type))
        : [];

    // If the resource type doesn't exist but we have data, redirect to the first available resource
    useEffect(() => {
        if (!isLoading && !error && accountData && resourceTypes.length > 0) {
            if (!params.resource || !resourcesByType[params.resource]) {
                router.replace(`/account/${params.address}/${resourceTypes[0]}`);
            }
        }
    }, [isLoading, error, accountData, resourceTypes, params.resource, params.address, router, resourcesByType]);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-semibold">Account Details</h2>
                    <p className="text-gray-600 dark:text-gray-400 font-mono break-all">{params.address}</p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                ) : (
                    <>
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
                                                href={`/account/${params.address}/${type}`}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-md 
                                                    ${params.resource === type
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
                                    activeResources.map((resource: any, index: number) => (
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
                )}
            </main>

            <Footer />
        </div>
    );
} 