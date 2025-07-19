/**
 * Unit tests for Azure NetApp Files Accounts operations
 * @author Dwiref Sharma <DwirefS@SapientEdge.io>
 */

import { AccountsTool } from '../../src/tools/accounts';
import { NetAppManagementClient } from '@azure/arm-netapp';
import { DefaultAzureCredential } from '@azure/identity';

// Mock Azure SDK
jest.mock('@azure/arm-netapp');
jest.mock('@azure/identity');

describe('AccountsTool', () => {
  let accountsTool: AccountsTool;
  let mockClient: jest.Mocked<NetAppManagementClient>;
  let mockCredential: jest.Mocked<DefaultAzureCredential>;

  beforeEach(() => {
    // Setup mocks
    mockCredential = new DefaultAzureCredential() as jest.Mocked<DefaultAzureCredential>;
    mockClient = {
      accounts: {
        list: jest.fn(),
        get: jest.fn(),
        createOrUpdate: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    (NetAppManagementClient as jest.MockedClass<typeof NetAppManagementClient>).mockImplementation(() => mockClient);

    // Initialize tool
    accountsTool = new AccountsTool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listAccounts', () => {
    it('should list all NetApp accounts successfully', async () => {
      const mockAccounts = [
        {
          id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1',
          name: 'account1',
          location: 'eastus',
          tags: { environment: 'test' },
        },
        {
          id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account2',
          name: 'account2',
          location: 'westus',
          tags: { environment: 'prod' },
        },
      ];

      mockClient.accounts.list.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield* mockAccounts;
        },
      } as any);

      const result = await accountsTool.listAccounts({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
      });

      expect(result).toHaveProperty('accounts');
      expect(result.accounts).toHaveLength(2);
      expect(result.accounts[0].name).toBe('account1');
      expect(mockClient.accounts.list).toHaveBeenCalledWith('rg1');
    });

    it('should handle empty account list', async () => {
      mockClient.accounts.list.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          // Empty iterator
        },
      } as any);

      const result = await accountsTool.listAccounts({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
      });

      expect(result.accounts).toHaveLength(0);
      expect(result.message).toContain('No NetApp accounts found');
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error: Unauthorized');
      mockClient.accounts.list.mockRejectedValue(error);

      await expect(
        accountsTool.listAccounts({
          subscriptionId: 'sub1',
          resourceGroupName: 'rg1',
        })
      ).rejects.toThrow('API Error: Unauthorized');
    });
  });

  describe('getAccount', () => {
    it('should retrieve a specific NetApp account', async () => {
      const mockAccount = {
        id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1',
        name: 'account1',
        location: 'eastus',
        properties: {
          provisioningState: 'Succeeded',
        },
        tags: { environment: 'test' },
      };

      mockClient.accounts.get.mockResolvedValue(mockAccount);

      const result = await accountsTool.getAccount({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
      });

      expect(result.account).toEqual(mockAccount);
      expect(mockClient.accounts.get).toHaveBeenCalledWith('rg1', 'account1');
    });

    it('should handle non-existent account', async () => {
      const error = new Error('Account not found');
      error.name = 'ResourceNotFoundError';
      mockClient.accounts.get.mockRejectedValue(error);

      await expect(
        accountsTool.getAccount({
          subscriptionId: 'sub1',
          resourceGroupName: 'rg1',
          accountName: 'nonexistent',
        })
      ).rejects.toThrow('Account not found');
    });
  });

  describe('createAccount', () => {
    it('should create a new NetApp account', async () => {
      const newAccount = {
        location: 'eastus',
        tags: { environment: 'test', owner: 'testuser' },
      };

      const createdAccount = {
        ...newAccount,
        id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/newAccount',
        name: 'newAccount',
        properties: {
          provisioningState: 'Succeeded',
        },
      };

      mockClient.accounts.createOrUpdate.mockResolvedValue(createdAccount);

      const result = await accountsTool.createAccount({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'newAccount',
        location: 'eastus',
        tags: { environment: 'test', owner: 'testuser' },
      });

      expect(result.account).toEqual(createdAccount);
      expect(result.message).toContain('successfully created');
      expect(mockClient.accounts.createOrUpdate).toHaveBeenCalledWith(
        'rg1',
        'newAccount',
        expect.objectContaining({
          location: 'eastus',
          tags: { environment: 'test', owner: 'testuser' },
        })
      );
    });

    it('should handle creation failures', async () => {
      const error = new Error('Insufficient permissions');
      mockClient.accounts.createOrUpdate.mockRejectedValue(error);

      await expect(
        accountsTool.createAccount({
          subscriptionId: 'sub1',
          resourceGroupName: 'rg1',
          accountName: 'newAccount',
          location: 'eastus',
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('deleteAccount', () => {
    it('should delete a NetApp account', async () => {
      mockClient.accounts.delete.mockResolvedValue(undefined);

      const result = await accountsTool.deleteAccount({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
      });

      expect(result.message).toContain('successfully deleted');
      expect(mockClient.accounts.delete).toHaveBeenCalledWith('rg1', 'account1');
    });

    it('should handle deletion of non-existent account', async () => {
      const error = new Error('Account not found');
      error.name = 'ResourceNotFoundError';
      mockClient.accounts.delete.mockRejectedValue(error);

      await expect(
        accountsTool.deleteAccount({
          subscriptionId: 'sub1',
          resourceGroupName: 'rg1',
          accountName: 'nonexistent',
        })
      ).rejects.toThrow('Account not found');
    });

    it('should handle accounts with active resources', async () => {
      const error = new Error('Cannot delete account with active capacity pools');
      mockClient.accounts.delete.mockRejectedValue(error);

      await expect(
        accountsTool.deleteAccount({
          subscriptionId: 'sub1',
          resourceGroupName: 'rg1',
          accountName: 'account1',
        })
      ).rejects.toThrow('Cannot delete account with active capacity pools');
    });
  });

  describe('updateAccount', () => {
    it('should update account tags', async () => {
      const updatedAccount = {
        id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.NetApp/netAppAccounts/account1',
        name: 'account1',
        location: 'eastus',
        tags: { environment: 'prod', updated: 'true' },
      };

      mockClient.accounts.update.mockResolvedValue(updatedAccount);

      const result = await accountsTool.updateAccount({
        subscriptionId: 'sub1',
        resourceGroupName: 'rg1',
        accountName: 'account1',
        tags: { environment: 'prod', updated: 'true' },
      });

      expect(result.account).toEqual(updatedAccount);
      expect(mockClient.accounts.update).toHaveBeenCalledWith(
        'rg1',
        'account1',
        expect.objectContaining({
          tags: { environment: 'prod', updated: 'true' },
        })
      );
    });
  });
});