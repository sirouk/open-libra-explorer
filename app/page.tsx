'use client';

import { useBlockchainData } from './context/BlockchainDataContext';
import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';
import { AUTO_REFRESH_INTERVAL } from '../config';

export default function Home() {
  const {
    blockHeight,
    epoch,
    transactions,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refreshData
  } = useBlockchainData();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          {/* Remove duplicate title */}
        </div>

        {isLoading && !transactions.length ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-medium">Error</p>
            <p>{error}</p>
            <button
              onClick={refreshData}
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
                <p className="text-3xl font-mono">{transactions.length} recent</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Latest Transactions</h2>
                <div className="flex items-center">
                  {isRefreshing && (
                    <div className="flex items-center mr-4 text-sm text-blue-600 dark:text-blue-400">
                      <svg className="animate-spin mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Refreshing...</span>
                    </div>
                  )}
                  <span className="text-sm text-gray-500 mr-4">
                    Auto-updates every {AUTO_REFRESH_INTERVAL / 1000} seconds
                  </span>
                  <button
                    onClick={refreshData}
                    disabled={isRefreshing}
                    className="flex items-center px-3 py-1 text-sm bg-libra-coral hover:bg-libra-dark text-white rounded transition-colors disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Table Header */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-500 uppercase tracking-wider grid grid-cols-5 gap-4">
                  <div>Block Height</div>
                  <div>Version</div>
                  <div>From</div>
                  <div>Time</div>
                  <div>Function</div>
                </div>

                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <Link key={tx.id} href={`/tx/${tx.id}`}>
                      <div className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                        <div className="grid grid-cols-5 gap-4 items-center">
                          <div className="text-gray-700 dark:text-gray-300">
                            <p className="text-sm font-mono">{Number(tx.blockHeight).toLocaleString()}</p>
                          </div>
                          <div className="text-gray-700 dark:text-gray-300">
                            <p className="text-sm font-mono">{Number(tx.version).toLocaleString()}</p>
                          </div>
                          <div>
                            {tx.sender && (
                              <span className="text-libra-accent font-mono">
                                {tx.sender.startsWith('0x') ?
                                  tx.sender.substring(2, 6) + '...' + tx.sender.substring(tx.sender.length - 4) :
                                  tx.sender.substring(0, 4) + '...' + tx.sender.substring(tx.sender.length - 4)
                                }
                              </span>
                            )}
                            {!tx.sender && tx.id && (
                              <span className="text-libra-accent font-mono">
                                {tx.id.startsWith('0x') ?
                                  tx.id.substring(2, 6) + '...' + tx.id.substring(tx.id.length - 4) :
                                  tx.id.substring(0, 4) + '...' + tx.id.substring(tx.id.length - 4)
                                }
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 text-sm">
                            {tx.formattedDate || (() => {
                              return new Date(tx.timestamp * 1000).toLocaleString();
                            })()}
                          </div>
                          <div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] inline-block
                              ${tx.type === 'Transfer' ? 'bg-blue-100 text-blue-800' :
                                tx.type === 'Stake' ? 'bg-green-100 text-green-800' :
                                  tx.type === 'Governance' ? 'bg-yellow-100 text-yellow-800' :
                                    tx.type === 'Block Metadata' ? 'bg-gray-100 text-gray-800' :
                                      tx.type === 'State Checkpoint' ? 'bg-purple-100 text-purple-800' :
                                        'bg-indigo-100 text-indigo-800'}`}>
                              {tx.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No transactions found. The blockchain may be experiencing low activity.
                  </div>
                )}
              </div>
              {transactions.length > 0 && (
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
