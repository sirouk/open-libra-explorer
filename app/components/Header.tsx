import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { observable } from '@legendapp/state';
import { fetchAccountData } from '../store/actions';
import { getTransactionByHash } from '../services/transactionService';
import { toggleDarkMode } from '../store/actions';
import { useUIPreferences } from '../store/hooks';

interface HeaderProps {
    showSearch?: boolean;
}

export default function Header({ showSearch = true }: HeaderProps) {
    const router = useRouter();
    const [searchInput, setSearchInput] = useState<string>('');
    const searchState = observable({
        isSearching: false,
        error: null as string | null
    });
    const { isDarkMode } = useUIPreferences();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        // Trim and validate input
        const query = searchInput.trim();
        if (!query) return;

        searchState.isSearching.set(true);
        searchState.error.set(null);

        try {
            // First try to find an account by calling the fetchAccountData action
            try {
                await fetchAccountData(query);
                // If it succeeds (no error thrown), redirect to the account page
                router.push(`/account/${query}`);
                return;
            } catch (accountError) {
                // If account not found, try transaction hash
                const txResult = await getTransactionByHash(query);

                if (txResult) {
                    router.push(`/tx/${query}`);
                    return;
                }

                // If neither found, show error but don't navigate
                searchState.error.set("No matching account or transaction found");
            }
        } catch (error) {
            console.error("Search error:", error);
            searchState.error.set("Error performing search");
        } finally {
            searchState.isSearching.set(false);
        }
    };

    return (
        <header className="bg-white dark:bg-gray-900 shadow">
            <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center">
                <div className="flex items-center justify-between w-full sm:w-auto mb-4 sm:mb-0">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/images/logo.svg"
                            alt="Open Libra Logo"
                            width={40}
                            height={40}
                            className="mr-3"
                        />
                        <h1 className="text-2xl font-bold text-libra-coral dark:text-white">Open Libra Explorer</h1>
                    </Link>
                    <button
                        onClick={toggleDarkMode}
                        className="ml-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        aria-label="Toggle dark mode"
                    >
                        {isDarkMode.get() ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        )}
                    </button>
                </div>
                {showSearch && (
                    <form onSubmit={handleSearch} className="flex flex-col w-full sm:max-w-lg sm:ml-4">
                        <div className="flex w-full rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-libra-coral focus-within:border-transparent">
                            <input
                                type="text"
                                placeholder="Search by account or tx hash"
                                className="w-full px-4 py-2 outline-none border-0 dark:bg-gray-800 dark:text-white"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                disabled={searchState.isSearching.get()}
                            />
                            <button
                                type="submit"
                                className={`bg-libra-coral hover:bg-libra-dark text-white font-medium px-6 py-2 transition-colors flex items-center ${searchState.isSearching.get() ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={searchState.isSearching.get()}
                            >
                                {searchState.isSearching.get() ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                        Searching...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 mr-1"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                            />
                                        </svg>
                                        Search
                                    </>
                                )}
                            </button>
                        </div>
                        {searchState.error.get() && (
                            <div className="mt-2 text-red-500 text-sm">{searchState.error.get()}</div>
                        )}
                    </form>
                )}
            </div>
        </header>
    );
} 