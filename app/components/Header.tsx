import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getAccountResources } from '../services/libraService';
import { getTransactionByHash } from '../services/transactionServer';

interface HeaderProps {
    showSearch?: boolean;
}

export default function Header({ showSearch = true }: HeaderProps) {
    const router = useRouter();
    const [searchInput, setSearchInput] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        // Trim and validate input
        const query = searchInput.trim();
        if (!query) return;

        setIsSearching(true);
        setSearchError(null);

        try {
            // First try to find an account
            const accountResult = await getAccountResources(query);

            // If account exists and has resources/balance
            if (accountResult && (accountResult.resources?.length > 0 || accountResult.balance !== '0')) {
                router.push(`/account/${query}`);
                return;
            }

            // If account not found, try transaction hash
            const txResult = await getTransactionByHash(query);

            if (txResult) {
                router.push(`/tx/${query}`);
                return;
            }

            // If neither found, show error but don't navigate
            setSearchError("No matching account or transaction found");
        } catch (error) {
            console.error("Search error:", error);
            setSearchError("Error performing search");
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <header className="bg-white dark:bg-gray-900 shadow">
            <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center">
                <Link href="/" className="flex items-center w-full sm:w-auto mb-4 sm:mb-0">
                    <Image
                        src="/images/logo.svg"
                        alt="Open Libra Logo"
                        width={40}
                        height={40}
                        className="mr-3"
                    />
                    <h1 className="text-2xl font-bold text-libra-coral">Open Libra Explorer</h1>
                </Link>
                {showSearch && (
                    <form onSubmit={handleSearch} className="flex flex-col w-full sm:max-w-lg sm:ml-4">
                        <div className="flex w-full rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-libra-coral focus-within:border-transparent">
                            <input
                                type="text"
                                placeholder="Search by account address or transaction hash"
                                className="w-full px-4 py-2 outline-none border-0 dark:bg-gray-800 dark:text-white"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                disabled={isSearching}
                            />
                            <button
                                type="submit"
                                className={`bg-libra-coral hover:bg-libra-dark text-white font-medium px-6 py-2 transition-colors flex items-center ${isSearching ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={isSearching}
                            >
                                {isSearching ? (
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
                        {searchError && (
                            <div className="mt-2 text-red-500 text-sm">{searchError}</div>
                        )}
                    </form>
                )}
            </div>
        </header>
    );
} 