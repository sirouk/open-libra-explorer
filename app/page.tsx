'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';
import { useBlockchainData } from './hooks/useBlockchainData';
import { AUTO_REFRESH_INTERVAL } from '../config';

export default function Home() {
  // Using our custom hook with 10-second refresh interval
  const {
    blockHeight,
    epoch,
    transactions: latestTransactions,
    isLoading,
    error,
    lastUpdated,
    refreshData
  } = useBlockchainData(10000);

  // Track if manual refresh is in progress
  const [refreshing, setRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Open Libra Explorer</h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className="flex items-center px-4 py-2 bg-libra-coral hover:bg-libra-dark text-white rounded transition-colors disabled:opacity-50"
          >
            {refreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing
              </>
            ) : (
              <>Refresh Data</>
            )}
          </button>
        </div>

        {isLoading && !latestTransactions.length ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-medium">Error</p>
            <p>{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-4 py-1 bg-red-700 text-white rounded text-sm hover:bg-red-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-libra-coral">
                <h2 className="text-xl font-semibold mb-2">Block Height</h2>
                <p className="text-3xl font-mono">{blockHeight?.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-libra-light">
                <h2 className="text-xl font-semibold mb-2">Current Epoch</h2>
                <p className="text-3xl font-mono">{epoch}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-libra-dark">
                <h2 className="text-xl font-semibold mb-2">Transactions</h2>
                <p className="text-3xl font-mono">{latestTransactions.length} recent</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Latest Transactions</h2>
                <span className="text-sm text-gray-500">
                  Auto-updates every {AUTO_REFRESH_INTERVAL / 1000} seconds
                </span>
              </div>
              {isLoading && latestTransactions.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 text-sm text-blue-700 dark:text-blue-300 border-b border-blue-100 dark:border-blue-800">
                  <svg className="inline-block animate-spin mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing data...
                </div>
              )}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {latestTransactions.length > 0 ? (
                  latestTransactions.map((tx) => (
                    <div key={tx.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex justify-between items-center">
                        <div>
                          <Link href={`/tx/${tx.id}`} className="text-libra-accent hover:underline font-mono">
                            {tx.id}
                          </Link>
                          <p className="text-gray-500 text-sm">
                            {new Date(tx.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${tx.type === 'Transfer' ? 'bg-blue-100 text-blue-800' :
                              tx.type === 'Stake' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'}`}>
                            {tx.type}
                          </span>
                          <span className="ml-2 font-mono">{tx.amount} LIBRA</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No transactions found. The blockchain may be experiencing low activity.
                  </div>
                )}
              </div>
              {latestTransactions.length > 0 && (
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
