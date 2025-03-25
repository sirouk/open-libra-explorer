import { observable } from '@legendapp/state';
import { configureObservablePersistence } from '@legendapp/state/persist';

// Configure Legend State for Next.js with persistence
configureObservablePersistence({
    // Enable local persistence
    persistLocal: true,
    throttle: 250,
    writeDelay: 250
});

// Define our blockchain explorer types
export interface Transaction {
    id: string;
    type: string;
    amount: string;
    timestamp: number;
    sender?: string;
    recipient?: string;
    blockHeight?: string;
    version?: string;
    formattedDate?: string;
}

export interface Account {
    address: string;
    balance: string;
    resources: any[];
    lastFetched?: number;
}

export interface ResourceType {
    type: string;
    displayName: string;
}

// Define the global state structure
export interface AppState {
    blockchain: {
        blockHeight: number;
        epoch: number;
        chainId: string;
        lastUpdated: number;
    };
    transactions: {
        list: Transaction[];
        isLoading: boolean;
        isRefreshing: boolean;
        error: string | null;
        // Cache of transaction details (by id)
        cache: { [id: string]: any };
    };
    currentTransaction: {
        data: any | null;
        isLoading: boolean;
        error: string | null;
    };
    accounts: {
        [address: string]: Account;
    };
    currentAccount: {
        address: string | null;
        isLoading: boolean;
        error: string | null;
        resourceTypes: ResourceType[];
        currentResourceType: string | null;
        lastFetched: number | null;
    };
    ui: {
        darkMode: boolean;
    };
}

// Initial state
const initialState: AppState = {
    blockchain: {
        blockHeight: 0,
        epoch: 0,
        chainId: 'v8-twin',
        lastUpdated: Date.now(),
    },
    transactions: {
        list: [],
        isLoading: false,
        isRefreshing: false,
        error: null,
        cache: {},
    },
    currentTransaction: {
        data: null,
        isLoading: false,
        error: null,
    },
    accounts: {},
    currentAccount: {
        address: null,
        isLoading: false,
        error: null,
        resourceTypes: [],
        currentResourceType: null,
        lastFetched: null,
    },
    ui: {
        darkMode: false,
    },
};

// Create the store
export const store = observable<AppState>(initialState);

// Helper to format date from timestamp
export const formatTransactionDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

// Helper to prune transaction cache for items not in the current list
export const pruneTransactionCache = () => {
    const currentList = store.transactions.list.get();
    const currentIds = new Set(currentList.map(tx => tx.id));
    const cachedIds = Object.keys(store.transactions.cache.get());

    // Remove cached transactions that are no longer in the list
    for (const id of cachedIds) {
        if (!currentIds.has(id)) {
            store.transactions.cache[id].set(undefined);
        }
    }
};

// Some helper selectors
export const selectBlockchainState = () => store.blockchain.get();
export const selectTransactionsList = () => store.transactions.list.get();
export const selectTransactionCache = () => store.transactions.cache.get();
export const selectCurrentTransaction = () => store.currentTransaction.get();
export const selectAccount = (address: string) => store.accounts[address].get();
export const selectCurrentAccount = () => store.currentAccount.get();
export const selectIsDarkMode = () => store.ui.darkMode.get();