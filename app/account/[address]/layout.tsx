'use client';

import { AccountDataProvider } from '../../context/AccountDataContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function AccountLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { address: string };
}) {
    return (
        <AccountDataProvider address={params.address}>
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