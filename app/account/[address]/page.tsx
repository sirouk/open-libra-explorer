'use client';

import { useState, useEffect } from 'react';
import { getAccountResources } from '../../services/libraService';
import { LIBRA_DECIMALS } from '../../../config';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

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

export default function AccountDetailsPage({ params }: { params: { address: string } }) {
    const [accountData, setAccountData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeResourceTab, setActiveResourceTab] = useState<string>('all');
    const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchAccountData = async () => {
            try {
                setIsLoading(true);
                const data = await getAccountResources(params.address);
                setAccountData(data);

                // Set default active tab to first resource type if available
                if (data?.resources?.length > 0) {
                    setActiveResourceTab('all');

                    // Expand the first resource by default
                    if (data.resources.length > 0) {
                        setExpandedResources(new Set([data.resources[0].type]));
                    }
                }

                setIsLoading(false);
            } catch (err) {
                console.error('Error fetching account data:', err);
                setError('Failed to fetch account data');
                setIsLoading(false);
            }
        };

        fetchAccountData();
    }, [params.address]);

    // Extract unique resource types for tabs
    const resourceTypes = accountData?.resources
        ? ['all', ...new Set(accountData.resources.map((r: any) => {
            // Extract simple name from full type for better UX
            const parts = r.type.split('::');
            return parts.length >= 3 ? parts[2].split('<')[0] : r.type;
        }) as string[])]
        : ['all'];

    // Group resources by type
    const resourcesByType = accountData?.resources?.reduce((acc: any, resource: any) => {
        const parts = resource.type.split('::');
        const simpleName = parts.length >= 3 ? parts[2].split('<')[0] : resource.type;

        if (!acc[simpleName]) {
            acc[simpleName] = [];
        }

        acc[simpleName].push(resource);
        return acc;
    }, {}) || {};

    // Filter resources based on active tab
    const filteredResources = accountData?.resources?.filter((resource: any) => {
        if (activeResourceTab === 'all') return true;

        const parts = resource.type.split('::');
        const simpleName = parts.length >= 3 ? parts[2].split('<')[0] : resource.type;
        return simpleName === activeResourceTab;
    });

    // Toggle resource expansion
    const toggleResource = (resourceType: string) => {
        setExpandedResources(prev => {
            const newSet = new Set(prev);
            if (newSet.has(resourceType)) {
                newSet.delete(resourceType);
            } else {
                newSet.add(resourceType);
            }
            return newSet;
        });
    };

    // Expand or collapse all resources
    const toggleAllResources = (expanded: boolean) => {
        if (expanded) {
            const allTypes = accountData?.resources?.map((r: any) => r.type) || [];
            setExpandedResources(new Set(allTypes));
        } else {
            setExpandedResources(new Set());
        }
    };

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
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm text-gray-500">
                                        {accountData?.resources?.length || 0} resources found
                                    </span>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => toggleAllResources(true)}
                                            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                        >
                                            Expand All
                                        </button>
                                        <button
                                            onClick={() => toggleAllResources(false)}
                                            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                        >
                                            Collapse All
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Resource Type Navigation */}
                            {accountData?.resources?.length > 0 && (
                                <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                                    <div className="flex space-x-2">
                                        {resourceTypes.map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setActiveResourceTab(type)}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap
                                                    ${activeResourceTab === type
                                                        ? 'bg-libra-coral text-white'
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {type === 'all' ? 'All Resources' : type}
                                                {type !== 'all' && resourcesByType[type] && (
                                                    <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                                                        {resourcesByType[type].length}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredResources?.length ? (
                                    filteredResources.map((resource: any, index: number) => (
                                        <div key={index} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                            <div
                                                className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                                                onClick={() => toggleResource(resource.type)}
                                            >
                                                <h3 className="font-medium text-libra-coral break-all text-sm">
                                                    {resource.type || 'Resource'}
                                                </h3>
                                                <div className="ml-3 flex-shrink-0">
                                                    <svg
                                                        className={`h-5 w-5 transform transition-transform ${expandedResources.has(resource.type) ? 'rotate-180' : ''}`}
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                            {expandedResources.has(resource.type) && (
                                                <div className="px-6 py-4">
                                                    <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs">
                                                        {JSON.stringify(resource.data || {}, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        No resources found for this account
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