import { observable } from '@legendapp/state';

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

// Some helper selectors
export const selectBlockchainState = () => store.blockchain.get();
export const selectTransactionsList = () => store.transactions.list.get();
export const selectCurrentTransaction = () => store.currentTransaction.get();
export const selectAccount = (address: string) => store.accounts[address].get();
export const selectCurrentAccount = () => store.currentAccount.get();
export const selectIsDarkMode = () => store.ui.darkMode.get();