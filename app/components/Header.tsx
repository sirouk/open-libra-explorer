import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface HeaderProps {
    showSearch?: boolean;
}

export default function Header({ showSearch = true }: HeaderProps) {
    const router = useRouter();
    const [accountAddress, setAccountAddress] = useState<string>('');

    const handleAccountSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (accountAddress.trim()) {
            router.push(`/account/${accountAddress}`);
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
                    <form onSubmit={handleAccountSearch} className="flex w-full sm:max-w-lg sm:ml-4">
                        <div className="flex w-full rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-libra-coral focus-within:border-transparent">
                            <input
                                type="text"
                                placeholder="Search by account address"
                                className="w-full px-4 py-2 outline-none border-0 dark:bg-gray-800 dark:text-white"
                                value={accountAddress}
                                onChange={(e) => setAccountAddress(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="bg-libra-coral hover:bg-libra-dark text-white font-medium px-6 py-2 transition-colors flex items-center"
                            >
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
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </header>
    );
} 