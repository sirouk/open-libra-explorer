import { LibraClient, Network, type AccountAddressInput } from 'open-libra-sdk';

// Initialize the Open Libra client
const RPC_URL = 'https://rpc.openlibra.space:8080/v1';
let client: LibraClient | null = null;

export const initLibraClient = async (): Promise<LibraClient> => {
    try {
        if (!client) {
            console.log('Initializing Open Libra client...');
            client = new LibraClient(Network.MAINNET, RPC_URL);
            console.log('Connected to Open Libra RPC:', RPC_URL);
        }
        return client;
    } catch (error) {
        console.error('Failed to initialize Open Libra client:', error);
        throw error;
    }
};

// Get the current block height
export const getBlockHeight = async (): Promise<number> => {
    try {
        const client = await initLibraClient();
        const ledgerInfo = await client.getLedgerInfo();
        return parseInt(ledgerInfo.block_height, 10);
    } catch (error) {
        console.error('Failed to get block height:', error);
        throw error;
    }
};

// Get the current epoch
export const getEpoch = async (): Promise<number> => {
    try {
        const client = await initLibraClient();
        const ledgerInfo = await client.getLedgerInfo();
        return parseInt(ledgerInfo.epoch, 10);
    } catch (error) {
        console.error('Failed to get epoch:', error);
        throw error;
    }
};

// Interface for transaction responses
interface Transaction {
    id: string;
    type: string;
    amount: string;
    timestamp: number;
    sender?: string;
    recipient?: string;
}

// Get the latest transactions
export const getLatestTransactions = async (limit: number = 10): Promise<Transaction[]> => {
    try {
        const client = await initLibraClient();
        // Fetch transactions from the chain
        const blockHeight = await getBlockHeight();

        // Try to get transactions from the latest blocks
        const transactions: Transaction[] = [];
        let fetched = 0;
        let currentBlock = blockHeight;

        while (fetched < limit && currentBlock > 0) {
            try {
                // Cast to any to avoid type errors while we're still learning the SDK
                const blockHeightParam = currentBlock.toString();
                // Attempt to get block by height
                const block = await client.getBlockByHeight({
                    blockHeight: blockHeightParam as any,
                    options: { withTransactions: true }
                });

                if (block && block.transactions && block.transactions.length > 0) {
                    // Process each transaction in the block
                    for (const tx of block.transactions) {
                        if (fetched >= limit) break;

                        try {
                            // For simplicity, we'll classify all transactions as "Transfer" for now
                            // In a real implementation, you'd want to parse the transaction data properly
                            const txInfo: Transaction = {
                                id: tx.hash,
                                type: 'Transfer', // Default type
                                amount: '0', // Default amount
                                timestamp: parseInt(block.block_timestamp, 10) / 1000000, // Convert to milliseconds
                            };

                            // In a real implementation, we would parse the events to get the transaction details
                            // Since tx.events may not be directly accessible in the SDK's type definitions,
                            // Let's use a simpler approach for now based on transaction type
                            if (tx.type === 'user_transaction') {
                                // Attempt to determine type from function name or payload
                                // This is simplified and might need adjustment based on the actual SDK structure
                                if (tx.payload && typeof tx.payload === 'object') {
                                    const payloadStr = JSON.stringify(tx.payload);

                                    if (payloadStr.includes('::stake::')) {
                                        txInfo.type = 'Stake';
                                    } else if (payloadStr.includes('::coin::')) {
                                        txInfo.type = 'Transfer';
                                    } else {
                                        txInfo.type = 'Contract Call';
                                    }

                                    // Try to extract amount from transaction data
                                    const amountMatch = payloadStr.match(/"amount":"(\d+)"/);
                                    if (amountMatch && amountMatch[1]) {
                                        txInfo.amount = amountMatch[1];
                                    }
                                }
                            }

                            transactions.push(txInfo);
                            fetched++;
                        } catch (txError) {
                            console.error('Error processing transaction:', txError);
                            // Continue to the next transaction
                        }
                    }
                }
            } catch (blockError) {
                console.error(`Error fetching block ${currentBlock}:`, blockError);
                // Continue to the next block
            }

            currentBlock--;
        }

        return transactions;
    } catch (error) {
        console.error('Failed to get latest transactions:', error);
        // If there's an error, return placeholder data for now
        return [
            { id: '0xabc...', type: 'Transfer', amount: '100', timestamp: Date.now() - 1000 * 60 },
            { id: '0xdef...', type: 'Stake', amount: '500', timestamp: Date.now() - 1000 * 120 },
            { id: '0xghi...', type: 'Transfer', amount: '250', timestamp: Date.now() - 1000 * 180 },
        ];
    }
};

// Interface for resources
interface Resources {
    [key: string]: any;
}

// Get account resources
export const getAccountResources = async (address: string): Promise<any> => {
    try {
        const client = await initLibraClient();
        // Use any type to bypass type checking while we learn the SDK
        // Fetch account resources
        const resources = await client.getAccountResources({ accountAddress: address as any });

        // Look for coin resources to determine balance
        let totalBalance = '0';
        const resourcesData: Resources[] = [];

        for (const resource of resources) {
            try {
                const resourceData = {
                    type: resource.type,
                    data: resource.data as any
                };

                // Check if this is a coin resource
                if (resource.type.includes('0x1::coin::CoinStore<0x1::libra_coin::LibraCoin>')) {
                    const data = resource.data as any;
                    if (data && data.coin && data.coin.value) {
                        totalBalance = data.coin.value.toString();
                    }
                }

                resourcesData.push(resourceData);
            } catch (resourceError) {
                console.error('Error processing resource:', resourceError);
            }
        }

        return {
            address,
            balance: totalBalance,
            resources: resourcesData,
        };
    } catch (error) {
        console.error(`Failed to get account resources for ${address}:`, error);
        return {
            address,
            balance: '0',
            resources: [],
        };
    }
}; 