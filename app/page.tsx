'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBlockHeight, getEpoch, getLatestTransactions } from './services/libraService';
import Header from './components/Header';
import Footer from './components/Footer';

export default function Home() {
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [latestTransactions, setLatestTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [epoch, setEpoch] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBlockchainData = async () => {
    try {
      setRefreshing(true);

      // Fetch data from the Open Libra blockchain
      const [height, currentEpoch, transactions] = await Promise.all([
        getBlockHeight(),
        getEpoch(),
        getLatestTransactions(10)
      ]);

      setBlockHeight(height);
      setEpoch(currentEpoch);
      setLatestTransactions(transactions);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching blockchain data:', err);
      setError('Failed to fetch blockchain data. Please try again later.');
      setIsLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBlockchainData();
    const interval = setInterval(fetchBlockchainData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Open Libra Explorer</h2>
          <button
            onClick={fetchBlockchainData}
            disabled={refreshing}
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

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-medium">Error</p>
            <p>{error}</p>
            <button
              onClick={fetchBlockchainData}
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
                  Auto-updates every 30 seconds
                </span>
              </div>
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
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
