'use client';

import { useParams } from 'next/navigation';
import { AccountDataProvider } from '../../context/AccountDataContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function AccountLayout({
    children
}: {
    children: React.ReactNode;
}) {
    // Use useParams hook to get route parameters
    const params = useParams();
    const address = params.address as string;

    return (
        <AccountDataProvider address={address}>
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-grow container mx-auto px-4 py-8">
                    {children}
                </main>
                <Footer />
            </div>
        </AccountDataProvider>
    );
} 