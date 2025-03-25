'use client';

import { useBlockchainData } from './store/hooks';
import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';

export default function Home() {
  const {
    blockHeight,
    epoch,
    chainId,
    transactions,
    isLoading,
    isRefreshing,
    error,
    refreshData
  } = useBlockchainData();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          {/* Remove duplicate title */}
        </div>

        {isLoading && !transactions.get().length ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral"></div>
          </div>
        ) : error.get() ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-medium">Error</p>
            <p>{error.get()}</p>
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
                <p className="text-3xl font-mono">{blockHeight.get()?.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-libra-light">
                <h2 className="text-xl font-semibold mb-2">Current Epoch</h2>
                <p className="text-3xl font-mono">{epoch.get()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-libra-accent">
                <h2 className="text-xl font-semibold mb-2">Chain ID</h2>
                <p className="text-3xl font-mono">{chainId.get()}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Recent Transactions <span className="text-gray-500">({transactions.get().length})</span></h2>
                <div className="flex items-center">
                  <button
                    onClick={refreshData}
                    disabled={isRefreshing.get()}
                    className="flex items-center px-3 py-1 text-sm bg-libra-coral hover:bg-libra-dark text-white rounded transition-colors disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 mr-1 ${isRefreshing.get() ? 'animate-spin' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isRefreshing.get() ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Table Header - only visible on larger screens */}
                <div className="hidden md:grid px-6 py-3 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-500 uppercase tracking-wider grid-cols-5 gap-4 text-center">
                  <div>Block Height</div>
                  <div>Version</div>
                  <div>From</div>
                  <div>Function</div>
                  <div>Time</div>
                </div>

                {transactions.get().length > 0 ? (
                  transactions.get().map((tx) => (
                    <div key={tx.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative">
                      {/* Background link - will be covered by other links when they're present */}
                      <Link
                        href={`/tx/${tx.id}`}
                        className="absolute inset-0 z-0"
                        aria-label={`View transaction ${tx.id} details`}
                      />

                      {/* Desktop view - only visible on md screens and up */}
                      <div className="hidden md:grid grid-cols-5 gap-4 items-center text-center relative z-10">
                        <div className="text-gray-700 dark:text-gray-300">
                          <Link href={`/tx/${tx.id}`} className="hover:underline relative z-10">
                            <p className="text-sm font-mono">{Number(tx.blockHeight).toLocaleString()}</p>
                          </Link>
                        </div>
                        <div className="text-gray-700 dark:text-gray-300">
                          <Link href={`/tx/${tx.id}`} className="hover:underline relative z-10">
                            <p className="text-sm font-mono">{Number(tx.version).toLocaleString()}</p>
                          </Link>
                        </div>
                        <div className="flex items-center justify-center relative z-10">
                          {tx.sender && tx.sender.length > 10 ? (
                            <>
                              <Link
                                href={`/account/${tx.sender}`}
                                className="text-libra-accent font-mono hover:underline cursor-pointer inline-block px-2 py-1"
                              >
                                {tx.sender.startsWith('0x') ?
                                  tx.sender.substring(2, 6) + '...' + tx.sender.substring(tx.sender.length - 4) :
                                  tx.sender.substring(0, 4) + '...' + tx.sender.substring(tx.sender.length - 4)
                                }
                              </Link>
                              <button
                                onClick={(e) => {
                                  try {
                                    // Copy without 0x prefix
                                    const addressToCopy = tx.sender?.startsWith('0x') ?
                                      tx.sender.substring(2) : tx.sender || '';
                                    navigator.clipboard.writeText(addressToCopy);
                                    const button = e.currentTarget;
                                    button.classList.add('text-green-500');
                                    setTimeout(() => button.classList.remove('text-green-500'), 1000);
                                  } catch (err) {
                                    console.error('Failed to copy:', err);
                                  }
                                }}
                                className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                                title="Copy address without 0x prefix"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <Link href={`/tx/${tx.id}`} className="text-libra-accent font-mono px-2 py-1 inline-block hover:underline">
                                {tx.id.startsWith('0x') ?
                                  tx.id.substring(2, 6) + '...' + tx.id.substring(tx.id.length - 4) :
                                  tx.id.substring(0, 4) + '...' + tx.id.substring(tx.id.length - 4)
                                }
                              </Link>
                              <button
                                onClick={(e) => {
                                  try {
                                    // Copy without 0x prefix
                                    const txIdToCopy = tx.id?.startsWith('0x') ?
                                      tx.id.substring(2) : tx.id;
                                    navigator.clipboard.writeText(txIdToCopy);
                                    const button = e.currentTarget;
                                    button.classList.add('text-green-500');
                                    setTimeout(() => button.classList.remove('text-green-500'), 1000);
                                  } catch (err) {
                                    console.error('Failed to copy:', err);
                                  }
                                }}
                                className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                                title="Copy transaction ID without 0x prefix"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex justify-center relative z-10">
                          <Link href={`/tx/${tx.id}`} className="hover:underline">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] inline-block
                              ${tx.type === 'Transfer' ? 'bg-blue-100 text-blue-800' :
                                tx.type === 'Stake' ? 'bg-green-100 text-green-800' :
                                  tx.type === 'Governance' ? 'bg-yellow-100 text-yellow-800' :
                                    tx.type === 'Block Metadata' ? 'bg-gray-100 text-gray-800' :
                                      tx.type === 'State Checkpoint' ? 'bg-purple-100 text-purple-800' :
                                        'bg-indigo-100 text-indigo-800'}`}>
                              {tx.type ? tx.type.replace('_transaction', '') : 'Unknown'}
                            </span>
                          </Link>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 text-sm text-center relative z-10">
                          <Link href={`/tx/${tx.id}`} className="hover:underline">
                            {tx.formattedDate || (() => {
                              return new Date(tx.timestamp * 1000).toLocaleString();
                            })()}
                          </Link>
                        </div>
                      </div>

                      {/* Mobile view - card style layout */}
                      <div className="md:hidden flex flex-col relative z-10">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <Link href={`/tx/${tx.id}`} className="hover:underline">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] inline-block mr-2
                                ${tx.type === 'Transfer' ? 'bg-blue-100 text-blue-800' :
                                  tx.type === 'Stake' ? 'bg-green-100 text-green-800' :
                                    tx.type === 'Governance' ? 'bg-yellow-100 text-yellow-800' :
                                      tx.type === 'Block Metadata' ? 'bg-gray-100 text-gray-800' :
                                        tx.type === 'State Checkpoint' ? 'bg-purple-100 text-purple-800' :
                                          'bg-indigo-100 text-indigo-800'}`}>
                                {tx.type ? tx.type.replace('_transaction', '') : 'Unknown'}
                              </span>
                            </Link>
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            <Link href={`/tx/${tx.id}`} className="hover:underline">
                              {tx.formattedDate || (() => {
                                return new Date(tx.timestamp * 1000).toLocaleString();
                              })()}
                            </Link>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center relative z-10">
                            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">From:</span>
                            {tx.sender && tx.sender.length > 10 ? (
                              <div className="flex items-center">
                                <Link
                                  href={`/account/${tx.sender}`}
                                  className="text-libra-accent font-mono hover:underline cursor-pointer text-sm"
                                >
                                  {tx.sender.startsWith('0x') ?
                                    tx.sender.substring(2, 6) + '...' + tx.sender.substring(tx.sender.length - 4) :
                                    tx.sender.substring(0, 4) + '...' + tx.sender.substring(tx.sender.length - 4)
                                  }
                                </Link>
                                <button
                                  onClick={(e) => {
                                    try {
                                      const addressToCopy = tx.sender?.startsWith('0x') ?
                                        tx.sender.substring(2) : tx.sender || '';
                                      navigator.clipboard.writeText(addressToCopy);
                                      const button = e.currentTarget;
                                      button.classList.add('text-green-500');
                                      setTimeout(() => button.classList.remove('text-green-500'), 1000);
                                    } catch (err) {
                                      console.error('Failed to copy:', err);
                                    }
                                  }}
                                  className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                                  title="Copy account address without 0x prefix"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No transactions found
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
