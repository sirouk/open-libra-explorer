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
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center">
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
                    <form onSubmit={handleAccountSearch} className="flex w-full max-w-lg mx-4">
                        <input
                            type="text"
                            placeholder="Search by account address"
                            className="w-full px-4 py-2 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-libra-coral"
                            value={accountAddress}
                            onChange={(e) => setAccountAddress(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-libra-coral hover:bg-libra-dark text-white px-4 py-2 rounded-r-lg transition-colors"
                        >
                            Search
                        </button>
                    </form>
                )}
            </div>
        </header>
    );
} 