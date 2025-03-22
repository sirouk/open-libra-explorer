'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getTransactionByHash } from '../../services/transactionServer';

export default function TransactionDetailsPage({ params }: { params: { hash: string } }) {
    const [transaction, setTransaction] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTransactionData = async () => {
            try {
                setIsLoading(true);

                // Use the server action to fetch transaction data
                const txData = await getTransactionByHash(params.hash);

                if (!txData) {
                    throw new Error('Transaction not found or error occurred');
                }

                setTransaction(txData);
                setIsLoading(false);
            } catch (err) {
                console.error('Error fetching transaction data:', err);
                setError('Failed to fetch transaction data. The transaction may not exist or the blockchain node may be experiencing issues.');
                setIsLoading(false);
            }
        };

        fetchTransactionData();
    }, [params.hash]);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-semibold">Transaction Details</h2>
                    <p className="text-gray-600 dark:text-gray-400 font-mono break-all">{params.hash}</p>
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
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold">Transaction Information</h2>
                        </div>
                        <div className="p-6">
                            {transaction ? (
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Hash:</span>
                                        <p className="mt-1 font-mono break-all">{transaction.hash}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Type:</span>
                                        <p className="mt-1 font-mono">{transaction.type}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Status:</span>
                                        <p className="mt-1">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${transaction.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {transaction.success ? 'Success' : 'Failed'}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Timestamp:</span>
                                        <p className="mt-1">{new Date(Number(transaction.timestamp) / 1000).toLocaleString()}</p>
                                    </div>

                                    {transaction.sender && (
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Sender:</span>
                                            <p className="mt-1 font-mono break-all">{transaction.sender}</p>
                                        </div>
                                    )}

                                    {transaction.gas_used && (
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Gas Used:</span>
                                            <p className="mt-1 font-mono">{transaction.gas_used}</p>
                                        </div>
                                    )}

                                    {transaction.payload && (
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Payload:</span>
                                            <pre className="mt-1 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs">
                                                {JSON.stringify(transaction.payload, null, 2)}
                                            </pre>
                                        </div>
                                    )}

                                    {transaction.events && transaction.events.length > 0 && (
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Events:</span>
                                            <div className="mt-1 space-y-3">
                                                {transaction.events.map((event: any, index: number) => (
                                                    <div key={index} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                                                        <p className="text-sm font-medium text-libra-coral mb-2">{event.type || 'Event'}</p>
                                                        <pre className="overflow-x-auto text-xs">
                                                            {JSON.stringify(event.data, null, 2)}
                                                        </pre>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-500">
                                    No transaction data found for this hash
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
} 