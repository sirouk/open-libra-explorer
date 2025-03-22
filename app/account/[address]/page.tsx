'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccountResources } from '../../services/libraService';

// Simple loading component for the redirect page
function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-libra-coral"></div>
        </div>
    );
}

export default function AccountPage({ params }: { params: { address: string } }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    // Helper function to extract simple resource type
    const getSimpleResourceType = (fullType: string): string => {
        const parts = fullType.split('::');
        return parts.length >= 3 ? parts[2].split('<')[0] : fullType;
    };

    useEffect(() => {
        async function loadAndRedirect() {
            try {
                // Fetch the account data to get available resources
                const accountData = await getAccountResources(params.address);

                if (accountData && accountData.resources && accountData.resources.length > 0) {
                    // Extract and sort resource types
                    const resourceTypes = [...new Set(
                        accountData.resources.map((r: any) => getSimpleResourceType(r.type))
                    )].sort();

                    // Redirect to the first resource type
                    if (resourceTypes.length > 0) {
                        router.replace(`/account/${params.address}/${resourceTypes[0]}`);
                        return;
                    }
                }

                // If no resources or error, we'll still stop loading
                setIsLoading(false);
            } catch (error) {
                console.error('Error fetching account data for redirect:', error);
                setIsLoading(false);
            }
        }

        loadAndRedirect();
    }, [params.address, router]);

    // Show loading spinner during the redirect
    if (isLoading) {
        return <LoadingSpinner />;
    }

    // In case we can't redirect (no resources), show a message
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h2 className="text-xl mb-4">No resources found for this account</h2>
            <p className="text-gray-600">Account address: {params.address}</p>
        </div>
    );
} 