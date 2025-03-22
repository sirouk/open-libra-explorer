import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { getBlockHeight, getEpoch, getLatestTransactions, getAccountResources } from '../services/libraService';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('Libra Service', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('getBlockHeight', () => {
        it('should return block height from API response', async () => {
            // Arrange
            const mockResponse = {
                data: {
                    result: {
                        block_height: 12345
                    }
                }
            };
            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            // Act
            const result = await getBlockHeight();

            // Assert
            expect(result).toBe(12345);
            expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        });

        it('should return 0 if no block height in response', async () => {
            // Arrange
            const mockResponse = {
                data: {
                    result: {}
                }
            };
            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            // Act
            const result = await getBlockHeight();

            // Assert
            expect(result).toBe(0);
        });

        it('should throw error when API request fails', async () => {
            // Arrange
            const errorMessage = 'Network Error';
            mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage));

            // Act & Assert
            await expect(getBlockHeight()).rejects.toThrow();
        });
    });

    describe('getEpoch', () => {
        it('should return epoch from API response', async () => {
            // Arrange
            const mockResponse = {
                data: {
                    result: {
                        epoch: 42
                    }
                }
            };
            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            // Act
            const result = await getEpoch();

            // Assert
            expect(result).toBe(42);
            expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        });
    });

    describe('getLatestTransactions', () => {
        it('should return mock transaction data for now', async () => {
            // Act
            const result = await getLatestTransactions();

            // Assert
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('id');
            expect(result[0]).toHaveProperty('type');
            expect(result[0]).toHaveProperty('amount');
            expect(result[0]).toHaveProperty('timestamp');
        });
    });

    describe('getAccountResources', () => {
        it('should return account data with the provided address', async () => {
            // Arrange
            const address = '0xtest123';

            // Act
            const result = await getAccountResources(address);

            // Assert
            expect(result).toHaveProperty('address', address);
            expect(result).toHaveProperty('balance');
            expect(result).toHaveProperty('resources');
        });
    });
}); 