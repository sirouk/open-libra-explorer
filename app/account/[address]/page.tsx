'use client';

import { useState, useEffect } from 'react';
import { getAccountResources } from '../../services/libraService';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function AccountDetailsPage({ params }: { params: { address: string } }) {
    const [accountData, setAccountData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-semibold">Account Details</h2>
                    <p className="text-gray-600 dark:text-gray-400 font-mono">{params.address}</p>
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
                                    <p className="mt-1 text-2xl font-semibold">{accountData?.balance || 0} LIBRA</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-semibold">Resources</h2>
                            </div>
                            <div className="p-6">
                                {accountData?.resources?.length ? (
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {accountData.resources.map((resource: any, index: number) => (
                                            <div key={index} className="py-4">
                                                <h3 className="font-medium text-libra-coral mb-2">{resource.type || 'Resource'}</h3>
                                                <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs">
                                                    {JSON.stringify(resource.data || {}, null, 2)}
                                                </pre>
                                            </div>
                                        ))}
                                    </div>
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