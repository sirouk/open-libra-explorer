/**
 * Open Libra Explorer Configuration
 */

// RPC endpoint for Open Libra blockchain
export const RPC_URL = 'https://rpc.openlibra.space:8080/v1';

// Client-side mode configuration
// When true, API calls will be made directly from the browser
// When false, API calls will be made server-side using server actions
// NOTE: Client-side mode has issues with the SDK's browser compatibility
export const CLIENT_SIDE_API = false;

// Libra token has 6 decimals (1,000,000 base units = 1 LIBRA)
export const LIBRA_DECIMALS = 6;

// Network configuration
export const NETWORK = {
    MAINNET: 'mainnet',
    TESTNET: 'testnet'
};

// Default network to use
export const DEFAULT_NETWORK = NETWORK.MAINNET;

// Number of transactions to show on the home page
export const DEFAULT_TX_LIMIT = 20;

// Auto-refresh interval in milliseconds
export const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

// Debug mode - enables console logging
export const DEBUG_MODE = true; 