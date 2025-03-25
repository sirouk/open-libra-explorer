'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';
import { useTransactionDetails } from '../../store/hooks';
import { fetchTransactionByHash } from '../../store/actions';
import { store } from '../../store';

// Define interfaces for better type safety
interface TransactionEvent {
    type?: string;
    data?: Record<string, unknown>;
}

interface Transaction {
    hash: string;
    type: string;
    displayType?: string;
    success: boolean;
    timestamp: string | number;
    sender?: string;
    gas_used?: string | number;
    payload?: Record<string, unknown>;
    events?: TransactionEvent[];
}

// Loading spinner component with message
function LoadingSpinner({ message = "Loading transaction data..." }) {
    return (
        <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{message}</p>
        </div>
    );
}

export default function TransactionPage() {
    // Use useParams hook to get route parameters
    const params = useParams();
    const hash = params.hash as string;
    const router = useRouter();

    // Use the transaction details hook from global state
    const { transaction, isLoading, error } = useTransactionDetails(hash);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-semibold">Transaction Details</h2>
                    <div className="flex items-center">
                        <p className="text-gray-600 dark:text-gray-400 font-mono break-all text-sm mr-2">{hash}</p>
                        <button
                            onClick={() => {
                                try {
                                    const hashToCopy = hash?.startsWith('0x') ? hash : `0x${hash}`;
                                    navigator.clipboard.writeText(hashToCopy);
                                    const button = document.getElementById('copy-tx-hash-btn');
                                    if (button) {
                                        button.classList.add('text-green-500');
                                        setTimeout(() => button.classList.remove('text-green-500'), 1000);
                                    }
                                } catch (err) {
                                    console.error('Failed to copy:', err);
                                }
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                            title="Copy transaction hash"
                            id="copy-tx-hash-btn"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {isLoading.get() ? (
                    <LoadingSpinner />
                ) : error.get() ? (
                    <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-6 rounded-lg mb-6">
                        <h3 className="text-xl font-semibold mb-2">Error</h3>
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
                                    // Manually refresh the transaction data
                                    store.currentTransaction.error.set(null);
                                    store.currentTransaction.isLoading.set(true);
                                    fetchTransactionByHash(hash);
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
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold">Transaction Information</h2>
                        </div>
                        <div className="p-6">
                            {transaction.get() ? (
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Type:</span>
                                        <p className="mt-1 font-mono">
                                            {transaction.get().displayType ||
                                                (transaction.get().type ? transaction.get().type.replace('_transaction', '') : 'Unknown')}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Status:</span>
                                        <p className="mt-1">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${transaction.get().success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                                {transaction.get().success ? 'Success' : 'Failed'}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Timestamp:</span>
                                        <p className="mt-1">{new Date(Number(transaction.get().timestamp) / 1000).toLocaleString()}</p>
                                    </div>

                                    {transaction.get().sender && (
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Sender:</span>
                                            <div className="mt-1 flex items-center">
                                                <p className="font-mono break-all">{transaction.get().sender}</p>
                                                <button
                                                    onClick={() => {
                                                        try {
                                                            const addressToCopy = transaction.get().sender?.startsWith('0x') ?
                                                                transaction.get().sender.substring(2) : transaction.get().sender || '';
                                                            navigator.clipboard.writeText(addressToCopy);
                                                            const button = document.getElementById('copy-sender-btn');
                                                            if (button) {
                                                                button.classList.add('text-green-500');
                                                                setTimeout(() => button.classList.remove('text-green-500'), 1000);
                                                            }
                                                        } catch (err) {
                                                            console.error('Failed to copy:', err);
                                                        }
                                                    }}
                                                    className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                                                    title="Copy sender address"
                                                    id="copy-sender-btn"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {transaction.get().gas_used && (
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Gas Used:</span>
                                            <p className="mt-1 font-mono">{transaction.get().gas_used}</p>
                                        </div>
                                    )}

                                    {transaction.get().payload && (
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Payload:</span>
                                            <pre className="mt-1 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs">
                                                {JSON.stringify(transaction.get().payload, null, 2)}
                                            </pre>
                                        </div>
                                    )}

                                    {transaction.get().events && transaction.get().events.length > 0 && (
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Events:</span>
                                            <div className="mt-1 space-y-3">
                                                {transaction.get().events.map((event: TransactionEvent, index: number) => (
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
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                    <p className="mb-4">No transaction data found for this hash</p>
                                    <Link href="/"
                                        className="px-4 py-2 bg-libra-coral hover:bg-libra-dark text-white rounded transition-colors"
                                    >
                                        Return to Home
                                    </Link>
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